import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { Dashboard } from "@/modules/dashboard";
import { ClientsModule } from "@/modules/clients";
import { InventoryModule } from "@/modules/inventory";
import BillingModule from "@/modules/invoices"; // Import Billing Module
import ReceivablesModule from "@/modules/receivables";
import { TreasuryDashboard } from "@/modules/treasury/TreasuryDashboard";
import SettingsPage from "@/modules/settings";

import { LoginPage } from "@/modules/auth"; // SetupPage removed from auth
import { SetupWizard } from "@/modules/setup";
import { useAppStore } from "@/lib/store";
import { auth } from "@/lib/tauri";
import { CashRegisterProvider } from "@/modules/cash-register/CashRegisterProvider";

import { LicenseGuard } from "@/components/auth/LicenseGuard";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { DecoyScreen } from "@/components/DecoyScreen";

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <LicenseGuard>
      {children}
    </LicenseGuard>
  );
}

// Auth check on app load
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const setUser = useAppStore((state) => state.setUser);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if setup is required
        const setupRequired = await auth.checkSetupRequired();
        setNeedsSetup(setupRequired);
        
        if (!setupRequired) {
          // Check if user is already logged in
          const user = await auth.getCurrentUser();
          if (user) {
            setUser(user);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [setUser]);

  // When user becomes authenticated after setup, disable setup mode
  useEffect(() => {
    if (isAuthenticated && needsSetup) {
      setNeedsSetup(false);
    }
  }, [isAuthenticated, needsSetup]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Redirect to setup if needed AND not authenticated
  if (needsSetup && !isAuthenticated) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return <>{children}</>;
}

function App() {

  const { isDecoyMode } = usePrivacyMode();

  if (isDecoyMode) {
    return <DecoyScreen />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<SetupWizard />} />
          
          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <CashRegisterProvider>
                  <AppShell>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/clients/*" element={<ClientsModule />} />
                      <Route path="/invoices/*" element={<BillingModule />} />
                      <Route path="/receivables/*" element={<ReceivablesModule />} />
                      <Route path="/treasury" element={<TreasuryDashboard />} />
                      <Route path="/inventory/*" element={<InventoryModule />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </AppShell>
                </CashRegisterProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
