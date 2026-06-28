import "../pages/platform/tilt-terminal.css";

interface PlatformFooterProps {
  venueCount?: number | null;
  latency?: number | null;
  testId?: string;
}

export function PlatformFooter({
  venueCount,
  latency,
  testId = "platform-footer",
}: PlatformFooterProps) {
  return (
    <div className="tilt-statusbar" data-testid={testId}>
      <div className="tilt-sb-live">
        <div className="tilt-sb-dot tilt-pulse" />
        MONITORING ACTIVE
      </div>
      <div className="tilt-sb-item">STRATALINK TELEMETRY</div>
      {venueCount != null && (
        <div className="tilt-sb-item">
          VENUES: <span>{venueCount} ACTIVE</span>
        </div>
      )}
      {latency != null && (
        <div className="tilt-sb-item">
          LATENCY: <span>{latency}ms</span>
        </div>
      )}
      <div style={{ marginLeft: "auto" }} className="tilt-sb-item">
        STRATALINK &rarr; MARKET INTEGRITY INFRASTRUCTURE
      </div>
    </div>
  );
}
