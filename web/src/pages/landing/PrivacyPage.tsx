import { useTranslation } from '../../lib/i18n';
import { getLandingT } from '../../lib/i18n/landingLocales';

export function PrivacyPage() {
  const { locale } = useTranslation();
  const t = getLandingT(locale);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6">{t.pp_title}</h1>
      <p className="text-dark-300 text-lg leading-relaxed mb-12">{t.pp_intro}</p>

      <PolicySection title={t.pp_section1_title} body={t.pp_section1_body} />
      <PolicySection title={t.pp_section2_title} body={t.pp_section2_body} />
      <PolicySection title={t.pp_section3_title} body={t.pp_section3_body} />
      <PolicySection title={t.pp_section4_title} body={t.pp_section4_body} />
      <PolicySection title={t.pp_section5_title} body={t.pp_section5_body} />

      {/* Closing statement */}
      <blockquote className="mt-12 bg-primary-900/20 border border-primary-800/50 rounded-2xl p-8">
        <p className="text-primary-200 text-lg leading-relaxed font-medium italic">
          {t.pp_closing}
        </p>
      </blockquote>

      <p className="text-dark-500 text-sm mt-8">
        Last updated: February 2026
      </p>
    </div>
  );
}

function PolicySection({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      <p className="text-dark-300 leading-relaxed">{body}</p>
    </div>
  );
}
