export interface TabInfo {
  id?: number;
  url: string;
  title: string;
  favIconUrl?: string;
}

export type WorkspaceColor = 'green' | 'blue' | 'yellow' | 'purple' | 'red' | 'tan';

export interface Workspace {
  id: string;
  name: string;
  note?: string;
  tabs: TabInfo[];
  createdAt: number;
  updatedAt: number;
  color?: WorkspaceColor;
  isAutoSave?: boolean;
}

export interface ExtensionState {
  workspaces: Workspace[];
  lastSnapshot?: Workspace;
}
