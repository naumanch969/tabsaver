import { TabInfo, Workspace } from '../types';

export const tabService = {
  async getCurrentTabs(): Promise<TabInfo[]> {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.map((tab) => ({
      url: tab.url || '',
      title: tab.title || '',
      favIconUrl: tab.favIconUrl,
    }));
  },

  async restoreWorkspace(workspace: Workspace): Promise<void> {
    const urls = workspace.tabs.map((tab) => tab.url).filter((url) => !!url);
    if (urls.length === 0) return;

    // Create a new window with the first tab
    const window = await chrome.windows.create({ url: urls[0] });

    // Add the rest of the tabs
    if (urls.length > 1) {
      for (let i = 1; i < urls.length; i++) {
        await chrome.tabs.create({ windowId: window.id, url: urls[i] });
      }
    }
  },

  async getTabCount(): Promise<number> {
    const tabs = await chrome.tabs.query({});
    return tabs.length;
  }
};
