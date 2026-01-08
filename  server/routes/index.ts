import { Router } from "express";

import lisRouter from "./lis";
import poliRouter from "./poli";
import tsleRouter from "./tsle";
import depthRouter from "./depth";
import alertsRouter from "./alerts";
import fundingRouter from "./funding";
import liquidityRouter from "./liquidity";
import executionRouter from "./execution";
import intelRouter from "./intel";

const router = Router();

// --- Core LIS / LTC routes ---
router.use("/lis", lisRouter);
router.use("/depth", depthRouter);
router.use("/liquidity", liquidityRouter);
router.use("/execution", executionRouter);
router.use("/funding", fundingRouter);
router.use("/alerts", alertsRouter);
router.use("/intel", intelRouter);

// --- TILT / TSLE ---
router.use("/tsle", tsleRouter);

// --- PoLi (Judgement Layer) ---
router.use("/poli", poliRouter);

export default router;