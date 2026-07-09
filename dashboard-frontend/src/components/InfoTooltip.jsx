import { Info } from 'lucide-react';

export default function InfoTooltip({ text }) {
  return (
    <span className="relative inline-flex items-center ml-1.5 group/tip">
      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg opacity-0 group-hover/tip:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg">
        {text}
      </span>
    </span>
  );
}
