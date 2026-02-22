import { useTranslation } from '../../lib/i18n';
import { getLandingT } from '../../lib/i18n/landingLocales';
import { Link } from 'react-router-dom';
import { ShieldIcon } from '../../components/icons/ShieldIcon';
import { useEffect } from 'react';

export function LandingPage() {
  const { locale } = useTranslation();
  const t = getLandingT(locale);

  useEffect(() => {
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div>
      {/* ═══ Hero Section ═══ */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/20 via-dark-950 to-dark-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40 text-center">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-primary-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary-600/30">
              <ShieldIcon className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-4xl mx-auto mb-6">
            {t.hero_title}
          </h1>
          <p className="text-lg sm:text-xl text-dark-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            {t.hero_subtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#download" className="btn-primary text-lg px-8 py-4 rounded-2xl shadow-xl shadow-primary-600/20">
              {t.hero_cta_download}
            </a>
            <a href="#features" className="btn-secondary text-lg px-8 py-4 rounded-2xl">
              {t.hero_cta_features}
            </a>
          </div>
        </div>
      </section>

      {/* ═══ Problem & Solution ═══ */}
      <section id="problem" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">{t.ps_title}</h2>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Problem */}
            <div className="card border-red-900/50 bg-red-950/20">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⚠️</span>
                <h3 className="text-xl font-bold text-red-300">{t.ps_problem}</h3>
              </div>
              <p className="text-dark-300 leading-relaxed">{t.ps_problem_desc}</p>
            </div>

            {/* Solution */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-primary-400 flex items-center gap-3 mb-6">
                <span className="text-3xl">✅</span> {t.ps_solution}
              </h3>
              <SolutionCard icon="🔐" title={t.ps_e2ee} desc={t.ps_e2ee_desc} />
              <SolutionCard icon="🧅" title={t.ps_tor} desc={t.ps_tor_desc} />
              <SolutionCard icon="🌐" title={t.ps_p2p} desc={t.ps_p2p_desc} />
              <SolutionCard icon="💸" title={t.ps_wallet} desc={t.ps_wallet_desc} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section id="features" className="py-20 lg:py-28 bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">{t.feat_title}</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon="💬" title={t.feat_messaging} desc={t.feat_messaging_desc} />
            <FeatureCard icon="🛡️" title={t.feat_privacy} desc={t.feat_privacy_desc} />
            <FeatureCard icon="🌐" title={t.feat_decentralized} desc={t.feat_decentralized_desc} />
            <FeatureCard icon="🆔" title={t.feat_identifiers} desc={t.feat_identifiers_desc} />
            <FeatureCard icon="💰" title={t.feat_wallet} desc={t.feat_wallet_desc} />
            <FeatureCard icon="📱" title={t.feat_pwa} desc={t.feat_pwa_desc} />
          </div>
        </div>
      </section>

      {/* ═══ Privacy Guarantee ═══ */}
      <section id="privacy" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">{t.priv_title}</h2>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            <PrivacyPoint icon="🚫" text={t.priv_no_data} />
            <PrivacyPoint icon="🔑" text={t.priv_no_decrypt} />
            <PrivacyPoint icon="☁️" text={t.priv_no_servers} />
            <PrivacyPoint icon="📖" text={t.priv_open_source} />
          </div>

          {/* Bold statement */}
          <div className="max-w-3xl mx-auto">
            <blockquote className="relative bg-primary-900/20 border border-primary-800/50 rounded-2xl p-8 text-center">
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold">"</span>
              <p className="text-lg sm:text-xl text-primary-200 leading-relaxed font-medium italic">
                {t.priv_bold_statement}
              </p>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ═══ Pricing ═══ */}
      <section id="pricing" className="py-20 lg:py-28 bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">{t.price_title}</h2>
          <p className="text-dark-400 text-center mb-16 max-w-2xl mx-auto">{t.price_reminder}</p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <PricingCard
              tier={t.price_free}
              price={t.price_free_price}
              desc={t.price_free_desc}
              features={[t.price_free_f1, t.price_free_f2, t.price_free_f3, t.price_free_f4, t.price_free_f5]}
              cta={t.price_cta}
              primary={false}
            />
            {/* Supporter */}
            <PricingCard
              tier={t.price_supporter}
              price={t.price_supporter_price}
              desc={t.price_supporter_desc}
              features={[t.price_supporter_f1, t.price_supporter_f2, t.price_supporter_f3, t.price_supporter_f4, t.price_supporter_f5, t.price_supporter_f6]}
              cta={t.price_cta}
              primary={true}
            />
            {/* Enterprise */}
            <PricingCard
              tier={t.price_enterprise}
              price={t.price_enterprise_price}
              desc={t.price_enterprise_desc}
              features={[t.price_enterprise_f1, t.price_enterprise_f2, t.price_enterprise_f3, t.price_enterprise_f4]}
              cta={t.price_cta}
              primary={false}
            />
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">{t.faq_title}</h2>

          <div className="space-y-4">
            <FaqItem q={t.faq_q1} a={t.faq_a1} />
            <FaqItem q={t.faq_q2} a={t.faq_a2} />
            <FaqItem q={t.faq_q3} a={t.faq_a3} />
            <FaqItem q={t.faq_q4} a={t.faq_a4} />
            <FaqItem q={t.faq_q5} a={t.faq_a5} />
            <FaqItem q={t.faq_q6} a={t.faq_a6} />
          </div>

          <div className="text-center mt-10">
            <Link to="/faq" className="text-primary-400 hover:text-primary-300 text-sm font-medium">
              {t.faq_title} →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ CTA / Download ═══ */}
      <section id="download" className="py-20 lg:py-28 bg-gradient-to-b from-dark-900/50 to-dark-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-600/30">
              <ShieldIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t.cta_title}</h2>
          <p className="text-dark-300 text-lg mb-10 max-w-2xl mx-auto">{t.cta_subtitle}</p>

          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
            <DownloadButton icon="🤖" label={t.cta_android} href="https://github.com/abokenan444/shield-messenger/releases" />
            <DownloadButton icon="🌐" label={t.cta_pwa} href="/register" />
            <DownloadButton icon="🍎" label={t.cta_ios} href="https://github.com/abokenan444/shield-messenger/releases" />
          </div>

          <p className="text-dark-500 text-sm max-w-xl mx-auto">{t.cta_install_pwa}</p>
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─── */

function SolutionCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-dark-900/50 border border-dark-800 hover:border-primary-800/50 transition-colors">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div>
        <h4 className="text-white font-semibold mb-1">{title}</h4>
        <p className="text-dark-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card hover:border-primary-800/50 transition-all group">
      <span className="text-3xl mb-4 block">{icon}</span>
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">{title}</h3>
      <p className="text-dark-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function PrivacyPoint({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-xl bg-dark-900 border border-dark-800">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <p className="text-dark-200 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function PricingCard({
  tier, price, desc, features, cta, primary,
}: {
  tier: string; price: string; desc: string; features: string[]; cta: string; primary: boolean;
}) {
  return (
    <div className={`rounded-2xl p-8 flex flex-col ${
      primary
        ? 'bg-primary-900/30 border-2 border-primary-600 shadow-xl shadow-primary-600/10 relative'
        : 'bg-dark-900 border border-dark-800'
    }`}>
      {primary && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-4 py-1 rounded-full">
          ★
        </span>
      )}
      <h3 className="text-xl font-bold text-white mb-1">{tier}</h3>
      <p className="text-3xl font-bold text-white mb-1">{price}</p>
      <p className="text-dark-400 text-sm mb-6">{desc}</p>
      <ul className="space-y-3 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-dark-200">
            <svg className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <Link
        to="/register"
        className={`mt-8 text-center py-3 rounded-xl font-medium transition-all ${
          primary
            ? 'bg-primary-600 hover:bg-primary-700 text-white'
            : 'bg-dark-800 hover:bg-dark-700 text-white border border-dark-700'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group card cursor-pointer">
      <summary className="flex items-center justify-between text-white font-medium list-none">
        <span>{q}</span>
        <svg className="w-5 h-5 text-dark-400 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <p className="text-dark-300 text-sm leading-relaxed mt-4">{a}</p>
    </details>
  );
}

function DownloadButton({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-center gap-3 p-4 rounded-xl bg-dark-900 border border-dark-800 hover:border-primary-600 hover:bg-dark-800 transition-all group"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-white font-medium group-hover:text-primary-400 transition-colors">{label}</span>
    </a>
  );
}
