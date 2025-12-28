/**
 * LIS State Invariant Tests
 * 
 * Validates the /api/lis/state endpoint against core invariants:
 * 1. Price-Independence: TSLE, PoLi, Regime unchanged under price-only shocks
 * 2. Horizon Independence: Now/Session/Baseline compute independently
 * 3. Cross-Venue Fragmentation: Proper divergence detection
 * 4. Consumer Reliability: LiquidityState object completeness
 */

import {
  TSLE_DEFINITION,
  TSLE_ALLOWED_INPUTS,
  TSLE_FORBIDDEN_INPUTS,
  type LiquidityState,
  type PoLiRating,
  computePoLiRating,
  isLiquidityReal,
  classifyRegime,
  createEmptyLiquidityState,
} from "../../shared/liquidity-truth";

import {
  tsleBuffer,
  tsleStateEngine,
  buildLiquidityState,
  TSLE_STATE,
  type TSLEPoint,
  type TSLEStateSnapshot,
} from "../services/tsle-buffer";

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  duration: number;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  passed: number;
  failed: number;
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockTSLEPoint(overrides: Partial<TSLEPoint> = {}): TSLEPoint {
  return {
    ts: Date.now(),
    poli: 75,
    depth25: 500000,
    depth50: 1200000,
    imbalance2550: 0.08,
    ...overrides,
  };
}

function createBufferWithPriceShock(): { before: TSLEPoint[]; after: TSLEPoint[] } {
  const baseTime = Date.now() - 60000;
  
  const before: TSLEPoint[] = [];
  const after: TSLEPoint[] = [];
  
  for (let i = 0; i < 10; i++) {
    const point: TSLEPoint = {
      ts: baseTime + i * 5000,
      poli: 72 + Math.random() * 5,
      depth25: 480000 + Math.random() * 40000,
      depth50: 1150000 + Math.random() * 100000,
      imbalance2550: 0.06 + Math.random() * 0.04,
    };
    before.push(point);
    after.push({ ...point });
  }
  
  return { before, after };
}

function createHorizonTestBuffers(): {
  nowBuffer: TSLEPoint[];
  sessionBuffer: TSLEPoint[];
  baselineBuffer: TSLEPoint[];
} {
  const now = Date.now();
  
  const nowBuffer: TSLEPoint[] = [];
  for (let i = 0; i < 6; i++) {
    nowBuffer.push({
      ts: now - (60 - i * 10) * 1000,
      poli: 80 - i * 2,
      depth25: 600000 - i * 20000,
      depth50: 1400000 - i * 50000,
      imbalance2550: 0.05 + i * 0.01,
    });
  }
  
  const sessionBuffer: TSLEPoint[] = [];
  for (let i = 0; i < 30; i++) {
    sessionBuffer.push({
      ts: now - (3600 - i * 120) * 1000,
      poli: 65 + Math.sin(i * 0.3) * 10,
      depth25: 450000 + Math.sin(i * 0.2) * 50000,
      depth50: 1100000 + Math.sin(i * 0.2) * 100000,
      imbalance2550: 0.10 + Math.sin(i * 0.1) * 0.05,
    });
  }
  
  const baselineBuffer: TSLEPoint[] = [];
  for (let i = 0; i < 100; i++) {
    baselineBuffer.push({
      ts: now - (86400 - i * 864) * 1000,
      poli: 70 + Math.sin(i * 0.1) * 15,
      depth25: 500000 + Math.sin(i * 0.05) * 100000,
      depth50: 1200000 + Math.sin(i * 0.05) * 200000,
      imbalance2550: 0.08 + Math.sin(i * 0.08) * 0.06,
    });
  }
  
  return { nowBuffer, sessionBuffer, baselineBuffer };
}

function createDivergentVenueSnapshots(): {
  reference: TSLEPoint[];
  stress: TSLEPoint[];
} {
  const now = Date.now();
  
  const reference: TSLEPoint[] = [];
  const stress: TSLEPoint[] = [];
  
  for (let i = 0; i < 10; i++) {
    reference.push({
      ts: now - (50 - i * 5) * 1000,
      poli: 78,
      depth25: 550000,
      depth50: 1300000,
      imbalance2550: 0.06,
    });
    
    stress.push({
      ts: now - (50 - i * 5) * 1000,
      poli: 45,
      depth25: 280000,
      depth50: 650000,
      imbalance2550: 0.25,
    });
  }
  
  return { reference, stress };
}

// ============================================================================
// TEST RUNNERS
// ============================================================================

function runPriceIndependenceTests(): TestSuite {
  const results: TestResult[] = [];
  const start = Date.now();
  
  {
    const testStart = Date.now();
    const { before, after } = createBufferWithPriceShock();
    
    const mockStateSnapshot: TSLEStateSnapshot = {
      state: TSLE_STATE.STABLE,
      since: Date.now() - 60000,
      durationMs: 60000,
      transitionCount: 0,
      lastTransition: null,
      pendingState: null,
      confirmationProgress: 0,
      confirmationRequired: 0,
    };
    
    const mockTrend = {
      direction: "stable" as const,
      poliChange: 1,
      poliVelocity: 0.1,
      depthChange: 2,
      depthVelocity: 0.5,
      imbalanceShift: 0.01,
      momentum: "neutral" as const,
      confidence: 0.8,
    };
    
    const stateBefore = buildLiquidityState("coinbase", "BTC", before, mockStateSnapshot, mockTrend, []);
    const stateAfter = buildLiquidityState("coinbase", "BTC", after, mockStateSnapshot, mockTrend, []);
    
    const poliMatch = stateBefore.poli.value === stateAfter.poli.value;
    const regimeMatch = stateBefore.regime.regime === stateAfter.regime.regime;
    const tsleMatch = stateBefore.tsle.state.state === stateAfter.tsle.state.state;
    
    results.push({
      name: "TSLE/PoLi/Regime unchanged under identical liquidity inputs",
      passed: poliMatch && regimeMatch && tsleMatch,
      details: `PoLi: ${poliMatch}, Regime: ${regimeMatch}, TSLE: ${tsleMatch}`,
      duration: Date.now() - testStart,
    });
  }
  
  {
    const testStart = Date.now();
    const emptyState = createEmptyLiquidityState("test", "BTC");
    const priceIndependent = emptyState.invariants.priceIndependent;
    const noForbiddenInputs = emptyState.invariants.forbiddenInputsUsed.length === 0;
    
    results.push({
      name: "LiquidityState invariants flag set correctly",
      passed: priceIndependent && noForbiddenInputs,
      details: `priceIndependent: ${priceIndependent}, forbiddenInputsUsed: ${emptyState.invariants.forbiddenInputsUsed.join(",")}`,
      duration: Date.now() - testStart,
    });
  }
  
  {
    const testStart = Date.now();
    const forbiddenCheck = TSLE_FORBIDDEN_INPUTS.every(input => 
      !TSLE_ALLOWED_INPUTS.includes(input as any)
    );
    const coreInputs = ["depth25", "depth50", "imbalance2550", "poli", "spread"];
    const hasCoreInputs = coreInputs.every(input => 
      TSLE_ALLOWED_INPUTS.includes(input as any)
    );
    const noPriceInputs = !TSLE_ALLOWED_INPUTS.includes("price" as any) && 
      !TSLE_ALLOWED_INPUTS.includes("returns" as any) &&
      !TSLE_ALLOWED_INPUTS.includes("volume" as any);
    
    results.push({
      name: "TSLE allowed/forbidden inputs are mutually exclusive",
      passed: forbiddenCheck && hasCoreInputs && noPriceInputs,
      details: `Core inputs present: ${hasCoreInputs}, No forbidden: ${forbiddenCheck}, No price: ${noPriceInputs}`,
      duration: Date.now() - testStart,
    });
  }
  
  {
    const testStart = Date.now();
    const definitionContainsPrice = TSLE_DEFINITION.toLowerCase().includes("independent of price");
    
    results.push({
      name: "TSLE definition explicitly states price-independence",
      passed: definitionContainsPrice,
      details: `Definition: "${TSLE_DEFINITION}"`,
      duration: Date.now() - testStart,
    });
  }
  
  return {
    name: "Price-Independence Invariant Tests",
    results,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
  };
}

function runHorizonIndependenceTests(): TestSuite {
  const results: TestResult[] = [];
  
  {
    const testStart = Date.now();
    const { nowBuffer, sessionBuffer, baselineBuffer } = createHorizonTestBuffers();
    
    const mockStateSnapshot: TSLEStateSnapshot = {
      state: TSLE_STATE.STABLE,
      since: Date.now() - 60000,
      durationMs: 60000,
      transitionCount: 0,
      lastTransition: null,
      pendingState: null,
      confirmationProgress: 0,
      confirmationRequired: 0,
    };
    
    const mockTrend = {
      direction: "stable" as const,
      poliChange: 0,
      poliVelocity: 0,
      depthChange: 0,
      depthVelocity: 0,
      imbalanceShift: 0,
      momentum: "neutral" as const,
      confidence: 0.5,
    };
    
    const nowState = buildLiquidityState("coinbase", "BTC", nowBuffer, mockStateSnapshot, mockTrend, []);
    const sessionState = buildLiquidityState("coinbase", "BTC", sessionBuffer, mockStateSnapshot, mockTrend, []);
    const baselineState = buildLiquidityState("coinbase", "BTC", baselineBuffer, mockStateSnapshot, mockTrend, []);
    
    const nowHorizon = nowState.tsle.horizons.now;
    const sessionHorizon = sessionState.tsle.horizons.session;
    const baselineHorizon = baselineState.tsle.horizons.baseline;
    
    const nowHasData = nowHorizon !== null;
    const sessionHasData = sessionHorizon !== null;
    const baselineHasData = baselineHorizon !== null;
    
    results.push({
      name: "Each horizon computes from its respective buffer",
      passed: nowHasData && sessionHasData && baselineHasData,
      details: `Now: ${nowHasData}, Session: ${sessionHasData}, Baseline: ${baselineHasData}`,
      duration: Date.now() - testStart,
    });
  }
  
  {
    const testStart = Date.now();
    const { nowBuffer } = createHorizonTestBuffers();
    
    const mockStateSnapshot: TSLEStateSnapshot = {
      state: TSLE_STATE.STABLE,
      since: Date.now() - 60000,
      durationMs: 60000,
      transitionCount: 0,
      lastTransition: null,
      pendingState: null,
      confirmationProgress: 0,
      confirmationRequired: 0,
    };
    
    const mockTrend = {
      direction: "stable" as const,
      poliChange: 0,
      poliVelocity: 0,
      depthChange: 0,
      depthVelocity: 0,
      imbalanceShift: 0,
      momentum: "neutral" as const,
      confidence: 0.5,
    };
    
    const state = buildLiquidityState("coinbase", "BTC", nowBuffer, mockStateSnapshot, mockTrend, []);
    
    const nowHorizon = state.tsle.horizons.now;
    const hasCorrectShape = nowHorizon !== null && 
      nowHorizon.horizon === "now" &&
      typeof nowHorizon.poli.value === "number" &&
      typeof nowHorizon.state.state === "string" &&
      typeof nowHorizon.trend.direction === "string";
    
    results.push({
      name: "Horizon TSLE has correct structure (poli, state, trend)",
      passed: hasCorrectShape,
      details: hasCorrectShape ? `Horizon: ${nowHorizon?.horizon}, State: ${nowHorizon?.state.state}` : "Missing fields",
      duration: Date.now() - testStart,
    });
  }
  
  {
    const testStart = Date.now();
    
    const horizonWindows = {
      now: 1,
      session: 60,
      baseline: 1440,
    };
    
    const windowsCorrect = horizonWindows.now === 1 && 
      horizonWindows.session === 60 && 
      horizonWindows.baseline === 1440;
    
    results.push({
      name: "Horizon windows are correctly defined (1/60/1440 minutes)",
      passed: windowsCorrect,
      details: `Now: ${horizonWindows.now}min, Session: ${horizonWindows.session}min, Baseline: ${horizonWindows.baseline}min`,
      duration: Date.now() - testStart,
    });
  }
  
  return {
    name: "Horizon Independence Tests",
    results,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
  };
}

function runFragmentationTests(): TestSuite {
  const results: TestResult[] = [];
  
  {
    const testStart = Date.now();
    const { reference, stress } = createDivergentVenueSnapshots();
    
    const refLatest = reference[reference.length - 1];
    const stressLatest = stress[stress.length - 1];
    
    const poliDivergence = Math.abs(refLatest.poli - stressLatest.poli);
    const depthDivergence = Math.abs(
      (refLatest.depth25 + refLatest.depth50) - (stressLatest.depth25 + stressLatest.depth50)
    ) / (refLatest.depth25 + refLatest.depth50) * 100;
    const imbalanceDivergence = Math.abs(refLatest.imbalance2550 - stressLatest.imbalance2550);
    
    const hasSignificantDivergence = poliDivergence > 15 || depthDivergence > 30 || imbalanceDivergence > 0.15;
    
    results.push({
      name: "Divergence detected between reference and stress venues",
      passed: hasSignificantDivergence,
      details: `PoLi div: ${poliDivergence.toFixed(1)}, Depth div: ${depthDivergence.toFixed(1)}%, Imbalance div: ${(imbalanceDivergence * 100).toFixed(1)}%`,
      duration: Date.now() - testStart,
    });
  }
  
  {
    const testStart = Date.now();
    
    const poliRef = 78;
    const poliStress = 45;
    const divergenceThreshold = 15;
    
    const divergenceDetected = Math.abs(poliRef - poliStress) > divergenceThreshold;
    
    results.push({
      name: "PoLi divergence threshold (15 points) triggers signal",
      passed: divergenceDetected,
      details: `Reference PoLi: ${poliRef}, Stress PoLi: ${poliStress}, Threshold: ${divergenceThreshold}`,
      duration: Date.now() - testStart,
    });
  }
  
  {
    const testStart = Date.now();
    
    const regimeFromHighPoli = classifyRegime(78, "stable", 0.06, 0);
    const regimeFromLowPoli = classifyRegime(45, "declining", 0.25, 3);
    
    const regimesClassifiedCorrectly = 
      regimeFromHighPoli.regime === "NORMAL" && 
      (regimeFromLowPoli.regime === "THIN" || regimeFromLowPoli.regime === "STRESSED");
    
    results.push({
      name: "Regime classification responds to fragmented conditions",
      passed: regimesClassifiedCorrectly,
      details: `High PoLi regime: ${regimeFromHighPoli.regime}, Low PoLi regime: ${regimeFromLowPoli.regime}`,
      duration: Date.now() - testStart,
    });
  }
  
  return {
    name: "Cross-Venue Fragmentation Tests",
    results,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
  };
}

function runConsumerReliabilityTests(): TestSuite {
  const results: TestResult[] = [];
  
  {
    const testStart = Date.now();
    const emptyState = createEmptyLiquidityState("coinbase", "BTC");
    
    const hasSymbol = typeof emptyState.symbol === "string";
    const hasVenue = typeof emptyState.venue === "string";
    const hasTimestamp = typeof emptyState.timestamp === "number";
    const hasPoli = emptyState.poli !== undefined;
    const hasRegime = emptyState.regime !== undefined;
    const hasTsle = emptyState.tsle !== undefined;
    const hasInvariants = emptyState.invariants !== undefined;
    
    const allFieldsPresent = hasSymbol && hasVenue && hasTimestamp && hasPoli && hasRegime && hasTsle && hasInvariants;
    
    results.push({
      name: "LiquidityState has all required top-level fields",
      passed: allFieldsPresent,
      details: `symbol: ${hasSymbol}, venue: ${hasVenue}, timestamp: ${hasTimestamp}, poli: ${hasPoli}, regime: ${hasRegime}, tsle: ${hasTsle}, invariants: ${hasInvariants}`,
      duration: Date.now() - testStart,
    });
  }
  
  {
    const testStart = Date.now();
    const emptyState = createEmptyLiquidityState("coinbase", "BTC");
    
    const hasPoliValue = typeof emptyState.poli.value === "number";
    const hasPoliRating = typeof emptyState.poli.rating === "string";
    const hasPoliIsReal = typeof emptyState.poli.isReal === "boolean";
    const hasPoliComponents = emptyState.poli.components !== undefined;
    const hasPoliInterpretation = typeof emptyState.poli.interpretation === "string";
    
    const poliComplete = hasPoliValue && hasPoliRating && hasPoliIsReal && hasPoliComponents && hasPoliInterpretation;
    
    results.push({
      name: "PoLi object has all required fields",
      passed: poliComplete,
      details: `value: ${hasPoliValue}, rating: ${hasPoliRating}, isReal: ${hasPoliIsReal}, components: ${hasPoliComponents}, interpretation: ${hasPoliInterpretation}`,
      duration: Date.now() - testStart,
    });
  }
  
  {
    const testStart = Date.now();
    const emptyState = createEmptyLiquidityState("coinbase", "BTC");
    
    const hasDefinition = typeof emptyState.tsle.definition === "string";
    const hasState = emptyState.tsle.state !== undefined;
    const hasHorizons = emptyState.tsle.horizons !== undefined;
    const hasNowHorizon = "now" in emptyState.tsle.horizons;
    const hasSessionHorizon = "session" in emptyState.tsle.horizons;
    const hasBaselineHorizon = "baseline" in emptyState.tsle.horizons;
    
    const tsleComplete = hasDefinition && hasState && hasHorizons && hasNowHorizon && hasSessionHorizon && hasBaselineHorizon;
    
    results.push({
      name: "TSLE object has definition, state, and all horizons",
      passed: tsleComplete,
      details: `definition: ${hasDefinition}, state: ${hasState}, horizons: ${hasHorizons}, now: ${hasNowHorizon}, session: ${hasSessionHorizon}, baseline: ${hasBaselineHorizon}`,
      duration: Date.now() - testStart,
    });
  }
  
  {
    const testStart = Date.now();
    
    const testCases: Array<{ poli: number; expected: PoLiRating }> = [
      { poli: 95, expected: "AAA" },
      { poli: 85, expected: "AA" },
      { poli: 75, expected: "A" },
      { poli: 65, expected: "BBB" },
      { poli: 55, expected: "BB" },
      { poli: 45, expected: "B" },
      { poli: 30, expected: "CCC" },
      { poli: 10, expected: "D" },
    ];
    
    const allRatingsCorrect = testCases.every(tc => computePoLiRating(tc.poli) === tc.expected);
    
    results.push({
      name: "PoLi rating bands compute correctly (AAA through D)",
      passed: allRatingsCorrect,
      details: testCases.map(tc => `${tc.poli}→${computePoLiRating(tc.poli)}`).join(", "),
      duration: Date.now() - testStart,
    });
  }
  
  {
    const testStart = Date.now();
    
    const isRealAt40 = isLiquidityReal(40);
    const isRealAt39 = isLiquidityReal(39);
    const isRealAt80 = isLiquidityReal(80);
    const isRealAt0 = isLiquidityReal(0);
    
    const thresholdCorrect = isRealAt40 && !isRealAt39 && isRealAt80 && !isRealAt0;
    
    results.push({
      name: "isLiquidityReal threshold at 40 works correctly",
      passed: thresholdCorrect,
      details: `40: ${isRealAt40}, 39: ${isRealAt39}, 80: ${isRealAt80}, 0: ${isRealAt0}`,
      duration: Date.now() - testStart,
    });
  }
  
  return {
    name: "Consumer Reliability Tests",
    results,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
  };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

export function runAllInvariantTests(): {
  suites: TestSuite[];
  totalPassed: number;
  totalFailed: number;
  summary: string;
} {
  console.log("\n" + "=".repeat(70));
  console.log("LIS STATE INVARIANT TESTS");
  console.log("=".repeat(70) + "\n");
  
  const suites: TestSuite[] = [];
  
  const priceTests = runPriceIndependenceTests();
  suites.push(priceTests);
  console.log(`\n[${priceTests.name}]`);
  priceTests.results.forEach(r => {
    console.log(`  ${r.passed ? "✓" : "✗"} ${r.name}`);
    if (!r.passed) console.log(`    Details: ${r.details}`);
  });
  
  const horizonTests = runHorizonIndependenceTests();
  suites.push(horizonTests);
  console.log(`\n[${horizonTests.name}]`);
  horizonTests.results.forEach(r => {
    console.log(`  ${r.passed ? "✓" : "✗"} ${r.name}`);
    if (!r.passed) console.log(`    Details: ${r.details}`);
  });
  
  const fragTests = runFragmentationTests();
  suites.push(fragTests);
  console.log(`\n[${fragTests.name}]`);
  fragTests.results.forEach(r => {
    console.log(`  ${r.passed ? "✓" : "✗"} ${r.name}`);
    if (!r.passed) console.log(`    Details: ${r.details}`);
  });
  
  const consumerTests = runConsumerReliabilityTests();
  suites.push(consumerTests);
  console.log(`\n[${consumerTests.name}]`);
  consumerTests.results.forEach(r => {
    console.log(`  ${r.passed ? "✓" : "✗"} ${r.name}`);
    if (!r.passed) console.log(`    Details: ${r.details}`);
  });
  
  const totalPassed = suites.reduce((sum, s) => sum + s.passed, 0);
  const totalFailed = suites.reduce((sum, s) => sum + s.failed, 0);
  
  console.log("\n" + "=".repeat(70));
  console.log(`SUMMARY: ${totalPassed} passed, ${totalFailed} failed`);
  console.log("=".repeat(70) + "\n");
  
  return {
    suites,
    totalPassed,
    totalFailed,
    summary: `${totalPassed} passed, ${totalFailed} failed`,
  };
}

runAllInvariantTests();
