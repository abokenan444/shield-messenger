import { useTranslation } from '../../lib/i18n';
import { getLandingT } from '../../lib/i18n/landingLocales';
import { Link } from 'react-router-dom';

export function PricingPage() {
  const { locale } = useTranslation();
  const t = getLandingT(locale);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">{t.price_title}</h1>
      <p className="text-dark-400 text-center mb-16 max-w-2xl mx-auto">{t.price_reminder}</p>

      <div className="grid md:grid-cols-3 gap-8">
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
