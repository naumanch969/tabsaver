import React from 'react';
import { Workspace } from '../../types';
import FaviconStack from './FaviconStack';
import { getTimeLabel } from '../utils';
import { COLOR_MAP } from '../constants';

interface WorkspaceCardProps {
  ws: Workspace;
  currentTabUrls: Set<string>;
  editingId: string | null;
  editingName: string;
  onSelect: () => void;
  onRestore: (e: React.MouseEvent) => void;
  onRenameStart: (e: React.MouseEvent) => void;
  onRenameChange: (val: string) => void;
  onRenameSave: () => void;
  onRenameCancel: () => void;
}

const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  ws,
  currentTabUrls,
  editingId,
  editingName,
  onSelect,
  onRestore,
  onRenameStart,
  onRenameChange,
  onRenameSave,
  onRenameCancel
}) => {
  const openCount = ws.tabs.filter(t => currentTabUrls.has(t.url)).length;
  const isFull = openCount === ws.tabs.length;
  const isSome = openCount > 0 && !isFull;

  return (
    <div 
      className="ws-card"
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
    >
      <div className="ws-stripe" style={{ background: ws.color ? COLOR_MAP[ws.color] : 'var(--accent)' }}></div>
      <div className="ws-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <FaviconStack workspace={ws} />
          {isFull && <span className="caption" style={{ color: COLOR_MAP.green, fontSize: '9px', textTransform: 'uppercase' }}>● Already open</span>}
          {isSome && <span className="caption" style={{ color: COLOR_MAP.blue, fontSize: '9px', textTransform: 'uppercase' }}>● {openCount}/{ws.tabs.length} open</span>}
        </div>
        <div className="ws-name">
          {editingId === ws.id ? (
            <input
              type="text"
              className="ws-name-edit"
              value={editingName}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameSave();
                if (e.key === 'Escape') onRenameCancel();
              }}
              onBlur={onRenameSave}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div 
              className="ws-name-text" 
              onClick={onRenameStart}
              title="Click to rename"
            >
              {ws.name}
            </div>
          )}
        </div>
        <div className="ws-meta">
          <span className="ws-tab-count serif" style={{ fontSize: '10px' }}>{ws.tabs.length} tabs</span>
          <div className="ws-dot-sep"></div>
          <span className="ws-time">{getTimeLabel(ws.createdAt)}</span>
        </div>
      </div>
      <div className="ws-actions" onClick={(e) => e.stopPropagation()}>
        <button className="ws-open-btn" onClick={onRestore}>RESTORE</button>
      </div>
    </div>
  );
};

export default WorkspaceCard;
