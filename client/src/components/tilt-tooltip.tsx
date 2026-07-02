/**
 * TiltTooltip  -  lightweight hover tooltip system for the TILT terminal.
 *
 * Usage:
 *   <TT title="Metric Name" body="Plain-language explanation...">
 *     <div>...label and/or value...</div>
 *   </TT>
 *
 * The wrapper renders with display:contents so it has zero layout impact.
 * The tooltip portal appears near the cursor with 220ms delay and smart
 * viewport-edge avoidance.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

export interface TTProps {
  title: string;
  body: string;
  children: React.ReactNode;
}

const TIP_W = 320;
const DELAY_MS = 220;

export function TT({ title, body, children }: TTProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleShow = useCallback((e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), DELAY_MS);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const move = useCallback((e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let left = pos.x + 14;
  let top  = pos.y + 14;

  if (left + TIP_W > vw - 8) left = pos.x - TIP_W - 14;
  if (left < 8) left = 8;

  const estimatedHeight = 40 + body.length * 0.3;
  if (top + estimatedHeight > vh - 8) top = pos.y - estimatedHeight - 14;
  if (top < 8) top = 8;

  return (
    <>
      <span
        style={{ display: "contents" }}
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        onMouseMove={move}
      >
        {children}
      </span>
      {visible &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left,
              top,
              zIndex: 99999,
              background: "#0F151F",
              border: "1px solid #1A2435",
              borderRadius: 2,
              width: TIP_W,
              maxWidth: "calc(100vw - 24px)",
              padding: "12px 16px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#D8DEE8",
                marginBottom: 6,
                lineHeight: 1.3,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: 12,
                color: "#7B8EA3",
                lineHeight: 1.6,
              }}
            >
              {body}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
