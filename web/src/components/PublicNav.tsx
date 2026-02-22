import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { getLandingT } from '../lib/i18n/landingLocales';
import { ShieldIcon } from './icons/ShieldIcon';
import { useState } from 'react';

export function PublicNav() {
  const { locale, setLocale } = useTranslation();
  const lt = getLandingT(locale);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: '/', label: lt.nav_home },
    { to: '/#features', label: lt.nav_features },
    { to: '/pricing', label: lt.nav_pricing },
    { to: '/faq', label: lt.nav_faq },
    { to: '/blog', label: lt.nav_blog },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center group-hover:bg-primary-500 transition-colors">
              <ShieldIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Shield Messenger</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-primary-400 bg-primary-600/10'
                    : 'text-dark-300 hover:text-white hover:bg-dark-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language switcher */}
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as any)}
              className="bg-dark-800 border border-dark-700 text-dark-200 text-xs rounded-lg px-2 py-1.5 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="tr">Türkçe</option>
              <option value="fa">فارسی</option>
              <option value="ur">اردو</option>
              <option value="zh">中文</option>
              <option value="ru">Русский</option>
              <option value="pt">Português</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="hi">हिन्दी</option>
              <option value="id">Indonesia</option>
              <option value="it">Italiano</option>
              <option value="nl">Nederlands</option>
            </select>

            <Link to="/login" className="btn-secondary !py-2 !px-4 text-sm">
              {lt.nav_login}
            </Link>
            <Link to="/#download" className="btn-primary !py-2 !px-4 text-sm">
              {lt.nav_download}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-dark-800 text-dark-300"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-800"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-dark-800 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-secondary text-center text-sm">
                {lt.nav_login}
              </Link>
              <Link to="/#download" onClick={() => setMenuOpen(false)} className="btn-primary text-center text-sm">
                {lt.nav_download}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
