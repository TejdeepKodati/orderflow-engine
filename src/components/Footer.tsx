import React from 'react';
import { ExternalLink, Code2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span>OrderFlow — Continuous Double Auction Matching Engine &amp; Alpha Signal Suite</span>
        </div>

        {/* REQUIRED EXACT FOOTER BADGE: "made with ♥ by Tejdeep" linking directly to the GitHub repo */}
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/TejdeepKodati/orderflow-engine"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50 transition shadow-sm font-medium"
          >
            <span>made with ♥ by Tejdeep</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition" />
          </a>
        </div>
      </div>
    </footer>
  );
};
