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

/* ----- Arabic (???????) ----- */
export const ar: Translations = {
  langName: '???????',
  langDir: 'rtl',
  langCode: 'ar',

  sidebar_chats: '?????????',
  sidebar_calls: '?????????',
  sidebar_contacts: '???? ???????',
  sidebar_settings: '?????????',

  chatList_title: '?????????',
  chatList_newChat: '?????? ?????',
  chatList_search: '?? ???...',
  chatList_noChats: '?? ???? ???????',
  chatList_noMessages: '?? ???? ?????',

  chat_user: '??????',
  chat_me: '???',
  chat_members: '?????',
  chat_typing: '????...',
  chat_voiceCall: '?????? ?????',
};

/* ----- English ----- */
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
  chatList_search: '?? Search...',
  chatList_noChats: 'No chats',
  chatList_noMessages: 'No messages',

  chat_user: 'User',
  chat_me: 'Me',
  chat_members: 'members',
  chat_typing: 'typing...',
  chat_voiceCall: 'Voice call',
};

/* ----- Français ----- */
export const fr: Translations = {
  langName: 'Français',
  langDir: 'ltr',
  langCode: 'fr',

  sidebar_chats: 'Discussions',
  sidebar_calls: 'Appels',
  sidebar_contacts: 'Contacts',
  sidebar_settings: 'Paramètres',

  chatList_title: 'Discussions',
  chatList_newChat: 'Nouvelle discussion',
  chatList_search: '?? Rechercher...',
  chatList_noChats: 'Aucune discussion',
  chatList_noMessages: 'Aucun message',

  chat_user: 'Utilisateur',
  chat_me: 'Moi',
  chat_members: 'membres',
  chat_typing: 'écrit...',
  chat_voiceCall: 'Appel vocal',
};

/* ----- Español ----- */
export const es: Translations = {
  langName: 'Español',
  langDir: 'ltr',
  langCode: 'es',

  sidebar_chats: 'Chats',
  sidebar_calls: 'Llamadas',
  sidebar_contacts: 'Contactos',
  sidebar_settings: 'Ajustes',

  chatList_title: 'Chats',
  chatList_newChat: 'Nuevo chat',
  chatList_search: '?? Buscar...',
  chatList_noChats: 'No hay chats',
  chatList_noMessages: 'No hay mensajes',

  chat_user: 'Usuario',
  chat_me: 'Yo',
  chat_members: 'miembros',
  chat_typing: 'escribiendo...',
  chat_voiceCall: 'Llamada de voz',
};

/* ----- Deutsch ----- */
export const de: Translations = {
  langName: 'Deutsch',
  langDir: 'ltr',
  langCode: 'de',

  sidebar_chats: 'Chats',
  sidebar_calls: 'Anrufe',
  sidebar_contacts: 'Kontakte',
  sidebar_settings: 'Einstellungen',

  chatList_title: 'Chats',
  chatList_newChat: 'Neuer Chat',
  chatList_search: '?? Suchen...',
  chatList_noChats: 'Keine Chats',
  chatList_noMessages: 'Keine Nachrichten',

  chat_user: 'Benutzer',
  chat_me: 'Ich',
  chat_members: 'Mitglieder',
  chat_typing: 'schreibt...',
  chat_voiceCall: 'Sprachanruf',
};

/* ----- Türkçe ----- */
export const tr: Translations = {
  langName: 'Türkçe',
  langDir: 'ltr',
  langCode: 'tr',

  sidebar_chats: 'Sohbetler',
  sidebar_calls: 'Aramalar',
  sidebar_contacts: 'Kisiler',
  sidebar_settings: 'Ayarlar',

  chatList_title: 'Sohbetler',
  chatList_newChat: 'Yeni sohbet',
  chatList_search: '?? Ara...',
  chatList_noChats: 'Sohbet yok',
  chatList_noMessages: 'Mesaj yok',

  chat_user: 'Kullanici',
  chat_me: 'Ben',
  chat_members: 'üye',
  chat_typing: 'yaziyor...',
  chat_voiceCall: 'Sesli arama',
};

/* ----- ????? (Persian) ----- */
export const fa: Translations = {
  langName: '?????',
  langDir: 'rtl',
  langCode: 'fa',

  sidebar_chats: '???????',
  sidebar_calls: '???????',
  sidebar_contacts: '???????',
  sidebar_settings: '???????',

  chatList_title: '???????',
  chatList_newChat: '?????? ????',
  chatList_search: '?? ?????...',
  chatList_noChats: '??????? ???? ?????',
  chatList_noMessages: '????? ???? ?????',

  chat_user: '?????',
  chat_me: '??',
  chat_members: '???',
  chat_typing: '?? ??? ?????...',
  chat_voiceCall: '???? ????',
};

/* ----- ???? (Urdu) ----- */
export const ur: Translations = {
  langName: '????',
  langDir: 'rtl',
  langCode: 'ur',

  sidebar_chats: '????',
  sidebar_calls: '????',
  sidebar_contacts: '?????',
  sidebar_settings: '???????',

  chatList_title: '????',
  chatList_newChat: '??? ???',
  chatList_search: '?? ????...',
  chatList_noChats: '???? ??? ????',
  chatList_noMessages: '???? ????? ????',

  chat_user: '????',
  chat_me: '???',
  chat_members: '??????',
  chat_typing: '??? ??? ??...',
  chat_voiceCall: '???? ???',
};

/* ----- ?? (Chinese Simplified) ----- */
export const zh: Translations = {
  langName: '??',
  langDir: 'ltr',
  langCode: 'zh',

  sidebar_chats: '??',
  sidebar_calls: '??',
  sidebar_contacts: '???',
  sidebar_settings: '??',

  chatList_title: '??',
  chatList_newChat: '????',
  chatList_search: '?? ??...',
  chatList_noChats: '????',
  chatList_noMessages: '????',

  chat_user: '??',
  chat_me: '?',
  chat_members: '??',
  chat_typing: '????...',
  chat_voiceCall: '????',
};

/* ----- ??? (Japanese) ----- */
export const ja: Translations = {
  langName: '???',
  langDir: 'ltr',
  langCode: 'ja',

  sidebar_chats: '????',
  sidebar_calls: '??',
  sidebar_contacts: '???',
  sidebar_settings: '??',

  chatList_title: '????',
  chatList_newChat: '???????',
  chatList_search: '?? ??...',
  chatList_noChats: '??????',
  chatList_noMessages: '???????',

  chat_user: '????',
  chat_me: '??',
  chat_members: '????',
  chat_typing: '???...',
  chat_voiceCall: '????',
};

/* ----- ??? (Korean) ----- */
export const ko: Translations = {
  langName: '???',
  langDir: 'ltr',
  langCode: 'ko',

  sidebar_chats: '??',
  sidebar_calls: '??',
  sidebar_contacts: '???',
  sidebar_settings: '??',

  chatList_title: '??',
  chatList_newChat: '? ??',
  chatList_search: '?? ??...',
  chatList_noChats: '?? ??',
  chatList_noMessages: '??? ??',

  chat_user: '???',
  chat_me: '?',
  chat_members: '??',
  chat_typing: '?? ?...',
  chat_voiceCall: '?? ??',
};

/* ----- ??????? (Russian) ----- */
export const ru: Translations = {
  langName: '???????',
  langDir: 'ltr',
  langCode: 'ru',

  sidebar_chats: '????',
  sidebar_calls: '??????',
  sidebar_contacts: '????????',
  sidebar_settings: '?????????',

  chatList_title: '????',
  chatList_newChat: '????? ???',
  chatList_search: '?? ?????...',
  chatList_noChats: '??? ?????',
  chatList_noMessages: '??? ?????????',

  chat_user: '????????????',
  chat_me: '?',
  chat_members: '??????????',
  chat_typing: '????????...',
  chat_voiceCall: '????????? ??????',
};

/* ----- Português ----- */
export const pt: Translations = {
  langName: 'Português',
  langDir: 'ltr',
  langCode: 'pt',

  sidebar_chats: 'Conversas',
  sidebar_calls: 'Chamadas',
  sidebar_contacts: 'Contatos',
  sidebar_settings: 'Configurações',

  chatList_title: 'Conversas',
  chatList_newChat: 'Nova conversa',
  chatList_search: '?? Pesquisar...',
  chatList_noChats: 'Sem conversas',
  chatList_noMessages: 'Sem mensagens',

  chat_user: 'Usuário',
  chat_me: 'Eu',
  chat_members: 'membros',
  chat_typing: 'digitando...',
  chat_voiceCall: 'Chamada de voz',
};

/* ----- Italiano ----- */
export const it: Translations = {
  langName: 'Italiano',
  langDir: 'ltr',
  langCode: 'it',

  sidebar_chats: 'Chat',
  sidebar_calls: 'Chiamate',
  sidebar_contacts: 'Contatti',
  sidebar_settings: 'Impostazioni',

  chatList_title: 'Chat',
  chatList_newChat: 'Nuova chat',
  chatList_search: '?? Cerca...',
  chatList_noChats: 'Nessuna chat',
  chatList_noMessages: 'Nessun messaggio',

  chat_user: 'Utente',
  chat_me: 'Io',
  chat_members: 'membri',
  chat_typing: 'sta scrivendo...',
  chat_voiceCall: 'Chiamata vocale',
};

/* ----- ?????? (Hindi) ----- */
export const hi: Translations = {
  langName: '??????',
  langDir: 'ltr',
  langCode: 'hi',

  sidebar_chats: '???',
  sidebar_calls: '???',
  sidebar_contacts: '??????',
  sidebar_settings: '????????',

  chatList_title: '???',
  chatList_newChat: '?? ???',
  chatList_search: '?? ?????...',
  chatList_noChats: '??? ??? ????',
  chatList_noMessages: '??? ????? ????',

  chat_user: '??????????',
  chat_me: '???',
  chat_members: '?????',
  chat_typing: '???? ?? ??? ??...',
  chat_voiceCall: '???? ???',
};

/* ----- Bahasa Indonesia ----- */
export const id: Translations = {
  langName: 'Bahasa Indonesia',
  langDir: 'ltr',
  langCode: 'id',

  sidebar_chats: 'Obrolan',
  sidebar_calls: 'Panggilan',
  sidebar_contacts: 'Kontak',
  sidebar_settings: 'Pengaturan',

  chatList_title: 'Obrolan',
  chatList_newChat: 'Obrolan baru',
  chatList_search: '?? Cari...',
  chatList_noChats: 'Tidak ada obrolan',
  chatList_noMessages: 'Tidak ada pesan',

  chat_user: 'Pengguna',
  chat_me: 'Saya',
  chat_members: 'anggota',
  chat_typing: 'mengetik...',
  chat_voiceCall: 'Panggilan suara',
};

/* ----- Nederlands ----- */
export const nl: Translations = {
  langName: 'Nederlands',
  langDir: 'ltr',
  langCode: 'nl',

  sidebar_chats: 'Chats',
  sidebar_calls: 'Oproepen',
  sidebar_contacts: 'Contacten',
  sidebar_settings: 'Instellingen',

  chatList_title: 'Chats',
  chatList_newChat: 'Nieuwe chat',
  chatList_search: '?? Zoeken...',
  chatList_noChats: 'Geen chats',
  chatList_noMessages: 'Geen berichten',

  chat_user: 'Gebruiker',
  chat_me: 'Ik',
  chat_members: 'leden',
  chat_typing: 'aan het typen...',
  chat_voiceCall: 'Spraakoproep',
};

/* ----- Locale registry ----- */
export const locales: Record<string, Translations> = {
  ar, en, fr, es, de, tr, fa, ur, zh, ja, ko, ru, pt, it, hi, id, nl,
};

export const localeList = Object.values(locales);
export type LocaleCode = keyof typeof locales;
