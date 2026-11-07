// Algorithmic Execution Simulator: TWAP, VWAP, and Almgren-Chriss Optimal Impact Engine

export interface ExecutionSlice {
  sliceIndex: number;
  timeLabel: string;
  targetQuantity: number;
  executedPrice: number;
  benchmarkPrice: number;
  slippageTicks: number;
  cumulativeExecuted: number;
}

export interface AlmgrenChrissTrajectory {
  step: number;
  remainingInventory: number;
  tradingVelocity: number;
  expectedCost: number;
  varianceRisk: number;
}

export interface ExecutionResult {
  algorithm: 'TWAP' | 'VWAP' | 'ALMGREN_CHRISS';
  totalQuantity: number;
  averageExecutedPrice: number;
  benchmarkVWAP: number;
  arrivalPrice: number;
  implementationShortfall: number; // in $
  slippageBps: number;
  slices: ExecutionSlice[];
  almgrenTrajectory?: AlmgrenChrissTrajectory[];
}

// Generate intraday U-shaped volume curve (higher open/close, slower midday)
export function getIntradayVolumeWeights(numIntervals: number = 10): number[] {
  const weights: number[] = [];
  let sum = 0;
  for (let i = 0; i < numIntervals; i++) {
    const t = (i / (numIntervals - 1)) * 2 - 1; // [-1, 1]
    const w = 0.5 + 0.5 * (t * t); // U-shape parabola
    weights.push(w);
    sum += w;
  }
  return weights.map(w => w / sum);
}

// Simulate TWAP Execution
export function simulateTWAP(
  totalQuantity: number,
  arrivalPrice: number,
  numSlices: number = 8,
  dailyVol: number = 0.02,
  tempImpactCoeff: number = 0.0008
): ExecutionResult {
  const sliceQty = Math.floor(totalQuantity / numSlices);
  const slices: ExecutionSlice[] = [];
  let cumQty = 0;
  let totalCost = 0;
  let runningVWAPSum = 0;
  let runningMarketVol = 0;

  for (let i = 0; i < numSlices; i++) {
    const progress = i / numSlices;
    // Market price follows drift + random walk
    const randomWalk = (Math.sin(i * 1.3) * 0.4 + (i * 0.05)) * dailyVol * arrivalPrice;
    const marketMid = arrivalPrice + randomWalk;

    // Temporary market impact is proportional to slice size
    const marketImpact = tempImpactCoeff * sliceQty;
    const execPrice = Math.round((marketMid + marketImpact) * 100) / 100;

    const sliceMarketVol = 500 + Math.floor(Math.random() * 400);
    runningVWAPSum += marketMid * sliceMarketVol;
    runningMarketVol += sliceMarketVol;

    cumQty += sliceQty;
    totalCost += execPrice * sliceQty;

    slices.push({
      sliceIndex: i + 1,
      timeLabel: `T+${(i * 15)}m`,
      targetQuantity: sliceQty,
      executedPrice: execPrice,
      benchmarkPrice: Math.round(marketMid * 100) / 100,
      slippageTicks: Math.round(((execPrice - arrivalPrice) / 0.05) * 10) / 10,
      cumulativeExecuted: cumQty
    });
  }

  const avgPrice = totalCost / (cumQty || 1);
  const benchmarkVWAP = runningVWAPSum / (runningMarketVol || 1);
  const implementationShortfall = (avgPrice - arrivalPrice) * cumQty;
  const slippageBps = arrivalPrice > 0 ? ((avgPrice - arrivalPrice) / arrivalPrice) * 10000 : 0;

  return {
    algorithm: 'TWAP',
    totalQuantity: cumQty,
    averageExecutedPrice: Math.round(avgPrice * 100) / 100,
    benchmarkVWAP: Math.round(benchmarkVWAP * 100) / 100,
    arrivalPrice,
    implementationShortfall: Math.round(implementationShortfall * 100) / 100,
    slippageBps: Math.round(slippageBps * 10) / 10,
    slices
  };
}

// Simulate VWAP Execution
export function simulateVWAP(
  totalQuantity: number,
  arrivalPrice: number,
  numSlices: number = 8,
  dailyVol: number = 0.02,
  tempImpactCoeff: number = 0.0006
): ExecutionResult {
  const weights = getIntradayVolumeWeights(numSlices);
  const slices: ExecutionSlice[] = [];
  let cumQty = 0;
  let totalCost = 0;
  let runningVWAPSum = 0;
  let runningMarketVol = 0;

  for (let i = 0; i < numSlices; i++) {
    const targetSliceQty = Math.round(totalQuantity * weights[i]);
    const randomWalk = (Math.cos(i * 0.9) * 0.35 + (i * 0.03)) * dailyVol * arrivalPrice;
    const marketMid = arrivalPrice + randomWalk;

    // Better schedule reduces overall market impact
    const marketImpact = tempImpactCoeff * (targetSliceQty / (weights[i] * 1000 + 1));
    const execPrice = Math.round((marketMid + marketImpact) * 100) / 100;

    const sliceMarketVol = Math.round(weights[i] * 5000);
    runningVWAPSum += marketMid * sliceMarketVol;
    runningMarketVol += sliceMarketVol;

    cumQty += targetSliceQty;
    totalCost += execPrice * targetSliceQty;

    slices.push({
      sliceIndex: i + 1,
      timeLabel: `T+${(i * 15)}m`,
      targetQuantity: targetSliceQty,
      executedPrice: execPrice,
      benchmarkPrice: Math.round(marketMid * 100) / 100,
      slippageTicks: Math.round(((execPrice - arrivalPrice) / 0.05) * 10) / 10,
      cumulativeExecuted: cumQty
    });
  }

  const avgPrice = totalCost / (cumQty || 1);
  const benchmarkVWAP = runningVWAPSum / (runningMarketVol || 1);
  const implementationShortfall = (avgPrice - arrivalPrice) * cumQty;
  const slippageBps = arrivalPrice > 0 ? ((avgPrice - arrivalPrice) / arrivalPrice) * 10000 : 0;

  return {
    algorithm: 'VWAP',
    totalQuantity: cumQty,
    averageExecutedPrice: Math.round(avgPrice * 100) / 100,
    benchmarkVWAP: Math.round(benchmarkVWAP * 100) / 100,
    arrivalPrice,
    implementationShortfall: Math.round(implementationShortfall * 100) / 100,
    slippageBps: Math.round(slippageBps * 10) / 10,
    slices
  };
}

// Almgren-Chriss (2000) Optimal Liquidation Model
export function computeAlmgrenChriss(
  totalInventory: number,
  totalTimeHorizon: number = 1.0, // e.g. 1 day
  numSteps: number = 10,
  volatility: number = 0.30,
  riskAversion: number = 1e-5, // lambda
  tempImpactEta: number = 2.5e-4,
  permImpactGamma: number = 1.0e-5
): AlmgrenChrissTrajectory[] {
  const dt = totalTimeHorizon / numSteps;
  // Kappa parameter: sinh / cosh trajectory curvature
  // kappa^2 = (lambda * sigma^2) / eta
  const sigmaSquared = volatility * volatility;
  const kappaSquared = (riskAversion * sigmaSquared) / tempImpactEta;
  const kappa = Math.sqrt(Math.max(1e-7, kappaSquared));

  const trajectory: AlmgrenChrissTrajectory[] = [];
  const sinhKT = Math.sinh(kappa * totalTimeHorizon);

  for (let j = 0; j <= numSteps; j++) {
    const tj = j * dt;
    const remainingTime = totalTimeHorizon - tj;
    
    // Optimal inventory trajectory: x_j = X * sinh(kappa * (T - t_j)) / sinh(kappa * T)
    const inventory = sinhKT > 0
      ? totalInventory * (Math.sinh(kappa * remainingTime) / sinhKT)
      : totalInventory * (1 - j / numSteps);

    const prevInventory = j === 0 ? totalInventory : trajectory[j - 1].remainingInventory;
    const velocity = (prevInventory - inventory) / dt;

    // Expected execution cost & variance of cost
    const expectedCost = 0.5 * permImpactGamma * (totalInventory * totalInventory) + tempImpactEta * (velocity * velocity) * dt;
    const varianceRisk = 0.5 * sigmaSquared * (inventory * inventory) * dt;

    trajectory.push({
      step: j,
      remainingInventory: Math.max(0, Math.round(inventory)),
      tradingVelocity: Math.max(0, Math.round(velocity)),
      expectedCost: Math.round(expectedCost * 100) / 100,
      varianceRisk: Math.round(varianceRisk * 100) / 100
    });
  }

  return trajectory;
}
