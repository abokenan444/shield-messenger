import { useTranslation } from '../../lib/i18n';
import { getLandingT } from '../../lib/i18n/landingLocales';
import { Link } from 'react-router-dom';

export function AetherNetPage() {
  const { locale } = useTranslation();
  const t = getLandingT(locale);

  return (
    <div>
      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/20 via-dark-950 to-dark-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary-600/30">
              <span className="text-4xl">🌐</span>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-4xl mx-auto mb-6">
            {t.an_title}
          </h1>
          <p className="text-lg sm:text-xl text-dark-300 max-w-3xl mx-auto leading-relaxed">
            {t.an_subtitle}
          </p>
        </div>
      </section>

      {/* ═══ What is AetherNet ═══ */}
      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-6">{t.an_what_title}</h2>
          <p className="text-dark-300 text-lg leading-relaxed mb-12">{t.an_what_body}</p>

          {/* Transport Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <TransportCard
              icon="🧅"
              name={t.an_tor_name}
              desc={t.an_tor_desc}
              badge={t.an_tor_badge}
              badgeColor="text-purple-400 bg-purple-900/30 border-purple-800/50"
            />
            <TransportCard
              icon="🧄"
              name={t.an_i2p_name}
              desc={t.an_i2p_desc}
              badge={t.an_i2p_badge}
              badgeColor="text-blue-400 bg-blue-900/30 border-blue-800/50"
            />
            <TransportCard
              icon="📡"
              name={t.an_mesh_name}
              desc={t.an_mesh_desc}
              badge={t.an_mesh_badge}
              badgeColor="text-amber-400 bg-amber-900/30 border-amber-800/50"
            />
          </div>
        </div>
      </section>

      {/* ═══ Smart Switching ═══ */}
      <section className="py-16 lg:py-24 border-t border-dark-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">{t.an_switch_title}</h2>
          <p className="text-dark-300 text-lg leading-relaxed mb-10">{t.an_switch_body}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ScoreFactor icon="🛡️" label={t.an_factor_anonymity} weight="35%" />
            <ScoreFactor icon="⚡" label={t.an_factor_latency} weight="20%" />
            <ScoreFactor icon="✅" label={t.an_factor_reliability} weight="20%" />
            <ScoreFactor icon="📶" label={t.an_factor_bandwidth} weight="10%" />
            <ScoreFactor icon="🔋" label={t.an_factor_battery} weight="10%" />
            <ScoreFactor icon="⚠️" label={t.an_factor_threat} weight="5%" />
          </div>
        </div>
      </section>

      {/* ═══ Crisis Mode ═══ */}
      <section className="py-16 lg:py-24 border-t border-dark-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-8 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-red-300 mb-4 flex items-center gap-3">
              <span className="text-3xl">🚨</span> {t.an_crisis_title}
            </h2>
            <p className="text-dark-300 leading-relaxed mb-8">{t.an_crisis_body}</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <CrisisFeature icon="🔄" text={t.an_crisis_f1} />
              <CrisisFeature icon="📏" text={t.an_crisis_f2} />
              <CrisisFeature icon="👻" text={t.an_crisis_f3} />
              <CrisisFeature icon="🔑" text={t.an_crisis_f4} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Store & Forward ═══ */}
      <section className="py-16 lg:py-24 border-t border-dark-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">{t.an_store_title}</h2>
          <p className="text-dark-300 text-lg leading-relaxed mb-8">{t.an_store_body}</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <FeatureBox icon="🔐" text={t.an_store_f1} />
            <FeatureBox icon="📊" text={t.an_store_f2} />
            <FeatureBox icon="🔁" text={t.an_store_f3} />
            <FeatureBox icon="⏳" text={t.an_store_f4} />
          </div>
        </div>
      </section>

      {/* ═══ Trust Map ═══ */}
      <section className="py-16 lg:py-24 border-t border-dark-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">{t.an_trust_title}</h2>
          <p className="text-dark-300 text-lg leading-relaxed mb-8">{t.an_trust_body}</p>

          <div className="bg-primary-900/20 border border-primary-800/50 rounded-2xl p-8">
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-primary-400">100%</p>
                <p className="text-dark-400 text-sm mt-1">{t.an_trust_stat1}</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary-400">0</p>
                <p className="text-dark-400 text-sm mt-1">{t.an_trust_stat2}</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary-400">∞</p>
                <p className="text-dark-400 text-sm mt-1">{t.an_trust_stat3}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Solidarity Protocol ═══ */}
      <section className="py-16 lg:py-24 border-t border-dark-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">{t.an_solidarity_title}</h2>
          <p className="text-dark-300 text-lg leading-relaxed mb-8">{t.an_solidarity_body}</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <FeatureBox icon="🤝" text={t.an_solidarity_f1} />
            <FeatureBox icon="🧅" text={t.an_solidarity_f2} />
            <FeatureBox icon="⭐" text={t.an_solidarity_f3} />
            <FeatureBox icon="🎛️" text={t.an_solidarity_f4} />
          </div>
        </div>
      </section>

      {/* ═══ Mesh Setup CTA ═══ */}
      <section className="py-16 lg:py-24 border-t border-dark-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t.an_setup_title}</h2>
          <p className="text-dark-300 text-lg mb-8">{t.an_setup_body}</p>
          <Link
            to="/tplink-setup"
            className="btn-primary text-lg px-8 py-4 rounded-2xl shadow-xl shadow-primary-600/20 inline-flex items-center gap-3"
          >
            <span className="text-xl">📶</span>
            {t.an_setup_cta}
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ── */

function TransportCard({ icon, name, desc, badge, badgeColor }: { icon: string; name: string; desc: string; badge: string; badgeColor: string }) {
  return (
    <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-6 hover:border-primary-800/50 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{name}</h3>
      <p className="text-dark-400 text-sm leading-relaxed mb-4">{desc}</p>
      <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full border ${badgeColor}`}>{badge}</span>
    </div>
  );
}

function ScoreFactor({ icon, label, weight }: { icon: string; label: string; weight: string }) {
  return (
    <div className="flex items-center gap-3 bg-dark-900/60 border border-dark-800 rounded-xl p-4">
      <span className="text-xl">{icon}</span>
      <span className="text-dark-300 text-sm flex-1">{label}</span>
      <span className="text-primary-400 font-bold text-sm">{weight}</span>
    </div>
  );
}

function CrisisFeature({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3 bg-dark-900/40 rounded-xl p-4">
      <span className="text-xl mt-0.5">{icon}</span>
      <span className="text-dark-300 text-sm">{text}</span>
    </div>
  );
}

function FeatureBox({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3 bg-dark-900/60 border border-dark-800 rounded-xl p-4">
      <span className="text-xl mt-0.5">{icon}</span>
      <span className="text-dark-300 text-sm">{text}</span>
    </div>
  );
}
