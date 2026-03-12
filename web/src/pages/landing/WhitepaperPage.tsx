import { useTranslation } from '../../lib/i18n';
import { getLandingT } from '../../lib/i18n/landingLocales';
import { MermaidDiagram } from '../../components/MermaidDiagram';

const HANDSHAKE_DIAGRAM = `sequenceDiagram
    participant Alice as Alice (Sender)
    participant Tor as Tor Network
    participant Bob as Bob (Recipient)

    Note over Alice, Bob: Phase 1: Initial Request (PIN Encrypted)
    Alice->>Tor: Send Request (Encrypted with PIN)
    Tor->>Bob: Deliver to Discovery Onion
    
    Note over Bob: Decrypts with PIN & Verifies Identity
    
    Note over Alice, Bob: Phase 2: Hybrid KEX (X25519 + ML-KEM)
    Bob->>Tor: Send Acceptance + Messaging Onion
    Tor->>Alice: Key Encapsulation Message
    
    Note over Alice: Computes Shared Secret (Post-Quantum)
    
    Note over Alice, Bob: Phase 3: Mutual Acknowledgment
    Alice->>Tor: Confirm Session Keys
    Tor->>Bob: Final Handshake ACK
    
    Note over Alice, Bob: Secure P2P Channel Established`;

const NETWORK_DIAGRAM = `graph TD
    subgraph User_Device ["Shield Messenger Client"]
        Core["Rust Crypto Core"]
        DB[("SQLCipher DB")]
        Keys{"Hardware Keystore"}
    end

    subgraph Tor_Hidden_Services ["Tor Layer"]
        HS1["Discovery Service: Port Dynamic"]
        HS2["Friend Request: Port 9151"]
        HS3["Messaging/Voice: Port 9150"]
    end

    User_Device --> HS1
    User_Device --> HS2
    User_Device --> HS3

    HS3 <--> Peer["Remote Peer via Tor Circuit"]
    
    style User_Device fill:#4c1d95,stroke:#7c3aed,stroke-width:2px,color:#e2e8f0
    style Tor_Hidden_Services fill:#1e1b4b,stroke:#6d28d9,stroke-width:2px,color:#e2e8f0`;

export function WhitepaperPage() {
  const { locale } = useTranslation();
  const t = getLandingT(locale);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t.wp_title}</h1>
      <p className="text-dark-400 text-sm mb-8">{t.wp_version}</p>
      <p className="text-dark-300 text-lg leading-relaxed mb-12">{t.wp_intro}</p>

      {/* ── Section 1: Architecture Overview ── */}
      <SectionBlock title={t.wp_arch_title} body={t.wp_arch_body} />

      {/* ── Diagram: Three-Phase Handshake ── */}
      <MermaidDiagram chart={HANDSHAKE_DIAGRAM} title={t.wp_diagram_handshake_title} />

      {/* ── Diagram: Network Architecture ── */}
      <MermaidDiagram chart={NETWORK_DIAGRAM} title={t.wp_diagram_network_title} />

      {/* ── Section 2: Data Transmission ── */}
      <SectionBlock title={t.wp_transmission_title} body={t.wp_transmission_body} />
      <BulletList items={[t.wp_transmission_b1, t.wp_transmission_b2, t.wp_transmission_b3, t.wp_transmission_b4]} />

      {/* ── Section 3: Local-Only Storage ── */}
      <SectionBlock title={t.wp_storage_title} body={t.wp_storage_body} />
      <BulletList items={[t.wp_storage_b1, t.wp_storage_b2, t.wp_storage_b3, t.wp_storage_b4]} />

      {/* ── Highlighted Box: What the server stores ── */}
      <div className="my-8 bg-primary-900/20 border border-primary-800/50 rounded-2xl p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-xl">🗄️</span> {t.wp_server_stores_title}
        </h3>
        <p className="text-primary-200 leading-relaxed mb-4">{t.wp_server_stores_body}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatBox label={t.wp_server_stat1_label} value={t.wp_server_stat1_value} />
          <StatBox label={t.wp_server_stat2_label} value={t.wp_server_stat2_value} />
          <StatBox label={t.wp_server_stat3_label} value={t.wp_server_stat3_value} />
        </div>
      </div>

      {/* ── Section 4: Why Admin Cannot Read Messages ── */}
      <SectionBlock title={t.wp_admin_title} body={t.wp_admin_body} />
      <BulletList items={[t.wp_admin_b1, t.wp_admin_b2, t.wp_admin_b3, t.wp_admin_b4, t.wp_admin_b5]} />

      {/* ─── Section 5: Voice Calls ─── */}
      <SectionBlock title={t.wp_calls_title} body={t.wp_calls_body} />
      <BulletList items={[t.wp_calls_b1, t.wp_calls_b2, t.wp_calls_b3, t.wp_calls_b4]} />

      {/* ── Section 6: Cryptographic Primitives ── */}
      <SectionBlock title={t.wp_crypto_title} body={t.wp_crypto_body} />
      <div className="my-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left text-dark-300 py-2 pr-4 font-semibold">{t.wp_crypto_col_purpose}</th>
              <th className="text-left text-dark-300 py-2 font-semibold">{t.wp_crypto_col_algorithm}</th>
            </tr>
          </thead>
          <tbody className="text-dark-400">
            <tr className="border-b border-dark-800"><td className="py-2 pr-4">{t.wp_crypto_row1_purpose}</td><td className="py-2 font-mono text-primary-400">{t.wp_crypto_row1_algo}</td></tr>
            <tr className="border-b border-dark-800"><td className="py-2 pr-4">{t.wp_crypto_row2_purpose}</td><td className="py-2 font-mono text-primary-400">{t.wp_crypto_row2_algo}</td></tr>
            <tr className="border-b border-dark-800"><td className="py-2 pr-4">{t.wp_crypto_row3_purpose}</td><td className="py-2 font-mono text-primary-400">{t.wp_crypto_row3_algo}</td></tr>
            <tr className="border-b border-dark-800"><td className="py-2 pr-4">{t.wp_crypto_row4_purpose}</td><td className="py-2 font-mono text-primary-400">{t.wp_crypto_row4_algo}</td></tr>
            <tr className="border-b border-dark-800"><td className="py-2 pr-4">{t.wp_crypto_row5_purpose}</td><td className="py-2 font-mono text-primary-400">{t.wp_crypto_row5_algo}</td></tr>
            <tr><td className="py-2 pr-4">{t.wp_crypto_row6_purpose}</td><td className="py-2 font-mono text-primary-400">{t.wp_crypto_row6_algo}</td></tr>
          </tbody>
        </table>
      </div>

      {/* ── Closing ── */}
      <blockquote className="mt-12 bg-primary-900/20 border border-primary-800/50 rounded-2xl p-8">
        <p className="text-primary-200 text-lg leading-relaxed font-medium italic">
          {t.wp_closing}
        </p>
      </blockquote>

      <p className="text-dark-500 text-sm mt-8">{t.wp_version}</p>
    </div>
  );
}

function SectionBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      <p className="text-dark-300 leading-relaxed">{body}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-2 mb-8 pl-2">
      {items.map((item, i) => (
        <li key={i} className="text-dark-300 leading-relaxed">{item}</li>
      ))}
    </ul>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-dark-900/50 rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-primary-400">{value}</p>
      <p className="text-dark-400 text-sm mt-1">{label}</p>
    </div>
  );
}
