import { Link } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { getLandingT } from '../lib/i18n/landingLocales';
import { ShieldIcon } from './icons/ShieldIcon';

export function PublicFooter() {
  const { locale } = useTranslation();
  const lt = getLandingT(locale);

  return (
    <footer className="bg-dark-950 border-t border-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
                <ShieldIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Shield Messenger</span>
            </div>
            <p className="text-dark-400 text-sm leading-relaxed">
              {lt.hero_subtitle}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{lt.nav_features}</h4>
            <div className="space-y-2">
              <Link to="/#features" className="block text-dark-400 text-sm hover:text-primary-400 transition-colors">{lt.feat_messaging}</Link>
              <Link to="/#features" className="block text-dark-400 text-sm hover:text-primary-400 transition-colors">{lt.feat_privacy}</Link>
              <Link to="/#features" className="block text-dark-400 text-sm hover:text-primary-400 transition-colors">{lt.feat_wallet}</Link>
              <Link to="/#features" className="block text-dark-400 text-sm hover:text-primary-400 transition-colors">{lt.feat_pwa}</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">{lt.nav_terms}</h4>
            <div className="space-y-2">
              <Link to="/privacy" className="block text-dark-400 text-sm hover:text-primary-400 transition-colors">{lt.nav_privacy}</Link>
              <Link to="/terms" className="block text-dark-400 text-sm hover:text-primary-400 transition-colors">{lt.nav_terms}</Link>
              <Link to="/transparency" className="block text-dark-400 text-sm hover:text-primary-400 transition-colors">{lt.nav_transparency}</Link>
            </div>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-white font-semibold mb-4">{lt.nav_source}</h4>
            <div className="space-y-2">
              <a href="https://github.com/abokenan444/shield-messenger" target="_blank" rel="noopener noreferrer" className="block text-dark-400 text-sm hover:text-primary-400 transition-colors">GitHub</a>
              <Link to="/blog" className="block text-dark-400 text-sm hover:text-primary-400 transition-colors">{lt.nav_blog}</Link>
              <Link to="/faq" className="block text-dark-400 text-sm hover:text-primary-400 transition-colors">{lt.nav_faq}</Link>
            </div>
          </div>
        </div>

        {/* Badges + copyright */}
        <div className="mt-10 pt-8 border-t border-dark-800">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-900/30 text-primary-400 text-xs rounded-full border border-primary-800/50">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              {lt.footer_open_source}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-dark-800 text-dark-300 text-xs rounded-full border border-dark-700">
              {lt.footer_community}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-dark-800 text-dark-300 text-xs rounded-full border border-dark-700">
              {lt.footer_no_data}
            </span>
          </div>
          <p className="text-dark-500 text-sm">{lt.footer_rights}</p>
        </div>
      </div>
    </footer>
  );
}
