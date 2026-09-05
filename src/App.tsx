import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { PublicHeader } from './components/layout/PublicHeader';
import { PublicFooter } from './components/layout/PublicFooter';
import { AddInvoiceModal } from './components/modals/AddInvoiceModal';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { FeaturesPage } from './pages/public/FeaturesPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { PricingPage } from './pages/public/PricingPage';
import { CalculatorPage } from './pages/public/CalculatorPage';
import { TemplatesPage } from './pages/public/TemplatesPage';
import { SecurityPage } from './pages/public/SecurityPage';
import { FAQPage } from './pages/public/FAQPage';
import { AuthPage } from './pages/public/AuthPages';

// App Pages
import { DashboardPage } from './pages/app/DashboardPage';
import { InvoicesPage } from './pages/app/InvoicesPage';
import { InvoiceDetailPage } from './pages/app/InvoiceDetailPage';
import { ClientsPage } from './pages/app/ClientsPage';
import { ClientDetailPage } from './pages/app/ClientDetailPage';
import { RemindersPage } from './pages/app/RemindersPage';
import { ActivityPage } from './pages/app/ActivityPage';
import { AnalyticsPage } from './pages/app/AnalyticsPage';
import { ConnectionsPage } from './pages/app/ConnectionsPage';
import { SettingsPage } from './pages/app/SettingsPage';
import { BillingPage } from './pages/app/BillingPage';
import { AccountPage } from './pages/app/AccountPage';
import { OnboardingWizard } from './pages/app/OnboardingWizard';
import { AdminPage } from './pages/admin/AdminPage';

function AppContent() {
  const { user, isAuthenticated, isLoadingAuth } = useApp();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) return hash;
    return '/login';
  });
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);

  // Initialize or read browser hash if present
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash) {
        setCurrentPath(hash);
      }
    };

    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.location.hash = path;
    window.scrollTo(0, 0);
  };

  // Enforce session boundary for protected application routes
  useEffect(() => {
    if (isLoadingAuth) return;

    const isApp = currentPath.startsWith('/app') || currentPath === '/admin';
    if (!isAuthenticated && isApp) {
      navigate('/login');
    } else if (isAuthenticated && (currentPath === '/login' || currentPath === '/signup' || currentPath.startsWith('/auth/callback'))) {
      navigate('/app/dashboard');
    }
  }, [isLoadingAuth, isAuthenticated, currentPath]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#fdfaf5] flex flex-col items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3c473a] text-white font-black text-lg shadow-md animate-pulse">
          IC
        </div>
        <p className="mt-4 text-xs font-semibold text-[#8b9789]">Verifying authenticated session…</p>
      </div>
    );
  }

  const isAppRoute = currentPath.startsWith('/app');
  const isAdminRoute = currentPath === '/admin';

  // Extract parameterized IDs if any
  const invoiceDetailMatch = currentPath.match(/^\/app\/invoices\/([^/]+)$/);
  const clientDetailMatch = currentPath.match(/^\/app\/clients\/([^/]+)$/);

  return (
    <div className="min-h-screen bg-[#fdfaf5] text-[#3c473a] flex flex-col font-sans selection:bg-[#d8e4d3] selection:text-[#2d382b]">
      {/* AUTHENTICATED APP SHELL */}
      {isAppRoute ? (
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            currentPath={currentPath}
            navigate={navigate}
            onOpenAddInvoice={() => setIsAddInvoiceOpen(true)}
          />

          {/* Main Area */}
          <div className="flex flex-1 flex-col overflow-y-auto bg-[#fdfaf5]">
            <Navbar currentPath={currentPath} navigate={navigate} />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              {currentPath === '/app/onboarding' ? (
                <OnboardingWizard onComplete={() => navigate('/app/dashboard')} />
              ) : currentPath === '/app/dashboard' ? (
                <DashboardPage
                  navigate={navigate}
                  onOpenAddInvoice={() => setIsAddInvoiceOpen(true)}
                />
              ) : currentPath === '/app/invoices' ? (
                <InvoicesPage
                  navigate={navigate}
                  onOpenAddInvoice={() => setIsAddInvoiceOpen(true)}
                />
              ) : invoiceDetailMatch ? (
                <InvoiceDetailPage
                  invoiceId={invoiceDetailMatch[1]}
                  navigate={navigate}
                />
              ) : currentPath === '/app/clients' ? (
                <ClientsPage navigate={navigate} />
              ) : clientDetailMatch ? (
                <ClientDetailPage
                  clientId={clientDetailMatch[1]}
                  navigate={navigate}
                  onOpenAddInvoice={() => setIsAddInvoiceOpen(true)}
                />
              ) : currentPath === '/app/reminders' ? (
                <RemindersPage navigate={navigate} />
              ) : currentPath === '/app/activity' ? (
                <ActivityPage />
              ) : currentPath === '/app/analytics' ? (
                <AnalyticsPage />
              ) : currentPath === '/app/connections' ? (
                <ConnectionsPage />
              ) : currentPath === '/app/settings' ? (
                <SettingsPage />
              ) : currentPath === '/app/billing' ? (
                <BillingPage />
              ) : currentPath === '/app/account' ? (
                <AccountPage />
              ) : (
                <DashboardPage
                  navigate={navigate}
                  onOpenAddInvoice={() => setIsAddInvoiceOpen(true)}
                />
              )}
            </main>
          </div>
        </div>
      ) : isAdminRoute ? (
        <div className="min-h-screen bg-[#fdfaf5]">
          <main className="p-4 sm:p-6 lg:p-8">
            <AdminPage navigate={navigate} />
          </main>
        </div>
      ) : (
        /* PUBLIC MARKETING & AUTH SHELL */
        <div className="flex min-h-screen flex-col justify-between">
          <PublicHeader currentPath={currentPath} navigate={navigate} />

          <main className="flex-1">
            {currentPath === '/' ? (
              <LandingPage navigate={navigate} />
            ) : currentPath === '/features' ? (
              <FeaturesPage navigate={navigate} />
            ) : currentPath === '/how-it-works' ? (
              <HowItWorksPage navigate={navigate} />
            ) : currentPath === '/pricing' ? (
              <PricingPage navigate={navigate} />
            ) : currentPath === '/calculator' ? (
              <CalculatorPage navigate={navigate} />
            ) : currentPath === '/templates' ? (
              <TemplatesPage navigate={navigate} />
            ) : currentPath === '/security' ? (
              <SecurityPage navigate={navigate} />
            ) : currentPath === '/faq' ? (
              <FAQPage navigate={navigate} />
            ) : currentPath === '/login' ? (
              <AuthPage mode="LOGIN" navigate={navigate} />
            ) : currentPath === '/signup' ? (
              <AuthPage mode="SIGNUP" navigate={navigate} />
            ) : currentPath === '/forgot-password' ? (
              <AuthPage mode="FORGOT_PASSWORD" navigate={navigate} />
            ) : (
              <LandingPage navigate={navigate} />
            )}
          </main>

          <PublicFooter navigate={navigate} />
        </div>
      )}

      {/* Global Add Invoice Modal */}
      <AddInvoiceModal
        isOpen={isAddInvoiceOpen}
        onClose={() => setIsAddInvoiceOpen(false)}
        onSuccess={(id) => navigate(`/app/invoices/${id}`)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
