import { useTranslation } from '../../lib/i18n';
import { getLandingT } from '../../lib/i18n/landingLocales';
import { Link } from 'react-router-dom';

export function TPLinkSetupPage() {
  const { locale } = useTranslation();
  const t = getLandingT(locale);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      {/* Header */}
      <div className="mb-12">
        <Link to="/aethernet" className="text-primary-400 text-sm hover:text-primary-300 transition-colors mb-4 inline-flex items-center gap-1">
          ← {t.tp_back}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-4 mb-4">{t.tp_title}</h1>
        <p className="text-dark-300 text-lg leading-relaxed">{t.tp_intro}</p>
      </div>

      {/* Requirements */}
      <Section title={t.tp_req_title}>
        <ul className="space-y-3">
          <Bullet text={t.tp_req1} />
          <Bullet text={t.tp_req2} />
          <Bullet text={t.tp_req3} />
          <Bullet text={t.tp_req4} />
        </ul>
      </Section>

      {/* Compatible Models */}
      <Section title={t.tp_models_title}>
        <p className="text-dark-300 leading-relaxed mb-4">{t.tp_models_body}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <ModelCard name="TP-Link Deco M5" tag={t.tp_model_rec} />
          <ModelCard name="TP-Link Deco X20" tag={t.tp_model_rec} />
          <ModelCard name="TP-Link Deco X50" tag={t.tp_model_adv} />
          <ModelCard name="TP-Link Deco XE75" tag={t.tp_model_adv} />
          <ModelCard name="TP-Link Archer AX50" tag={t.tp_model_single} />
          <ModelCard name="TP-Link RE605X" tag={t.tp_model_range} />
        </div>
      </Section>

      {/* Step 1: Initial Setup */}
      <StepSection number="1" title={t.tp_step1_title}>
        <p className="text-dark-300 leading-relaxed mb-4">{t.tp_step1_body}</p>
        <ol className="space-y-3">
          <NumberedStep n="1" text={t.tp_step1_s1} />
          <NumberedStep n="2" text={t.tp_step1_s2} />
          <NumberedStep n="3" text={t.tp_step1_s3} />
          <NumberedStep n="4" text={t.tp_step1_s4} />
        </ol>
      </StepSection>

      {/* Step 2: Network Configuration */}
      <StepSection number="2" title={t.tp_step2_title}>
        <p className="text-dark-300 leading-relaxed mb-4">{t.tp_step2_body}</p>
        <ol className="space-y-3">
          <NumberedStep n="1" text={t.tp_step2_s1} />
          <NumberedStep n="2" text={t.tp_step2_s2} />
          <NumberedStep n="3" text={t.tp_step2_s3} />
          <NumberedStep n="4" text={t.tp_step2_s4} />
        </ol>
        <div className="mt-6 bg-amber-950/30 border border-amber-900/50 rounded-xl p-4">
          <p className="text-amber-300 text-sm flex items-start gap-2">
            <span className="text-lg mt-0.5">⚠️</span>
            {t.tp_step2_warn}
          </p>
        </div>
        <div className="mt-3 bg-green-950/30 border border-green-900/50 rounded-xl p-4">
          <p className="text-green-300 text-sm flex items-start gap-2">
            <span className="text-lg mt-0.5">🛡️</span>
            {t.tp_step2_security}
          </p>
        </div>
      </StepSection>

      {/* Step 3: Mesh Network */}
      <StepSection number="3" title={t.tp_step3_title}>
        <p className="text-dark-300 leading-relaxed mb-4">{t.tp_step3_body}</p>
        <ol className="space-y-3">
          <NumberedStep n="1" text={t.tp_step3_s1} />
          <NumberedStep n="2" text={t.tp_step3_s2} />
          <NumberedStep n="3" text={t.tp_step3_s3} />
          <NumberedStep n="4" text={t.tp_step3_s4} />
        </ol>
      </StepSection>

      {/* Step 4: Shield Messenger Config */}
      <StepSection number="4" title={t.tp_step4_title}>
        <p className="text-dark-300 leading-relaxed mb-4">{t.tp_step4_body}</p>
        <ol className="space-y-3">
          <NumberedStep n="1" text={t.tp_step4_s1} />
          <NumberedStep n="2" text={t.tp_step4_s2} />
          <NumberedStep n="3" text={t.tp_step4_s3} />
        </ol>
      </StepSection>

      {/* Step 5: Advanced — OpenWrt */}
      <StepSection number="5" title={t.tp_step5_title}>
        <p className="text-dark-300 leading-relaxed mb-4">{t.tp_step5_body}</p>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4 font-mono text-sm text-dark-200 overflow-x-auto mb-4">
          <pre>{`# Install OpenWrt on TP-Link (if supported)
# Download firmware from openwrt.org for your model
# IMPORTANT: Your device needs at least 64MB RAM for Tor

# After OpenWrt installation:
opkg update
opkg install tor tor-geoip

# Verify available RAM before proceeding
free -m   # Look for 64MB+ total memory

# Configure Tor
cat > /etc/tor/torrc << EOF
SocksPort 0.0.0.0:9050
SocksPolicy accept 192.168.1.0/24
SocksPolicy reject *
EOF

# Enable and start Tor
/etc/init.d/tor enable
/etc/init.d/tor start

# Install mDNS for local device discovery (avahi)
opkg install avahi-daemon
/etc/init.d/avahi-daemon enable
/etc/init.d/avahi-daemon start

# Configure firewall to allow SOCKS + mDNS
uci add firewall rule
uci set firewall.@rule[-1].name='Allow-Tor-SOCKS'
uci set firewall.@rule[-1].src='lan'
uci set firewall.@rule[-1].dest_port='9050'
uci set firewall.@rule[-1].proto='tcp'
uci set firewall.@rule[-1].target='ACCEPT'
uci commit firewall
/etc/init.d/firewall restart`}</pre>
        </div>
        <p className="text-dark-400 text-sm">{t.tp_step5_note}</p>
      </StepSection>

      {/* Step 6: Testing */}
      <StepSection number="6" title={t.tp_step6_title}>
        <p className="text-dark-300 leading-relaxed mb-4">{t.tp_step6_body}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <TestCard icon="✅" label={t.tp_test1} />
          <TestCard icon="✅" label={t.tp_test2} />
          <TestCard icon="✅" label={t.tp_test3} />
          <TestCard icon="✅" label={t.tp_test4} />
        </div>
      </StepSection>

      {/* Troubleshooting */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-white mb-6">{t.tp_trouble_title}</h2>
        <div className="space-y-4">
          <TroubleItem q={t.tp_trouble_q1} a={t.tp_trouble_a1} />
          <TroubleItem q={t.tp_trouble_q2} a={t.tp_trouble_a2} />
          <TroubleItem q={t.tp_trouble_q3} a={t.tp_trouble_a3} />
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-16 text-center">
        <Link
          to="/download"
          className="btn-primary text-lg px-8 py-4 rounded-2xl shadow-xl shadow-primary-600/20 inline-flex items-center gap-3"
        >
          {t.tp_cta}
        </Link>
      </div>

      <p className="text-dark-500 text-sm mt-8 text-center">{t.tp_updated}</p>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

function StepSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
          {number}
        </div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-dark-300 text-sm">
      <span className="text-primary-400 mt-1">●</span>
      {text}
    </li>
  );
}

function NumberedStep({ n, text }: { n: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 bg-dark-800 border border-dark-700 rounded-lg flex items-center justify-center text-primary-400 text-xs font-bold shrink-0 mt-0.5">{n}</span>
      <span className="text-dark-300 text-sm">{text}</span>
    </li>
  );
}

function ModelCard({ name, tag }: { name: string; tag: string }) {
  return (
    <div className="flex items-center justify-between bg-dark-900/60 border border-dark-800 rounded-xl px-4 py-3">
      <span className="text-dark-200 text-sm font-medium">{name}</span>
      <span className="text-primary-400 text-xs bg-primary-900/30 border border-primary-800/50 px-2 py-0.5 rounded-full">{tag}</span>
    </div>
  );
}

function TestCard({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-3 bg-dark-900/60 border border-dark-800 rounded-xl p-4">
      <span className="text-lg">{icon}</span>
      <span className="text-dark-300 text-sm">{label}</span>
    </div>
  );
}

function TroubleItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-dark-900/60 border border-dark-800 rounded-xl p-5">
      <h3 className="text-white font-medium text-sm mb-2">{q}</h3>
      <p className="text-dark-400 text-sm leading-relaxed">{a}</p>
    </div>
  );
}
