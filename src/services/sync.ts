import { supabase } from './supabase';
import { Workspace } from '../types';
import { nanoid } from 'nanoid';

const CLIENT_URL = 'https://tabstack.app';

export const syncService = {
  /**
   * Pushes a local workspace to Supabase cloud.
   */
  async pushWorkspace(workspace: Workspace): Promise<Workspace> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const cloudData = {
      id: workspace.id,
      user_id: session.user.id,
      name: workspace.name,
      data: workspace.tabs, // Map tabs to the 'data' field in schema
      color: workspace.color,
      is_public: workspace.isPublic || false,
      share_id: workspace.shareId || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('workspaces')
      .upsert(cloudData, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    return {
      ...workspace,
      user_id: session.user.id,
      syncedAt: Date.now(),
    };
  },

  /**
   * Generates a public share link for a workspace.
   */
  async generateShareLink(workspace: Workspace): Promise<{ shareId: string; url: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const shareId = workspace.shareId || nanoid(6);
    
    const { error } = await supabase
      .from('workspaces')
      .update({ 
        is_public: true, 
        share_id: shareId 
      })
      .eq('user_id', session.user.id)
      .eq('id', workspace.id);

    if (error) throw error;

    return {
      shareId,
      url: `${CLIENT_URL}/s/${shareId}`
    };
  },

  /**
   * Revokes a public share link.
   */
  async revokeShareLink(workspace: Workspace): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('workspaces')
      .update({ 
        is_public: false, 
        share_id: null 
      })
      .eq('user_id', session.user.id)
      .eq('id', workspace.id);

    if (error) throw error;
  },

  async syncAllWorkspaces(workspaces: Workspace[]): Promise<Workspace[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    if (!workspaces || !Array.isArray(workspaces) || workspaces.length === 0) return [];

    // Map to cloud schema, ensuring valid IDs (though we expect UUIDs now)
    const cloudWorkspaces = workspaces.map(ws => ({
      id: ws.id,
      user_id: session.user.id,
      name: ws.name,
      data: ws.tabs,
      color: ws.color,
      is_public: ws.isPublic || false,
      share_id: ws.shareId || null,
      updated_at: new Date(ws.updatedAt || Date.now()).toISOString(),
    }));

    const { error } = await supabase
      .from('workspaces')
      .upsert(cloudWorkspaces, { onConflict: 'id' });

    if (error) throw error;

    const now = Date.now();
    return workspaces.map(ws => ({
      ...ws,
      user_id: session.user.id,
      syncedAt: now
    }));
  },

  /**
   * Deletes a workspace from the cloud.
   */
  async deleteWorkspaceCloud(workspaceId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // Silent return if not logged in

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Failed to delete from cloud:', error);
      throw error;
    }
  },

  /**
   * Fetches all workspaces from the cloud.
   */
  async pullWorkspaces(): Promise<Workspace[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) throw error;

    return (data || []).map(ws => ({
      id: ws.id,
      name: ws.name,
      tabs: ws.data,
      color: ws.color,
      isPublic: ws.is_public,
      shareId: ws.share_id,
      updatedAt: new Date(ws.updated_at).getTime(),
      createdAt: new Date(ws.created_at).getTime(),
      user_id: ws.user_id,
      syncedAt: Date.now()
    }));
  },

  /**
   * Performs a bidirectional sync: pulls cloud data, merges with local data, and pushes back.
   */
  async fullSync(localWorkspaces: Workspace[]): Promise<Workspace[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // 1. Pull from cloud
    let cloudWorkspaces: Workspace[] = [];
    try {
      cloudWorkspaces = await this.pullWorkspaces();
    } catch (err) {
      console.error('Pull failed, continuing with local only:', err);
    }
    
    // 2. Merge logic
    const mergedMap = new Map<string, Workspace>();
    
    // Add cloud data first as baseline
    cloudWorkspaces.forEach(ws => mergedMap.set(ws.id, ws));
    
    // Merge local data: local overrides if it's newer OR if cloud doesn't have it
    localWorkspaces.forEach(ws => {
      const existing = mergedMap.get(ws.id);
      if (!existing || (ws.updatedAt || 0) > (existing.updatedAt || 0)) {
        mergedMap.set(ws.id, ws);
      }
    });
    
    const mergedList = Array.from(mergedMap.values());
    
    // 3. Push everything back to cloud if there's data to ensure consistency
    if (mergedList.length > 0) {
      try {
        await this.syncAllWorkspaces(mergedList);
      } catch (err) {
        console.error('Final push failed:', err);
        // We still return mergedList as it's the most up-to-date locally
      }
    }
    
    return mergedList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
};
