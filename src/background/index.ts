import { storageService } from '../services/storage';
import { tabService } from '../services/tabs';
import { Workspace } from '../types';

const AUTO_SAVE_ALARM = 'auto-save-snapshot';
const AUTO_SAVE_INTERVAL = 5; // minutes

chrome.runtime.onInstalled.addListener(() => {
  setupAlarms();
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  updateBadge();
});

// Handle messages from the website
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('Received message from external source:', sender.url, message);
  
  if (message.type === 'PING') {
    sendResponse({ success: true, version: chrome.runtime.getManifest().version });
    return true;
  }
  
  if (message.type === 'SET_AUTH') {
    chrome.storage.local.set({ session: message.session }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'CLEAR_AUTH') {
    chrome.storage.local.remove(['session'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
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
  // Disabled auto-save alarm as requested
  // chrome.alarms.create(AUTO_SAVE_ALARM, {
  //   periodInMinutes: AUTO_SAVE_INTERVAL,
  // });
}

async function performAutoSave() {
  // Disabled auto-save feature
  return;
}

async function updateBadge() {
  const count = await tabService.getTabCount();
  chrome.action.setBadgeText({ text: count.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#e8a84b' }); // Obsidian Gold
}
