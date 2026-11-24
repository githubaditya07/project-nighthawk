import React, { useEffect, useRef } from 'react';
import { Terminal, Shield, AlertTriangle, Info, CheckCircle2, XOctagon } from 'lucide-react';

export interface LogItem {
  id: string;
  timestamp: string;
  level: string;
  code: string;
  message: string;
}

interface EventTimelineProps {
  logs: LogItem[];
  onClearLogs: () => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ logs, onClearLogs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLevelStyle = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'text-crimson-400 bg-crimson-500/10 border-crimson-500/30';
      case 'WARN':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'SUCCESS':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800 flex flex-col h-[320px]">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
        <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4" /> Live Chronological Audit Log
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500">{logs.length} events</span>
          <button
            onClick={onClearLogs}
            className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto terminal-scroll bg-black/60 rounded-lg p-3 font-mono text-xs space-y-1.5 border border-slate-900"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 text-center py-8 italic text-xs">
            Awaiting system telemetry stream on ws://localhost:8080/ws/telemetry...
          </div>
        ) : (
          logs.map((log) => {
            const timeStr = log.timestamp.includes('T')
              ? log.timestamp.split('T')[1].slice(0, 8)
              : log.timestamp;

            return (
              <div key={log.id} className="flex items-start gap-2 text-[11px] leading-relaxed group">
                <span className="text-slate-500 shrink-0 select-none">[{timeStr}]</span>
                <span
                  className={`px-1.5 py-0.2 rounded border text-[9px] font-extrabold uppercase shrink-0 ${getLevelStyle(
                    log.level
                  )}`}
                >
                  {log.code || log.level}
                </span>
                <span className="text-slate-300 break-all">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
