/**
 * RCL (Regulatory Consumption Layer) API Routes
 * Version: v0.1
 * Jurisdiction: ADGM
 * 
 * Read-only regulatory view endpoints for market integrity monitoring
 */

import { Router, Request, Response, NextFunction } from "express";
import {
  getAdgmScreenPayload,
  getInstruments,
  cacheSnapshot,
  getSnapshot,
  type RclScreenPayload,
  type RclTimeMode,
} from "../services/rclMock";

const router = Router();

interface AccessContext {
  role: string;
  jurisdiction: string;
  scopes: string[];
}

declare global {
  namespace Express {
    interface Request {
      rclAccess?: AccessContext;
    }
  }
}

function requireBearerToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === undefined) {
    req.rclAccess = {
      role: "regulator",
      jurisdiction: "ADGM",
      scopes: ["rcl:read"],
    };
    return next();
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Bearer token required",
    });
  }

  req.rclAccess = {
    role: "regulator",
    jurisdiction: "ADGM",
    scopes: ["rcl:read"],
  };
  
  next();
}

router.get("/meta", (_req: Request, res: Response) => {
  res.json({
    contract_version: "rcl_v0.1",
    jurisdiction: "ADGM",
    description: "Regulatory Consumption Layer - Read-only market integrity view",
    endpoints: [
      { path: "/screen/adgm", method: "GET", description: "ADGM regulatory screen payload" },
      { path: "/instruments", method: "GET", description: "List available instruments" },
      { path: "/exports/:snapshot_ref/json", method: "GET", description: "Export snapshot as JSON" },
      { path: "/exports/:snapshot_ref/pdf", method: "GET", description: "Export snapshot as PDF" },
    ],
    authoritative_record: false,
  });
});

router.get("/instruments", requireBearerToken, (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const cursor = req.query.cursor as string | undefined;

  const result = getInstruments(q, limit, cursor);

  res.json({
    items: result.items,
    pagination: {
      limit,
      next_cursor: result.next_cursor,
    },
  });
});

router.get("/screen/adgm", requireBearerToken, (req: Request, res: Response) => {
  const instrument = (req.query.instrument as string) || "BTC-USD";
  const timeModeParam = req.query.time_mode as string | undefined;
  const timeMode: RclTimeMode = timeModeParam === "at_time" ? "at_time" : "latest_snapshot";
  const at = req.query.at as string | undefined;

  const payload = getAdgmScreenPayload(instrument, timeMode, at);
  
  cacheSnapshot(payload);

  res.json(payload);
});

router.get("/exports/:snapshot_ref/json", requireBearerToken, (req: Request, res: Response) => {
  const { snapshot_ref } = req.params;

  let payload = getSnapshot(snapshot_ref);

  if (!payload) {
    payload = getAdgmScreenPayload("BTC-USD", "latest_snapshot");
    (payload.provenance.reference_ids as { snapshot_ref: string }).snapshot_ref = snapshot_ref;
    cacheSnapshot(payload);
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="rcl-snapshot-${snapshot_ref}.json"`
  );
  res.json(payload);
});

router.get("/exports/:snapshot_ref/pdf", requireBearerToken, (req: Request, res: Response) => {
  const { snapshot_ref } = req.params;

  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 24 Tf
50 700 Td
(RCL Regulatory Snapshot) Tj
/F1 12 Tf
0 -30 Td
(Snapshot Reference: ${snapshot_ref}) Tj
0 -20 Td
(Jurisdiction: ADGM) Tj
0 -20 Td
(Contract Version: rcl_v0.1) Tj
0 -40 Td
(This is a placeholder PDF document.) Tj
0 -20 Td
(Full PDF rendering will be implemented in Phase B.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000516 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
595
%%EOF`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="rcl-snapshot-${snapshot_ref}.pdf"`
  );
  res.send(pdfContent);
});

export default router;
