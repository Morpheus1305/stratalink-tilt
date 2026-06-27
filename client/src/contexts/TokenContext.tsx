import { createContext, useContext, useState, ReactNode } from "react";
import { ILU_TOKENS, type ILUToken } from "../../../shared/ilu-universe";

interface TokenContextType {
  selectedToken: ILUToken;
  setSelectedToken: (token: ILUToken) => void;
  selectedSymbol: string;
  selectedPair: string;
}

const TokenContext = createContext<TokenContextType | null>(null);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [selectedToken, setSelectedToken] = useState<ILUToken>(ILU_TOKENS[0]);

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
