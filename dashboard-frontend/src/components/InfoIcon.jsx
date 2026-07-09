import { useState, useRef } from 'react';
import { Info, ExternalLink, Tag } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function InfoIcon({ title, apiEndpoint, apiFields, databaseTables, calculations, additionalInfo }) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      // Flip to left-align if too close to the right edge
      const tooltipWidth = 320;
      const leftPos = rect.left + window.scrollX;
      const adjustedLeft = leftPos + tooltipWidth > window.innerWidth
        ? window.innerWidth - tooltipWidth - 12
        : leftPos;

      setTooltipPos({
        top: rect.bottom + window.scrollY + 8,
        left: adjustedLeft,
      });
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => setIsVisible(false);

  const isDentallyUrl = apiEndpoint && apiEndpoint.startsWith('https://api.dentally.co');

  return (
    <div className="relative inline-flex items-center">
      <div
        ref={iconRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center justify-center cursor-help"
      >
        <Info size={12} className="text-slate-400 hover:text-slate-600 transition-colors" />
      </div>

      {isVisible && createPortal(
        <div
          className="w-80 p-3 bg-slate-900 text-white text-[10px] rounded-lg shadow-2xl pointer-events-none"
          style={{
            position: 'fixed',
            top: tooltipPos.top - window.scrollY,
            left: tooltipPos.left,
            zIndex: 99999,
          }}
        >
          {/* Title */}
          <div className="font-bold text-[11px] mb-2.5 text-slate-100 border-b border-slate-700 pb-1.5">{title}</div>

          {/* Dentally API Source + Fields */}
          {apiEndpoint && (
            <div className="mb-2.5">
              <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <ExternalLink size={9} className="text-indigo-400" />
                Dentally API Source:
              </div>

              {/* Endpoint rows */}
              {isDentallyUrl && (
                <div className="space-y-1 mb-2">
                  {apiEndpoint.split(',').map((ep, i) => {
                    const url = ep.trim();
                    const displayUrl = url.startsWith('http')
                      ? url.replace('https://api.dentally.co', '')
                      : url;
                    return (
                      <div key={i} className="flex items-center gap-1.5 font-mono bg-slate-800 px-1.5 py-1 rounded">
                        <span className="text-[8px] font-bold px-1 py-0.5 bg-indigo-600/30 text-indigo-300 rounded uppercase tracking-wider">GET</span>
                        <span className="text-indigo-200 text-[10px]">{displayUrl}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* API Response Fields table */}
              {apiFields && apiFields.length > 0 && (
                <div className="mt-1">
                  <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1">
                    <Tag size={9} className="text-amber-400" />
                    Response Fields Used:
                  </div>
                  <div className="rounded overflow-hidden border border-slate-700">
                    {apiFields.map((f, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 px-2 py-1 ${
                          i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/60'
                        } ${i < apiFields.length - 1 ? 'border-b border-slate-700/60' : ''}`}
                      >
                        <span className="font-mono text-amber-300 text-[10px] whitespace-nowrap shrink-0 pt-px">
                          {f.field}
                        </span>
                        <span className="text-slate-400 text-[9px] leading-relaxed">{f.role}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-slate-600 text-[9px] mt-1 text-right">
                    via developer.dentally.co
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Database Tables */}
          {databaseTables && databaseTables.length > 0 && (
            <div className="mb-2">
              <div className="text-slate-400 font-semibold mb-0.5">Database Tables:</div>
              <div className="text-blue-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                {databaseTables.join(', ')}
              </div>
            </div>
          )}

          {/* Calculations */}
          {calculations && (
            <div className="mb-2">
              <div className="text-slate-400 font-semibold mb-0.5">Calculations:</div>
              <div className="text-slate-200 leading-relaxed">{calculations}</div>
            </div>
          )}

          {/* Additional Info */}
          {additionalInfo && (
            <div>
              <div className="text-slate-400 font-semibold mb-0.5">Additional Info:</div>
              <div className="text-slate-200 leading-relaxed">{additionalInfo}</div>
            </div>
          )}

          {/* Arrow */}
          <div className="absolute -top-1 left-3 w-2 h-2 bg-slate-900 rotate-45" />
        </div>,
        document.body
      )}
    </div>
  );
}
