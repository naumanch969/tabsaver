export interface TabInfo {
  id?: number;
  url: string;
  title: string;
  favIconUrl?: string;
}

export type WorkspaceColor = 'green' | 'blue' | 'yellow' | 'purple' | 'red' | 'tan';

export interface Workspace {
  id: string;
  user_id?: string; // Supabase user ID
  name: string;
  note?: string;
  tabs: TabInfo[];
  createdAt: number;
  updatedAt: number;
  color?: WorkspaceColor;
  isAutoSave?: boolean;
  
  // Cloud Sync / Sharing
  isPublic?: boolean;
  shareId?: string;
  syncedAt?: number;
}

export interface ExtensionState {
  workspaces: Workspace[];
  lastSnapshot?: Workspace;
}
