import React from 'react';
import { Activity, Layers, Cpu, BarChart2, Radio } from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (t: string) => void;
}

export const Header: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BarChart2 className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white font-mono">ORDERFLOW</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-medium">LOB v2.0</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                Limit Order Book &amp; Market Microstructure Simulator
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Matching Engine: FIFO $O(1)$</span>
            </span>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex space-x-1 sm:space-x-4 border-t border-slate-800/80 -mb-px overflow-x-auto">
          {[
            { id: 'ladder', label: 'Level-2 DOM Ladder' },
            { id: 'signals', label: 'OFI & Microstructure Alpha' },
            { id: 'execution', label: 'Algorithmic Execution (TWAP/VWAP)' },
            { id: 'statarb', label: 'Spread Trading & Stat-Arb' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3 border-b-2 text-xs font-medium font-mono whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-emerald-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
