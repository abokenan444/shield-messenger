import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContactStore, type Contact } from '../lib/store/contactStore';
import { useAuthStore } from '../lib/store/authStore';
import { useTranslation, type Translations } from '../lib/i18n';
import { ShieldIcon } from '../components/icons/ShieldIcon';

export function ContactsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { contacts, friendRequests, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, removeContact, blockContact } = useContactStore();
  const { userId, publicKey } = useAuthStore();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'contacts' | 'requests' | 'add'>('contacts');
  const [showQR, setShowQR] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const filteredContacts = contacts.filter(
    (c) =>
      !c.blocked &&
      c.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  const blockedContacts = contacts.filter((c) => c.blocked);
  const pendingRequests = friendRequests.filter((r) => r.status === 'pending');
  const incomingRequests = pendingRequests.filter((r) => r.direction === 'incoming');
  const outgoingRequests = pendingRequests.filter((r) => r.direction === 'outgoing');

  const myOnion = userId ? `${userId.slice(0, 16)}...onion` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(myOnion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendRequest = () => {
    if (!newAddress.trim()) return;
    useContactStore.getState().addFriendRequest({
      id: 'fr-' + Date.now(),
      fromId: userId || '',
      fromName: '',
      fromOnion: newAddress.trim(),
      direction: 'outgoing',
      timestamp: Date.now(),
      status: 'pending',
    });
    setNewAddress('');
    setRequestSent(true);
    setTimeout(() => setRequestSent(false), 3000);
  };

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-dark-400 hover:text-dark-200 transition">←</button>
        <h1 className="text-xl font-semibold">{t.contacts_title}</h1>
        <div className="flex-1" />
        <button
          onClick={() => setShowQR(!showQR)}
          className="px-3 py-1.5 bg-dark-800 rounded-lg text-sm text-dark-200 hover:bg-dark-700 transition"
        >
          {t.contacts_myQR}
        </button>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="max-w-2xl mx-auto px-6 pt-4">
          <div className="card text-center">
            <div className="w-48 h-48 mx-auto bg-white rounded-xl flex items-center justify-center mb-4">
              <div className="text-6xl">📱</div>
            </div>
            <p className="text-sm text-dark-400 mb-2">{t.contacts_onionAddress}</p>
            <code className="text-xs text-primary-400 bg-dark-800 px-3 py-1 rounded" dir="ltr">{myOnion}</code>
            <button
              onClick={handleCopy}
              className="block mx-auto mt-3 text-sm text-primary-400 hover:text-primary-300"
            >
              {copied ? t.contacts_copied : t.contacts_copyAddress}
            </button>
            {publicKey && (
              <p className="text-xs text-dark-500 mt-2 truncate" dir="ltr">
                🔑 {publicKey.slice(0, 32)}...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-6 pt-4">
        <div className="flex gap-2 mb-4">
          {(['contacts', 'requests', 'add'] as const).map((t2) => (
            <button
              key={t2}
              onClick={() => setTab(t2)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                tab === t2 ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {t2 === 'contacts' ? t.contacts_title : t2 === 'requests' ? t.friends_incoming : t.contacts_addFriend}
              {t2 === 'requests' && incomingRequests.length > 0 && (
                <span className="ms-2 bg-red-500 text-white text-xs px-1.5 rounded-full">{incomingRequests.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-6 space-y-4">
        {/* Contacts Tab */}
        {tab === 'contacts' && (
          <>
            <input
              type="text"
              placeholder={t.contacts_search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-full"
            />

            {filteredContacts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-dark-400">{t.contacts_noContacts}</p>
                <p className="text-dark-500 text-sm mt-2">{t.contacts_addDesc}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredContacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onRemove={() => removeContact(contact.id)}
                    onBlock={() => blockContact(contact.id)}
                    t={t}
                  />
                ))}
              </div>
            )}

            {blockedContacts.length > 0 && (
              <>
                <h3 className="text-sm text-dark-500 mt-6">{t.contacts_blocked} ({blockedContacts.length})</h3>
                {blockedContacts.map((c) => (
                  <div key={c.id} className="card flex items-center gap-3 opacity-50">
                    <div className="avatar-sm">{c.displayName[0]}</div>
                    <span className="text-dark-400 text-sm">{c.displayName}</span>
                    <span className="text-red-500 text-xs ms-auto">{t.contacts_blocked}</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* Requests Tab */}
        {tab === 'requests' && (
          <>
            {incomingRequests.length > 0 && (
              <div>
                <h3 className="text-sm text-dark-400 mb-3">{t.friends_incoming}</h3>
                {incomingRequests.map((req) => (
                  <div key={req.id} className="card flex items-center gap-3 mb-2">
                    <div className="avatar-sm bg-yellow-900">{req.fromName[0]}</div>
                    <div className="flex-1">
                      <p className="font-medium">{req.fromName}</p>
                      <p className="text-xs text-dark-500" dir="ltr">{req.fromOnion}</p>
                    </div>
                    <button
                      onClick={() => acceptFriendRequest(req.id)}
                      className="px-3 py-1 bg-primary-600 rounded-lg text-sm hover:bg-primary-700 transition"
                    >
                      {t.friends_accept}
                    </button>
                    <button
                      onClick={() => rejectFriendRequest(req.id)}
                      className="px-3 py-1 bg-dark-700 rounded-lg text-sm hover:bg-dark-600 transition"
                    >
                      {t.friends_reject}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {outgoingRequests.length > 0 && (
              <div>
                <h3 className="text-sm text-dark-400 mb-3">{t.friends_outgoing}</h3>
                {outgoingRequests.map((req) => (
                  <div key={req.id} className="card flex items-center gap-3 mb-2">
                    <div className="avatar-sm">{req.fromOnion[0]}</div>
                    <div className="flex-1">
                      <p className="text-sm" dir="ltr">{req.fromOnion}</p>
                      <p className="text-xs text-dark-500">{t.contacts_pending}</p>
                    </div>
                    <button
                      onClick={() => cancelFriendRequest(req.id)}
                      className="px-3 py-1 bg-dark-700 rounded-lg text-sm text-red-400 hover:bg-dark-600 transition"
                    >
                      {t.friends_cancel}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingRequests.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📨</div>
                <p className="text-dark-400">{t.friends_noRequests}</p>
              </div>
            )}
          </>
        )}

        {/* Add Friend Tab */}
        {tab === 'add' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-semibold mb-4">{t.friends_sendRequest}</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.friends_enterAddress}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="input-field flex-1"
                  dir="ltr"
                />
                <button
                  onClick={handleSendRequest}
                  disabled={!newAddress.trim()}
                  className="btn-primary px-4 disabled:opacity-30"
                >
                  {t.chat_send}
                </button>
              </div>
              {requestSent && (
                <p className="text-primary-400 text-sm mt-2">{t.friends_requestSent}</p>
              )}
            </div>

            <div className="card text-center">
              <h3 className="font-semibold mb-4">{t.contacts_scanQR}</h3>
              <div className="w-64 h-64 mx-auto bg-dark-800 rounded-xl flex items-center justify-center border-2 border-dashed border-dark-600">
                <div className="text-center">
                  <div className="text-5xl mb-2">📷</div>
                  <p className="text-dark-400 text-sm">{t.contacts_scanQR}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactCard({
  contact,
  onRemove,
  onBlock,
  t,
}: {
  contact: Contact;
  onRemove: () => void;
  onBlock: () => void;
  t: Translations;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="card flex items-center gap-3 hover:bg-dark-800/50 transition">
      <div className="relative">
        <div className="avatar-sm">{contact.displayName[0]}</div>
        <div
          className={`absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-dark-900 ${
            contact.status === 'online' ? 'bg-green-500' : 'bg-dark-600'
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{contact.displayName}</span>
          {contact.verified && (
            <ShieldIcon className="w-4 h-4 text-primary-400 shrink-0" />
          )}
        </div>
        <p className="text-xs text-dark-500 truncate" dir="ltr">{contact.onionAddress}</p>
      </div>
      <span className={`text-xs ${contact.status === 'online' ? 'text-green-400' : 'text-dark-500'}`}>
        {contact.status === 'online' ? t.contacts_online : t.contacts_offline}
      </span>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-dark-500 hover:text-dark-300 px-1"
        >
          ⋮
        </button>
        {showMenu && (
          <div className="absolute end-0 top-6 bg-dark-800 border border-dark-700 rounded-lg py-1 min-w-32 z-10 shadow-xl">
            <button
              onClick={() => { onRemove(); setShowMenu(false); }}
              className="w-full px-3 py-1.5 text-start text-sm text-dark-300 hover:bg-dark-700"
            >
              {t.contacts_remove}
            </button>
            <button
              onClick={() => { onBlock(); setShowMenu(false); }}
              className="w-full px-3 py-1.5 text-start text-sm text-red-400 hover:bg-dark-700"
            >
              {t.contacts_block}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
