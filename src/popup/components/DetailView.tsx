import React, { useState } from 'react';
import { TabInfo, Workspace } from '../../types';
import { COLOR_MAP } from '../constants';
import { formatDateFull, getDomainCount, getTimeLabel } from '../utils';

interface DetailViewProps {
  selectedWorkspace: Workspace;
  onBack: () => void;
  onDeleteWorkspace: (id: string) => void;
  onDeleteTab: (wsId: string, idx: number) => void;
  onRenameSave: (id: string, name: string) => void;
  onOpenTab: (url: string) => void;
}

const DetailView: React.FC<DetailViewProps> = ({
  selectedWorkspace,
  onBack,
  onDeleteWorkspace,
  onDeleteTab,
  onRenameSave,
  onOpenTab
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamedName, setRenamedName] = useState(selectedWorkspace.name);
  const domains = getDomainCount(selectedWorkspace.tabs);

  const handleRenameSave = () => {
    if (renamedName.trim()) {
      onRenameSave(selectedWorkspace.id, renamedName.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div className="detail-view">
      <div className="view-header">
        <div className="back-btn" onClick={() => { onBack(); setIsRenaming(false); }}>
          ‹ Back to workspaces
        </div>
        <div className="detail-title-section">
          <div className="detail-stripe" style={{ background: selectedWorkspace.color ? COLOR_MAP[selectedWorkspace.color] : 'var(--accent)' }}></div>
          <div>
            {isRenaming ? (
              <input
                className="rename-input"
                value={renamedName}
                onChange={(e) => setRenamedName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
                autoFocus
                onBlur={handleRenameSave}
              />
            ) : (
              <div 
                className="detail-title serif" 
                onClick={() => { setIsRenaming(true); setRenamedName(selectedWorkspace.name); }}
                style={{ cursor: 'pointer' }}
              >
                {selectedWorkspace.name}
              </div>
            )}
            <div className="detail-subtitle">{formatDateFull(selectedWorkspace.createdAt)} · {selectedWorkspace.note || 'no note'}</div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-val">{selectedWorkspace.tabs.length}</div>
          <div className="stat-lbl">Tabs</div>
        </div>
        <div className="stat-item">
          <div className="stat-val">{domains}</div>
          <div className="stat-lbl">Domains</div>
        </div>
        <div className="stat-item">
          <div className="stat-val">{getTimeLabel(selectedWorkspace.createdAt)}</div>
          <div className="stat-lbl">Saved</div>
        </div>
      </div>

      <div className="tab-list">
        {selectedWorkspace.tabs.map((tab, idx) => {
          let domain = '';
          try { domain = new URL(tab.url).hostname.replace('www.', ''); } catch (e) { }
          return (
            <div key={idx} className="tab-item" style={{ cursor: 'pointer' }} onClick={() => onOpenTab(tab.url)}>
              <div className="tab-icon">
                {tab.favIconUrl ? <img src={tab.favIconUrl} style={{ width: '16px', height: '16px' }} /> : '🌐'}
              </div>
              <div className="tab-info">
                <div className="tab-title">{tab.title}</div>
              </div>
              <div className="tab-domain">{domain}</div>
              {selectedWorkspace.tabs.length > 1 && (
                <div
                  className="tab-delete-btn"
                  title="Remove from vault"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTab(selectedWorkspace.id, idx);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="view-actions">
        <button 
          className="btn-secondary" 
          style={{ flex: 1, borderColor: '#e07070', color: '#e07070' }}
          onClick={() => {
            if (confirm('Delete this workspace? This cannot be undone.')) {
              onDeleteWorkspace(selectedWorkspace.id);
            }
          }}
        >
          Delete Vault
        </button>
      </div>
    </div>
  );
};

export default DetailView;
