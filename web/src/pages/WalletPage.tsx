import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletStore, type WalletTransaction } from '../lib/store/walletStore';
import { useTranslation } from '../lib/i18n';

export function WalletPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasWallet, walletType, address, tokens, transactions, totalUsdBalance, createWallet, importWallet } = useWalletStore();
  const [tab, setTab] = useState<'tokens' | 'history'>('tokens');
  const [showSend, setShowSend] = useState(false);
  const [copied, setCopied] = useState(false);

  // Wallet creation state
  const [setupStep, setSetupStep] = useState<'choose' | 'import' | null>(null);
  const [selectedType, setSelectedType] = useState<'solana' | 'zcash'>('solana');
  const [seedInput, setSeedInput] = useState('');

  // Send state
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendToken, setSendToken] = useState('SOL');

  const handleCopy = () => {
    if (address) navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (!sendTo.trim() || !sendAmount) return;
    useWalletStore.getState().addTransaction({
      id: 'tx-' + Date.now(),
      type: 'send',
      token: sendToken,
      amount: parseFloat(sendAmount),
      address: sendTo,
      timestamp: Date.now(),
      status: 'pending',
      txHash: '0x' + Math.random().toString(16).slice(2, 18),
    });
    setShowSend(false);
    setSendTo('');
    setSendAmount('');
  };

  if (!hasWallet) {
    return (
      <div className="min-h-screen bg-dark-950">
        <div className="bg-dark-900 border-b border-dark-800 px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-dark-400 hover:text-dark-200 transition">←</button>
          <h1 className="text-xl font-semibold">{t.wallet_title}</h1>
        </div>

        <div className="max-w-md mx-auto p-6 mt-16">
          {!setupStep && (
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4">💰</div>
              <h2 className="text-2xl font-bold">{t.wallet_title}</h2>
              <p className="text-dark-400">{t.wallet_noWallet}</p>
              <div className="space-y-3">
                <button
                  onClick={() => setSetupStep('choose')}
                  className="btn-primary w-full py-3"
                >
                  {t.wallet_createWallet}
                </button>
                <button
                  onClick={() => setSetupStep('import')}
                  className="w-full py-3 bg-dark-800 rounded-xl text-dark-200 hover:bg-dark-700 transition"
                >
                  {t.wallet_importWallet}
                </button>
              </div>
            </div>
          )}

          {setupStep === 'choose' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t.wallet_createWallet}</h2>
              <div className="space-y-3">
                {(['solana', 'zcash'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setSelectedType(type); }}
                    className={`w-full card flex items-center gap-4 transition ${
                      selectedType === type ? 'border-primary-500 border' : ''
                    }`}
                  >
                    <span className="text-3xl">{type === 'solana' ? '◎' : 'Ⓩ'}</span>
                    <div className="text-start">
                      <p className="font-medium">{type === 'solana' ? 'Solana' : 'Zcash'}</p>
                      <p className="text-xs text-dark-500">
                        {type === 'solana' ? 'SOL + USDC + Jupiter DEX' : 'ZEC — ' + t.wallet_shielded}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => { createWallet(selectedType); setSetupStep(null); }}
                className="btn-primary w-full py-3 mt-4"
              >
                {t.wallet_createWallet} {selectedType === 'solana' ? 'Solana' : 'Zcash'}
              </button>
              <button onClick={() => setSetupStep(null)} className="text-dark-400 text-sm hover:text-dark-200 w-full text-center">
                ← {t.settings_back}
              </button>
            </div>
          )}

          {setupStep === 'import' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t.wallet_importWallet}</h2>
              <div className="flex gap-2 mb-2">
                {(['solana', 'zcash'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-lg text-sm transition ${
                      selectedType === type ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300'
                    }`}
                  >
                    {type === 'solana' ? 'Solana' : 'Zcash'}
                  </button>
                ))}
              </div>
              <textarea
                placeholder={t.wallet_seedPhrase}
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                className="input-field w-full h-28 resize-none"
                dir="ltr"
              />
              <button
                onClick={() => { importWallet(selectedType, seedInput); setSetupStep(null); setSeedInput(''); }}
                disabled={!seedInput.trim()}
                className="btn-primary w-full py-3 disabled:opacity-30"
              >
                {t.wallet_importWallet}
              </button>
              <button onClick={() => setSetupStep(null)} className="text-dark-400 text-sm hover:text-dark-200 w-full text-center">
                ← {t.settings_back}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-dark-400 hover:text-dark-200 transition">←</button>
        <h1 className="text-xl font-semibold">{t.wallet_title}</h1>
        <span className="text-xs bg-dark-800 px-2 py-0.5 rounded text-dark-400">
          {walletType === 'solana' ? 'Solana' : 'Zcash'}
        </span>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Balance Card */}
        <div className="card text-center">
          <p className="text-dark-400 text-sm mb-1">{t.wallet_totalBalance}</p>
          <p className="text-4xl font-bold text-white mb-1">${totalUsdBalance.toFixed(2)}</p>
          <p className="text-xs text-dark-500 truncate" dir="ltr">{address}</p>
          <button onClick={handleCopy} className="text-xs text-primary-400 hover:text-primary-300 mt-1">
            {copied ? t.contacts_copied : t.contacts_copyAddress}
          </button>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={() => setShowSend(true)}
              className="px-6 py-2 bg-primary-600 rounded-xl text-sm hover:bg-primary-700 transition"
            >
              {t.wallet_send}
            </button>
            <button className="px-6 py-2 bg-dark-700 rounded-xl text-sm hover:bg-dark-600 transition">
              {t.wallet_receive}
            </button>
            {walletType === 'solana' && (
              <button className="px-6 py-2 bg-dark-700 rounded-xl text-sm hover:bg-dark-600 transition">
                {t.wallet_swap}
              </button>
            )}
          </div>
        </div>

        {/* Send Dialog */}
        {showSend && (
          <div className="card border border-primary-800">
            <h3 className="font-semibold mb-4">{t.wallet_send}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-dark-400 block mb-1">{t.wallet_sendTo}</label>
                <input
                  type="text"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  className="input-field w-full"
                  placeholder={t.wallet_sendTo}
                  dir="ltr"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-sm text-dark-400 block mb-1">{t.wallet_amount}</label>
                  <input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="input-field w-full"
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm text-dark-400 block mb-1">&nbsp;</label>
                  <select
                    value={sendToken}
                    onChange={(e) => setSendToken(e.target.value)}
                    className="bg-dark-800 text-dark-200 text-sm rounded-lg px-3 py-2 border border-dark-700"
                  >
                    {tokens.map((tk) => (
                      <option key={tk.symbol} value={tk.symbol}>{tk.symbol}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSend} disabled={!sendTo.trim() || !sendAmount} className="btn-primary flex-1 disabled:opacity-30">
                  {t.wallet_sendConfirm}
                </button>
                <button onClick={() => setShowSend(false)} className="px-4 py-2 bg-dark-700 rounded-xl hover:bg-dark-600 transition">
                  {t.friends_cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Token/History Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('tokens')}
            className={`px-4 py-2 rounded-lg text-sm transition ${tab === 'tokens' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'}`}
          >
            {t.wallet_tokens}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-lg text-sm transition ${tab === 'history' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'}`}
          >
            {t.wallet_transactions}
          </button>
        </div>

        {tab === 'tokens' && (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div key={token.symbol} className="card flex items-center gap-3">
                <span className="text-2xl">{token.icon}</span>
                <div className="flex-1">
                  <p className="font-medium">{token.name}</p>
                  <p className="text-xs text-dark-500">{token.symbol}</p>
                </div>
                <div className="text-end">
                  <p className="font-medium" dir="ltr">{token.balance.toFixed(4)}</p>
                  <p className="text-xs text-dark-500" dir="ltr">${token.usdValue.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📄</div>
                <p className="text-dark-400">{t.wallet_noTransactions}</p>
              </div>
            ) : (
              transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TxRow({ tx }: { tx: WalletTransaction }) {
  const icon = tx.type === 'send' ? '↗️' : tx.type === 'receive' ? '↙️' : '🔄';
  const color = tx.type === 'send' ? 'text-red-400' : tx.type === 'receive' ? 'text-green-400' : 'text-blue-400';
  return (
    <div className="card flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium capitalize">{tx.type}</p>
        <p className="text-xs text-dark-500 truncate" dir="ltr">{tx.address}</p>
      </div>
      <div className="text-end">
        <p className={`font-medium ${color}`} dir="ltr">
          {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.token}
        </p>
        <p className="text-xs text-dark-500">
          {new Date(tx.timestamp).toLocaleDateString()}
        </p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded ${
        tx.status === 'confirmed' ? 'bg-green-900/30 text-green-400' :
        tx.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
        'bg-red-900/30 text-red-400'
      }`}>
        {tx.status}
      </span>
    </div>
  );
}
