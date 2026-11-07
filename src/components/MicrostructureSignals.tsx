import React from 'react';
import { OFISnapshot } from '../engine/microstructure';
import { Activity, Gauge, TrendingUp, TrendingDown, Radio, ShieldAlert } from 'lucide-react';

interface Props {
  ofi: OFISnapshot;
}

export const MicrostructureSignals: React.FC<Props> = ({ ofi }) => {
  return (
    <div className="space-y-6">
      {/* Primary Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Instantaneous OFI */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Order Flow Imbalance (OFI)</span>
            <span className="text-[10px] font-mono text-slate-500">ΔV_bid - ΔV_ask</span>
          </div>
          <div className={`text-2xl font-mono font-bold ${ofi.ofi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {ofi.ofi > 0 ? `+${ofi.ofi}` : ofi.ofi}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Net limit-order book revision pressure
          </p>
        </div>

        {/* Normalized OFI */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Normalized OFI Ratio</span>
            <span className="text-[10px] font-mono text-slate-500">[-1.0, +1.0]</span>
          </div>
          <div className={`text-2xl font-mono font-bold ${ofi.normalizedOFI >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
            {ofi.normalizedOFI > 0 ? `+${ofi.normalizedOFI.toFixed(3)}` : ofi.normalizedOFI.toFixed(3)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Standardized depth momentum index
          </p>
        </div>

        {/* Micro-Price Estimator */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Volume-Weighted Micro-Price</span>
            <span className="text-[10px] font-mono text-slate-500">P_micro</span>
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100">
            ${ofi.microPrice.toFixed(3)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Queue-weighted fair settlement estimate
          </p>
        </div>

        {/* Toxicity VPIN Metric */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Toxicity Metric (VPIN)</span>
            <span className="text-[10px] font-mono text-slate-500">Easley et al.</span>
          </div>
          <div className={`text-2xl font-mono font-bold ${ofi.vpin > 0.45 ? 'text-rose-400' : ofi.vpin > 0.30 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {(ofi.vpin * 100).toFixed(1)}%
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Informed trading adverse selection risk
          </p>
        </div>
      </div>

      {/* Signal Analytics & Direction Predictor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h4 className="font-semibold text-slate-100 text-sm uppercase tracking-wide">
              Microstructure Short-Term Alpha Signal
            </h4>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs text-slate-500 block">Directional Forecast (Next 5-15 Ticks)</span>
              <div className="flex items-center space-x-2 mt-1">
                {ofi.predictedDirection === 'BULLISH' && (
                  <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-bold text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>BULLISH ORDER PRESSURE</span>
                  </span>
                )}
                {ofi.predictedDirection === 'BEARISH' && (
                  <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono font-bold text-sm">
                    <TrendingDown className="w-4 h-4" />
                    <span>BEARISH ORDER PRESSURE</span>
                  </span>
                )}
                {ofi.predictedDirection === 'NEUTRAL' && (
                  <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono font-bold text-sm">
                    <span>BALANCED ORDER FLOW</span>
                  </span>
                )}
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="text-slate-500 block">Cumulative Integrated OFI:</span>
              <span className={`text-lg font-bold ${ofi.cumulativeOFI >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {ofi.cumulativeOFI > 0 ? `+${ofi.cumulativeOFI}` : ofi.cumulativeOFI} lots
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed pt-2">
            <strong>Theoretical Mechanism:</strong> According to empirical microstructure literature (Cont, Kukanov, Stoikov 2014), price changes in high-frequency limit order books exhibit strong linear correlation with Order Flow Imbalance (OFI). Shifts in queue depth reflect institutional accumulation or adverse informed order flow ahead of quote adjustments.
          </div>
        </div>

        {/* Spread Elasticity Card */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <h4 className="font-semibold text-slate-100 text-xs uppercase tracking-wide">
              Queue Elasticity &amp; Liquidity Health
            </h4>
          </div>

          <div className="space-y-3 pt-2">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-500 block mb-1">Queue Replenishment Elasticity</span>
              <div className="text-xl font-mono font-bold text-emerald-400">
                {(ofi.spreadElasticity * 100).toFixed(1)}%
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Ratio of queue resilience to incoming order shocks</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-500 block mb-1">Adverse Selection State</span>
              <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                ofi.vpin > 0.40 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {ofi.vpin > 0.40 ? 'ELEVATED TOXICITY' : 'NORMAL MARKET LIQUIDITY'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
