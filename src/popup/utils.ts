import { TabInfo } from '../types';

export const getTimeLabel = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;
  if (diff < 86400000 && now.getDate() === date.getDate()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.getDate() === date.getDate() && yesterday.getMonth() === date.getMonth()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const formatDateFull = (timestamp: number) => {
  const label = getTimeLabel(timestamp);
  if (label === 'Today' || label === 'Yesterday') return `Saved ${label.toLowerCase()}`;
  return `Saved on ${label}`;
};

export const getDomainCount = (tabs: TabInfo[]) => {
  const domains = new Set();
  tabs.forEach(t => {
    try {
      const url = new URL(t.url);
      domains.add(url.hostname);
    } catch (e) { }
  });
  return domains.size;
};
