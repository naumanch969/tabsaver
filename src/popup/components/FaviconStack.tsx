import React from 'react';
import { Workspace } from '../../types';

interface FaviconStackProps {
  workspace: Workspace;
}

const FaviconStack: React.FC<FaviconStackProps> = ({ workspace }) => {
  const icons = workspace.tabs
    .map(t => t.favIconUrl)
    .filter((url, i, self) => !!url && self.indexOf(url) === i)
    .slice(0, 5);

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

export default FaviconStack;
