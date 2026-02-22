import { useTranslation } from '../../lib/i18n';
import { getLandingT } from '../../lib/i18n/landingLocales';

export function TransparencyPage() {
  const { locale } = useTranslation();
  const t = getLandingT(locale);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6">{t.tr_title}</h1>
      <p className="text-dark-300 text-lg leading-relaxed mb-12">{t.tr_intro}</p>

      <Section title={t.tr_section1_title} body={t.tr_section1_body} />
      <Section title={t.tr_section2_title} body={t.tr_section2_body} />
      <Section title={t.tr_section3_title} body={t.tr_section3_body} />

      {/* Transparency report box */}
      <div className="mt-12 bg-primary-900/20 border border-primary-800/50 rounded-2xl p-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
          <span className="text-2xl">📊</span>
          {t.tr_report_title}
        </h2>
        <p className="text-primary-200 leading-relaxed">{t.tr_report_body}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-dark-900/50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-primary-400">0</p>
            <p className="text-dark-400 text-sm mt-1">Government Requests</p>
          </div>
          <div className="bg-dark-900/50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-primary-400">0</p>
            <p className="text-dark-400 text-sm mt-1">Data Disclosed</p>
          </div>
        </div>
      </div>

      <p className="text-dark-500 text-sm mt-8">
        Last updated: February 2026
      </p>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>
      <p className="text-dark-300 leading-relaxed">{body}</p>
    </div>
  );
}
