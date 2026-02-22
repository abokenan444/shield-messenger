import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store/authStore';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ChatPage } from './pages/ChatPage';
import { CallsPage } from './pages/CallsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ContactsPage } from './pages/ContactsPage';
import { WalletPage } from './pages/WalletPage';
import { SecurityPage } from './pages/SecurityPage';
import { CallOverlay, IncomingCallDialog } from './components/CallOverlay';
import { PublicLayout } from './components/PublicLayout';
import { LandingPage } from './pages/landing/LandingPage';
import { PrivacyPage } from './pages/landing/PrivacyPage';
import { TermsPage } from './pages/landing/TermsPage';
import { TransparencyPage } from './pages/landing/TransparencyPage';
import { FaqPage } from './pages/landing/FaqPage';
import { PricingPage } from './pages/landing/PricingPage';
import { BlogPage } from './pages/landing/BlogPage';

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <>
      <Routes>
        {/* Public pages with shared nav/footer layout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={isAuthenticated ? <Navigate to="/chat" /> : <LandingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/transparency" element={<TransparencyPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/blog" element={<BlogPage />} />
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
          path="/calls"
          element={isAuthenticated ? <CallsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/contacts"
          element={isAuthenticated ? <ContactsPage /> : <Navigate to="/login" />}
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
          path="/chat/*"
          element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />}
        />
        {/* Catch-all: redirect to landing or chat */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/chat' : '/'} />}
        />
      </Routes>

      {/* Global call overlays */}
      {isAuthenticated && (
        <>
          <CallOverlay />
          <IncomingCallDialog />
        </>
      )}
    </>
  );
}
