import React, { useEffect, useState, useRef } from 'react';
import { TabInfo, Workspace, WorkspaceColor } from '../types';
import { COLORS } from './constants';
import ListView from './components/ListView';
import DetailView from './components/DetailView';
import SaveView from './components/SaveView';

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
  
  // List UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [currentTabUrls, setCurrentTabUrls] = useState<Set<string>>(new Set());

  // Inline editing state (List view)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  ////////////////////////////////////////// EFFECTS //////////////////////////////////////////
  useEffect(() => {
    loadWorkspaces();
    updateCurrentTabUrls();
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Ensure focus on search input whenever list view is shown
  useEffect(() => {
    if (view === 'list') {
      const timer = setTimeout(() => {
         listSearchRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [view]);

  ////////////////////////////////////////// FUNCTIONS //////////////////////////////////////////
  
  // -- Data Fetching & Sync --
  const loadWorkspaces = () => {
    chrome.storage.local.get(['workspaces'], (result) => {
      if (result.workspaces) {
        setWorkspaces(result.workspaces);
      }
    });
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
    </div>
  );
};

export default Popup;
