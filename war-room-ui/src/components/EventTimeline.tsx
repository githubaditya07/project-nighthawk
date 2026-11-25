import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

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
        return 'text-cherry bg-cherry-bg border-cherry-light';
      case 'WARN':
        return 'text-amber bg-amber-bg border-amber-light';
      case 'SUCCESS':
        return 'text-sage bg-sage-bg border-sage-light';
      default:
        return 'text-powder-blue-dark bg-powder-blue-light/30 border-powder-blue-light';
    }
  };

  return (
    <div className="editorial-card rounded-2xl p-6 flex flex-col h-[390px]">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border shrink-0">
        <h3 className="text-xs font-sans font-semibold text-charcoal uppercase tracking-widest flex items-center gap-2">
          <Terminal className="w-4 h-4 text-powder-blue-dark" /> Live Chronological Audit Log
        </h3>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono text-mid-grey">{logs.length} events</span>
          <button
            onClick={onClearLogs}
            className="text-[11px] font-sans font-medium text-mid-grey hover:text-charcoal px-2.5 py-1 rounded-lg bg-beige-light hover:bg-border/60 border border-border transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Editorial Audit Log Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto editorial-scroll bg-beige-light rounded-xl p-3.5 font-mono text-xs space-y-2 border border-border"
      >
        {logs.length === 0 ? (
          <div className="text-mid-grey text-center py-10 italic font-sans text-xs">
            Awaiting system telemetry stream on ws://localhost:8080/ws/telemetry...
          </div>
        ) : (
          logs.map((log) => {
            const timeStr = log.timestamp.includes('T')
              ? log.timestamp.split('T')[1].slice(0, 8)
              : log.timestamp;

            return (
              <div
                key={log.id}
                className="flex items-start gap-2.5 text-[11px] leading-relaxed pb-1.5 border-b border-border/60 last:border-b-0"
              >
                <span className="text-mid-grey shrink-0 select-none">[{timeStr}]</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md border text-[9px] font-semibold uppercase shrink-0 ${getLevelStyle(
                    log.level
                  )}`}
                >
                  {log.code || log.level}
                </span>
                <span className="text-dark-grey break-all">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
