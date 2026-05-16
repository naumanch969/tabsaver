import React, { useEffect, useState, useRef } from 'react';
import { TabInfo, Workspace, WorkspaceColor } from '../types';
import { COLORS } from './constants';
import ListView from './components/ListView';
import DetailView from './components/DetailView';
import SaveView from './components/SaveView';
import { syncService } from '../services/sync';
import { supabase } from '../services/supabase';

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
  const [session, setSession] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [currentTabUrls, setCurrentTabUrls] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inline editing state (List view)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  ////////////////////////////////////////// EFFECTS //////////////////////////////////////////
  useEffect(() => {
    const initialize = async () => {
      const localWorkspaces = await loadWorkspaces();
      updateCurrentTabUrls();
      
      // Initialize session from Supabase
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (currentSession) {
        chrome.storage.local.set({ session: currentSession });
        // Initial sync on mount if session exists
        handleSyncAll(localWorkspaces);
      }
    };

    initialize();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        chrome.storage.local.set({ session });
        // If we just signed in, trigger a sync
        if (event === 'SIGNED_IN') {
          handleSyncAll();
        }
      } else {
        chrome.storage.local.remove(['session']);
      }
    });

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);

    return () => {
      clearInterval(timer);
      subscription.unsubscribe();
    };
  }, []);

  // Ensure focus on search input whenever list view is shown
  useEffect(() => {
    if (view === 'list') {
      const focusSearch = () => {
        if (listSearchRef.current) {
          listSearchRef.current.focus();
          // Ensure cursor is at the end if there's text
          const len = listSearchRef.current.value.length;
          if (len > 0) {
            listSearchRef.current.setSelectionRange(len, len);
          }
        }
      };

      // Multi-stage focus attempts to catch the popup lifecycle
      const timers = [10, 50, 150, 300, 600].map(delay => setTimeout(focusSearch, delay));
      
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [view]);

  ////////////////////////////////////////// FUNCTIONS //////////////////////////////////////////
  
  // -- Data Fetching & Sync --
  const loadWorkspaces = (): Promise<Workspace[]> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['workspaces'], (result) => {
        let migrated: Workspace[] = [];
        if (result.workspaces && Array.isArray(result.workspaces)) {
          let needsUpdate = false;
          migrated = result.workspaces.map((ws: Workspace) => {
            // Migration: Ensure valid UUID for syncing with Supabase
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!ws.id || !uuidRegex.test(ws.id)) {
              needsUpdate = true;
              return { ...ws, id: crypto.randomUUID() };
            }
            return ws;
          });

          if (needsUpdate) {
            chrome.storage.local.set({ workspaces: migrated });
          }
        } else if (result.workspaces) {
          console.error('Workspaces in storage is not an array:', result.workspaces);
          chrome.storage.local.set({ workspaces: [] });
        }
        
        setWorkspaces(migrated);
        resolve(migrated);
      });
    });
  };


  const handleSyncAll = async (workspacesToSync?: Workspace[] | any) => {
    // Re-check session
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession || isSyncing) {
      return;
    }

    // Determine what to sync. If explicitly passed as array, use it as local source.
    // Otherwise use current workspaces state.
    const localData = Array.isArray(workspacesToSync) ? workspacesToSync : workspaces;
    
    setIsSyncing(true);
    try {
      const syncedWorkspaces = await syncService.fullSync(localData);
      
      // Update local storage and state with merged results
      chrome.storage.local.set({ workspaces: syncedWorkspaces }, () => {
        setWorkspaces(syncedWorkspaces);
        showToast('Cloud sync complete');
      });
    } catch (error: any) {
      console.error('Failed to sync workspaces:', error);
      showToast(`Sync failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectCloud = () => {
    chrome.tabs.create({ url: 'http://localhost:3000/sign-in?extension=true' });
  };

  const handleShare = async (ws: Workspace) => {
    if (!session) {
      handleConnectCloud();
      return;
    }

    try {
      const { shareId, url } = await syncService.generateShareLink(ws);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');

      // Update local state to reflect it's shared
      const updated = workspaces.map(w => 
        w.id === ws.id ? { ...w, shareId, isPublic: true } : w
      );
      setWorkspaces(updated);
      chrome.storage.local.set({ workspaces: updated });
      
      if (selectedWorkspace?.id === ws.id) {
        setSelectedWorkspace({ ...selectedWorkspace, shareId, isPublic: true });
      }
    } catch (err: any) {
      alert(`Scaling to cloud failed: ${err.message}`);
    }
  };

  const updateCurrentTabUrls = () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const urls = new Set(tabs.map(t => t.url).filter((url): url is string => !!url));
      setCurrentTabUrls(urls);
    });
  };

  // -- Session Management --
  const startSaving = () => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const tabsInfo = tabs.map(tab => ({
        id: tab.id,
        title: tab.title || 'Untitled',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl
      }));
      setCurrentTabs(tabsInfo);
      setIncludedIndices(new Set(tabs.map((_, i) => i)));
      setShowTabList(false);
      setSaveName('');
      setSaveNote('');
      setSaveColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
      setView('save');
    });
  };

  const saveCurrentActiveTab = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.url) return;

      const newWs: Workspace = {
        id: crypto.randomUUID(),
        name: activeTab.title || 'Saved Tab',
        note: `Quick saved: ${new URL(activeTab.url).hostname || 'unknown'}`,
        tabs: [{
          title: activeTab.title || 'Untitled',
          url: activeTab.url || '',
          favIconUrl: activeTab.favIconUrl
        }],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      chrome.storage.local.get(['workspaces'], (result) => {
        const current = result.workspaces || [];
        const updated = [newWs, ...current];
        chrome.storage.local.set({ workspaces: updated }, () => {
          setWorkspaces(updated);
          if (session) handleSyncAll(updated);
        });
      });
    });
  };

  const handleSave = (closeTabs: boolean = false) => {
    if (!saveName.trim()) return;

    const filteredTabs = currentTabs.filter((_, i) => includedIndices.has(i));
    if (filteredTabs.length === 0) return;

    const newWs: Workspace = {
      id: crypto.randomUUID(),
      name: saveName.trim(),
      note: saveNote.trim(),
      tabs: filteredTabs.map(({ id, ...rest }) => rest),
      color: saveColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newWs, ...workspaces];
    chrome.storage.local.set({ workspaces: updated }, () => {
      setWorkspaces(updated);
      setView('list');

      if (session) handleSyncAll(updated);

      if (closeTabs) {
        const tabIdsToClose = filteredTabs.map(t => t.id).filter((id): id is number => id !== undefined);
        if (tabIdsToClose.length > 0) {
          chrome.tabs.remove(tabIdsToClose, () => {
            chrome.tabs.query({ currentWindow: true }, (remainingTabs) => {
              if (remainingTabs.length === 0) chrome.tabs.create({});
            });
          });
        }
      }
    });
  };

  // -- Interaction Handlers --
  const openWorkspace = (ws: Workspace) => {
    ws.tabs.forEach(tab => {
      chrome.tabs.create({ url: tab.url });
    });
    setTimeout(updateCurrentTabUrls, 1000);
  };

  const handleRenameInline = (id: string, newName?: string) => {
    const nameToUse = newName || editingName;
    if (!nameToUse.trim()) {
      setEditingId(null);
      return;
    }

    const updated = workspaces.map(ws => 
      ws.id === id ? { ...ws, name: nameToUse.trim(), updatedAt: Date.now() } : ws
    );

    chrome.storage.local.set({ workspaces: updated }, () => {
      setWorkspaces(updated);
      setEditingId(null);
      // Synchronize detail view if open
      if (selectedWorkspace?.id === id) {
        setSelectedWorkspace({ ...selectedWorkspace, name: nameToUse.trim() });
      }
      if (session) handleSyncAll(updated);
    });
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const deleteWorkspace = async (id: string) => {
    if (confirm('Delete this session? This action cannot be undone.')) {
      const updated = workspaces.filter(ws => ws.id !== id);
      chrome.storage.local.set({ workspaces: updated }, async () => {
        setWorkspaces(updated);
        setSelectedWorkspace(null);
        setView('list');
        showToast('Session deleted safely');
        
        if (session) {
          try {
            await syncService.deleteWorkspaceCloud(id);
          } catch (err) {
            console.error('Cloud deletion failed:', err);
          }
        }
      });
    }
  };

  const deleteTab = (workspaceId: string, tabIndex: number) => {
    const updated = workspaces.map(ws => {
      if (ws.id === workspaceId) {
        if (ws.tabs.length <= 1) return ws;
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
      if (session) handleSyncAll(updated);
    });
  };

  ////////////////////////////////////////// RENDER //////////////////////////////////////////
  return (
    <div className="popup-container">
      {view === 'list' && (
        <ListView 
          workspaces={workspaces}
          currentTabUrls={currentTabUrls}
          editingId={editingId}
          editingName={editingName}
          searchQuery={searchQuery}
          currentTime={currentTime}
          searchRef={listSearchRef}
          onSearchChange={setSearchQuery}
          onSearchClear={() => setSearchQuery('')}
          onStartSaving={startSaving}
          onSaveCurrentTab={saveCurrentActiveTab}
          onDirectRestore={openWorkspace}
          onSelectWorkspace={(ws) => { setSelectedWorkspace(ws); setView('detail'); }}
          onRestoreWorkspace={openWorkspace}
          onRenameStart={(ws) => { setEditingId(ws.id); setEditingName(ws.name); }}
          onRenameChange={setEditingName}
          onRenameSave={(id) => handleRenameInline(id)}
          onRenameCancel={() => setEditingId(null)}
          onConnectCloud={handleConnectCloud}
          onDeleteWorkspace={deleteWorkspace}
          onSyncAll={handleSyncAll}
          isSyncing={isSyncing}
          session={session}
        />
      )}

      {view === 'detail' && selectedWorkspace && (
        <DetailView 
          selectedWorkspace={selectedWorkspace}
          onBack={() => setView('list')}
          onDeleteWorkspace={deleteWorkspace}
          onDeleteTab={deleteTab}
          onRenameSave={(id, name) => handleRenameInline(id, name)}
          onOpenTab={(url) => chrome.tabs.create({ url })}
          onShare={handleShare}
        />
      )}

      {view === 'save' && (
        <SaveView 
          currentTabs={currentTabs}
          saveName={saveName}
          saveNote={saveNote}
          saveColor={saveColor}
          includedIndices={includedIndices}
          showTabList={showTabList}
          onSetName={setSaveName}
          onSetNote={setSaveNote}
          onSetColor={setSaveColor}
          onToggleTabList={() => setShowTabList(!showTabList)}
          onToggleTabInclusion={(idx) => {
            const next = new Set(includedIndices);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            setIncludedIndices(next);
          }}
          onToggleAllInclusion={() => {
            if (includedIndices.size === currentTabs.length) setIncludedIndices(new Set());
            else setIncludedIndices(new Set(currentTabs.map((_, i) => i)));
          }}
          onCancel={() => setView('list')}
          onSave={handleSave}
        />
      )}

      <div className="statusbar">
        <div className="status-item">
          <div className="status-dot"></div>
          <span className="status-label">{view === 'list' ? 'System Active' : 'Vault Ready'}</span>
        </div>
        <span className="status-time">{currentTime}</span>
      </div>

      <div className={`toast-notification ${toastMessage ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </div>
  );
};

export default Popup;
