import type { ChangeEvent } from "react";
import { TOKEN_LIST, type TokenId } from "@shared/venueSymbols";

interface TapeTokenSelectorProps {
  value: TokenId | string;
  onChange: (token: TokenId) => void;
  className?: string;
}

const TOKEN_GROUPS: { label: string; tokens: TokenId[] }[] = [
  {
    label: "Layer 1 / Majors",
    tokens: ["BTC", "ETH", "SOL", "ADA", "AVAX", "NEAR"],
  },
  {
    label: "DeFi / Infrastructure",
    tokens: ["LINK", "MATIC", "DOT"],
  },
  {
    label: "Other Large Caps",
    tokens: ["XRP"],
  },
];

export function TapeTokenSelector({ value, onChange, className = "" }: TapeTokenSelectorProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const token = e.target.value as TokenId;
    if (TOKEN_LIST.includes(token)) {
      onChange(token);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm opacity-80 w-16">Token</label>
      <select
        value={value}
        onChange={handleChange}
        data-testid="select-tape-token"
        className="px-2 py-1.5 rounded border border-neutral-800 bg-transparent text-sm min-w-[140px]"
      >
        {TOKEN_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.tokens.map((token) => (
              <option key={token} value={token}>
                {token}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
