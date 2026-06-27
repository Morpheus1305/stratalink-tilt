// @refresh reset
import { createContext, useContext, useState, ReactNode } from "react";
import { ILU_TOKENS, type ILUToken } from "../../../shared/ilu-universe";

const STORAGE_KEY = "stratalink_selected_token";

function loadToken(): ILUToken {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = ILU_TOKENS.find(t => t.symbol === stored);
      if (found) return found;
    }
  } catch {
    // localStorage may be unavailable in some environments
  }
  return ILU_TOKENS[0];
}

interface TokenContextType {
  selectedToken: ILUToken;
  setSelectedToken: (token: ILUToken) => void;
  selectedSymbol: string;
  selectedPair: string;
}

const TokenContext = createContext<TokenContextType | null>(null);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [selectedToken, setSelectedTokenState] = useState<ILUToken>(loadToken);

  function setSelectedToken(token: ILUToken) {
    try {
      localStorage.setItem(STORAGE_KEY, token.symbol);
    } catch {
      // ignore write failures
    }
    setSelectedTokenState(token);
  }

  return (
    <TokenContext.Provider value={{
      selectedToken,
      setSelectedToken,
      selectedSymbol: selectedToken.symbol,
      selectedPair: selectedToken.pair,
    }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const ctx = useContext(TokenContext);
  if (!ctx) throw new Error("useToken must be used within TokenProvider");
  return ctx;
}
