import { createContext, useContext, useState } from "react";

interface UIStateContextValue {
  showReports: boolean;
  openReports: () => void;
  closeReports: () => void;
}

const UIStateContext = createContext<UIStateContextValue>({
  showReports: false,
  openReports: () => {},
  closeReports: () => {},
});

export function UIStateProvider({ children }: { children: React.ReactNode }) {
  const [showReports, setShowReports] = useState(false);

  return (
    <UIStateContext.Provider
      value={{
        showReports,
        openReports: () => setShowReports(true),
        closeReports: () => setShowReports(false),
      }}
    >
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  return useContext(UIStateContext);
}
