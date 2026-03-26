import React, { useEffect, useState } from 'react';
import { TabInfo, Workspace, WorkspaceColor } from '../types';

const COLORS: WorkspaceColor[] = ['green', 'blue', 'yellow', 'purple', 'red', 'tan'];

const COLOR_MAP: Record<WorkspaceColor, string> = {
  green: '#5cba8a',
  blue: '#7bafd4',
  yellow: '#e8a84b',
  purple: '#b08ebf',
  red: '#e07070',
  tan: '#d4a373'
};

const Popup: React.FC = () => {
  const [view, setView] = useState<'list' | 'save' | 'detail'>('list');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  // Save View State
  const [saveName, setSaveName] = useState('');
  const [saveNote, setSaveNote] = useState('');
  const [saveColor, setSaveColor] = useState<WorkspaceColor>('yellow');
  const [currentTabs, setCurrentTabs] = useState<TabInfo[]>([]);
  const [includedIndices, setIncludedIndices] = useState<Set<number>>(new Set());
  const [showTabList, setShowTabList] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    loadWorkspaces();
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const loadWorkspaces = () => {
    chrome.storage.local.get(['workspaces'], (result) => {
      if (result.workspaces) {
        setWorkspaces(result.workspaces);
      }
    });
  };

  const startSaving = () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const tabsInfo = tabs.map(tab => ({
        id: tab.id,
        title: tab.title || 'Untitled',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl
      }));
      setCurrentTabs(tabsInfo);
      setIncludedIndices(new Set(tabs.map((_, i) => i))); // All selected by default
      setShowTabList(false); // List closed by default
      setSaveName('');
      setSaveNote('');
      setSaveColor('yellow');
      setView('save');
    });
  };

  const handleSave = (closeTabs: boolean = false) => {
    if (!saveName.trim()) return;

    const filteredTabs = currentTabs.filter((_, i) => includedIndices.has(i));
    if (filteredTabs.length === 0) return;

    const newWs: Workspace = {
      id: crypto.randomUUID(),
      name: saveName,
      note: saveNote,
      tabs: filteredTabs.map(({ id, ...rest }) => rest), // Don't save transient tab IDs in storage
      color: saveColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newWs, ...workspaces];
    chrome.storage.local.set({ workspaces: updated }, () => {
      setWorkspaces(updated);
      setView('list');

      if (closeTabs) {
        // Only close tabs that were part of the saved workspace
        const tabIdsToClose = filteredTabs.map(t => t.id).filter((id): id is number => id !== undefined);

        if (tabIdsToClose.length > 0) {
          chrome.tabs.remove(tabIdsToClose, () => {
            // Check if any tabs are left in the window. If not, open a new one.
            chrome.tabs.query({ currentWindow: true }, (remainingTabs) => {
              if (remainingTabs.length === 0) {
                chrome.tabs.create({});
              }
            });
          });
        }
      }
    });
  };

  const openWorkspace = (ws: Workspace) => {
    ws.tabs.forEach((tab) => {
      chrome.tabs.create({ url: tab.url });
    });
  };

  const deleteWorkspace = (id: string) => {
    const updated = workspaces.filter(ws => ws.id !== id);
    chrome.storage.local.set({ workspaces: updated }, () => {
      setWorkspaces(updated);
      setSelectedWorkspace(null);
      setView('list');
    });
  };

  const getTimeLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    if (diff < 86400000 && now.getDate() === date.getDate()) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.getDate() === date.getDate() && yesterday.getMonth() === date.getMonth()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDateFull = (timestamp: number) => {
    const label = getTimeLabel(timestamp);
    if (label === 'Today' || label === 'Yesterday') return `Saved ${label.toLowerCase()}`;
    return `Saved on ${label}`;
  };

  const getDomainCount = (tabs: TabInfo[]) => {
    const domains = new Set();
    tabs.forEach(t => {
      try {
        const url = new URL(t.url);
        domains.add(url.hostname);
      } catch (e) { }
    });
    return domains.size;
  };

  const renderListView = () => (
    <>
      <div className="topbar">
        <div className="logo">
          <div className="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.4 9.6H22L15.8 14.2L18.2 21.8L12 17.2L5.8 21.8L8.2 14.2L2 9.6H9.6L12 2Z" fill="var(--accent)" />
            </svg>
          </div>
          <div className="logo-name">Tab Saver</div>
        </div>
        <div className="caption serif" style={{ fontStyle: 'italic', color: 'var(--t3)', opacity: 0.8 }}>v1.1.0</div>
      </div>

      {workspaces.length > 0 && (
        <div className="resume-banner">
          <div className="resume-icon">☕</div>
          <div className="resume-text">
            <div className="resume-title" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent)' }}>Resume where you left off?</div>
            <div className="resume-sub" style={{ fontSize: '11px', color: 'var(--t3)' }}>Last session: {workspaces[0].name}</div>
          </div>
          <button className="resume-btn" onClick={() => openWorkspace(workspaces[0])}>Open</button>
        </div>
      )}

      <div className="save-cta" style={{ margin: '14px 14px 0' }}>
        <button
          className="ws-card"
          style={{ width: '100%', borderStyle: 'dashed', background: 'var(--bg3)', justifyContent: 'flex-start' }}
          onClick={startSaving}
        >
          <div className="logo-icon" style={{ flexShrink: 0 }}>＋</div>
          <div className="ws-info">
            <div className="ws-name">Save Current Session</div>
            <div className="ws-meta" style={{ marginTop: '0' }}><span className="caption">Snapshot current window tabs</span></div>
          </div>
          <div style={{ color: 'var(--t3)' }}>→</div>
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
          workspaces.map((ws) => (
            <div key={ws.id} className="ws-card" onClick={() => { setSelectedWorkspace(ws); setView('detail'); }}>
              <div className="ws-stripe" style={{ background: ws.color ? COLOR_MAP[ws.color] : 'var(--accent)' }}></div>
              <div className="ws-info">
                <div className="ws-name">{ws.name}</div>
                <div className="ws-meta">
                  <span className="ws-tab-count serif" style={{ fontSize: '10px' }}>{ws.tabs.length} tabs</span>
                  <div className="ws-dot-sep"></div>
                  <span className="ws-time">{getTimeLabel(ws.createdAt)}</span>
                </div>
              </div>
              <div className="ws-actions" onClick={(e) => e.stopPropagation()}>
                <button className="ws-open-btn" onClick={() => openWorkspace(ws)}>Restore</button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderDetailView = () => {
    if (!selectedWorkspace) return null;
    const domains = getDomainCount(selectedWorkspace.tabs);

    return (
      <div className="detail-view">
        <div className="view-header">
          <div className="back-btn" onClick={() => setView('list')}>
            ‹ Back to workspaces
          </div>
          <div className="detail-title-section">
            <div className="detail-stripe" style={{ background: selectedWorkspace.color ? COLOR_MAP[selectedWorkspace.color] : 'var(--accent)' }}></div>
            <div>
              <div className="detail-title serif">{selectedWorkspace.name}</div>
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
              <div key={idx} className="tab-item">
                <div className="tab-icon">
                  {tab.favIconUrl ? <img src={tab.favIconUrl} style={{ width: '16px', height: '16px' }} /> : '🌐'}
                </div>
                <div className="tab-info">
                  <div className="tab-title">{tab.title}</div>
                </div>
                <div className="tab-domain">{domain}</div>
              </div>
            );
          })}
        </div>

        <div className="view-actions">
          <button className="btn-primary" onClick={() => openWorkspace(selectedWorkspace)}>
            Open all {selectedWorkspace.tabs.length} tabs
          </button>
          <button className="btn-secondary" style={{ flex: 0.5 }}>Rename</button>
          <div
            className="btn-secondary"
            style={{ flex: 0.5, color: '#e07070' }}
            onClick={() => deleteWorkspace(selectedWorkspace.id)}
          >
            Delete
          </div>
        </div>
      </div>
    );
  };

  const renderSaveView = () => (
    <div className="save-view-content">
      <div className="save-view-header">
        <div>
          <div className="save-view-title serif">Save {currentTabs.length} tabs</div>
          <div className="caption">Name this moment. Close without fear.</div>
        </div>
        <div className="btn-close" onClick={() => setView('list')}>×</div>
      </div>

      <div className="tab-selection-header" onClick={() => setShowTabList(!showTabList)}>
        <div className="tab-icons-group" style={{ margin: '0' }}>
          {currentTabs.slice(0, 6).map((tab, i) => (
            <div key={i} className="small-icon">
              {tab.favIconUrl ? <img src={tab.favIconUrl} style={{ width: '14px', height: '14px', borderRadius: '50%' }} /> : '🌐'}
            </div>
          ))}
          {currentTabs.length > 6 && (
            <div className="caption" style={{ marginLeft: '12px' }}>+{currentTabs.length - 6} more</div>
          )}
        </div>
        <div className="tab-list-toggle">
          {showTabList ? 'Hide List ▲' : 'View Full List ▼'}
        </div>
      </div>

      {showTabList && (
        <div className="tab-inclusion-list">
          {currentTabs.map((tab, i) => (
            <div key={i} className="tab-inclusion-item">
              <input
                type="checkbox"
                checked={includedIndices.has(i)}
                onChange={(e) => {
                  const next = new Set(includedIndices);
                  if (e.target.checked) next.add(i);
                  else next.delete(i);
                  setIncludedIndices(next);
                }}
              />
              <div className="tab-inclusion-icon">
                {tab.favIconUrl ? <img src={tab.favIconUrl} style={{ width: '14px', height: '14px' }} /> : '🌐'}
              </div>
              <div className="tab-inclusion-title">{tab.title}</div>
            </div>
          ))}
        </div>
      )}

      <div className="input-group">
        <div className="input-label">Workspace Name</div>
        <input
          className="styled-input"
          placeholder="Client X research"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="input-group">
        <div className="input-label">Why are you saving this?</div>
        <textarea
          className="styled-textarea"
          placeholder="Competitive analysis before Thursday call"
          value={saveNote}
          onChange={(e) => setSaveNote(e.target.value)}
        />
      </div>

      <div className="input-group">
        <div className="input-label">Color Tag</div>
        <div className="color-picker">
          {COLORS.map(c => (
            <div
              key={c}
              className={`color-swatch ${saveColor === c ? 'active' : ''}`}
              style={{ background: COLOR_MAP[c] }}
              onClick={() => setSaveColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="view-actions" style={{ position: 'relative', padding: '0', marginTop: '14px' }}>
        <button className="btn-primary" onClick={() => handleSave(true)}>
          Save & close all tabs
        </button>
        <button className="btn-secondary" onClick={() => handleSave(false)}>
          Save only
        </button>
      </div>
    </div>
  );

  return (
    <div className="popup-container">
      {view === 'list' && renderListView()}
      {view === 'detail' && renderDetailView()}
      {view === 'save' && renderSaveView()}

      <div className="statusbar">
        <div className="status-item">
          <div className="status-dot"></div>
          <span className="status-label">{view === 'list' ? 'System Active' : 'Vault Ready'}</span>
        </div>
        <span className="status-time">{currentTime}</span>
      </div>
    </div>
  );
};

export default Popup;
