import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Trends from "@/pages/trends";
import Portfolio from "@/pages/portfolio";
import Alerts from "@/pages/alerts";
import Scorecard from "@/pages/scorecard";
import LoginPage from "@/pages/LoginPage";
import VerifyOTPPage from "@/pages/VerifyOTPPage";
import IdentityLandingPage from "@/pages/identity/IdentityLandingPage";
import LiquidityFragmentationPage from "@/pages/identity/LiquidityFragmentationPage";
import MMIntegrityPage from "@/pages/identity/MMIntegrityPage";
import PoliPlusPage from "@/pages/identity/PoliPlusPage";
import IdentityAlertsPage from "@/pages/identity/IdentityAlertsPage";
import RegSurveillancePage from "@/pages/identity/RegSurveillancePage";
import { AuthProvider } from "@/contexts/AuthContext";
import { TokenProvider } from "@/contexts/TokenContext";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={LoginPage} />
      <Route path="/verify-otp" component={VerifyOTPPage} />
      <Route path="/platform">
        {() => (
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        )}
      </Route>
      <Route path="/platform/trends">
        {() => (
          <RequireAuth>
            <Trends />
          </RequireAuth>
        )}
      </Route>
      <Route path="/platform/portfolio">
        {() => (
          <RequireAuth>
            <Portfolio />
          </RequireAuth>
        )}
      </Route>
      <Route path="/platform/alerts">
        {() => (
          <RequireAuth>
            <Alerts />
          </RequireAuth>
        )}
      </Route>
      <Route path="/platform/scorecard">
        {() => (
          <RequireAuth>
            <Scorecard />
          </RequireAuth>
        )}
      </Route>
      <Route path="/identity">
        {() => (
          <RequireAuth>
            <IdentityLandingPage />
          </RequireAuth>
        )}
      </Route>
      <Route path="/identity/liquidity-fragmentation">
        {() => (
          <RequireAuth>
            <LiquidityFragmentationPage />
          </RequireAuth>
        )}
      </Route>
      <Route path="/identity/mm-integrity">
        {() => (
          <RequireAuth>
            <MMIntegrityPage />
          </RequireAuth>
        )}
      </Route>
      <Route path="/identity/poli-plus">
        {() => (
          <RequireAuth>
            <PoliPlusPage />
          </RequireAuth>
        )}
      </Route>
      <Route path="/identity/identity-alerts">
        {() => (
          <RequireAuth>
            <IdentityAlertsPage />
          </RequireAuth>
        )}
      </Route>
      <Route path="/identity/reg-surveillance">
        {() => (
          <RequireAuth>
            <RegSurveillancePage />
          </RequireAuth>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TokenProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </TokenProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
