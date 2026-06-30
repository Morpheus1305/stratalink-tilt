import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserSettings {
  timezone: string;
  decimalSeparator: string;
  thousandsSeparator: string;
  defaultToken: string;
  supervisedTokens: string[];
  notificationSeverities: string[];           // 'HIGH' | 'WARNING' | 'INFO'
  notificationScope: "supervised" | "all";
  notificationEmail: string | null;
  notificationEmailEnabled: boolean;
  reportEmail: string | null;
  reportEmailEnabled: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  timezone: "UTC",
  decimalSeparator: ".",
  thousandsSeparator: ",",
  defaultToken: "BTC",
  supervisedTokens: ["BTC", "ETH", "SOL", "XRP", "ADA"],
  notificationSeverities: ["HIGH", "WARNING", "INFO"],
  notificationScope: "supervised",
  notificationEmail: null,
  notificationEmailEnabled: false,
  reportEmail: null,
  reportEmailEnabled: false,
};

const LS_KEY = "strata_user_settings_v1";

function load(): UserSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function save(s: UserSettings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(load);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      save(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    save(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
