import React, { useState, useEffect } from 'react';
import { LimitOrderBook, DOMLevel, Trade, OrderSide, OrderType } from '../engine/orderBook';
import { MicrostructureAnalyzer, OFISnapshot } from '../engine/microstructure';
import { Play, Pause, RefreshCw, Send, ShieldAlert, Activity, BarChart2 } from 'lucide-react';

interface Props {
  lob: LimitOrderBook;
  analyzer: MicrostructureAnalyzer;
  onStateUpdate: (ofi: OFISnapshot) => void;
}

export const DepthOfMarketLadder: React.FC<Props> = ({ lob, analyzer, onStateUpdate }) => {
  const [dom, setDom] = useState(lob.getDOMLadder(8));
  const [state, setState] = useState(lob.getState());
  const [isLiveSim, setIsLiveSim] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(800); // ms per tick

  // Order submission form
  const [side, setSide] = useState<OrderSide>('buy');
  const [type, setType] = useState<OrderType>('limit');
  const [price, setPrice] = useState<number>(state.midPrice || 100.0);
  const [quantity, setQuantity] = useState<number>(20);
  const [displayQty, setDisplayQty] = useState<number>(5);

  const refreshState = () => {
    const s = lob.getState();
    const d = lob.getDOMLadder(8);
    setState(s);
    setDom(d);
    const ofi = analyzer.update(s.bids, s.asks, s.trades);
    onStateUpdate(ofi);
  };

  // Poisson simulated tick generator
  useEffect(() => {
    if (!isLiveSim) return;

    const interval = setInterval(() => {
      const s = lob.getState();
      const mid = s.midPrice || 100.0;
      const tick = 0.05;

      const rand = Math.random();
      if (rand < 0.45) {
        // Limit order near inside market
        const isBid = Math.random() < 0.5;
        const offset = Math.floor(Math.random() * 3 + 1) * tick;
        const p = isBid ? Math.round((mid - offset) * 100) / 100 : Math.round((mid + offset) * 100) / 100;
        const q = Math.floor(5 + Math.random() * 30);
        lob.submitLimitOrder(isBid ? 'buy' : 'sell', p, q);
      } else if (rand < 0.80) {
        // Market aggressive order
        const isBuy = Math.random() < 0.52; // slight upward drift
        const q = Math.floor(10 + Math.random() * 25);
        lob.submitOrder(isBuy ? 'buy' : 'sell', 'market', 0, q);
      } else {
        // Random cancellation
        const allBids = lob.getSortedLevels('buy');
        if (allBids.length > 3) {
          const lvl = allBids[Math.floor(Math.random() * allBids.length)];
          if (lvl.orders.length > 0) {
            lob.cancelOrder(lvl.orders[0].id);
          }
        }
      }

      refreshState();
    }, simSpeed);

    return () => clearInterval(interval);
  }, [isLiveSim, simSpeed]);

  const handleManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    lob.submitOrder(side, type, price, quantity, type === 'iceberg' ? displayQty : undefined);
    refreshState();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* DOM Ladder Display */}
      <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide uppercase">
              Depth-of-Market (DOM) Level-2 Ladder
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsLiveSim(!isLiveSim)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono transition ${
                isLiveSim
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isLiveSim ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isLiveSim ? 'Sim Running' : 'Paused'}</span>
            </button>

            <button
              onClick={() => {
                lob.seedInitialBook(100.0, 0.05);
                analyzer.reset();
                refreshState();
              }}
              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Reset Book"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Level-2 DOM Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                <th className="py-2 text-left font-medium">Bids Cum</th>
                <th className="py-2 text-left font-medium">Bid Size</th>
                <th className="py-2 text-center font-medium">Price</th>
                <th className="py-2 text-right font-medium">Ask Size</th>
                <th className="py-2 text-right font-medium">Asks Cum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {/* Asks (rendered top down in reverse order so lowest ask is at bottom) */}
              {[...dom.asks].reverse().map((ask, idx) => (
                <tr key={`ask-${idx}`} className="hover:bg-slate-800/20 transition relative">
                  <td className="py-1 text-slate-600">-</td>
                  <td className="py-1 text-slate-600">-</td>
                  <td className="py-1 text-center font-semibold text-rose-400">
                    ${ask.price.toFixed(2)}
                  </td>
                  <td className="py-1 text-right text-rose-300 font-medium relative">
                    <span className="relative z-10">{ask.volume}</span>
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-rose-500/15"
                      style={{ width: `${ask.depthPct}%` }}
                    />
                  </td>
                  <td className="py-1 text-right text-slate-400">
                    {ask.cumulativeVolume}
                  </td>
                </tr>
              ))}

              {/* Inside Spread Row */}
              <tr className="bg-slate-950 font-semibold border-y border-slate-700/80">
                <td colSpan={2} className="py-2 px-3 text-xs text-slate-400">
                  Best Bid: <span className="text-emerald-400">${state.bestBid?.toFixed(2) || 'N/A'}</span>
                </td>
                <td className="py-2 text-center text-cyan-400 text-xs font-mono">
                  Spread: ${state.spread?.toFixed(2) || '0.00'} ({state.spreadBps || 0} bps)
                </td>
                <td colSpan={2} className="py-2 px-3 text-right text-xs text-slate-400">
                  Best Ask: <span className="text-rose-400">${state.bestAsk?.toFixed(2) || 'N/A'}</span>
                </td>
              </tr>

              {/* Bids */}
              {dom.bids.map((bid, idx) => (
                <tr key={`bid-${idx}`} className="hover:bg-slate-800/20 transition relative">
                  <td className="py-1 text-slate-400">
                    {bid.cumulativeVolume}
                  </td>
                  <td className="py-1 text-left text-emerald-300 font-medium relative">
                    <span className="relative z-10">{bid.volume}</span>
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-emerald-500/15"
                      style={{ width: `${bid.depthPct}%` }}
                    />
                  </td>
                  <td className="py-1 text-center font-semibold text-emerald-400">
                    ${bid.price.toFixed(2)}
                  </td>
                  <td className="py-1 text-slate-600 text-right">-</td>
                  <td className="py-1 text-slate-600 text-right">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Order Entry & Execution Log */}
      <div className="lg:col-span-5 space-y-4">
        {/* Order Entry Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Send className="w-4 h-4 text-cyan-400" />
            <h4 className="font-semibold text-slate-100 text-xs uppercase tracking-wide">
              Direct Order Entry Station
            </h4>
          </div>

          <form onSubmit={handleManualOrder} className="space-y-3">
            {/* Side toggle */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSide('buy')}
                className={`py-1.5 rounded-lg font-bold font-mono uppercase transition ${
                  side === 'buy'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Buy (Bid)
              </button>
              <button
                type="button"
                onClick={() => setSide('sell')}
                className={`py-1.5 rounded-lg font-bold font-mono uppercase transition ${
                  side === 'sell'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Sell (Ask)
              </button>
            </div>

            {/* Type selector */}
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              {(['limit', 'market', 'iceberg'] as OrderType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-1 rounded text-center capitalize font-mono transition ${
                    type === t ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Price & Quantity inputs */}
            {type !== 'market' && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Limit Price ($)</span>
                  <span className="font-mono text-cyan-400">${price.toFixed(2)}</span>
                </div>
                <input
                  type="number"
                  step="0.05"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 100.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-100 font-mono text-xs"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Quantity (Contracts)</span>
                <span className="font-mono text-slate-200">{quantity}</span>
              </div>
              <input
                type="number"
                min="1"
                max="500"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 10)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-100 font-mono text-xs"
              />
            </div>

            {type === 'iceberg' && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Display Peak Size</span>
                  <span className="font-mono text-amber-400">{displayQty}</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={quantity}
                  value={displayQty}
                  onChange={(e) => setDisplayQty(parseInt(e.target.value, 10) || 5)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-100 font-mono text-xs"
                />
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-2 rounded-lg text-xs font-mono font-bold uppercase transition shadow-md ${
                side === 'buy'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              Submit {side.toUpperCase()} {type.toUpperCase()}
            </button>
          </form>
        </div>

        {/* Live Trades Stream */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-xs">
            <span className="font-semibold text-slate-300 uppercase">Recent Executed Trades</span>
            <span className="text-[10px] text-slate-500 font-mono">Last 10 fills</span>
          </div>

          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
            {state.trades.slice(0, 10).map((t, idx) => (
              <div
                key={t.id + idx}
                className="flex items-center justify-between text-xs font-mono bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/60"
              >
                <span className={t.makerSide === 'sell' ? 'text-emerald-400' : 'text-rose-400'}>
                  {t.makerSide === 'sell' ? 'BUY' : 'SELL'}
                </span>
                <span className="text-slate-200 font-semibold">${t.price.toFixed(2)}</span>
                <span className="text-slate-400">{t.quantity} lots</span>
                <span className="text-slate-600 text-[10px]">
                  {new Date(t.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
