import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactECharts from "echarts-for-react";
import { Plus, ChevronDown, ChevronRight, List, X, Info, Database, Calculator, Tag } from "lucide-react";
import { metricCards, sections, miniPreviews } from "./widgetDefinitions";

function SafeECharts(props) {
  const ref = useRef(null);
  useEffect(() => {
    const chartRef = ref.current;
    if (!chartRef) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      try { chartRef.getEchartsInstance()?.resize(); } catch (_) {}
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [props.option]);
  return <ReactECharts ref={ref} notMerge {...props} />;
}

function WidgetInfoCard({ widget }) {
  if (!widget) return null;
  const apiEndpoints = widget.api ? widget.api.split(",").map(e => e.trim()) : [];
  const dbTables = widget.database_tables ? widget.database_tables.split(",").map(t => t.trim()) : [];
  const apiFields = Array.isArray(widget.api_fields) ? widget.api_fields : [];
  if (apiEndpoints.length === 0 && apiFields.length === 0 && dbTables.length === 0 && !widget.calculations && !widget.description) return null;
  return (
    <div className="mt-2 space-y-2">
      {apiEndpoints.length > 0 && (
        <div>
          <h4 className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <Database size={10} /> API Source
          </h4>
          <div className="space-y-1">
            {apiEndpoints.map((ep, i) => {
              const display = ep.replace("https://api.dentally.co", "");
              return (
                <div key={i} className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-2.5 py-1.5">
                  <span className="text-[7px] font-bold px-1 py-0.5 bg-indigo-600/30 text-indigo-300 rounded uppercase">GET</span>
                  <span className="text-indigo-200 text-[9px] font-mono truncate">{display}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {apiFields.length > 0 && (
        <div>
          <h4 className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <Tag size={10} /> Response Fields
          </h4>
          <div className="rounded-lg overflow-hidden border border-card-border">
            {apiFields.map((f, i) => (
              <div key={i} className={`flex items-start gap-1.5 px-2 py-1 ${i % 2 === 0 ? "bg-surface" : "bg-card"}`}>
                <span className="font-mono text-amber-600 text-[9px] whitespace-nowrap shrink-0">{f.field}</span>
                <span className="text-muted text-[8px] leading-relaxed">{f.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {dbTables.length > 0 && (
        <div>
          <h4 className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <Database size={10} /> Database Tables
          </h4>
          <div className="flex flex-wrap gap-1">
            {dbTables.map((t, i) => (
              <span key={i} className="text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">{t}</span>
            ))}
          </div>
        </div>
      )}
      {widget.calculations && (
        <div>
          <h4 className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calculator size={10} /> Calculations
          </h4>
          <p className="text-[9px] text-body leading-relaxed bg-surface rounded-lg border border-card-border px-2.5 py-1.5">{widget.calculations}</p>
        </div>
      )}
      {widget.description && (
        <div>
          <h4 className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <Info size={10} /> Info
          </h4>
          <p className="text-[9px] text-body leading-relaxed bg-surface rounded-lg border border-card-border px-2.5 py-1.5">{widget.description}</p>
        </div>
      )}
    </div>
  );
}

function MiniChartPreview({ chartType }) {
  const option = miniPreviews[chartType];
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "100px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  if (!option) return null;
  return (
    <div ref={containerRef} className="h-24 w-full pointer-events-none bg-surface/50 rounded-lg p-1.5 border border-card-border/50 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
      {visible ? <SafeECharts option={option} style={{ height: 84 }} /> : <div className="w-full h-full animate-pulse bg-surface-alt rounded" />}
    </div>
  );
}

export default function WidgetPanel({ onAddWidget }) {
  const [dragWidget, setDragWidget] = useState(null);
  const [expanded, setExpanded] = useState(() => sections.reduce((acc, s) => ({ ...acc, [s.id]: true }), {}));
  const [previewWidget, setPreviewWidget] = useState(null);
  const [dbWidgets, setDbWidgets] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/widgets")
      .then(res => res.json())
      .then(data => setDbWidgets(data.widgets || []))
      .catch(() => {});
  }, []);

  const allWidgets = useMemo(() => {
    const metrics = metricCards.map(m => ({ ...m, category: "Metrics" }));
    const sectionItems = sections.flatMap(s =>
      s.items.map(item => ({ ...item, category: s.label }))
    );
    return [...metrics, ...sectionItems];
  }, []);

  const allWidgetsMerged = useMemo(() => {
    if (dbWidgets.length === 0) return allWidgets;
    return allWidgets.map(fw => {
      const db = dbWidgets.find(d => String(d.chart_type) === String(fw.chartType));
      if (!db) return fw;
      let parsedFields = db.api_fields;
      if (typeof parsedFields === "string") { try { parsedFields = JSON.parse(parsedFields); } catch { parsedFields = null; } }
      return { ...fw, api: db.api, description: db.description, calculations: db.calculations, database_tables: db.database_tables, api_fields: parsedFields };
    });
  }, [dbWidgets, allWidgets]);

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

  const handleSelectWidget = (e) => {
    const widgetId = e.target.value;
    if (!widgetId) return;
    const widget = allWidgetsMerged.find(w => w.id === widgetId);
    if (widget && !widget.disabled) {
      setPreviewWidget(widget);
    }
    e.target.value = "";
  };

  return (
    <div className="bg-card rounded-2xl border border-card-border/80 shadow-sm h-full flex flex-col overflow-hidden max-h-[calc(100vh-9rem)]">
      {/* Header Container */}
      <div className="px-4 py-3.5 border-b border-card-border bg-surface/40">
        <h3 className="text-xs font-bold text-heading tracking-tight flex items-center gap-1.5 mb-2.5">
          Widgets Catalog
        </h3>
        <div className="relative">
          <List size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <select
            onChange={handleSelectWidget}
            defaultValue=""
            className="w-full h-8.5 pl-8.5 pr-8 text-[11px] font-medium bg-card border border-card-border/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-body appearance-none shadow-sm transition-all cursor-pointer"
          >
            <option value="" disabled>Select a widget...</option>
            {sections.map(section => (
              <optgroup key={section.id} label={section.label}>
                {section.items.map(item => (
                  <option key={item.id} value={item.id} disabled={item.disabled}>
                    {item.title}{item.disabled ? " (Coming Soon)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
            <optgroup label="Metrics">
              {metricCards.map(m => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </optgroup>
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>
      </div>

      {/* Preview Section */}
      <AnimatePresence>
        {previewWidget && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-b border-indigo-100/60 bg-gradient-to-b from-indigo-50/30 to-white"
          >
            <div className="px-3.5 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Preview</span>
                <button
                  onClick={() => setPreviewWidget(null)}
                  className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-surface-alt transition-colors"
                >
                  <X size={12} className="text-muted" />
                </button>
              </div>
              <div className="bg-card rounded-xl border border-card-border/80 p-3 shadow-sm">
                <motion.div
                  draggable
                  onDragStart={e => handleDragStart(e, previewWidget)}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const Icon = previewWidget.icon;
                      return (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border border-indigo-100/60 flex items-center justify-center">
                          <Icon size={16} className="text-indigo-600" />
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-heading truncate">{previewWidget.title}</div>
                      <div className="text-[9px] text-muted">{previewWidget.category}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold bg-surface border border-card-border rounded px-1.5 py-0.5 text-muted">
                        {previewWidget.defaultW}×{previewWidget.defaultH}
                      </span>
                    </div>
                  </div>
                  {previewWidget.chartType && miniPreviews[previewWidget.chartType] && (
                    <div className="h-24 w-full pointer-events-none bg-surface/50 rounded-lg p-1.5 border border-card-border/50">
                      <SafeECharts option={miniPreviews[previewWidget.chartType]} style={{ height: 84 }} />
                    </div>
                  )}
                  {previewWidget.type === "metric" && (
                    <div className="flex items-baseline gap-2 p-2 bg-surface/50 rounded-lg border border-card-border/50">
                      <span className="text-lg font-black tracking-tight text-heading">{previewWidget.value}</span>
                      <span className={`text-[10px] font-bold ${previewWidget.positive ? "text-emerald-600" : "text-rose-500"}`}>
                        {previewWidget.change}
                      </span>
                      <span className="text-[9px] text-muted ml-auto">{previewWidget.footer}</span>
                    </div>
                  )}
                  <div className="mt-2.5 h-8 rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50/30 flex items-center justify-center gap-1.5 text-indigo-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 9l7-7 7 7"/>
                      <path d="M12 2v14"/>
                      <path d="M19 21H5"/>
                    </svg>
                    <span className="text-[10px] font-bold">Drag to dashboard</span>
                  </div>
                </motion.div>
                <WidgetInfoCard widget={previewWidget} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 scrollbar-thin scrollbar-thumb-card-border scrollbar-track-transparent">
        {/* Metrics Sub-grid */}
        <div>
          <div className="flex items-center gap-2 px-1 py-1 mb-1.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Metrics</span>
            <span className="text-[9px] font-bold bg-surface-alt text-muted px-1.5 py-0.5 rounded-full ml-auto">{metricCards.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {metricCards.map(m => {
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
                    className={`flex flex-col gap-1 p-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-150 text-left group relative bg-card ${
                      dragWidget === m 
                        ? "opacity-40 border-indigo-200 shadow-inner" 
                        : "border-card-border/80 hover:border-indigo-200/80 hover:shadow-md hover:shadow-indigo-500/5"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <div className={`w-5.5 h-5.5 rounded-lg ${bgAccent} flex items-center justify-center shrink-0`}>
                        <Icon size={10} className={textAccent} />
                      </div>
                      <span className="text-[9px] font-bold text-muted tracking-wide truncate uppercase leading-tight flex-1">{m.title}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-1 mt-0.5 w-full">
                      <span className="text-sm font-black tracking-tight text-heading leading-none">{m.value}</span>
                      <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold ${bgAccent} ${textAccent} scale-90 origin-right`}>{m.change}</span>
                    </div>
                    <span className="text-[8px] font-medium text-muted/90 truncate mt-0.5">{m.footer}</span>
                  </motion.button>
                );
              })}
          </div>
        </div>

        {/* Collapsible Sections (Charts, Tables, etc) */}
        {sections.map(section => (
          <div key={section.id} className="border-b border-card-border/60 last:border-0 pb-3 last:pb-0">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-2 px-1 py-1.5 rounded-xl hover:bg-surface transition-colors text-left font-bold text-muted uppercase tracking-wider text-[10px]"
            >
              {expanded[section.id] ? <ChevronDown size={12} className="text-muted" /> : <ChevronRight size={12} className="text-muted" />}
              <span className="text-heading">{section.label}</span>
              <span className="text-[9px] font-bold bg-surface-alt text-muted px-1.5 py-0.5 rounded-full ml-auto">{section.items.length}</span>
            </button>

            <AnimatePresence initial={false}>
              {expanded[section.id] && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
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
                              ? "border-card-border bg-surface/40 opacity-50 cursor-not-allowed"
                              : "border-card-border/80 bg-card hover:border-indigo-200/80 hover:shadow-md hover:shadow-indigo-500/5 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 w-full">
                            <div className={`w-7.5 h-7.5 min-w-[30px] rounded-xl flex items-center justify-center ${
                              item.disabled
                                ? "bg-surface-alt text-muted"
                                : "bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border border-indigo-100/60 text-indigo-600 group-hover:scale-105"
                            } transition-transform duration-150 shadow-sm`}
                            >
                              <Icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-bold truncate tracking-tight ${item.disabled ? "text-muted" : "text-heading"}`}>
                                  {item.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.25 bg-surface border border-card-border rounded text-muted`}>
                                  Grid Map: {item.defaultW}×{item.defaultH}
                                </span>
                                {item.disabled && (
                                  <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100/60 px-1.5 py-0.25 rounded">Coming Soon</span>
                                )}
                              </div>
                            </div>
                            {!item.disabled && (
                              <div className="w-5 h-5 rounded-lg border border-card-border flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:border-indigo-100 group-hover:bg-indigo-50/50 transition-all shrink-0">
                                <Plus size={12} className="text-muted group-hover:text-indigo-600 transition-colors" />
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
