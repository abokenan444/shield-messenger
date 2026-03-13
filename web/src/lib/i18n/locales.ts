/* --- Translation keys & 16 locale dictionaries ----------------- */

export interface Translations {
  // meta
  langName: string;
  langDir: 'rtl' | 'ltr';
  langCode: string;

  // Sidebar
  sidebar_chats: string;
  sidebar_calls: string;
  sidebar_contacts: string;
  sidebar_settings: string;

  // ChatList
  chatList_title: string;
  chatList_newChat: string;
  chatList_search: string;
  chatList_noChats: string;
  chatList_noMessages: string;

  // ChatView
  chat_user: string;
  chat_me: string;
  chat_members: string;
  chat_typing: string;
  chat_voiceCall: string;
  chat_more: string;
  chat_e2eNotice: string;
  chat_reply: string;
  chat_copy: string;
  chat_voiceMessage: string;
  chat_recording: string;
  chat_cancel: string;
  chat_send: string;
  chat_attachFile: string;
  chat_emoji: string;
  chat_messagePlaceholder: string;
  chat_encryptedE2E: string;

  // EmptyState
  empty_selectChat: string;
  empty_e2e: string;
  empty_protocol: string;
  empty_encryptedCalls: string;
  empty_noDataCollection: string;
  empty_multiPlatform: string;
  empty_openSource: string;

  // CallOverlay
  call_encryptedE2E: string;
  call_mute: string;
  call_unmute: string;
  call_stopCamera: string;
  call_startCamera: string;
  call_speaker: string;
  call_earpiece: string;
  call_endCall: string;
  call_incomingVoice: string;
  call_encrypted: string;
  call_reject: string;
  call_accept: string;
  call_ringing: string;
  call_connecting: string;
  call_connected: string;
  call_reconnecting: string;
  call_ended: string;
  call_failed: string;
  call_mutedMic: string;

  // Login
  login_subtitle: string;
  login_username: string;
  login_password: string;
  login_failed: string;
  login_loggingIn: string;
  login_login: string;
  login_noAccount: string;
  login_e2eNotice: string;

  // Register
  register_title: string;
  register_subtitle: string;
  register_username: string;
  register_usernamePlaceholder: string;
  register_password: string;
  register_passwordPlaceholder: string;
  register_confirmPassword: string;
  register_confirmPlaceholder: string;
  register_passwordMismatch: string;
  register_passwordMinLength: string;
  register_failed: string;
  register_creating: string;
  register_create: string;
  register_hasAccount: string;
  register_noDataCollection: string;
  register_openSource: string;

  // Settings
  settings_back: string;
  settings_title: string;
  settings_profile: string;
  settings_identity: string;
  settings_publicKey: string;
  settings_notAvailable: string;
  settings_protocol: string;
  settings_privacySecurity: string;
  settings_e2e: string;
  settings_enabled: string;
  settings_disabled: string;
  settings_notEnabled: string;
  settings_incognito: string;
  settings_disappearing: string;
  settings_twoFactor: string;
  settings_torRouting: string;
  settings_appearance: string;
  settings_theme: string;
  settings_dark: string;
  settings_language: string;
  settings_fontSize: string;
  settings_medium: string;
  settings_logout: string;

  // Calls page
  calls_title: string;
  calls_all: string;
  calls_missed: string;
  calls_voice: string;
  calls_noCalls: string;
  calls_missedLabel: string;
  calls_callback: string;
  calls_e2eNotice: string;

  // Contacts page
  contacts_title: string;
  contacts_search: string;
  contacts_addFriend: string;
  contacts_scanQR: string;
  contacts_myQR: string;
  contacts_onionAddress: string;
  contacts_copyAddress: string;
  contacts_copied: string;
  contacts_noContacts: string;
  contacts_addDesc: string;
  contacts_online: string;
  contacts_offline: string;
  contacts_pending: string;
  contacts_blocked: string;
  contacts_remove: string;
  contacts_block: string;

  // Verification
  verify_title: string;
  verify_safetyNumber: string;
  verify_showQR: string;
  verify_scanQR: string;
  verify_success: string;
  verify_mismatch: string;
  verify_mismatchDesc: string;
  verify_invalidQR: string;
  verify_contactVerified: string;
  verify_notVerified: string;
  verify_compareNumbers: string;
  verify_desc: string;

  // Trust Levels & Restriction
  trust_untrusted: string;
  trust_encrypted: string;
  trust_verified: string;
  trust_level: string;
  trust_fileWarningTitle: string;
  trust_fileWarningDesc: string;
  trust_sendAnyway: string;

  // Friend Requests
  friends_incoming: string;
  friends_outgoing: string;
  friends_accept: string;
  friends_reject: string;
  friends_cancel: string;
  friends_sendRequest: string;
  friends_enterAddress: string;
  friends_requestSent: string;
  friends_noRequests: string;

  // Groups
  group_create: string;
  group_name: string;
  group_members: string;
  group_selectMembers: string;
  group_noGroups: string;
  group_admin: string;
  group_leave: string;
  group_addMember: string;
  group_info: string;
  group_e2ee: string;

  // Wallet
  wallet_title: string;
  wallet_totalBalance: string;
  wallet_send: string;
  wallet_receive: string;
  wallet_swap: string;
  wallet_transactions: string;
  wallet_noTransactions: string;
  wallet_amount: string;
  wallet_address: string;
  wallet_sendConfirm: string;
  wallet_receiveDesc: string;
  wallet_solana: string;
  wallet_zcash: string;
  wallet_createWallet: string;
  wallet_importWallet: string;
  wallet_seedPhrase: string;
  wallet_backupSeed: string;
  wallet_noWallet: string;

  // Security
  security_lock: string;
  security_appLock: string;
  security_autoLock: string;
  security_duressPin: string;
  security_duressDesc: string;
  security_wipeAccount: string;
  security_wipeConfirm: string;
  security_biometric: string;
  security_securityMode: string;
  security_standard: string;
  security_paranoid: string;
  security_title: string;
  security_lockDesc: string;
  security_lockTimeout: string;
  security_setupDuress: string;
  security_disable: string;
  security_wipeDesc: string;
  wallet_sendTo: string;
  wallet_tokens: string;
  wallet_shielded: string;
  wallet_balance: string;

  // Tor
  tor_status: string;
  tor_connected: string;
  tor_connecting: string;
  tor_disconnected: string;
  tor_bridges: string;
  tor_health: string;
  tor_circuits: string;
  tor_vpnMode: string;

  // PWA
  pwa_installTitle: string;
  pwa_installDesc: string;
  pwa_install: string;
  pwa_later: string;
  pwa_updateAvailable: string;
  pwa_updateDesc: string;
  pwa_refresh: string;

  // Identity Key Change
  identity_keyChanged: string;
  identity_keyChangedDesc: string;
  identity_detectedAt: string;
  identity_showDetails: string;
  identity_hideDetails: string;
  identity_explanation1: string;
  identity_explanation2: string;
  identity_explanation3: string;
  identity_verifyNow: string;
  identity_dismiss: string;
}

type PartialLocale = Partial<Translations> & Pick<Translations, 'langName' | 'langDir' | 'langCode'>;

function withFallback(base: Translations, partial: PartialLocale): Translations {
  return { ...base, ...partial };
}

/* ----- English (base locale ? all keys required here) ----- */
export const en: Translations = {
  langName: 'English',
  langDir: 'ltr',
  langCode: 'en',

  sidebar_chats: 'Chats',
  sidebar_calls: 'Calls',
  sidebar_contacts: 'Contacts',
  sidebar_settings: 'Settings',

  chatList_title: 'Chats',
  chatList_newChat: 'New chat',
  chatList_search: '\uD83D\uDD0D Search...',
  chatList_noChats: 'No chats',
  chatList_noMessages: 'No messages',

  chat_user: 'User',
  chat_me: 'Me',
  chat_members: 'members',
  chat_typing: 'typing...',
  chat_voiceCall: 'Voice call',
  chat_more: 'More',
  chat_e2eNotice: 'Messages are end-to-end encrypted',
  chat_reply: 'Reply',
  chat_copy: 'Copy',
  chat_voiceMessage: 'Voice message',
  chat_recording: 'Recording...',
  chat_cancel: 'Cancel',
  chat_send: 'Send',
  chat_attachFile: 'Attach file',
  chat_emoji: 'Emoji',
  chat_messagePlaceholder: 'Type a message...',
  chat_encryptedE2E: 'End-to-end encrypted',

  empty_selectChat: 'Select a chat to start messaging',
  empty_e2e: 'End-to-end encrypted',
  empty_protocol: 'Shield Protocol',
  empty_encryptedCalls: 'Encrypted voice calls',
  empty_noDataCollection: 'No data collection',
  empty_multiPlatform: 'Multi-platform',
  empty_openSource: 'Open source',

  call_encryptedE2E: 'End-to-end encrypted call',
  call_mute: 'Mute',
  call_unmute: 'Unmute',
  call_stopCamera: 'Stop camera',
  call_startCamera: 'Start camera',
  call_speaker: 'Speaker',
  call_earpiece: 'Earpiece',
  call_endCall: 'End call',
  call_incomingVoice: 'Incoming voice call',
  call_encrypted: 'Encrypted',
  call_reject: 'Reject',
  call_accept: 'Accept',
  call_ringing: 'Ringing',
  call_connecting: 'Connecting',
  call_connected: 'Connected',
  call_reconnecting: 'Reconnecting',
  call_ended: 'Call ended',
  call_failed: 'Call failed',
  call_mutedMic: 'muted their mic',

  login_subtitle: 'Sign in to your account',
  login_username: 'Username',
  login_password: 'Password',
  login_failed: 'Login failed',
  login_loggingIn: 'Logging in...',
  login_login: 'Log in',
  login_noAccount: "Don't have an account?",
  login_e2eNotice: 'Your messages are end-to-end encrypted',

  register_title: 'Create Account',
  register_subtitle: 'Join Shield Messenger',
  register_username: 'Username',
  register_usernamePlaceholder: 'Choose a username',
  register_password: 'Password',
  register_passwordPlaceholder: 'Create a password',
  register_confirmPassword: 'Confirm Password',
  register_confirmPlaceholder: 'Confirm your password',
  register_passwordMismatch: 'Passwords do not match',
  register_passwordMinLength: 'Password must be at least 8 characters',
  register_failed: 'Registration failed',
  register_creating: 'Creating account...',
  register_create: 'Create Account',
  register_hasAccount: 'Already have an account?',
  register_noDataCollection: 'We never collect your data',
  register_openSource: 'Fully open source',

  settings_back: 'Back',
  settings_title: 'Settings',
  settings_profile: 'Profile',
  settings_identity: 'Identity',
  settings_publicKey: 'Public Key',
  settings_notAvailable: 'Not available',
  settings_protocol: 'Shield Protocol',
  settings_privacySecurity: 'Privacy & Security',
  settings_e2e: 'End-to-End Encryption',
  settings_enabled: 'Enabled',
  settings_disabled: 'Disabled',
  settings_notEnabled: 'Not enabled',
  settings_incognito: 'Incognito Mode',
  settings_disappearing: 'Disappearing Messages',
  settings_twoFactor: 'Two-Factor Authentication',
  settings_torRouting: 'Tor Routing',
  settings_appearance: 'Appearance',
  settings_theme: 'Theme',
  settings_dark: 'Dark',
  settings_language: 'Language',
  settings_fontSize: 'Font Size',
  settings_medium: 'Medium',
  settings_logout: 'Log Out',

  calls_title: 'Calls',
  calls_all: 'All',
  calls_missed: 'Missed',
  calls_voice: 'Voice',
  calls_noCalls: 'No calls yet',
  calls_missedLabel: 'Missed',
  calls_callback: 'Call back',
  calls_e2eNotice: 'All calls are end-to-end encrypted',

  contacts_title: 'Contacts',
  contacts_search: 'Search contacts...',
  contacts_addFriend: 'Add Friend',
  contacts_scanQR: 'Scan QR Code',
  contacts_myQR: 'My QR Code',
  contacts_onionAddress: 'Onion Address',
  contacts_copyAddress: 'Copy Address',
  contacts_copied: 'Copied!',
  contacts_noContacts: 'No contacts yet',
  contacts_addDesc: 'Add friends to start chatting',
  contacts_online: 'Online',
  contacts_offline: 'Offline',
  contacts_pending: 'Pending',
  contacts_blocked: 'Blocked',
  contacts_remove: 'Remove',
  contacts_block: 'Block',

  verify_title: 'Verification',
  verify_safetyNumber: 'Safety Number',
  verify_showQR: 'Show QR Code',
  verify_scanQR: 'Scan QR Code',
  verify_success: 'Verified!',
  verify_mismatch: 'Mismatch',
  verify_mismatchDesc: 'Safety numbers do not match. The contact may have reinstalled.',
  verify_invalidQR: 'Invalid QR code',
  verify_contactVerified: 'Contact verified',
  verify_notVerified: 'Not verified',
  verify_compareNumbers: 'Compare safety numbers',
  verify_desc: 'Verify your contact by comparing safety numbers in person or via another channel.',

  trust_untrusted: 'Untrusted',
  trust_encrypted: 'Encrypted',
  trust_verified: 'Verified',
  trust_level: 'Trust Level',
  trust_fileWarningTitle: 'Unverified Contact',
  trust_fileWarningDesc: 'This contact is not verified. Files may be intercepted.',
  trust_sendAnyway: 'Send Anyway',

  friends_incoming: 'Incoming',
  friends_outgoing: 'Outgoing',
  friends_accept: 'Accept',
  friends_reject: 'Reject',
  friends_cancel: 'Cancel',
  friends_sendRequest: 'Send Request',
  friends_enterAddress: 'Enter onion address',
  friends_requestSent: 'Request sent',
  friends_noRequests: 'No friend requests',

  group_create: 'Create Group',
  group_name: 'Group Name',
  group_members: 'Members',
  group_selectMembers: 'Select members',
  group_noGroups: 'No groups yet',
  group_admin: 'Admin',
  group_leave: 'Leave Group',
  group_addMember: 'Add Member',
  group_info: 'Group Info',
  group_e2ee: 'End-to-end encrypted group',

  wallet_title: 'Wallet',
  wallet_totalBalance: 'Total Balance',
  wallet_send: 'Send',
  wallet_receive: 'Receive',
  wallet_swap: 'Swap',
  wallet_transactions: 'Transactions',
  wallet_noTransactions: 'No transactions yet',
  wallet_amount: 'Amount',
  wallet_address: 'Address',
  wallet_sendConfirm: 'Confirm Send',
  wallet_receiveDesc: 'Share your address to receive funds',
  wallet_solana: 'Solana',
  wallet_zcash: 'Zcash',
  wallet_createWallet: 'Create Wallet',
  wallet_importWallet: 'Import Wallet',
  wallet_seedPhrase: 'Seed Phrase',
  wallet_backupSeed: 'Backup Seed Phrase',
  wallet_noWallet: 'No wallet configured',
  wallet_sendTo: 'Send To',
  wallet_tokens: 'Tokens',
  wallet_shielded: 'Shielded',
  wallet_balance: 'Balance',

  security_lock: 'Lock',
  security_appLock: 'App Lock',
  security_autoLock: 'Auto Lock',
  security_duressPin: 'Duress PIN',
  security_duressDesc: 'Wipe all data when this PIN is entered',
  security_wipeAccount: 'Wipe Account',
  security_wipeConfirm: 'Are you sure? This cannot be undone.',
  security_biometric: 'Biometric Authentication',
  security_securityMode: 'Security Mode',
  security_standard: 'Standard',
  security_paranoid: 'Paranoid',
  security_title: 'Security',
  security_lockDesc: 'Require authentication to open the app',
  security_lockTimeout: 'Lock Timeout',
  security_setupDuress: 'Setup Duress PIN',
  security_disable: 'Disable',
  security_wipeDesc: 'Permanently delete all data',

  tor_status: 'Tor Status',
  tor_connected: 'Connected',
  tor_connecting: 'Connecting...',
  tor_disconnected: 'Disconnected',
  tor_bridges: 'Bridges',
  tor_health: 'Health',
  tor_circuits: 'Circuits',
  tor_vpnMode: 'VPN Mode',

  pwa_installTitle: 'Install Shield Messenger',
  pwa_installDesc: 'Install the app for a better experience',
  pwa_install: 'Install',
  pwa_later: 'Later',
  pwa_updateAvailable: 'Update Available',
  pwa_updateDesc: 'A new version is available',
  pwa_refresh: 'Refresh',

  identity_keyChanged: 'Identity Key Changed',
  identity_keyChangedDesc: "This contact's identity key has changed.",
  identity_detectedAt: 'Detected at',
  identity_showDetails: 'Show Details',
  identity_hideDetails: 'Hide Details',
  identity_explanation1: 'This could mean the contact reinstalled the app.',
  identity_explanation2: 'It could also indicate a man-in-the-middle attack.',
  identity_explanation3: 'Verify the contact through another channel.',
  identity_verifyNow: 'Verify Now',
  identity_dismiss: 'Dismiss',
};

/* ----- Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629) ----- */
export const ar: Translations = withFallback(en, {
  langName: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629',
  langDir: 'rtl',
  langCode: 'ar',

  sidebar_chats: '\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A',
  sidebar_calls: '\u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0627\u062A',
  sidebar_contacts: '\u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644',
  sidebar_settings: '\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A',

  chatList_title: '\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A',
  chatList_newChat: '\u0645\u062D\u0627\u062F\u062B\u0629 \u062C\u062F\u064A\u062F\u0629',
  chatList_search: '\uD83D\uDD0D \u0628\u062D\u062B...',
  chatList_noChats: '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062D\u0627\u062F\u062B\u0627\u062A',
  chatList_noMessages: '\u0644\u0627 \u062A\u0648\u062C\u062F \u0631\u0633\u0627\u0626\u0644',

  chat_user: '\u0645\u0633\u062A\u062E\u062F\u0645',
  chat_me: '\u0623\u0646\u0627',
  chat_members: '\u0623\u0639\u0636\u0627\u0621',
  chat_typing: '\u064A\u0643\u062A\u0628...',
  chat_voiceCall: '\u0645\u0643\u0627\u0644\u0645\u0629 \u0635\u0648\u062A\u064A\u0629',
  chat_more: '\u0627\u0644\u0645\u0632\u064A\u062F',
  chat_e2eNotice: '\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0645\u0634\u0641\u0631\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644',
  chat_reply: '\u0631\u062F',
  chat_copy: '\u0646\u0633\u062E',
  chat_voiceMessage: '\u0631\u0633\u0627\u0644\u0629 \u0635\u0648\u062A\u064A\u0629',
  chat_recording: '\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u0633\u062C\u064A\u0644...',
  chat_cancel: '\u0625\u0644\u063A\u0627\u0621',
  chat_send: '\u0625\u0631\u0633\u0627\u0644',
  chat_attachFile: '\u0625\u0631\u0641\u0627\u0642 \u0645\u0644\u0641',
  chat_emoji: '\u0631\u0645\u0648\u0632 \u062A\u0639\u0628\u064A\u0631\u064A\u0629',
  chat_messagePlaceholder: '\u0627\u0643\u062A\u0628 \u0631\u0633\u0627\u0644\u0629...',
  chat_encryptedE2E: '\u0645\u0634\u0641\u0631 \u0628\u0627\u0644\u0643\u0627\u0645\u0644',

  empty_selectChat: '\u0627\u062E\u062A\u0631 \u0645\u062D\u0627\u062F\u062B\u0629 \u0644\u0628\u062F\u0621 \u0627\u0644\u0645\u0631\u0627\u0633\u0644\u0629',
  empty_e2e: '\u062A\u0634\u0641\u064A\u0631 \u0634\u0627\u0645\u0644',
  empty_protocol: '\u0628\u0631\u0648\u062A\u0648\u0643\u0648\u0644 Shield',
  empty_encryptedCalls: '\u0645\u0643\u0627\u0644\u0645\u0627\u062A \u0645\u0634\u0641\u0631\u0629',
  empty_noDataCollection: '\u0644\u0627 \u062C\u0645\u0639 \u0644\u0644\u0628\u064A\u0627\u0646\u0627\u062A',
  empty_multiPlatform: '\u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0645\u0646\u0635\u0627\u062A',
  empty_openSource: '\u0645\u0641\u062A\u0648\u062D \u0627\u0644\u0645\u0635\u062F\u0631',

  call_encryptedE2E: '\u0645\u0643\u0627\u0644\u0645\u0629 \u0645\u0634\u0641\u0631\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644',
  call_mute: '\u0643\u062A\u0645',
  call_unmute: '\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0643\u062A\u0645',
  call_endCall: '\u0625\u0646\u0647\u0627\u0621 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629',
  call_incomingVoice: '\u0645\u0643\u0627\u0644\u0645\u0629 \u0635\u0648\u062A\u064A\u0629 \u0648\u0627\u0631\u062F\u0629',
  call_encrypted: '\u0645\u0634\u0641\u0631\u0629',
  call_reject: '\u0631\u0641\u0636',
  call_accept: '\u0642\u0628\u0648\u0644',
  call_ringing: '\u064A\u0631\u0646',
  call_connecting: '\u062C\u0627\u0631\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644',
  call_connected: '\u0645\u062A\u0635\u0644',
  call_reconnecting: '\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644',
  call_ended: '\u0627\u0646\u062A\u0647\u062A \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629',
  call_failed: '\u0641\u0634\u0644\u062A \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0629',
  call_mutedMic: '\u0643\u062A\u0645 \u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646',

  login_subtitle: '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0625\u0644\u0649 \u062D\u0633\u0627\u0628\u0643',
  login_username: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645',
  login_password: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
  login_failed: '\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644',
  login_loggingIn: '\u062C\u0627\u0631\u064A \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644...',
  login_login: '\u062F\u062E\u0648\u0644',
  login_noAccount: '\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u062D\u0633\u0627\u0628\u061F',
  login_e2eNotice: '\u0631\u0633\u0627\u0626\u0644\u0643 \u0645\u0634\u0641\u0631\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644',

  register_title: '\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628',
  register_subtitle: '\u0627\u0646\u0636\u0645 \u0625\u0644\u0649 Shield Messenger',
  register_username: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645',
  register_usernamePlaceholder: '\u0627\u062E\u062A\u0631 \u0627\u0633\u0645 \u0645\u0633\u062A\u062E\u062F\u0645',
  register_password: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
  register_passwordPlaceholder: '\u0623\u0646\u0634\u0626 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631',
  register_confirmPassword: '\u062A\u0623\u0643\u064A\u062F \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
  register_confirmPlaceholder: '\u0623\u0643\u062F \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
  register_passwordMismatch: '\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0645\u062A\u0637\u0627\u0628\u0642\u0629',
  register_passwordMinLength: '\u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644',
  register_failed: '\u0641\u0634\u0644 \u0627\u0644\u062A\u0633\u062C\u064A\u0644',
  register_creating: '\u062C\u0627\u0631\u064A \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628...',
  register_create: '\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628',
  register_hasAccount: '\u0644\u062F\u064A\u0643 \u062D\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644\u061F',
  register_noDataCollection: '\u0644\u0627 \u0646\u062C\u0645\u0639 \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0623\u0628\u062F\u0627\u064B',
  register_openSource: '\u0645\u0641\u062A\u0648\u062D \u0627\u0644\u0645\u0635\u062F\u0631 \u0628\u0627\u0644\u0643\u0627\u0645\u0644',

  settings_back: '\u0631\u062C\u0648\u0639',
  settings_title: '\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A',
  settings_profile: '\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A',
  settings_identity: '\u0627\u0644\u0647\u0648\u064A\u0629',
  settings_publicKey: '\u0627\u0644\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0639\u0627\u0645',
  settings_notAvailable: '\u063A\u064A\u0631 \u0645\u062A\u0627\u062D',
  settings_protocol: '\u0628\u0631\u0648\u062A\u0648\u0643\u0648\u0644 Shield',
  settings_privacySecurity: '\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 \u0648\u0627\u0644\u0623\u0645\u0627\u0646',
  settings_e2e: '\u0627\u0644\u062A\u0634\u0641\u064A\u0631 \u0627\u0644\u0634\u0627\u0645\u0644',
  settings_enabled: '\u0645\u0641\u0639\u0644',
  settings_disabled: '\u0645\u0639\u0637\u0644',
  settings_notEnabled: '\u063A\u064A\u0631 \u0645\u0641\u0639\u0644',
  settings_incognito: '\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0645\u062A\u062E\u0641\u064A',
  settings_disappearing: '\u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0645\u062E\u062A\u0641\u064A\u0629',
  settings_twoFactor: '\u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0627\u0644\u062B\u0646\u0627\u0626\u064A\u0629',
  settings_torRouting: '\u062A\u0648\u062C\u064A\u0647 Tor',
  settings_appearance: '\u0627\u0644\u0645\u0638\u0647\u0631',
  settings_theme: '\u0627\u0644\u0633\u0645\u0629',
  settings_dark: '\u062F\u0627\u0643\u0646',
  settings_language: '\u0627\u0644\u0644\u063A\u0629',
  settings_fontSize: '\u062D\u062C\u0645 \u0627\u0644\u062E\u0637',
  settings_medium: '\u0645\u062A\u0648\u0633\u0637',
  settings_logout: '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C',

  calls_title: '\u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0627\u062A',
  calls_all: '\u0627\u0644\u0643\u0644',
  calls_missed: '\u0641\u0627\u0626\u062A\u0629',
  calls_voice: '\u0635\u0648\u062A\u064A\u0629',
  calls_noCalls: '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0643\u0627\u0644\u0645\u0627\u062A',
  calls_missedLabel: '\u0641\u0627\u0626\u062A\u0629',
  calls_callback: '\u0645\u0639\u0627\u0648\u062F\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644',
  calls_e2eNotice: '\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0643\u0627\u0644\u0645\u0627\u062A \u0645\u0634\u0641\u0631\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644',

  contacts_title: '\u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644',
  contacts_search: '\u0628\u062D\u062B \u0641\u064A \u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644...',
  contacts_addFriend: '\u0625\u0636\u0627\u0641\u0629 \u0635\u062F\u064A\u0642',
  contacts_noContacts: '\u0644\u0627 \u062A\u0648\u062C\u062F \u062C\u0647\u0627\u062A \u0627\u062A\u0635\u0627\u0644',
  contacts_online: '\u0645\u062A\u0635\u0644',
  contacts_offline: '\u063A\u064A\u0631 \u0645\u062A\u0635\u0644',

  security_title: '\u0627\u0644\u0623\u0645\u0627\u0646',
  wallet_title: '\u0627\u0644\u0645\u062D\u0641\u0638\u0629',
  wallet_send: '\u0625\u0631\u0633\u0627\u0644',
  wallet_receive: '\u0627\u0633\u062A\u0642\u0628\u0627\u0644',

  tor_status: '\u062D\u0627\u0644\u0629 Tor',
  tor_connected: '\u0645\u062A\u0635\u0644',
  tor_connecting: '\u062C\u0627\u0631\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644...',
  tor_disconnected: '\u063A\u064A\u0631 \u0645\u062A\u0635\u0644',
});

/* ----- Fran\u00E7ais ----- */
export const fr: Translations = withFallback(en, {
  langName: 'Fran\u00E7ais',
  langDir: 'ltr',
  langCode: 'fr',

  sidebar_chats: 'Discussions',
  sidebar_calls: 'Appels',
  sidebar_contacts: 'Contacts',
  sidebar_settings: 'Param\u00E8tres',

  chatList_title: 'Discussions',
  chatList_newChat: 'Nouvelle discussion',
  chatList_search: '\uD83D\uDD0D Rechercher...',
  chatList_noChats: 'Aucune discussion',
  chatList_noMessages: 'Aucun message',

  chat_user: 'Utilisateur',
  chat_me: 'Moi',
  chat_members: 'membres',
  chat_typing: '\u00E9crit...',
  chat_voiceCall: 'Appel vocal',
  chat_more: 'Plus',
  chat_e2eNotice: 'Messages chiffr\u00E9s de bout en bout',
  chat_reply: 'R\u00E9pondre',
  chat_copy: 'Copier',
  chat_send: 'Envoyer',
  chat_cancel: 'Annuler',
  chat_messagePlaceholder: '\u00C9crire un message...',
  chat_encryptedE2E: 'Chiffr\u00E9 de bout en bout',

  call_encryptedE2E: 'Appel chiffr\u00E9 de bout en bout',
  call_mute: 'Muet',
  call_unmute: 'R\u00E9activer',
  call_endCall: 'Raccrocher',
  call_incomingVoice: 'Appel vocal entrant',
  call_reject: 'Refuser',
  call_accept: 'Accepter',
  call_ringing: 'Sonnerie',
  call_connecting: 'Connexion',
  call_connected: 'Connect\u00E9',
  call_ended: 'Appel termin\u00E9',
  call_failed: 'Appel \u00E9chou\u00E9',

  login_subtitle: 'Connectez-vous \u00E0 votre compte',
  login_username: "Nom d'utilisateur",
  login_password: 'Mot de passe',
  login_login: 'Connexion',
  login_noAccount: "Pas de compte ?",

  settings_title: 'Param\u00E8tres',
  settings_logout: 'D\u00E9connexion',
  settings_language: 'Langue',
  settings_theme: 'Th\u00E8me',
  settings_dark: 'Sombre',

  contacts_title: 'Contacts',
  contacts_addFriend: 'Ajouter un ami',
  contacts_online: 'En ligne',
  contacts_offline: 'Hors ligne',

  wallet_title: 'Portefeuille',
  wallet_send: 'Envoyer',
  wallet_receive: 'Recevoir',

  security_title: 'S\u00E9curit\u00E9',
});

/* ----- Espa\u00F1ol ----- */
export const es: Translations = withFallback(en, {
  langName: 'Espa\u00F1ol',
  langDir: 'ltr',
  langCode: 'es',

  sidebar_chats: 'Chats',
  sidebar_calls: 'Llamadas',
  sidebar_contacts: 'Contactos',
  sidebar_settings: 'Ajustes',

  chatList_title: 'Chats',
  chatList_newChat: 'Nuevo chat',
  chatList_search: '\uD83D\uDD0D Buscar...',
  chatList_noChats: 'No hay chats',
  chatList_noMessages: 'No hay mensajes',

  chat_user: 'Usuario',
  chat_me: 'Yo',
  chat_members: 'miembros',
  chat_typing: 'escribiendo...',
  chat_voiceCall: 'Llamada de voz',
  chat_more: 'M\u00E1s',
  chat_e2eNotice: 'Mensajes cifrados de extremo a extremo',
  chat_reply: 'Responder',
  chat_copy: 'Copiar',
  chat_send: 'Enviar',
  chat_cancel: 'Cancelar',
  chat_messagePlaceholder: 'Escribe un mensaje...',
  chat_encryptedE2E: 'Cifrado de extremo a extremo',

  call_endCall: 'Finalizar llamada',
  call_incomingVoice: 'Llamada de voz entrante',
  call_reject: 'Rechazar',
  call_accept: 'Aceptar',
  call_ringing: 'Sonando',
  call_connecting: 'Conectando',
  call_connected: 'Conectado',
  call_ended: 'Llamada finalizada',
  call_failed: 'Llamada fallida',

  login_subtitle: 'Inicia sesi\u00F3n en tu cuenta',
  login_username: 'Nombre de usuario',
  login_password: 'Contrase\u00F1a',
  login_login: 'Iniciar sesi\u00F3n',

  settings_title: 'Ajustes',
  settings_logout: 'Cerrar sesi\u00F3n',
  settings_language: 'Idioma',

  contacts_title: 'Contactos',
  contacts_online: 'En l\u00EDnea',
  contacts_offline: 'Desconectado',

  wallet_title: 'Billetera',
  wallet_send: 'Enviar',
  wallet_receive: 'Recibir',

  security_title: 'Seguridad',
});

/* ----- Deutsch ----- */
export const de: Translations = withFallback(en, {
  langName: 'Deutsch',
  langDir: 'ltr',
  langCode: 'de',

  sidebar_chats: 'Chats',
  sidebar_calls: 'Anrufe',
  sidebar_contacts: 'Kontakte',
  sidebar_settings: 'Einstellungen',

  chatList_title: 'Chats',
  chatList_newChat: 'Neuer Chat',
  chatList_search: '\uD83D\uDD0D Suchen...',
  chatList_noChats: 'Keine Chats',
  chatList_noMessages: 'Keine Nachrichten',

  chat_user: 'Benutzer',
  chat_me: 'Ich',
  chat_members: 'Mitglieder',
  chat_typing: 'schreibt...',
  chat_voiceCall: 'Sprachanruf',
  chat_more: 'Mehr',
  chat_e2eNotice: 'Nachrichten sind Ende-zu-Ende-verschl\u00FCsselt',
  chat_reply: 'Antworten',
  chat_copy: 'Kopieren',
  chat_send: 'Senden',
  chat_cancel: 'Abbrechen',
  chat_messagePlaceholder: 'Nachricht eingeben...',
  chat_encryptedE2E: 'Ende-zu-Ende-verschl\u00FCsselt',

  call_endCall: 'Auflegen',
  call_incomingVoice: 'Eingehender Sprachanruf',
  call_reject: 'Ablehnen',
  call_accept: 'Annehmen',
  call_ringing: 'Klingelt',
  call_connecting: 'Verbindung wird hergestellt',
  call_connected: 'Verbunden',
  call_ended: 'Anruf beendet',
  call_failed: 'Anruf fehlgeschlagen',

  login_subtitle: 'Melden Sie sich an',
  login_username: 'Benutzername',
  login_password: 'Passwort',
  login_login: 'Anmelden',

  settings_title: 'Einstellungen',
  settings_logout: 'Abmelden',
  settings_language: 'Sprache',

  contacts_title: 'Kontakte',
  contacts_online: 'Online',
  contacts_offline: 'Offline',

  wallet_title: 'Geldb\u00F6rse',
  wallet_send: 'Senden',
  wallet_receive: 'Empfangen',

  security_title: 'Sicherheit',
});

/* ----- T\u00FCrk\u00E7e ----- */
export const tr: Translations = withFallback(en, {
  langName: 'T\u00FCrk\u00E7e',
  langDir: 'ltr',
  langCode: 'tr',

  sidebar_chats: 'Sohbetler',
  sidebar_calls: 'Aramalar',
  sidebar_contacts: 'Ki\u015Filer',
  sidebar_settings: 'Ayarlar',

  chatList_title: 'Sohbetler',
  chatList_newChat: 'Yeni sohbet',
  chatList_search: '\uD83D\uDD0D Ara...',
  chatList_noChats: 'Sohbet yok',
  chatList_noMessages: 'Mesaj yok',

  chat_user: 'Kullan\u0131c\u0131',
  chat_me: 'Ben',
  chat_members: '\u00FCye',
  chat_typing: 'yaz\u0131yor...',
  chat_voiceCall: 'Sesli arama',
  chat_more: 'Daha fazla',
  chat_reply: 'Yan\u0131tla',
  chat_copy: 'Kopyala',
  chat_send: 'G\u00F6nder',
  chat_cancel: '\u0130ptal',

  call_endCall: 'Aramay\u0131 bitir',
  call_reject: 'Reddet',
  call_accept: 'Kabul et',
  call_ringing: '\u00C7al\u0131yor',
  call_connecting: 'Ba\u011Flan\u0131yor',
  call_connected: 'Ba\u011Fl\u0131',
  call_ended: 'Arama bitti',
  call_failed: 'Arama ba\u015Far\u0131s\u0131z',

  settings_title: 'Ayarlar',
  settings_logout: '\u00C7\u0131k\u0131\u015F',
  settings_language: 'Dil',

  contacts_title: 'Ki\u015Filer',
  security_title: 'G\u00FCvenlik',
  wallet_title: 'C\u00FCzdan',
});

/* ----- \u0641\u0627\u0631\u0633\u06CC (Persian) ----- */
export const fa: Translations = withFallback(en, {
  langName: '\u0641\u0627\u0631\u0633\u06CC',
  langDir: 'rtl',
  langCode: 'fa',

  sidebar_chats: '\u06AF\u0641\u062A\u06AF\u0648\u0647\u0627',
  sidebar_calls: '\u062A\u0645\u0627\u0633\u200C\u0647\u0627',
  sidebar_contacts: '\u0645\u062E\u0627\u0637\u0628\u0627\u0646',
  sidebar_settings: '\u062A\u0646\u0638\u06CC\u0645\u0627\u062A',

  chatList_title: '\u06AF\u0641\u062A\u06AF\u0648\u0647\u0627',
  chatList_newChat: '\u06AF\u0641\u062A\u06AF\u0648\u06CC \u062C\u062F\u06CC\u062F',
  chatList_search: '\uD83D\uDD0D \u062C\u0633\u062A\u062C\u0648...',
  chatList_noChats: '\u06AF\u0641\u062A\u06AF\u0648\u06CC\u06CC \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F',
  chatList_noMessages: '\u067E\u06CC\u0627\u0645\u06CC \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F',

  chat_user: '\u06A9\u0627\u0631\u0628\u0631',
  chat_me: '\u0645\u0646',
  chat_members: '\u0639\u0636\u0648',
  chat_typing: '\u062F\u0631 \u062D\u0627\u0644 \u0646\u0648\u0634\u062A\u0646...',
  chat_voiceCall: '\u062A\u0645\u0627\u0633 \u0635\u0648\u062A\u06CC',
  chat_send: '\u0627\u0631\u0633\u0627\u0644',
  chat_cancel: '\u0644\u063A\u0648',

  settings_title: '\u062A\u0646\u0638\u06CC\u0645\u0627\u062A',
  settings_language: '\u0632\u0628\u0627\u0646',
  contacts_title: '\u0645\u062E\u0627\u0637\u0628\u0627\u0646',
  security_title: '\u0627\u0645\u0646\u06CC\u062A',
  wallet_title: '\u06A9\u06CC\u0641 \u067E\u0648\u0644',
});

/* ----- \u0627\u0631\u062F\u0648 (Urdu) ----- */
export const ur: Translations = withFallback(en, {
  langName: '\u0627\u0631\u062F\u0648',
  langDir: 'rtl',
  langCode: 'ur',

  sidebar_chats: '\u0686\u06CC\u0679',
  sidebar_calls: '\u06A9\u0627\u0644\u0632',
  sidebar_contacts: '\u0631\u0648\u0627\u0628\u0637',
  sidebar_settings: '\u062A\u0631\u062A\u06CC\u0628\u0627\u062A',

  chatList_title: '\u0686\u06CC\u0679',
  chatList_newChat: '\u0646\u0626\u06CC \u0686\u06CC\u0679',
  chatList_search: '\uD83D\uDD0D \u062A\u0644\u0627\u0634...',
  chatList_noChats: '\u06A9\u0648\u0626\u06CC \u0686\u06CC\u0679 \u0646\u06C1\u06CC\u06BA',
  chatList_noMessages: '\u06A9\u0648\u0626\u06CC \u067E\u06CC\u063A\u0627\u0645 \u0646\u06C1\u06CC\u06BA',

  chat_user: '\u0635\u0627\u0631\u0641',
  chat_me: '\u0645\u06CC\u06BA',
  chat_members: '\u0627\u0631\u0627\u06A9\u06CC\u0646',
  chat_typing: '\u0644\u06A9\u06BE \u0631\u06C1\u0627 \u06C1\u06D2...',
  chat_voiceCall: '\u0648\u0627\u0626\u0633 \u06A9\u0627\u0644',

  settings_title: '\u062A\u0631\u062A\u06CC\u0628\u0627\u062A',
  contacts_title: '\u0631\u0648\u0627\u0628\u0637',
  security_title: '\u0633\u06CC\u06A9\u06CC\u0648\u0631\u0679\u06CC',
  wallet_title: '\u0648\u0627\u0644\u0679',
});

/* ----- \u4E2D\u6587 (Chinese Simplified) ----- */
export const zh: Translations = withFallback(en, {
  langName: '\u4E2D\u6587',
  langDir: 'ltr',
  langCode: 'zh',

  sidebar_chats: '\u804A\u5929',
  sidebar_calls: '\u901A\u8BDD',
  sidebar_contacts: '\u8054\u7CFB\u4EBA',
  sidebar_settings: '\u8BBE\u7F6E',

  chatList_title: '\u804A\u5929',
  chatList_newChat: '\u65B0\u5EFA\u804A\u5929',
  chatList_search: '\uD83D\uDD0D \u641C\u7D22...',
  chatList_noChats: '\u6CA1\u6709\u804A\u5929',
  chatList_noMessages: '\u6CA1\u6709\u6D88\u606F',

  chat_user: '\u7528\u6237',
  chat_me: '\u6211',
  chat_members: '\u6210\u5458',
  chat_typing: '\u8F93\u5165\u4E2D...',
  chat_voiceCall: '\u8BED\u97F3\u901A\u8BDD',
  chat_more: '\u66F4\u591A',
  chat_reply: '\u56DE\u590D',
  chat_copy: '\u590D\u5236',
  chat_send: '\u53D1\u9001',
  chat_cancel: '\u53D6\u6D88',

  call_endCall: '\u7ED3\u675F\u901A\u8BDD',
  call_reject: '\u62D2\u7EDD',
  call_accept: '\u63A5\u542C',
  call_ringing: '\u54CD\u94C3\u4E2D',
  call_connecting: '\u8FDE\u63A5\u4E2D',
  call_connected: '\u5DF2\u8FDE\u63A5',
  call_ended: '\u901A\u8BDD\u7ED3\u675F',
  call_failed: '\u901A\u8BDD\u5931\u8D25',

  settings_title: '\u8BBE\u7F6E',
  settings_logout: '\u9000\u51FA',
  settings_language: '\u8BED\u8A00',

  contacts_title: '\u8054\u7CFB\u4EBA',
  contacts_online: '\u5728\u7EBF',
  contacts_offline: '\u79BB\u7EBF',

  security_title: '\u5B89\u5168',
  wallet_title: '\u94B1\u5305',
  wallet_send: '\u53D1\u9001',
  wallet_receive: '\u63A5\u6536',
});

/* ----- \u65E5\u672C\u8A9E (Japanese) ----- */
export const ja: Translations = withFallback(en, {
  langName: '\u65E5\u672C\u8A9E',
  langDir: 'ltr',
  langCode: 'ja',

  sidebar_chats: '\u30C1\u30E3\u30C3\u30C8',
  sidebar_calls: '\u901A\u8A71',
  sidebar_contacts: '\u9023\u7D61\u5148',
  sidebar_settings: '\u8A2D\u5B9A',

  chatList_title: '\u30C1\u30E3\u30C3\u30C8',
  chatList_newChat: '\u65B0\u3057\u3044\u30C1\u30E3\u30C3\u30C8',
  chatList_search: '\uD83D\uDD0D \u691C\u7D22...',
  chatList_noChats: '\u30C1\u30E3\u30C3\u30C8\u306A\u3057',
  chatList_noMessages: '\u30E1\u30C3\u30BB\u30FC\u30B8\u306A\u3057',

  chat_user: '\u30E6\u30FC\u30B6\u30FC',
  chat_me: '\u81EA\u5206',
  chat_members: '\u30E1\u30F3\u30D0\u30FC',
  chat_typing: '\u5165\u529B\u4E2D...',
  chat_voiceCall: '\u97F3\u58F0\u901A\u8A71',
  chat_more: '\u305D\u306E\u4ED6',
  chat_reply: '\u8FD4\u4FE1',
  chat_copy: '\u30B3\u30D4\u30FC',
  chat_send: '\u9001\u4FE1',
  chat_cancel: '\u30AD\u30E3\u30F3\u30BB\u30EB',

  call_endCall: '\u901A\u8A71\u7D42\u4E86',
  call_reject: '\u62D2\u5426',
  call_accept: '\u5FDC\u7B54',
  call_ringing: '\u547C\u3073\u51FA\u3057\u4E2D',
  call_connecting: '\u63A5\u7D9A\u4E2D',
  call_connected: '\u63A5\u7D9A\u6E08\u307F',
  call_ended: '\u901A\u8A71\u7D42\u4E86',
  call_failed: '\u901A\u8A71\u5931\u6557',

  settings_title: '\u8A2D\u5B9A',
  settings_logout: '\u30ED\u30B0\u30A2\u30A6\u30C8',
  settings_language: '\u8A00\u8A9E',

  contacts_title: '\u9023\u7D61\u5148',
  security_title: '\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3',
  wallet_title: '\u30A6\u30A9\u30EC\u30C3\u30C8',
});

/* ----- \uD55C\uAD6D\uC5B4 (Korean) ----- */
export const ko: Translations = withFallback(en, {
  langName: '\uD55C\uAD6D\uC5B4',
  langDir: 'ltr',
  langCode: 'ko',

  sidebar_chats: '\uCC44\uD305',
  sidebar_calls: '\uD1B5\uD654',
  sidebar_contacts: '\uC5F0\uB77D\uCC98',
  sidebar_settings: '\uC124\uC815',

  chatList_title: '\uCC44\uD305',
  chatList_newChat: '\uC0C8 \uCC44\uD305',
  chatList_search: '\uD83D\uDD0D \uAC80\uC0C9...',
  chatList_noChats: '\uCC44\uD305 \uC5C6\uC74C',
  chatList_noMessages: '\uBA54\uC2DC\uC9C0 \uC5C6\uC74C',

  chat_user: '\uC0AC\uC6A9\uC790',
  chat_me: '\uB098',
  chat_members: '\uBA64\uBC84',
  chat_typing: '\uC785\uB825 \uC911...',
  chat_voiceCall: '\uC74C\uC131 \uD1B5\uD654',
  chat_more: '\uB354\uBCF4\uAE30',
  chat_reply: '\uB2F5\uC7A5',
  chat_copy: '\uBCF5\uC0AC',
  chat_send: '\uBCF4\uB0B4\uAE30',
  chat_cancel: '\uCDE8\uC18C',

  settings_title: '\uC124\uC815',
  settings_language: '\uC5B8\uC5B4',
  contacts_title: '\uC5F0\uB77D\uCC98',
  security_title: '\uBCF4\uC548',
  wallet_title: '\uC9C0\uAC11',
});

/* ----- \u0420\u0443\u0441\u0441\u043A\u0438\u0439 (Russian) ----- */
export const ru: Translations = withFallback(en, {
  langName: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
  langDir: 'ltr',
  langCode: 'ru',

  sidebar_chats: '\u0427\u0430\u0442\u044B',
  sidebar_calls: '\u0417\u0432\u043E\u043D\u043A\u0438',
  sidebar_contacts: '\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B',
  sidebar_settings: '\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438',

  chatList_title: '\u0427\u0430\u0442\u044B',
  chatList_newChat: '\u041D\u043E\u0432\u044B\u0439 \u0447\u0430\u0442',
  chatList_search: '\uD83D\uDD0D \u041F\u043E\u0438\u0441\u043A...',
  chatList_noChats: '\u041D\u0435\u0442 \u0447\u0430\u0442\u043E\u0432',
  chatList_noMessages: '\u041D\u0435\u0442 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439',

  chat_user: '\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C',
  chat_me: '\u042F',
  chat_members: '\u0443\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432',
  chat_typing: '\u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442...',
  chat_voiceCall: '\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0437\u0432\u043E\u043D\u043E\u043A',
  chat_more: '\u0415\u0449\u0451',
  chat_reply: '\u041E\u0442\u0432\u0435\u0442\u0438\u0442\u044C',
  chat_copy: '\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C',
  chat_send: '\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C',
  chat_cancel: '\u041E\u0442\u043C\u0435\u043D\u0430',

  settings_title: '\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438',
  settings_logout: '\u0412\u044B\u0445\u043E\u0434',
  settings_language: '\u042F\u0437\u044B\u043A',

  contacts_title: '\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B',
  contacts_online: '\u0412 \u0441\u0435\u0442\u0438',
  contacts_offline: '\u041D\u0435 \u0432 \u0441\u0435\u0442\u0438',

  security_title: '\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u044C',
  wallet_title: '\u041A\u043E\u0448\u0435\u043B\u0451\u043A',
});

/* ----- Portugu\u00EAs ----- */
export const pt: Translations = withFallback(en, {
  langName: 'Portugu\u00EAs',
  langDir: 'ltr',
  langCode: 'pt',

  sidebar_chats: 'Conversas',
  sidebar_calls: 'Chamadas',
  sidebar_contacts: 'Contatos',
  sidebar_settings: 'Configura\u00E7\u00F5es',

  chatList_title: 'Conversas',
  chatList_newChat: 'Nova conversa',
  chatList_search: '\uD83D\uDD0D Pesquisar...',
  chatList_noChats: 'Sem conversas',
  chatList_noMessages: 'Sem mensagens',

  chat_user: 'Usu\u00E1rio',
  chat_me: 'Eu',
  chat_members: 'membros',
  chat_typing: 'digitando...',
  chat_voiceCall: 'Chamada de voz',
  chat_send: 'Enviar',
  chat_cancel: 'Cancelar',

  settings_title: 'Configura\u00E7\u00F5es',
  settings_language: 'Idioma',
  contacts_title: 'Contatos',
  security_title: 'Seguran\u00E7a',
  wallet_title: 'Carteira',
});

/* ----- Italiano ----- */
export const it: Translations = withFallback(en, {
  langName: 'Italiano',
  langDir: 'ltr',
  langCode: 'it',

  sidebar_chats: 'Chat',
  sidebar_calls: 'Chiamate',
  sidebar_contacts: 'Contatti',
  sidebar_settings: 'Impostazioni',

  chatList_title: 'Chat',
  chatList_newChat: 'Nuova chat',
  chatList_search: '\uD83D\uDD0D Cerca...',
  chatList_noChats: 'Nessuna chat',
  chatList_noMessages: 'Nessun messaggio',

  chat_user: 'Utente',
  chat_me: 'Io',
  chat_members: 'membri',
  chat_typing: 'sta scrivendo...',
  chat_voiceCall: 'Chiamata vocale',
  chat_send: 'Invia',
  chat_cancel: 'Annulla',

  settings_title: 'Impostazioni',
  settings_language: 'Lingua',
  contacts_title: 'Contatti',
  security_title: 'Sicurezza',
  wallet_title: 'Portafoglio',
});

/* ----- \u0939\u093F\u0928\u094D\u0926\u0940 (Hindi) ----- */
export const hi: Translations = withFallback(en, {
  langName: '\u0939\u093F\u0928\u094D\u0926\u0940',
  langDir: 'ltr',
  langCode: 'hi',

  sidebar_chats: '\u091A\u0948\u091F',
  sidebar_calls: '\u0915\u0949\u0932',
  sidebar_contacts: '\u0938\u0902\u092A\u0930\u094D\u0915',
  sidebar_settings: '\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',

  chatList_title: '\u091A\u0948\u091F',
  chatList_newChat: '\u0928\u0908 \u091A\u0948\u091F',
  chatList_search: '\uD83D\uDD0D \u0916\u094B\u091C\u0947\u0902...',
  chatList_noChats: '\u0915\u094B\u0908 \u091A\u0948\u091F \u0928\u0939\u0940\u0902',
  chatList_noMessages: '\u0915\u094B\u0908 \u0938\u0902\u0926\u0947\u0936 \u0928\u0939\u0940\u0902',

  chat_user: '\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u0627',
  chat_me: '\u092E\u0948\u0902',
  chat_members: '\u0938\u0926\u0938\u094D\u092F',
  chat_typing: '\u091F\u0627\u0907\u092A \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902...',
  chat_voiceCall: '\u0935\u0949\u0907\u0938 \u0915\u0949\u0932',

  settings_title: '\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',
  settings_language: '\u092D\u0627\u0937\u093E',
  contacts_title: '\u0938\u0902\u092A\u0930\u094D\u0915',
  security_title: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E',
  wallet_title: '\u0935\u0949\u0932\u0947\u091F',
});

/* ----- Bahasa Indonesia ----- */
export const id: Translations = withFallback(en, {
  langName: 'Bahasa Indonesia',
  langDir: 'ltr',
  langCode: 'id',

  sidebar_chats: 'Obrolan',
  sidebar_calls: 'Panggilan',
  sidebar_contacts: 'Kontak',
  sidebar_settings: 'Pengaturan',

  chatList_title: 'Obrolan',
  chatList_newChat: 'Obrolan baru',
  chatList_search: '\uD83D\uDD0D Cari...',
  chatList_noChats: 'Tidak ada obrolan',
  chatList_noMessages: 'Tidak ada pesan',

  chat_user: 'Pengguna',
  chat_me: 'Saya',
  chat_members: 'anggota',
  chat_typing: 'mengetik...',
  chat_voiceCall: 'Panggilan suara',
  chat_send: 'Kirim',
  chat_cancel: 'Batal',

  settings_title: 'Pengaturan',
  settings_language: 'Bahasa',
  contacts_title: 'Kontak',
  security_title: 'Keamanan',
  wallet_title: 'Dompet',
});

/* ----- Nederlands ----- */
export const nl: Translations = withFallback(en, {
  langName: 'Nederlands',
  langDir: 'ltr',
  langCode: 'nl',

  sidebar_chats: 'Chats',
  sidebar_calls: 'Oproepen',
  sidebar_contacts: 'Contacten',
  sidebar_settings: 'Instellingen',

  chatList_title: 'Chats',
  chatList_newChat: 'Nieuwe chat',
  chatList_search: '\uD83D\uDD0D Zoeken...',
  chatList_noChats: 'Geen chats',
  chatList_noMessages: 'Geen berichten',

  chat_user: 'Gebruiker',
  chat_me: 'Ik',
  chat_members: 'leden',
  chat_typing: 'aan het typen...',
  chat_voiceCall: 'Spraakoproep',
  chat_send: 'Verstuur',
  chat_cancel: 'Annuleer',

  settings_title: 'Instellingen',
  settings_language: 'Taal',
  contacts_title: 'Contacten',
  security_title: 'Beveiliging',
  wallet_title: 'Portemonnee',
});

/* ----- Locale registry ----- */
export const locales: Record<string, Translations> = {
  ar, en, fr, es, de, tr, fa, ur, zh, ja, ko, ru, pt, it, hi, id, nl,
};

export const localeList = Object.values(locales);
export type LocaleCode = keyof typeof locales;
