import { storageService } from '../services/storage';
import { tabService } from '../services/tabs';
import { Workspace } from '../types';

const AUTO_SAVE_ALARM = 'auto-save-snapshot';
const AUTO_SAVE_INTERVAL = 5; // minutes

chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Saver installed. Setting up alarms...');
  setupAlarms();
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started. Resuming state...');
  updateBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_SAVE_ALARM) {
    performAutoSave();
  }
});

// Update badge when tabs are updated
chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);

async function setupAlarms() {
  await chrome.alarms.clearAll();
  chrome.alarms.create(AUTO_SAVE_ALARM, {
    periodInMinutes: AUTO_SAVE_INTERVAL,
  });
}

async function performAutoSave() {
  const tabs = await tabService.getCurrentTabs();
  if (tabs.length === 0) return;

  const autoWorkspace: Workspace = {
    id: 'auto-save-' + Date.now(),
    name: 'Auto-Save Snapshot',
    tabs,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isAutoSave: true,
  };

  await storageService.saveWorkspace(autoWorkspace);
  console.log('Auto-save snapshot created at', new Date().toLocaleTimeString());
}

async function updateBadge() {
  const count = await tabService.getTabCount();
  chrome.action.setBadgeText({ text: count.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#e8a84b' }); // Obsidian Gold
}
