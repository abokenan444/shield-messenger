import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from './lib/store/authStore';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { ContactsPage } from './pages/ContactsPage';
import { CallsPage } from './pages/CallsPage';
import { SecurityPage } from './pages/SecurityPage';
import { WalletPage } from './pages/WalletPage';
import { PublicLayout } from './components/PublicLayout';
import { LandingPage } from './pages/landing/LandingPage';
import { DownloadPage } from './pages/landing/DownloadPage';
import { FaqPage } from './pages/landing/FaqPage';
import { PricingPage } from './pages/landing/PricingPage';
import { BlogPage } from './pages/landing/BlogPage';
import { PrivacyPage } from './pages/landing/PrivacyPage';
import { TermsPage } from './pages/landing/TermsPage';
import { TransparencyPage } from './pages/landing/TransparencyPage';

const WhitepaperPage = lazy(() => import('./pages/landing/WhitepaperPage').then(m => ({ default: m.WhitepaperPage })));

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Routes>
      {/* Public pages with PublicLayout (nav + footer) */}
      <Route element={<PublicLayout />}>
        <Route path="/home" element={<LandingPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/transparency" element={<TransparencyPage />} />
        <Route path="/whitepaper" element={<Suspense fallback={<div className="flex justify-center py-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400" /></div>}><WhitepaperPage /></Suspense>} />
      </Route>

      {/* Auth pages */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/chat" /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/chat" /> : <RegisterPage />}
      />

      {/* Authenticated app pages */}
      <Route
        path="/chat"
        element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/contacts"
        element={isAuthenticated ? <ContactsPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/calls"
        element={isAuthenticated ? <CallsPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/wallet"
        element={isAuthenticated ? <WalletPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/security"
        element={isAuthenticated ? <SecurityPage /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings"
        element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />}
      />

      {/* Default: landing for guests, chat for authenticated */}
      <Route
        path="/*"
        element={isAuthenticated ? <Navigate to="/chat" /> : <Navigate to="/home" />}
      />
    </Routes>
  );
}
