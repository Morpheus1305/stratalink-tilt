import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "tilt", label: "TILT", path: "/platform/tilt" },
  { id: "rcl", label: "RCL", path: "/regulatory/adgm" },
  { id: "alerts", label: "ALERTS", path: "/platform/alerts" },
];

export function PlatformTabs() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/regulatory/adgm") {
      return location.startsWith("/regulatory");
    }
    return location === path;
  };

  return (
    <div className="sticky top-14 z-40 border-b border-border bg-background">
      <div className="flex gap-1 px-4">
        {tabs.map((tab) => (
          <Link key={tab.id} href={tab.path}>
            <button
              data-testid={`tab-${tab.id}`}
              className={cn(
                "px-4 py-2.5 text-xs font-semibold transition-colors relative",
                isActive(tab.path)
                  ? "text-yellow-400"
                  : "text-muted-foreground"
              )}
            >
              {tab.label}
              {isActive(tab.path) && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}
