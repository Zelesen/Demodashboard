import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { Search, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { metricCards, sections, miniPreviews } from "./widgetDefinitions";

function MiniChartPreview({ chartType }) {
  const option = miniPreviews[chartType];
  if (!option) return null;
  return (
    <div className="h-12 w-full pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity mt-1 bg-slate-50/50 rounded-lg p-1 border border-slate-100/50">
      <ReactECharts option={option} style={{ height: 40 }} notMerge />
    </div>
  );
}

export default function WidgetPanel({ onAddWidget }) {
  const [search, setSearch] = useState("");
  const [dragWidget, setDragWidget] = useState(null);
  const [expanded, setExpanded] = useState(() => sections.reduce((acc, s) => ({ ...acc, [s.id]: true }), {}));

  const handleDragStart = (e, w) => {
    setDragWidget(w);
    e.dataTransfer.setData("text/plain", JSON.stringify(w));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = () => {
    setDragWidget(null);
  };

  const toggleSection = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredSections = sections.map(s => ({
    ...s,
    items: s.items.filter(item =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      s.label.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(s => s.items.length > 0);

  const filteredMetrics = metricCards.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm h-full flex flex-col overflow-hidden max-h-[calc(100vh-9rem)]">
      {/* Header Container */}
      <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/40">
        <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5 mb-2.5">
          Blueprint Library
        </h3>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter components..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-8.5 pl-8.5 pr-3 text-[11px] font-medium bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 placeholder:text-slate-400 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {/* Metrics Sub-grid */}
        {filteredMetrics.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-1 py-1 mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metrics</span>
              <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full ml-auto">{filteredMetrics.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredMetrics.map(m => {
                const Icon = m.icon;
                const bgAccent = m.positive ? "bg-emerald-50/70 border border-emerald-100/50" : "bg-rose-50/70 border border-rose-100/50";
                const textAccent = m.positive ? "text-emerald-600" : "text-rose-500";
                return (
                  <motion.button
                    key={m.id}
                    draggable
                    onDragStart={e => handleDragStart(e, m)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onAddWidget(m)}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex flex-col gap-1 p-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-150 text-left group relative bg-white ${
                      dragWidget === m 
                        ? "opacity-40 border-indigo-200 shadow-inner" 
                        : "border-slate-200/80 hover:border-indigo-200/80 hover:shadow-md hover:shadow-indigo-500/5"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <div className={`w-5.5 h-5.5 rounded-lg ${bgAccent} flex items-center justify-center shrink-0`}>
                        <Icon size={10} className={textAccent} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wide truncate uppercase leading-tight flex-1">{m.title}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-1 mt-0.5 w-full">
                      <span className="text-sm font-black tracking-tight text-slate-900 leading-none">{m.value}</span>
                      <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold ${bgAccent} ${textAccent} scale-90 origin-right`}>{m.change}</span>
                    </div>
                    <span className="text-[8px] font-medium text-slate-400/90 truncate mt-0.5">{m.footer}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Collapsible Sections (Charts, Tables, etc) */}
        {filteredSections.map(section => (
          <div key={section.id} className="border-b border-slate-100/60 last:border-0 pb-3 last:pb-0">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-2 px-1 py-1.5 rounded-xl hover:bg-slate-50 transition-colors text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]"
            >
              {expanded[section.id] ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
              <span className="text-slate-800">{section.label}</span>
              <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full ml-auto">{section.items.length}</span>
            </button>

            <AnimatePresence initial={false}>
              {expanded[section.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-1.5 px-0.5">
                    {section.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <motion.button
                          key={item.id}
                          draggable={!item.disabled}
                          onDragStart={e => !item.disabled && handleDragStart(e, item)}
                          onDragEnd={handleDragEnd}
                          onClick={() => !item.disabled && onAddWidget(item)}
                          disabled={item.disabled}
                          whileHover={item.disabled ? {} : { y: -1 }}
                          whileTap={item.disabled ? {} : { scale: 0.99 }}
                          className={`w-full flex flex-col gap-1.5 p-2.5 rounded-xl border text-left group relative transition-all ${
                            item.disabled
                              ? "border-slate-100 bg-slate-50/40 opacity-50 cursor-not-allowed"
                              : "border-slate-200/80 bg-white hover:border-indigo-200/80 hover:shadow-md hover:shadow-indigo-500/5 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 w-full">
                            <div className={`w-7.5 h-7.5 min-w-[30px] rounded-xl flex items-center justify-center ${
                              item.disabled
                                ? "bg-slate-100 text-slate-400"
                                : "bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border border-indigo-100/60 text-indigo-600 group-hover:scale-105"
                            } transition-transform duration-150 shadow-sm`}
                            >
                              <Icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-bold truncate tracking-tight ${item.disabled ? "text-slate-400" : "text-slate-800"}`}>
                                  {item.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.25 bg-slate-50 border border-slate-100 rounded text-slate-400`}>
                                  Grid Map: {item.defaultW}×{item.defaultH}
                                </span>
                                {item.disabled && (
                                  <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100/60 px-1.5 py-0.25 rounded">Coming Soon</span>
                                )}
                              </div>
                            </div>
                            {!item.disabled && (
                              <div className="w-5 h-5 rounded-lg border border-slate-100 flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:border-indigo-100 group-hover:bg-indigo-50/50 transition-all shrink-0">
                                <Plus size={12} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                              </div>
                            )}
                          </div>
                          {!item.disabled && item.chartType && miniPreviews[item.chartType] && (
                            <MiniChartPreview chartType={item.chartType} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
