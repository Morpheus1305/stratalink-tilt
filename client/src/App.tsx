// client/src/App.tsx
import React from "react"; // 👈 ADD THIS
import { Switch, Route } from "wouter";
import { useEffect, useState } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Documentation from "@/pages/documentation";
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

import AnalyticsPage from "@/pages/analytics/AnalyticsPage";

import LisDebugPage from "@/pages/lis-debug";
import AlertConfigPage from "@/pages/alert-config";
import DownloadPage from "@/pages/download";
import TapePage from "@/pages/platform/tape";
import CCPMarginPage from "@/pages/platform/ccp-margin-unified";
import RegulatoryAdgmView from "@/pages/regulatory/RegulatoryAdgmView";

// ✅ IMPORTANT: this must point to your existing file:
// client/src/pages/clt-evidence.tsx
import CLTEvidence from "./pages/clt-evidence";

import { AuthProvider } from "@/contexts/AuthContext";
import { TokenProvider } from "@/contexts/TokenContext";
import { MicrostructureFeedProvider } from "@/contexts/MicrostructureFeed";
import { RequireAuth } from "@/components/RequireAuth";

function AppRouter() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Landing} />
      <Route path="/docs" component={Documentation} />
      <Route path="/login" component={LoginPage} />
      <Route path="/verify-otp" component={VerifyOTPPage} />

      {/* CLT Evidence Console (public for now) */}
      <Route path="/clt/evidence" component={CLTEvidence} />

      {/* Platform (auth-gated) */}
      <Route path="/platform">
        {() => (
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        )}
      </Route>

      <Route path="/platform/tape">
        {() => (
          <RequireAuth>
            <TapePage />
          </RequireAuth>
        )}
      </Route>

      <Route path="/platform/ccp-margin">
        {() => (
          <RequireAuth>
            <CCPMarginPage />
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

      <Route path="/platform/analytics">
        {() => (
          <RequireAuth>
            <AnalyticsPage />
          </RequireAuth>
        )}
      </Route>

      {/* Identity (auth-gated) */}
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

      {/* Regulatory (auth-gated) */}
      <Route path="/regulatory/adgm">
        {() => (
          <RequireAuth>
            <RegulatoryAdgmView />
          </RequireAuth>
        )}
      </Route>

      {/* Tools / Debug */}
      <Route path="/lis" component={LisDebugPage} />
      <Route path="/alerts/config" component={AlertConfigPage} />
      <Route path="/download" component={DownloadPage} />

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
    <MicrostructureFeedProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TokenProvider>
            <TooltipProvider>
              <Toaster />
              <AppRouter />
            </TooltipProvider>
          </TokenProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MicrostructureFeedProvider>
  );
}