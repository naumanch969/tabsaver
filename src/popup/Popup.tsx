import React, { useEffect, useState, useRef } from 'react';
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
  ////////////////////////////////////////// REFS ////////////////////////////////////////// 
  const listSearchRef = useRef<HTMLInputElement>(null);

  ////////////////////////////////////////// STATES ////////////////////////////////////////// 
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
  const [searchQuery, setSearchQuery] = useState('');

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [currentTabUrls, setCurrentTabUrls] = useState<Set<string>>(new Set());

  ////////////////////////////////////////// EFFECTS ////////////////////////////////////////// 
  useEffect(() => {
    loadWorkspaces();
    updateCurrentTabUrls();
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);

    // Focus the main list search on mount for instant typing when opened via shortcut or click
    const focusTimer = setTimeout(() => {
      if (view === 'list') listSearchRef.current?.focus();
    }, 150); 

    return () => {
      clearInterval(timer);
      clearTimeout(focusTimer);
    };
  }, []);



  ////////////////////////////////////////// FUNCTIONS ////////////////////////////////////////// 
  const updateCurrentTabUrls = () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const urls = new Set(tabs.map(t => t.url).filter((url): url is string => !!url));
      setCurrentTabUrls(urls);
    });
  };

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
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      setSaveColor(randomColor);
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
    ws.tabs.forEach(tab => {
      chrome.tabs.create({ url: tab.url });
    });
    setTimeout(() => {
      updateCurrentTabUrls();
    }, 1000);
  };

  const deleteWorkspace = (id: string) => {
    const updated = workspaces.filter(ws => ws.id !== id);
    chrome.storage.local.set({ workspaces: updated }, () => {
      setWorkspaces(updated);
      setSelectedWorkspace(null);
      setView('list');
    });
  };

  const deleteTab = (workspaceId: string, tabIndex: number) => {
    const updated = workspaces.map(ws => {
      if (ws.id === workspaceId) {
        const updatedTabs = [...ws.tabs];
        updatedTabs.splice(tabIndex, 1);
        return { ...ws, tabs: updatedTabs, updatedAt: Date.now() };
      }
      return ws;
    });

    chrome.storage.local.set({ workspaces: updated }, () => {
      setWorkspaces(updated);
      if (selectedWorkspace?.id === workspaceId) {
        const ws = updated.find(w => w.id === workspaceId);
        if (ws) setSelectedWorkspace(ws);
      }
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

  const renderFaviconStack = (workspace: Workspace) => {
    // Get unique favicons, filter out empty ones
    const icons = workspace.tabs
      .map(t => t.favIconUrl)
      .filter((url, i, self) => !!url && self.indexOf(url) === i)
      .slice(0, 5);

    ////////////////////////////////////////// RENDER ////////////////////////////////////////// 
    if (icons.length === 0) return null;

    return (
      <div className="tab-icons-group">
        {icons.map((url, i) => (
          <img
            key={i}
            src={url}
            className="small-icon"
            alt="tab"
            style={{
              width: '18px',
              height: '18px',
              border: '2px solid var(--bg2)',
              backgroundColor: 'var(--bg3)',
              marginLeft: i === 0 ? 0 : '-8px'
            }}
          />
        ))}
        {workspace.tabs.length > icons.length && (
          <div className="small-icon" style={{
            width: '18px',
            height: '18px',
            fontSize: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg3)',
            color: 'var(--t3)',
            border: '2px solid var(--bg2)',
            marginLeft: '-8px'
          }}>
            +{workspace.tabs.length - icons.length}
          </div>
        )}
      </div>
    );
  };

  const renderWorkspaceCard = (ws: Workspace) => {
    const openCount = ws.tabs.filter(t => currentTabUrls.has(t.url)).length;
    const isFull = openCount === ws.tabs.length;
    const isSome = openCount > 0 && !isFull;

    return (
      <div key={ws.id} className="ws-card" onClick={() => { setSelectedWorkspace(ws); setView('detail'); }}>
        <div className="ws-stripe" style={{ background: ws.color ? COLOR_MAP[ws.color] : 'var(--accent)' }}></div>
        <div className="ws-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {renderFaviconStack(ws)}
            {isFull && <span className="caption" style={{ color: COLOR_MAP.green, fontSize: '9px', textTransform: 'uppercase' }}>● Already open</span>}
            {isSome && <span className="caption" style={{ color: COLOR_MAP.blue, fontSize: '9px', textTransform: 'uppercase' }}>● {openCount}/{ws.tabs.length} open</span>}
          </div>
          <div className="ws-name">
            {ws.name}
          </div>
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
    );
  };

  const renderListView = () => (
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
            onClick={() => openWorkspace(workspaces[0])}
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
            ref={listSearchRef}
            type="text"
            className="search-input"
            placeholder="Search vaults or tabs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>
      </div>

      <div className="save-cta" style={{ margin: '14px 14px 0' }}>
        <button
          className="ws-card"
          style={{ width: '100%', borderStyle: 'dashed', background: 'var(--bg3)', justifyContent: 'flex-start' }}
          onClick={startSaving}
        >
          <div className="action-icon" style={{ flexShrink: 0 }}>＋</div>
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
          !searchQuery ? (
            workspaces
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
              .map(renderWorkspaceCard)
          ) : (
            workspaces.filter(ws => {
              const query = searchQuery.toLowerCase();
              return ws.name.toLowerCase().includes(query) ||
                ws.tabs.some(t => t.title.toLowerCase().includes(query) || (t.url && t.url.toLowerCase().includes(query)));
            }).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--t3)' }}>
                <p className="caption">No results matching "{searchQuery}"</p>
              </div>
            ) : (
              workspaces
                .filter(ws => {
                  const query = searchQuery.toLowerCase();
                  return ws.name.toLowerCase().includes(query) ||
                    ws.tabs.some(t => t.title.toLowerCase().includes(query) || (t.url && t.url.toLowerCase().includes(query)));
                })
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .map(renderWorkspaceCard)
            )
          )
        )}
      </div>
    </>
  );

  const [isRenaming, setIsRenaming] = useState(false);
  const [renamedName, setRenamedName] = useState('');

  const handleRenameSave = () => {
    if (!selectedWorkspace || !renamedName.trim()) {
      setIsRenaming(false);
      return;
    }

    const updated = workspaces.map(ws =>
      ws.id === selectedWorkspace.id ? { ...ws, name: renamedName, updatedAt: Date.now() } : ws
    );

    chrome.storage.local.set({ workspaces: updated }, () => {
      setWorkspaces(updated);
      setSelectedWorkspace({ ...selectedWorkspace, name: renamedName });
      setIsRenaming(false);
    });
  };

  const renderDetailView = () => {
    if (!selectedWorkspace) return null;
    const domains = getDomainCount(selectedWorkspace.tabs);

    return (
      <div className="detail-view">
        <div className="view-header">
          <div className="back-btn" onClick={() => { setView('list'); setIsRenaming(false); }}>
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
                />
              ) : (
                <div className="detail-title serif">{selectedWorkspace.name}</div>
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
              <div key={idx} className="tab-item" style={{ cursor: 'pointer' }} onClick={() => chrome.tabs.create({ url: tab.url })}>
                <div className="tab-icon">
                  {tab.favIconUrl ? <img src={tab.favIconUrl} style={{ width: '16px', height: '16px' }} /> : '🌐'}
                </div>
                <div className="tab-info">
                  <div className="tab-title">{tab.title}</div>
                </div>
                <div className="tab-domain">{domain}</div>
                <div
                  className="tab-delete-btn"
                  title="Remove from vault"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTab(selectedWorkspace.id, idx);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        <div className="view-actions">
          <button className="btn-primary" onClick={() => openWorkspace(selectedWorkspace)}>
            Open all {selectedWorkspace.tabs.length} tabs
          </button>
          {isRenaming ? (
            <button className="btn-secondary" style={{ flex: 0.5, border: '1px solid var(--accent)' }} onClick={handleRenameSave}>Save</button>
          ) : (
            <button
              className="btn-secondary"
              style={{ flex: 0.5 }}
              onClick={() => {
                setRenamedName(selectedWorkspace.name);
                setIsRenaming(true);
              }}
            >
              Rename
            </button>
          )}
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
          <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
            <div
              className="tab-inclusion-item select-all-btn"
              style={{ borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg2)', flex: 1 }}
              onClick={() => {
                if (includedIndices.size === currentTabs.length) {
                  setIncludedIndices(new Set());
                } else {
                  setIncludedIndices(new Set(currentTabs.map((_, i) => i)));
                }
              }}
            >
              <input
                type="checkbox"
                checked={includedIndices.size === currentTabs.length}
                onChange={(e) => { e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); }}
              />
              <div className="tab-inclusion-title">All ({currentTabs.length})</div>
            </div>
            <div
              className="tab-inclusion-item select-all-btn"
              style={{ borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg2)', flex: 1 }}
              onClick={() => {
                setIncludedIndices(new Set([0]));
              }}
            >
              <input
                type="checkbox"
                checked={includedIndices.size === 1 && includedIndices.has(0)}
                onChange={(e) => { e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); }}
              />
              <div className="tab-inclusion-title">Current</div>
            </div>
          </div>
          {currentTabs.map((tab, i) => (
            <div
              key={i}
              className="tab-inclusion-item"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                const next = new Set(includedIndices);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                setIncludedIndices(next);
              }}
            >
              <input
                type="checkbox"
                checked={includedIndices.has(i)}
                onChange={(e) => { e.stopPropagation(); }} // Managed by parent onClick
                onClick={(e) => { e.stopPropagation(); }} // Prevent double trigger
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
