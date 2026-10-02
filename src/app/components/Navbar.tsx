'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, LifeBuoy, Activity, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white px-6 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide uppercase text-slate-100">
              Enterprise Email Automation Platform
            </h1>
            <p className="text-[11px] text-slate-400">n8n Engine • Gemini 1.5 • PostgreSQL • NestJS</p>
          </div>
        </div>

        <nav className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
          <Link
            href="/tickets"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition ${
              pathname === '/tickets'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Luồng 1: Triage Ingest
          </Link>
          <Link
            href="/helpdesk"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition ${
              pathname === '/helpdesk'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            Luồng 2: Helpdesk Tickets
          </Link>
        </nav>

        <div className="hidden lg:flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Hạ Tầng Hoạt Động Bình Thường</span>
        </div>
      </div>
    </header>
  );
}