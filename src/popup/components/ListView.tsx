import React from 'react';
import { Workspace } from '../../types';
import WorkspaceCard from './WorkspaceCard';
import { Layers, RefreshCcw } from 'lucide-react';

interface ListViewProps {
  workspaces: Workspace[];
  currentTabUrls: Set<string>;
  editingId: string | null;
  editingName: string;
  searchQuery: string;
  currentTime: string;
  onSearchChange: (val: string) => void;
  onSearchClear: () => void;
  onStartSaving: () => void;
  onSaveCurrentTab: () => void;
  onDirectRestore: (ws: Workspace) => void;
  onSelectWorkspace: (ws: Workspace) => void;
  onRestoreWorkspace: (ws: Workspace) => void;
  onRenameStart: (ws: Workspace) => void;
  onRenameChange: (val: string) => void;
  onRenameSave: (id: string) => void;
  onRenameCancel: () => void;
  onConnectCloud: () => void;
  onSyncAll: () => void;
  onDeleteWorkspace: (id: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  session: any;
  isSyncing?: boolean;
}

const ListView: React.FC<ListViewProps> = ({
  workspaces,
  currentTabUrls,
  editingId,
  editingName,
  searchQuery,
  currentTime,
  onSearchChange,
  onSearchClear,
  onStartSaving,
  onSaveCurrentTab,
  onDirectRestore,
  onSelectWorkspace,
  onRestoreWorkspace,
  onRenameStart,
  onRenameChange,
  onRenameSave,
  onRenameCancel,
  onConnectCloud,
  onSyncAll,
  onDeleteWorkspace,
  searchRef,
  session,
  isSyncing = false
}) => {
  const filteredWorkspaces = workspaces.filter(ws => {
    const query = searchQuery.toLowerCase();
    return ws.name.toLowerCase().includes(query) ||
      ws.tabs.some(t => t.title.toLowerCase().includes(query) || (t.url && t.url.toLowerCase().includes(query)));
  });

  return (
    <>
      <div className="topbar">
        <div className="logo" style={{ cursor: 'default' }}>
          <div className="logo-icon">
            <div style={{ width: '28px', height: '28px', background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px var(--accent-glow)' }}>
              <Layers size={14} color="var(--bg)" strokeWidth={3} />
            </div>
          </div>
          <div className="logo-name">
            <span style={{ fontFamily: 'Fraunces, serif', fontWeight: '700', fontSize: '18px', color: 'var(--t1)', letterSpacing: '-0.02em' }}>tab</span>
            <span style={{ fontFamily: 'Fraunces, serif', fontWeight: '700', fontSize: '18px', color: 'var(--accent)', letterSpacing: '-0.02em' }}>stack</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {workspaces.length > 0 && (
            <button
              className="resume-btn-header"
              onClick={() => onDirectRestore(workspaces[0])}
              title={`Restore: ${workspaces[0].name}`}
            >
              Resume Last
            </button>
          )}
          {session && (
            <button
              onClick={() => onSyncAll()}
              disabled={isSyncing}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--t3)', 
                cursor: isSyncing ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
              title="Sync to Cloud"
            >
              <RefreshCcw size={16} className={isSyncing ? 'animate-spin' : ''} style={{ opacity: isSyncing ? 0.5 : 1 }} />
            </button>
          )}
          {session ? (
            session.user?.user_metadata?.avatar_url ? (
              <img
                src={session.user.user_metadata.avatar_url}
                alt="Profile"
                onClick={onConnectCloud}
                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--line2)', objectFit: 'cover', cursor: 'pointer' }}
              />
            ) : (
              <div
                onClick={onConnectCloud}
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                title={session.user?.email}
              >
                {session.user?.email?.[0].toUpperCase() || 'U'}
              </div>
            )
          ) : (
            <button
              onClick={onConnectCloud}
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg3)', border: '1px solid var(--line)', fontSize: '12px', fontWeight: '500', color: 'var(--t1)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Connect
            </button>
          )}
        </div>
      </div>

      <div className="search-container" style={{ margin: '14px 14px 0' }}>
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            ref={searchRef}
            type="text"
            className="search-input"
            placeholder="Search vaults or tabs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button className="search-clear" onClick={onSearchClear}>×</button>
          )}
        </div>
      </div>

      <div className="save-cta-group" style={{ margin: '14px 14px 0', display: 'flex', gap: '8px' }}>
        <button
          className="ws-card"
          style={{ flex: 1, borderStyle: 'dashed', background: 'var(--bg3)', justifyContent: 'flex-start', padding: '12px' }}
          onClick={onStartSaving}
        >
          <div className="action-icon" style={{ flexShrink: 0, width: '28px', height: '28px', fontSize: '14px' }}>＋</div>
          <div className="ws-info">
            <div className="ws-name" style={{ fontSize: '13px' }}>Save All</div>
            <div className="ws-meta" style={{ marginTop: '0' }}><span className="caption">Save window</span></div>
          </div>
        </button>

        <button
          className="ws-card"
          style={{ flex: 1, borderStyle: 'dashed', background: 'var(--bg3)', justifyContent: 'flex-start', padding: '12px' }}
          onClick={onSaveCurrentTab}
        >
          <div className="action-icon" style={{ flexShrink: 0, width: '28px', height: '28px', fontSize: '14px' }}>🗂️</div>
          <div className="ws-info">
            <div className="ws-name" style={{ fontSize: '13px' }}>Save Tab</div>
            <div className="ws-meta" style={{ marginTop: '0' }}><span className="caption">Quick save</span></div>
          </div>
        </button>
      </div>

      <div className="section-header" style={{ padding: '18px 18px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div className="section-title">Saved Tabs</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {session && (
            <div className="caption" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }}></div>
              Synced
            </div>
          )}
          <div className="caption">{workspaces.length} total</div>
        </div>
      </div>

      <div className="workspace-list" style={{ padding: '0 14px 14px', flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {workspaces.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--t3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>🏛️</div>
            <p style={{ fontSize: '13px' }}>Your Vault is empty</p>
            <p className="caption" style={{ marginTop: '4px' }}>Tabs you save will appear here.</p>
          </div>
        ) : (
          filteredWorkspaces.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--t3)' }}>
              <p className="caption">No results matching "{searchQuery}"</p>
            </div>
          ) : (
            filteredWorkspaces
              .sort((a, b) => b.createdAt - a.createdAt)
              .map(ws => (
                <WorkspaceCard
                  key={ws.id}
                  ws={ws}
                  currentTabUrls={currentTabUrls}
                  editingId={editingId}
                  editingName={editingName}
                  onSelect={() => onSelectWorkspace(ws)}
                  onRestore={(e) => { e.stopPropagation(); onRestoreWorkspace(ws); }}
                  onRenameStart={(e) => { e.stopPropagation(); onRenameStart(ws); }}
                  onRenameChange={onRenameChange}
                  onRenameSave={() => onRenameSave(ws.id)}
                  onRenameCancel={onRenameCancel}
                  onDelete={(e) => { e.stopPropagation(); onDeleteWorkspace(ws.id); }}
                />
              ))
          )
        )}
      </div>
    </>
  );
};

export default ListView;
