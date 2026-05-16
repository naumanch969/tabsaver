import { Workspace } from '../types';

const STORAGE_KEY = 'workspaces';

export const storageService = {
  async getWorkspaces(): Promise<Workspace[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  },

  async saveWorkspace(workspace: Workspace): Promise<void> {
    const workspaces = await this.getWorkspaces();
    const index = workspaces.findIndex((w) => w.id === workspace.id);

    if (index !== -1) {
      workspaces[index] = workspace;
    } else {
      workspaces.push(workspace);
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: workspaces });
    
    // Sync to cloud if the session is there
    const sessionRes = await chrome.storage.local.get(['session']);
    if (sessionRes.session) {
      const { syncService } = await import('./sync');
      syncService.pushWorkspace(workspace).catch(e => console.error("Cloud push failed:", e));
    }
  },

  async deleteWorkspace(id: string): Promise<void> {
    const workspaces = await this.getWorkspaces();
    const filtered = workspaces.filter((w) => w.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
    
    const sessionRes = await chrome.storage.local.get(['session']);
    if (sessionRes.session) {
      const { supabase } = await import('./supabase');
      // Set session manually since chrome.storage.local isn't native to the Supabase client out of the box
      await supabase.auth.setSession({
        access_token: sessionRes.session.access_token,
        refresh_token: sessionRes.session.refresh_token
      });
      // Delete from cloud
      await supabase.from('workspaces').delete().eq('id', id);
    }
  },

  async clear(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY);
  }
};
