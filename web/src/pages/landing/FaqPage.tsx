import { useTranslation } from '../../lib/i18n';
import { getLandingT } from '../../lib/i18n/landingLocales';
import { useState } from 'react';

export function FaqPage() {
  const { locale } = useTranslation();
  const t = getLandingT(locale);

  const faqs = [
    { q: t.faq_q1, a: t.faq_a1 },
    { q: t.faq_q2, a: t.faq_a2 },
    { q: t.faq_q3, a: t.faq_a3 },
    { q: t.faq_q4, a: t.faq_a4 },
    { q: t.faq_q5, a: t.faq_a5 },
    { q: t.faq_q6, a: t.faq_a6 },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">{t.faq_title}</h1>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <FaqAccordion key={i} q={faq.q} a={faq.a} />
        ))}
      </div>
    </div>
  );
}

function FaqAccordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between text-start"
        onClick={() => setOpen(!open)}
      >
        <span className="text-white font-medium">{q}</span>
        <svg
          className={`w-5 h-5 text-dark-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <p className="text-dark-300 text-sm leading-relaxed mt-4 pt-4 border-t border-dark-800">
          {a}
        </p>
      )}
    </div>
  );
}
