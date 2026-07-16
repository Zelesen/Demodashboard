import { useState, useMemo, useEffect } from "react";
import {
  Search, X, Puzzle, ChevronDown, ChevronRight, Info, Database, Code, Calculator, Tag, Layers,
  Calendar, CheckCircle2, XCircle, AlertTriangle, Clock, AlertCircle, Building2, Users,
  TrendingUp, List, CalendarRange, UserCheck, Activity, Grid3x3, ArrowRight, BarChart3, Filter, Type,
} from "lucide-react";
import { metricCards, sections } from "../components/dashboard/widgetDefinitions";
import { renderAppointmentWidget, AppointmentMetricCard } from "../components/dashboard/WidgetRenderer";

const ICON_MAP = {
  Calendar, CheckCircle2, XCircle, AlertTriangle, Clock, AlertCircle,
  Building2, Users, TrendingUp, List, CalendarRange, UserCheck,
  Activity, Grid3x3, ArrowRight, BarChart3, Filter, Type,
};

const categories = [
  { id: "all", label: "All" },
  { id: "metrics", label: "Metric Cards" },
  { id: "charts", label: "Charts" },
];

function buildFrontendWidgets() {
  const all = [];
  metricCards.forEach((m) => all.push({ ...m, _kind: "metric", _section: "Metric Cards" }));
  sections.forEach((s) => {
    s.items.forEach((item) =>
      all.push({ ...item, _kind: item.type || "chart", _section: s.label })
    );
  });
  return all;
}

const FRONTEND_WIDGETS = buildFrontendWidgets();

function mergeDbWithFrontend(dbWidgets, frontendWidgets) {
  if (!dbWidgets || dbWidgets.length === 0) {
    return frontendWidgets.map((fw) => ({
      ...fw,
      id: fw.id,
      chartType: fw.chartType,
      api: null,
      description: null,
      calculations: null,
      database_tables: null,
      api_fields: null,
    }));
  }
  return dbWidgets.map((db) => {
    const match = frontendWidgets.find((f) => f.chartType === db.chart_type);
    const iconName = db.icon;
    const IconComp = iconName && ICON_MAP[iconName] ? ICON_MAP[iconName] : (match?.icon || null);
    let parsedFields = db.api_fields;
    if (typeof parsedFields === "string") {
      try { parsedFields = JSON.parse(parsedFields); } catch { parsedFields = null; }
    }
    return {
      id: db.id,
      title: db.title,
      chartType: db.chart_type,
      type: db.type,
      icon: IconComp,
      defaultW: db.default_w,
      defaultH: db.default_h,
      disabled: db.disabled,
      _kind: db.type || "chart",
      _section: db.section,
      api: db.api,
      description: db.description,
      calculations: db.calculations,
      database_tables: db.database_tables,
      api_fields: parsedFields,
      ...(match?.type === "metric" ? { value: match.value, change: match.change, positive: match.positive, footer: match.footer } : {}),
    };
  });
}

function WidgetDetailCard({ widget }) {
  if (!widget) return null;
  const Icon = widget.icon;
  const isMetric = widget.type === "metric";
  const apiEndpoints = widget.api ? widget.api.split(",").map((e) => e.trim()) : [];
  const dbTables = widget.database_tables ? widget.database_tables.split(",").map((t) => t.trim()) : [];
  const apiFields = Array.isArray(widget.api_fields) ? widget.api_fields : [];

  return (
    <div className="bg-card rounded-2xl border border-card-border/60 shadow-lg overflow-hidden mb-8">
      <div className="px-5 py-4 border-b border-card-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-200">
          {Icon && <Icon size={16} className="text-white" />}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-alt text-[9px] font-bold text-muted shrink-0">{widget.id}</span>
          <div>
            <h2 className="text-sm font-bold text-heading">{widget.title}</h2>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{widget._section}</span>
          </div>
        </div>
        {widget.disabled && (
          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100/60 px-2 py-1 rounded-lg">Coming Soon</span>
        )}
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart preview */}
          <div className={`rounded-xl border border-card-border bg-surface/50 p-3 ${isMetric ? "lg:col-span-1" : "lg:col-span-2"}`}>
            <div className={`w-full ${isMetric ? "h-[140px]" : "h-[340px]"}`}>
              {isMetric ? (
                <AppointmentMetricCard
                  title={widget.title}
                  value={widget.value}
                  change={widget.change}
                  positive={widget.positive}
                  footer={widget.footer}
                  icon={Icon}
                />
              ) : widget.chartType ? (
                renderAppointmentWidget({ chartType: widget.chartType, data: null })
              ) : (
                <div className="h-full flex items-center justify-center text-muted text-xs">No preview available</div>
              )}
            </div>
          </div>

          {/* Info panel */}
          <div className={`space-y-4 ${isMetric ? "lg:col-span-2" : "lg:col-span-1"}`}>
            {/* API Source */}
            {apiEndpoints.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Database size={11} /> Dentally API Source
                </h4>
                <div className="space-y-1.5">
                  {apiEndpoints.map((ep, i) => {
                    const display = ep.replace("https://api.dentally.co", "");
                    return (
                      <div key={i} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 rounded uppercase tracking-wider">GET</span>
                        <span className="text-indigo-200 text-[11px] font-mono">{display}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Response Fields */}
            {apiFields.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag size={11} /> Response Fields Used
                </h4>
                <div className="rounded-lg overflow-hidden border border-card-border">
                  {apiFields.map((f, i) => (
                    <div key={i} className={`flex items-start gap-2 px-3 py-2 ${i % 2 === 0 ? "bg-surface" : "bg-card"}`}>
                      <span className="font-mono text-amber-600 text-[11px] whitespace-nowrap shrink-0 pt-px">{f.field}</span>
                      <span className="text-muted text-[10px] leading-relaxed">{f.role}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[9px] text-muted mt-1 text-right">via developer.dentally.co</div>
              </div>
            )}

            {/* Database Tables */}
            {dbTables.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Database size={11} /> Database Tables
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {dbTables.map((t, i) => (
                    <span key={i} className="text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Calculations */}
            {widget.calculations && (
              <div>
                <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calculator size={11} /> Calculations
                </h4>
                <p className="text-[11px] text-body leading-relaxed bg-surface rounded-lg border border-card-border px-3 py-2">{widget.calculations}</p>
              </div>
            )}

            {/* Description */}
            {widget.description && (
              <div>
                <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Info size={11} /> Additional Info
                </h4>
                <p className="text-[11px] text-body leading-relaxed bg-surface rounded-lg border border-card-border px-3 py-2">{widget.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCardFull({ m }) {
  const Icon = m.icon;
  return (
    <div className="h-full bg-card rounded-2xl border border-card-border/60 shadow-sm hover:shadow-lg hover:border-indigo-200/60 transition-all duration-200 overflow-hidden">
      <AppointmentMetricCard
        title={m.title}
        value={m.value}
        change={m.change}
        positive={m.positive}
        footer={m.footer}
        icon={Icon}
      />
    </div>
  );
}

function ChartCardFull({ item }) {
  const Icon = item.icon;
  return (
    <div className="bg-card rounded-2xl border border-card-border/60 shadow-sm hover:shadow-lg hover:border-indigo-200/60 transition-all duration-200 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-card-border flex items-center gap-2.5">
        <div className="w-7 h-7 min-w-[28px] rounded-lg bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border border-indigo-100/60 flex items-center justify-center text-indigo-600 shadow-sm">
          <Icon size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-heading truncate block">{item.title}</span>
          <span className="text-[8px] font-bold text-muted uppercase tracking-wider">Grid: {item.defaultW}×{item.defaultH}</span>
        </div>
        {item.disabled && (
          <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100/60 px-1.5 py-0.5 rounded">Coming Soon</span>
        )}
      </div>
      <div className="h-[300px] p-2">
        {item.chartType && (
          <div className="h-full w-full">
            {renderAppointmentWidget({ chartType: item.chartType, data: null })}
          </div>
        )}
      </div>
    </div>
  );
}

function DisabledCard({ item }) {
  const Icon = item.icon;
  return (
    <div className="bg-card rounded-2xl border border-card-border shadow-sm opacity-50 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-card-border flex items-center gap-2.5">
        <div className="w-7 h-7 min-w-[28px] rounded-lg bg-surface-alt flex items-center justify-center text-muted">
          <Icon size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-muted truncate block">{item.title}</span>
          <span className="text-[8px] font-bold text-muted uppercase tracking-wider">Grid: {item.defaultW}×{item.defaultH}</span>
        </div>
        <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100/60 px-1.5 py-0.5 rounded">Coming Soon</span>
      </div>
      <div className="h-[220px] p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-surface-alt flex items-center justify-center mx-auto mb-2">
            <Icon size={20} className="text-muted" />
          </div>
          <p className="text-[11px] font-medium text-muted">Coming Soon</p>
        </div>
      </div>
    </div>
  );
}

export default function WidgetsCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [expanded, setExpanded] = useState(() => sections.reduce((acc, s) => ({ ...acc, [s.id]: true }), {}));
  const [selectedWidgetId, setSelectedWidgetId] = useState("");
  const [dbWidgets, setDbWidgets] = useState([]);
  const [widgetsLoading, setWidgetsLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/widgets")
      .then((res) => res.json())
      .then((data) => setDbWidgets(data.widgets || []))
      .catch(() => setDbWidgets([]))
      .finally(() => setWidgetsLoading(false));
  }, []);

  const allWidgets = useMemo(
    () => mergeDbWithFrontend(dbWidgets, FRONTEND_WIDGETS),
    [dbWidgets]
  );

  const selectedWidget = useMemo(
    () => allWidgets.find((w) => String(w.id) === String(selectedWidgetId)) || null,
    [selectedWidgetId, allWidgets]
  );

  const dropdownWidgets = useMemo(() => {
    return allWidgets.filter((w) => {
      const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeCategory === "all") return true;
      if (activeCategory === "metrics") return w._kind === "metric";
      if (activeCategory === "charts") return w._kind === "chart" || (!w.type && w.chartType);
      return true;
    });
  }, [searchQuery, allWidgets, activeCategory]);

  const toggleSection = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredMetrics = useMemo(
    () => metricCards.filter((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );

  const filteredSections = useMemo(
    () =>
      sections
        .map((s) => ({
          ...s,
          items: s.items.filter(
            (item) =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.label.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((s) => s.items.length > 0),
    [searchQuery]
  );

  const showMetrics = activeCategory === "all" || activeCategory === "metrics";
  const showCharts = activeCategory === "all" || activeCategory === "charts";

  const totalVisible =
    (showMetrics ? filteredMetrics.length : 0) +
    filteredSections
      .filter((s) => {
        if (s.id === "appointments") return showCharts;
        return true;
      })
      .reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="font-sans antialiased min-h-screen">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100/40 via-blue-50/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/30 via-blue-50/20 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto p-5 sm:p-8 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-200">
                <Puzzle size={17} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-heading tracking-tight">Widgets Catalog</h1>
            </div>
            <p className="text-[13px] text-muted ml-[46px]">
              {totalVisible} widget{totalVisible !== 1 ? "s" : ""} available for your dashboards
            </p>
          </div>
        </div>

        {/* Search + Widget Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search widgets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-card border border-card-border/60 text-[13px] text-body placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-body"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={selectedWidgetId}
                onChange={(e) => setSelectedWidgetId(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-xl bg-card border border-card-border/60 text-[13px] text-body focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none cursor-pointer min-w-[200px]"
              >
                <option value="">Select a widget...</option>
                {dropdownWidgets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.id}. {w.title} ({w._kind})
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 bg-[#f7f9fd]/90 backdrop-blur-md">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-heading/10"
                    : "bg-card text-muted border-card-border/60 hover:border-card-border hover:text-body"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
          </div>
        </div>

        {/* Selected Widget Detail */}
        {selectedWidget && (
          <WidgetDetailCard widget={selectedWidget} />
        )}

        {/* No results */}
        {totalVisible === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Search size={24} className="text-muted mb-3" />
            <p className="text-sm font-medium text-muted">No widgets match "{searchQuery}"</p>
            <button
              onClick={() => { setSearchQuery(""); setActiveCategory("all"); setSelectedWidgetId(""); }}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Metric Cards */}
        {showMetrics && filteredMetrics.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 px-1 py-1 mb-4">
              <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-emerald-500" />
              </div>
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Metric Cards</span>
              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-200">{filteredMetrics.length}</span>
              <div className="h-px flex-1 bg-gradient-to-r from-card-border to-transparent" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMetrics.map((m) => (
                <div key={m.id} style={{ height: 140 }}>
                  <MetricCardFull m={m} />
                </div>
          ))}
          </div>
        </div>
          
        )}

        {/* Chart Sections */}
        {filteredSections.map((section) => {
          const isCharts = section.id === "appointments";
          if (isCharts && !showCharts) return null;

          return (
            <div key={section.id} className="mb-10">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-2 px-1 py-1.5 rounded-xl hover:bg-surface transition-colors text-left font-bold text-muted uppercase tracking-wider text-[10px] mb-4"
              >
                {expanded[section.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="text-heading">{section.label}</span>
                <span className="text-[9px] font-bold bg-surface-alt text-muted px-1.5 py-0.5 rounded-full">{section.items.length}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-card-border to-transparent ml-2" />
              </button>

              {expanded[section.id] && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {section.items.map((item) =>
                    item.disabled ? (
                      <DisabledCard key={item.id} item={item} />
                    ) : (
                      <ChartCardFull key={item.id} item={item} />
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
