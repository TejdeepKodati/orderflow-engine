import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BENCHMARK_SPREADS, SpreadPair, backtestSpreadMeanReversion, StatArbMetrics } from '../engine/statArb';
import { TrendingUp, RefreshCw, Layers, ShieldCheck, Award } from 'lucide-react';

export const StatArbBacktester: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState<SpreadPair>(BENCHMARK_SPREADS[0]);
  const [zEntry, setZEntry] = useState<number>(1.8);
  const [zExit, setZExit] = useState<number>(0.4);
  const [periods, setPeriods] = useState<number>(80);
  const [seed, setSeed] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const backtest = useMemo(() => {
    return backtestSpreadMeanReversion(selectedPair, periods, zEntry, zExit);
  }, [selectedPair, periods, zEntry, zExit, seed]);

  // Canvas drawing for Spread Price & Cumulative PnL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || backtest.points.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const padX = 50;
    const padY = 40;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const pts = backtest.points;
    let minPnL = 0;
    let maxPnL = 0;
    pts.forEach(p => {
      if (p.cumulativePnL < minPnL) minPnL = p.cumulativePnL;
      if (p.cumulativePnL > maxPnL) maxPnL = p.cumulativePnL;
    });

    const range = Math.max(100, maxPnL - minPnL);
    const zeroY = padY + (1 - (0 - minPnL) / range) * plotH;

    // Grid line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padY + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(width - padX, y);
      ctx.stroke();
    }

    // Zero baseline
    ctx.strokeStyle = '#475569';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padX, zeroY);
    ctx.lineTo(width - padX, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Cumulative PnL Curve
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    pts.forEach((p, idx) => {
      const x = padX + (idx / (pts.length - 1)) * plotW;
      const y = padY + (1 - (p.cumulativePnL - minPnL) / range) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill gradient under PnL
    const grad = ctx.createLinearGradient(0, padY, 0, height - padY);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    ctx.fillStyle = grad;
    ctx.lineTo(padX + plotW, zeroY);
    ctx.lineTo(padX, zeroY);
    ctx.closePath();
    ctx.fill();

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';
    ctx.fillText(`+$${Math.round(maxPnL)}`, padX - 8, padY + 10);
    ctx.fillText(`-$${Math.round(Math.abs(minPnL))}`, padX - 8, height - padY);
    ctx.fillText('$0', padX - 8, zeroY + 3);

  }, [backtest]);

  return (
    <div className="space-y-6">
      {/* Spread Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-xl">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold text-slate-100 text-sm uppercase tracking-wide">
            Ornstein-Uhlenbeck Spread Trading Pairs
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {BENCHMARK_SPREADS.map(pair => (
            <button
              key={pair.id}
              onClick={() => setSelectedPair(pair)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                selectedPair.id === pair.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {pair.name}
            </button>
          ))}
          <button
            onClick={() => setSeed(s => s + 1)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
            title="Re-run Simulation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Performance Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl">
          <span className="text-[11px] text-slate-400 block mb-0.5">Total Cumulative P&amp;L</span>
          <span className={`text-lg font-mono font-bold ${backtest.metrics.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {backtest.metrics.totalPnL >= 0 ? `+$${backtest.metrics.totalPnL.toLocaleString()}` : `-$${Math.abs(backtest.metrics.totalPnL).toLocaleString()}`}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl">
          <span className="text-[11px] text-slate-400 block mb-0.5">Annualized Sharpe</span>
          <span className="text-lg font-mono font-bold text-cyan-400">
            {backtest.metrics.sharpeRatio.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl">
          <span className="text-[11px] text-slate-400 block mb-0.5">Sortino Ratio</span>
          <span className="text-lg font-mono font-bold text-purple-400">
            {backtest.metrics.sortinoRatio.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl">
          <span className="text-[11px] text-slate-400 block mb-0.5">Win Rate</span>
          <span className="text-lg font-mono font-bold text-emerald-400">
            {backtest.metrics.winRate}%
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl">
          <span className="text-[11px] text-slate-400 block mb-0.5">Maximum Drawdown</span>
          <span className="text-lg font-mono font-bold text-rose-400">
            -${backtest.metrics.maxDrawdown.toLocaleString()}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl">
          <span className="text-[11px] text-slate-400 block mb-0.5">Mean Half-Life (τ)</span>
          <span className="text-lg font-mono font-bold text-amber-400">
            {selectedPair.halfLifeDays} days
          </span>
        </div>
      </div>

      {/* Chart & Parameter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Equity Curve (Continuous Spread Mean-Reversion P&amp;L)
            </span>
            <span className="text-[11px] font-mono text-emerald-400">Z-Score Arbitrage Model</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
            <canvas
              ref={canvasRef}
              width={720}
              height={300}
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Threshold Tuning Panel */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h4 className="font-semibold text-slate-100 text-xs uppercase tracking-wide">
              Statistical Arbitrage Bounds
            </h4>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Z-Score Entry Threshold</span>
                <span className="font-mono text-cyan-400 font-medium">±{zEntry.toFixed(1)} σ</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={3.0}
                step={0.1}
                value={zEntry}
                onChange={(e) => setZEntry(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 rounded h-1.5 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Z-Score Exit Threshold</span>
                <span className="font-mono text-emerald-400 font-medium">±{zExit.toFixed(1)} σ</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={zExit}
                onChange={(e) => setZExit(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 bg-slate-800 rounded h-1.5 cursor-pointer"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
              <span className="text-slate-400 font-medium block">Pair Characteristics:</span>
              <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                <span>Leg A (Asset 1):</span>
                <span>{selectedPair.legA}</span>
              </div>
              <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                <span>Leg B (Asset 2):</span>
                <span>{selectedPair.legB}</span>
              </div>
              <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                <span>Long-term Spread Mean:</span>
                <span>${selectedPair.meanSpread.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300 font-mono text-[11px]">
                <span>Hedge Ratio (β):</span>
                <span>{selectedPair.hedgeRatio.toFixed(2)}x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
