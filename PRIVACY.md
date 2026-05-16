# Privacy Policy for TabStack

**Last Updated: April 26, 2026**

TabStack ("the Extension") is committed to protecting your privacy. This Privacy Policy explains how we handle your data.

## 1. Single Purpose
The Extension is a professional browser workspace manager designed to help users capture, organize, and restore browser sessions.

## 2. Data Collection and Usage
TabStack values your privacy. **By default, all your data remains local on your device.**

*   **Web History (Tabs & URLs)**: To function, the Extension captures the URLs and titles of your currently open tabs. This data is used solely to create session snapshots ("Vaults") so you can restore them later.
*   **Local Storage**: Captured data is stored on your local device using the `chrome.storage` API. 
*   **Optional Cloud Sync**: If you choose to "Connect Cloud", your saved sessions will be synced to our secure database (Supabase) to enable cross-device access. This is entirely optional and requires explicit authentication.
*   **Offloading**: No data is ever sold to third parties or used for advertising.

## 3. Permissions Justifications
*   **tabs**: Used to read URLs and titles of open tabs for session saving and to restore them upon request.
*   **storage**: Used to persist your saved vaults on your local machine.
*   **windows**: Used to create new browser windows when restoring a saved session.
*   **alarms**: Used to trigger periodic automatic snapshots to prevent data loss.

## 4. No Remote Code
The Extension does not use any remote code, tracking pixels, or external scripts. All logic is contained within the local extension package.

## 5. Third-Party Access
Your data is never sold or transferred to third parties. It is used exclusively to fulfill the Extension's primary purpose.

## 6. Contact
For any questions regarding this privacy policy, please open an issue on the official GitHub repository.
