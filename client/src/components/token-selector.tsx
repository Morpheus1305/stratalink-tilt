import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface TokenSelectorProps {
  selectedToken: string;
  onChange: (tokenId: string) => void;
}

interface Token {
  id: string;
  name: string;
  symbol: string;
  rank: number;
}

export function TokenSelector({ selectedToken, onChange }: TokenSelectorProps) {
  const { data: tokens, isLoading } = useQuery<Token[]>({
    queryKey: ['/api/tokens'],
    staleTime: 300000,
  });

  if (isLoading) {
    return <Skeleton className="h-9 w-48" data-testid="skeleton-token-selector" />;
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="text-xs text-muted-foreground" data-testid="text-no-tokens">
        No tokens available
      </div>
    );
  }

  const selectedTokenData = tokens.find((t) => t.symbol === selectedToken);

  return (
    <Select value={selectedToken} onValueChange={onChange}>
      <SelectTrigger 
        className="w-[200px] h-9 font-mono text-xs border-border" 
        data-testid="select-token-trigger"
      >
        <SelectValue>
          {selectedTokenData ? (
            <div className="flex items-center gap-2">
              <span className="text-primary font-semibold">{selectedTokenData.symbol}</span>
              <span className="text-muted-foreground">{selectedTokenData.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select token...</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[420px] overflow-y-auto" data-testid="select-token-content">
        {tokens.map((token) => (
          <SelectItem 
            key={token.symbol} 
            value={token.symbol}
            data-testid={`select-token-option-${token.symbol}`}
          >
            <div className="flex items-center justify-between w-full gap-4">
              <div className="flex items-center gap-2">
                <span className="text-primary font-semibold font-mono">{token.symbol}</span>
                <span className="text-muted-foreground text-xs">{token.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">#{token.rank}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
