# Google Play Data Safety Form — Shield Messenger

This document provides the answers for the Google Play Console Data Safety section. Use this as a reference when filling out the form.

---

## Overview

Shield Messenger is a peer-to-peer encrypted messenger that does not collect, transmit, or store any user data on external servers. All data remains on the user's device, encrypted at rest.

---

## Data Collection & Sharing

### Does your app collect or share any of the required user data types?

**No.** Shield Messenger does not collect or share any user data with third parties.

---

## Detailed Responses

### 1. Location

| Question | Answer |
|----------|--------|
| Approximate location | Not collected |
| Precise location | Not collected |

### 2. Personal Info

| Question | Answer |
|----------|--------|
| Name | Not collected |
| Email address | Not collected |
| User IDs | Not collected (pseudonymous handles only, generated locally) |
| Address | Not collected |
| Phone number | Not collected |

### 3. Financial Info

| Question | Answer |
|----------|--------|
| User payment info | Not collected (wallet keys stored locally only) |
| Purchase history | Not collected |

### 4. Health and Fitness

| Question | Answer |
|----------|--------|
| Health info | Not collected |
| Fitness info | Not collected |

### 5. Messages

| Question | Answer |
|----------|--------|
| Emails | Not collected |
| SMS or MMS | Not collected |
| Other in-app messages | Not collected — messages are end-to-end encrypted and stored only on user devices. The app developer cannot read or access message content. |

### 6. Photos and Videos

| Question | Answer |
|----------|--------|
| Photos | Not collected — photos shared in chat are encrypted and sent directly between devices |
| Videos | Not collected — same as photos |

### 7. Audio Files

| Question | Answer |
|----------|--------|
| Voice or sound recordings | Not collected — voice messages and calls are encrypted end-to-end |
| Music files | Not applicable |
| Other audio files | Not collected |

### 8. Files and Docs

| Question | Answer |
|----------|--------|
| Files and docs | Not collected — files shared in chat are encrypted and sent P2P |

### 9. Calendar

| Question | Answer |
|----------|--------|
| Calendar events | Not collected |

### 10. Contacts

| Question | Answer |
|----------|--------|
| Contacts | Not collected — the app does not access the device contact list |

### 11. App Activity

| Question | Answer |
|----------|--------|
| App interactions | Not collected |
| In-app search history | Not collected |
| Installed apps | Not collected |
| Other user-generated content | Not collected |
| Other actions | Not collected |

### 12. Web Browsing

| Question | Answer |
|----------|--------|
| Web browsing history | Not collected |

### 13. App Info and Performance

| Question | Answer |
|----------|--------|
| Crash logs | Collected — stored locally on device only, never transmitted. User can optionally share via support. |
| Diagnostics | Not collected |
| Other app performance data | Not collected |

### 14. Device or Other IDs

| Question | Answer |
|----------|--------|
| Device or other IDs | Not collected |

---

## Security Practices

### Is all of the user data collected by your app encrypted in transit?

**Yes.** All data is encrypted using end-to-end encryption (X25519 + ML-KEM-1024) and transmitted over the Tor network.

### Do you provide a way for users to request that their data be deleted?

**Yes.** Users can delete their account and all associated data directly from the app settings. Since all data is stored locally, deleting the app also removes all data.

### Does your app comply with the Families Policy?

**Not applicable.** Shield Messenger is not targeted at children.

---

## Permissions Justification

| Permission | Justification |
|------------|---------------|
| INTERNET | Required for Tor network connectivity (peer-to-peer messaging) |
| ACCESS_NETWORK_STATE | Check network availability before attempting Tor connection |
| RECORD_AUDIO | Voice calls and voice messages (user-initiated only) |
| CAMERA | QR code scanning for contact verification |
| FOREGROUND_SERVICE | Keep Tor connection alive for message delivery |
| POST_NOTIFICATIONS | Notify user of incoming messages and calls |
| USE_BIOMETRIC | Biometric authentication for app lock |
| VIBRATE | Notification vibration for incoming messages |
| RECEIVE_BOOT_COMPLETED | Restart Tor service after device reboot |
| READ_MEDIA_IMAGES / READ_MEDIA_VIDEO | Attach media to encrypted messages |
| WRITE_EXTERNAL_STORAGE | Save received media (Android 9 and below only) |
