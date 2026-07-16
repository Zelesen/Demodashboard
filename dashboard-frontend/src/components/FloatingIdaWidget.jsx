import { useState, useMemo } from 'react';
import { Brain, X, AlertCircle, CheckCircle2, ArrowUpRight } from 'lucide-react';

export default function FloatingIdaWidget({ aiInsights = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const insights = useMemo(() => {
    return aiInsights && aiInsights.length > 0 ? aiInsights : [];
  }, [aiInsights]);

  const actionCount = useMemo(() => insights.filter(c => c[0] === 'ACT').length, [insights]);
  const insightSummaryText = insights.length > 0 ? insights[0][1] : "AI is scanning operational patterns";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isExpanded && (
        <div className="w-96 max-h-[500px] bg-card rounded-2xl border border-card-border/80 shadow-2xl shadow-heading/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-indigo-100/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <Brain size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-heading">IDA AI Copilot</h3>
                  <p className="text-[10px] text-muted font-medium mt-0.5">
                    {actionCount > 0 ? `${actionCount} action${actionCount > 1 ? 's' : ''} flagged` : "All clear"} · {insights.length} insights
                  </p>
                </div>
              </div>
              <button onClick={() => setIsExpanded(false)} className="w-8 h-8 rounded-lg hover:bg-surface-alt flex items-center justify-center text-muted hover:text-body transition-all">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[400px] p-3 space-y-2">
            {insights.map((card, index) => {
              const isActionRequired = card[0] === 'ACT';
              return (
                <div key={index} className="p-4 rounded-xl hover:bg-surface/80 transition-all duration-200 border border-card-border hover:border-indigo-100 hover:shadow-sm cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase ${isActionRequired ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                      {isActionRequired ? 'Action' : 'Info'}
                    </span>
                    {isActionRequired ? <AlertCircle size={11} className="text-amber-500" /> : <CheckCircle2 size={11} className="text-blue-500" />}
                  </div>
                  <h4 className="font-semibold text-[13px] text-heading leading-snug mb-1">{card[1]}</h4>
                  <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{card[2]}</p>
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-indigo-600">
                    <span>Investigate</span>
                    <ArrowUpRight size={10} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!isExpanded && (
        <div className="relative group">
          <div className="absolute inset-0 bg-indigo-400 rounded-full blur-md opacity-30 animate-ping" />
          <button onClick={() => setIsExpanded(true)} className="relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/50 hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-white">
            <Brain size={24} className="text-white" />
            {actionCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow-lg">
                {actionCount}
              </span>
            )}
          </button>
          <div className="absolute bottom-20 right-0 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            <p className="text-[11px] font-semibold">{insightSummaryText}</p>
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-slate-900 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}