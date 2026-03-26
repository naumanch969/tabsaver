import { Workspace } from '../types';

const STORAGE_KEY = 'tab_saver_workspaces';

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
  },

  async deleteWorkspace(id: string): Promise<void> {
    const workspaces = await this.getWorkspaces();
    const filtered = workspaces.filter((w) => w.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
  },

  async clear(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY);
  }
};
