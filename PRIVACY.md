# Privacy Policy for Tab Saver

**Last Updated: March 27, 2026**

Tab Saver ("the Extension") is committed to protecting your privacy. This Privacy Policy explains how we handle your data.

## 1. Single Purpose
The Extension is a professional browser workspace manager designed to help users capture, organize, and restore browser sessions.

## 2. Data Collection and Usage
Tab Saver values your privacy above all else. **We do not collect, sell, or transmit your personal data to any external servers.**

*   **Web History (Tabs & URLs)**: To function, the Extension captures the URLs and titles of your currently open tabs. This data is used solely to create session snapshots ("Vaults") so you can restore them later.
*   **Local Storage**: All captured data is stored strictly on your local device using the `chrome.storage` API. We do not have access to your saved sessions.
*   **Offloading**: No data is ever shared with third parties, used for advertising, or tracked for analytics.

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
