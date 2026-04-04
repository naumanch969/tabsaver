import React from 'react';
import { TabInfo, WorkspaceColor } from '../../types';
import { COLORS, COLOR_MAP } from '../constants';

interface SaveViewProps {
  currentTabs: TabInfo[];
  saveName: string;
  saveNote: string;
  saveColor: WorkspaceColor;
  includedIndices: Set<number>;
  showTabList: boolean;
  onSetName: (name: string) => void;
  onSetNote: (note: string) => void;
  onSetColor: (color: WorkspaceColor) => void;
  onToggleTabList: () => void;
  onToggleTabInclusion: (idx: number) => void;
  onToggleAllInclusion: () => void;
  onCancel: () => void;
  onSave: (closeTabs: boolean) => void;
}

const SaveView: React.FC<SaveViewProps> = ({
  currentTabs,
  saveName,
  saveNote,
  saveColor,
  includedIndices,
  showTabList,
  onSetName,
  onSetNote,
  onSetColor,
  onToggleTabList,
  onToggleTabInclusion,
  onToggleAllInclusion,
  onCancel,
  onSave
}) => {
  return (
    <div className="save-view-content">
      <div className="save-view-header">
        <div>
          <div className="save-view-title serif">Save {currentTabs.length} tabs</div>
          <div className="caption">Name this moment. Close without fear.</div>
        </div>
        <div className="btn-close" onClick={onCancel}>×</div>
      </div>

      <div className="tab-selection-header" onClick={onToggleTabList}>
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
              onClick={onToggleAllInclusion}
            >
              <input
                type="checkbox"
                checked={includedIndices.size === currentTabs.length}
                onChange={() => {}}
              />
              <div className="tab-inclusion-title">All ({currentTabs.length})</div>
            </div>
          </div>
          {currentTabs.map((tab, i) => (
            <div
              key={i}
              className={`tab-inclusion-item ${includedIndices.has(i) ? 'active' : ''}`}
              onClick={() => onToggleTabInclusion(i)}
            >
              <input
                type="checkbox"
                checked={includedIndices.has(i)}
                onChange={() => {}}
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
          onChange={(e) => onSetName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="input-group">
        <div className="input-label">Why are you saving this?</div>
        <textarea
          className="styled-textarea"
          placeholder="Competitive analysis before Thursday call"
          value={saveNote}
          onChange={(e) => onSetNote(e.target.value)}
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
              onClick={() => onSetColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="view-actions" style={{ position: 'relative', padding: '0', marginTop: '14px' }}>
        <button className="btn-primary" onClick={() => onSave(true)}>
          Save & close all tabs
        </button>
        <button className="btn-secondary" onClick={() => onSave(false)}>
          Save only
        </button>
      </div>
    </div>
  );
};

export default SaveView;
