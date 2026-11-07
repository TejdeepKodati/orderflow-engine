import React, { useState, useMemo } from 'react';
import { LimitOrderBook } from './engine/orderBook';
import { MicrostructureAnalyzer, OFISnapshot } from './engine/microstructure';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DepthOfMarketLadder } from './components/DepthOfMarketLadder';
import { MicrostructureSignals } from './components/MicrostructureSignals';
import { ExecutionSimulator } from './components/ExecutionSimulator';
import { StatArbBacktester } from './components/StatArbBacktester';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('ladder');

  const lob = useMemo(() => new LimitOrderBook(100.0, 0.05), []);
  const analyzer = useMemo(() => new MicrostructureAnalyzer(), []);

  const [currentOFI, setCurrentOFI] = useState<OFISnapshot>({
    timestamp: Date.now(),
    ofi: 0,
    cumulativeOFI: 0,
    normalizedOFI: 0,
    microPrice: 100.0,
    spreadElasticity: 0.15,
    vpin: 0.22,
    predictedDirection: 'NEUTRAL'
  });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Sub-Header Intraday Market Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 py-2.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
          <div className="flex items-center space-x-3">
            <span className="font-semibold text-slate-200">Continuous Double Auction LOB</span>
            <span className="text-slate-600">•</span>
            <span>Priority: Price-Time (FIFO)</span>
            <span className="text-slate-600">•</span>
            <span>Tick Size: $0.05</span>
          </div>

          <div className="flex items-center space-x-4">
            <span>Micro-Price: <strong className="text-slate-100">${currentOFI.microPrice.toFixed(2)}</strong></span>
            <span>OFI Index: <strong className={currentOFI.normalizedOFI >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {currentOFI.normalizedOFI > 0 ? `+${currentOFI.normalizedOFI.toFixed(2)}` : currentOFI.normalizedOFI.toFixed(2)}
            </strong></span>
            <span>VPIN Toxicity: <strong className="text-amber-400">{(currentOFI.vpin * 100).toFixed(1)}%</strong></span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === 'ladder' && (
          <DepthOfMarketLadder
            lob={lob}
            analyzer={analyzer}
            onStateUpdate={setCurrentOFI}
          />
        )}
        {activeTab === 'signals' && <MicrostructureSignals ofi={currentOFI} />}
        {activeTab === 'execution' && <ExecutionSimulator />}
        {activeTab === 'statarb' && <StatArbBacktester />}
      </main>

      <Footer />
    </div>
  );
};
