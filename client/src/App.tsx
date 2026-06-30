import { Switch, Route, Redirect, useLocation } from "wouter";
import { useEffect, useState } from "react";

import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import HeroPage from "@/pages/HeroPage";
import MethodologyPage from "@/pages/MethodologyPage";
import Alerts from "@/pages/alerts";
import LoginPage from "@/pages/LoginPage";
import VerifyOTPPage from "@/pages/VerifyOTPPage";
import AlertConfigPage from "@/pages/alert-config";
import RegulatoryAdgmView from "@/pages/regulatory/RegulatoryAdgmView";
import TiltTerminal from "@/pages/platform/tilt-terminal";
import StrataAI from "@/pages/platform/strata-ai";
import IntegrityPage from "@/pages/platform/integrity";
import CLTEvidence from "./pages/clt-evidence";
import RequestAccessPage from "@/pages/RequestAccessPage";

import { AuthProvider } from "@/contexts/AuthContext";
import { TokenProvider } from "@/contexts/TokenContext";
import { UIStateProvider, useUIState } from "@/contexts/UIStateContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ReportsPanel } from "@/components/reports-panel";
import { RequireAuth } from "@/components/RequireAuth";
import { BottomTicker } from "@/components/bottom-ticker";
import type { DashboardData } from "@shared/schema";

const LAST_ROUTE_KEY = 'stratalink_last_route';
const PLATFORM_PREFIXES = ['/platform', '/regulatory'];

/** Saves the current route to localStorage whenever it's a platform page. */
function RouteWatcher() {
  const [location] = useLocation();
  useEffect(() => {
    if (PLATFORM_PREFIXES.some(p => location.startsWith(p))) {
      localStorage.setItem(LAST_ROUTE_KEY, location);
    }
  }, [location]);
  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function GlobalReportsPanel() {
  const { showReports, closeReports } = useUIState();
  return <ReportsPanel isOpen={showReports} onClose={closeReports} />;
}

function GlobalTicker() {
  const { data } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", "BTC"],
    queryFn: () => fetch("/api/dashboard?asset=BTC").then((r) => r.json()),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  if (!data?.tickerItems?.length) return null;
  return <BottomTicker items={data.tickerItems} />;
}

function AppRouter() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/login" component={LoginPage} />
      <Route path="/verify-otp" component={VerifyOTPPage} />

      {/* CLT Evidence Console (public) */}
      <Route path="/clt/evidence" component={CLTEvidence} />

      {/* Cover / Hero landing page */}
      <Route path="/" component={HeroPage} />

      {/* Methodology (public) */}
      <Route path="/methodology" component={MethodologyPage} />

      {/* Request Access / Contact */}
      <Route path="/request-access" component={RequestAccessPage} />

      {/* /platform → TILT */}
      <Route path="/platform">
        {() => <Redirect to="/platform/tilt" />}
      </Route>

      <Route path="/platform/tilt">
        {() => (
          <RequireAuth>
            <TiltTerminal />
          </RequireAuth>
        )}
      </Route>

      <Route path="/platform/strata-ai">
        {() => (
          <RequireAuth>
            <StrataAI />
          </RequireAuth>
        )}
      </Route>

      <Route path="/platform/integrity">
        {() => (
          <RequireAuth>
            <IntegrityPage />
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

      {/* Alert config */}
      <Route path="/alerts/config" component={AlertConfigPage} />

      {/* Regulatory (auth-gated) */}
      <Route path="/regulatory/adgm">
        {() => (
          <RequireAuth>
            <RegulatoryAdgmView />
          </RequireAuth>
        )}
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme ?? "dark";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
        <TokenProvider>
          <UIStateProvider>
            <TooltipProvider>
              <Toaster />
              <ScrollToTop />
              <RouteWatcher />
              <AppRouter />
              <GlobalTicker />
              <GlobalReportsPanel />
            </TooltipProvider>
          </UIStateProvider>
        </TokenProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
