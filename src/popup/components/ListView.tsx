import React from 'react';
import { Workspace } from '../../types';
import WorkspaceCard from './WorkspaceCard';

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
  searchRef: React.RefObject<HTMLInputElement>;
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
  searchRef
}) => {
  const filteredWorkspaces = workspaces.filter(ws => {
    const query = searchQuery.toLowerCase();
    return ws.name.toLowerCase().includes(query) ||
      ws.tabs.some(t => t.title.toLowerCase().includes(query) || (t.url && t.url.toLowerCase().includes(query)));
  });

  return (
    <>
      <div className="topbar">
        <div className="logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 56 56" fill="none">
              <rect x="14" y="20" width="12" height="6" rx="3" fill="#e8a84b" opacity="0.2" />
              <rect x="14" y="24" width="36" height="22" rx="5" fill="#e8a84b" opacity="0.2" />
              <rect x="10" y="15" width="12" height="6" rx="3" fill="#e8a84b" opacity="0.45" />
              <rect x="10" y="19" width="36" height="22" rx="5" fill="#e8a84b" opacity="0.45" />
              <rect x="6" y="10" width="14" height="7" rx="3.5" fill="#e8a84b" />
              <rect x="6" y="15" width="36" height="22" rx="5" fill="#e8a84b" />
              <rect x="13" y="22" width="16" height="2" rx="1" fill="#171610" opacity="0.5" />
              <rect x="13" y="27" width="10" height="2" rx="1" fill="#171610" opacity="0.3" />
            </svg>
          </div>
          <div className="logo-name">
            <span className="wm-tab">Tab</span>
            <span className="wm-dot"></span>
            <span className="wm-saver">Saver</span>
          </div>
        </div>
        {workspaces.length > 0 && (
          <button
            className="resume-btn-header"
            onClick={() => onDirectRestore(workspaces[0])}
            title={`Restore: ${workspaces[0].name}`}
          >
            Resume Last
          </button>
        )}
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
            <div className="ws-meta" style={{ marginTop: '0' }}><span className="caption">Whole window</span></div>
          </div>
        </button>
        
        <button
          className="ws-card"
          style={{ flex: 1, borderStyle: 'dashed', background: 'var(--bg3)', justifyContent: 'flex-start', padding: '12px' }}
          onClick={onSaveCurrentTab}
        >
          <div className="action-icon" style={{ flexShrink: 0, width: '28px', height: '28px', fontSize: '14px' }}>🗂️</div>
          <div className="ws-info">
            <div className="ws-name" style={{ fontSize: '13px' }}>Current Tab</div>
            <div className="ws-meta" style={{ marginTop: '0' }}><span className="caption">Quick save</span></div>
          </div>
        </button>
      </div>

      <div className="section-header" style={{ padding: '18px 18px 10px', display: 'flex', justifyContent: 'space-between' }}>
        <div className="section-title">Saved Vaults</div>
        <div className="caption">{workspaces.length} total</div>
      </div>

      <div className="workspace-list" style={{ padding: '0 14px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {workspaces.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--t3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>🏛️</div>
            <p style={{ fontSize: '13px' }}>Your vault is empty</p>
            <p className="caption" style={{ marginTop: '4px' }}>Sessions you save will appear here.</p>
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
                />
              ))
          )
        )}
      </div>
    </>
  );
};

export default ListView;
