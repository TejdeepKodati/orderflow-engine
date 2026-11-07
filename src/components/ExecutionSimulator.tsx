import React, { useState, useMemo } from 'react';
import { simulateTWAP, simulateVWAP, computeAlmgrenChriss, ExecutionResult } from '../engine/execution';
import { Cpu, Zap, ArrowDownRight, Layers, Sliders, CheckCircle2 } from 'lucide-react';

export const ExecutionSimulator: React.FC = () => {
  const [totalQuantity, setTotalQuantity] = useState<number>(5000);
  const [arrivalPrice, setArrivalPrice] = useState<number>(100.0);
  const [numSlices, setNumSlices] = useState<number>(8);
  const [riskAversion, setRiskAversion] = useState<number>(2.5); // scaled 1e-5
  const [impactCoeff, setImpactCoeff] = useState<number>(0.0007);

  const twapResult = useMemo(() => {
    return simulateTWAP(totalQuantity, arrivalPrice, numSlices, 0.015, impactCoeff);
  }, [totalQuantity, arrivalPrice, numSlices, impactCoeff]);

  const vwapResult = useMemo(() => {
    return simulateVWAP(totalQuantity, arrivalPrice, numSlices, 0.015, impactCoeff * 0.85);
  }, [totalQuantity, arrivalPrice, numSlices, impactCoeff]);

  const almgrenTrajectory = useMemo(() => {
    return computeAlmgrenChriss(totalQuantity, 1.0, numSlices, 0.25, riskAversion * 1e-5, impactCoeff, 1e-5);
  }, [totalQuantity, numSlices, riskAversion, impactCoeff]);

  const [activeAlgo, setActiveAlgo] = useState<'TWAP' | 'VWAP' | 'ALMGREN_CHRISS'>('VWAP');

  const activeResult = activeAlgo === 'TWAP' ? twapResult : vwapResult;

  return (
    <div className="space-y-6">
      {/* Parameter Controls Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide uppercase">
              Algorithmic Execution Parameters
            </h3>
          </div>

          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-mono">
            {(['TWAP', 'VWAP', 'ALMGREN_CHRISS'] as const).map(algo => (
              <button
                key={algo}
                onClick={() => setActiveAlgo(algo)}
                className={`px-3 py-1 rounded font-medium transition ${
                  activeAlgo === algo
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {algo.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Parent Order Size</span>
              <span className="font-mono text-cyan-400 font-medium">{totalQuantity.toLocaleString()} contracts</span>
            </div>
            <input
              type="range"
              min={1000}
              max={25000}
              step={500}
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Arrival Benchmark Price</span>
              <span className="font-mono text-slate-200 font-medium">${arrivalPrice.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={50}
              max={150}
              step={1}
              value={arrivalPrice}
              onChange={(e) => setArrivalPrice(parseFloat(e.target.value))}
              className="w-full accent-slate-400 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Execution Slices (Buckets)</span>
              <span className="font-mono text-slate-200 font-medium">{numSlices} intervals</span>
            </div>
            <input
              type="range"
              min={4}
              max={16}
              step={1}
              value={numSlices}
              onChange={(e) => setNumSlices(parseInt(e.target.value, 10))}
              className="w-full accent-slate-400 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Risk Aversion (λ)</span>
              <span className="font-mono text-purple-400 font-medium">{riskAversion.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10.0}
              step={0.5}
              value={riskAversion}
              onChange={(e) => setRiskAversion(parseFloat(e.target.value))}
              className="w-full accent-purple-400 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Algorithmic Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-xs text-slate-400 mb-1">Average Execution Price</div>
          <div className="text-2xl font-mono font-bold text-slate-100">
            ${activeResult.averageExecutedPrice.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Arrival: ${arrivalPrice.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-xs text-slate-400 mb-1">Benchmark Market VWAP</div>
          <div className="text-2xl font-mono font-bold text-cyan-400">
            ${activeResult.benchmarkVWAP.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Full market interval average
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-xs text-slate-400 mb-1">Implementation Shortfall</div>
          <div className="text-2xl font-mono font-bold text-rose-400">
            ${activeResult.implementationShortfall.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Total dollar slippage + impact
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="text-xs text-slate-400 mb-1">Execution Slippage (bps)</div>
          <div className="text-2xl font-mono font-bold text-amber-400">
            +{activeResult.slippageBps.toFixed(1)} bps
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Relative to pre-trade arrival
          </span>
        </div>
      </div>

      {/* Trajectory or Slices Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h4 className="font-semibold text-slate-100 text-sm tracking-wide uppercase">
            {activeAlgo === 'ALMGREN_CHRISS'
              ? 'Almgren-Chriss Optimal Liquidation Trajectory (x_j & v_j)'
              : `${activeAlgo} Slice Schedule & Execution Breakdown`}
          </h4>
          <span className="text-xs font-mono text-slate-500">
            {activeAlgo === 'ALMGREN_CHRISS' ? 'sinh(κ(T-t)) / sinh(κT) trajectory' : 'Intraday execution profile'}
          </span>
        </div>

        {activeAlgo === 'ALMGREN_CHRISS' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                  <th className="pb-2">Step</th>
                  <th className="pb-2">Remaining Inventory (x_j)</th>
                  <th className="pb-2">Trading Velocity (v_j)</th>
                  <th className="pb-2">Expected Impact Cost</th>
                  <th className="pb-2">Variance Risk Penalty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {almgrenTrajectory.map(tr => (
                  <tr key={tr.step} className="hover:bg-slate-800/20">
                    <td className="py-2.5 text-slate-400">Step {tr.step}</td>
                    <td className="py-2.5 font-bold text-cyan-400">{tr.remainingInventory.toLocaleString()}</td>
                    <td className="py-2.5 text-emerald-400 font-semibold">{tr.tradingVelocity.toLocaleString()} /dt</td>
                    <td className="py-2.5 text-amber-400">${tr.expectedCost.toFixed(2)}</td>
                    <td className="py-2.5 text-slate-400">${tr.varianceRisk.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                  <th className="pb-2">Slice</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Target Qty</th>
                  <th className="pb-2">Executed Price</th>
                  <th className="pb-2">Benchmark Mid</th>
                  <th className="pb-2">Slippage Ticks</th>
                  <th className="pb-2">Cum Executed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {activeResult.slices.map(s => (
                  <tr key={s.sliceIndex} className="hover:bg-slate-800/20">
                    <td className="py-2 text-slate-400">Slice #{s.sliceIndex}</td>
                    <td className="py-2 text-slate-400">{s.timeLabel}</td>
                    <td className="py-2 font-semibold text-slate-200">{s.targetQuantity}</td>
                    <td className="py-2 text-cyan-400 font-semibold">${s.executedPrice.toFixed(2)}</td>
                    <td className="py-2 text-slate-400">${s.benchmarkPrice.toFixed(2)}</td>
                    <td className="py-2 text-amber-400">+{s.slippageTicks} ticks</td>
                    <td className="py-2 text-slate-300 font-bold">{s.cumulativeExecuted.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
