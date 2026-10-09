'use client';

import React from 'react';
import { 
  Compass, 
  AlertTriangle, 
  Navigation, 
  History, 
  RotateCcw, 
  PlusCircle, 
  ShieldCheck,
  Activity
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'places' | 'incidents' | 'route' | 'replay';
  setActiveTab: (tab: 'places' | 'incidents' | 'route' | 'replay') => void;
  onOpenReportModal: () => void;
  onOpenReplayModal: () => void;
  onResetDemo: () => void;
  incidentCount: number;
  isResetting: boolean;
  dataMode: string;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenReportModal,
  onOpenReplayModal,
  onResetDemo,
  incidentCount,
  isResetting,
  dataMode,
}: NavbarProps) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
      {/* Brand & Area Info */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-md shadow-blue-500/20">
          <Activity className="w-5 h-5 text-white animate-pulse" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-ping" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              CityPulse <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">AI</span>
            </h1>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-950/70 border border-blue-500/30 text-blue-300">
              Pune MH
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Evidence-Aware Urban Outing &amp; Route Exposure Engine
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 text-xs">
        <button
          onClick={() => setActiveTab('places')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
            activeTab === 'places'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Places</span>
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium relative ${
            activeTab === 'incidents'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Incidents</span>
          {incidentCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {incidentCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('route')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
            activeTab === 'route'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Route Hazards</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('replay');
            onOpenReplayModal();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium relative group ${
            activeTab === 'replay'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-500/30'
              : 'text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/30 border border-cyan-500/20'
          }`}
        >
          <History className="w-3.5 h-3.5 animate-spin-slow group-hover:rotate-180 transition-transform" />
          <span className="font-semibold">Impact Replay</span>
          <span className="hidden lg:inline text-[9px] bg-cyan-400/20 text-cyan-300 px-1 rounded uppercase tracking-wider font-bold">
            WOW
          </span>
        </button>
      </nav>

      {/* Action Buttons & System State */}
      <div className="flex items-center gap-2">
        {/* Reset Seed Demo */}
        <button
          onClick={onResetDemo}
          disabled={isResetting}
          title="Reset to initial seed data"
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg border border-slate-800 text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span className="hidden xl:inline">Reset Demo</span>
        </button>

        {/* System Data Mode Indicator */}
        <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{dataMode === 'demo_local_storage' ? 'Demo Sandbox' : 'Curated Seed'}</span>
        </div>

        {/* Submit Report CTA */}
        <button
          onClick={onOpenReportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all active:scale-95"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Report Problem</span>
        </button>
      </div>
    </header>
  );
}
