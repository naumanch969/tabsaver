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
      .upsert(cloudData)
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
      .eq('name', workspace.name); // Assuming name is a decent secondary check if we don't have UUID yet

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
      .eq('name', workspace.name);

    if (error) throw error;
  }
};
