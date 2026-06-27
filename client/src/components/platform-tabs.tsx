import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "tilt",      label: "TILT",       path: "/platform/tilt" },
  { id: "strata-ai", label: "STRATA AI",  path: "/platform/strata-ai" },
  { id: "integrity", label: "PoLi / PoMI",path: "/platform/integrity" },
  { id: "rcl",       label: "RCL",        path: "/regulatory/adgm" },
  { id: "alerts",    label: "ALERTS",     path: "/platform/alerts" },
];

export function PlatformTabs() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/regulatory/adgm") return location.startsWith("/regulatory");
    return location === path;
  };

  return (
    <div
      className="sticky z-40 flex-shrink-0"
      style={{
        top: 56,
        background: "#080D14",
        borderBottom: "1px solid #1A2435",
      }}
    >
      <div style={{ display: "flex", padding: "0 16px" }}>
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <Link key={tab.id} href={tab.path}>
              <button
                data-testid={`tab-${tab.id}`}
                style={{
                  padding: "0 16px",
                  height: 36,
                  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: active ? "#00BFA5" : "#7B8EA3",
                  background: "none",
                  border: "none",
                  borderBottom: active ? "2px solid #00BFA5" : "2px solid transparent",
                  cursor: "pointer",
                  position: "relative",
                  top: 1,
                  transition: "color 0.12s, border-color 0.12s",
                }}
              >
                {tab.label}
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
