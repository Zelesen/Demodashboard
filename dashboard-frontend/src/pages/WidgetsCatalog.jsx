import { useState, useMemo } from "react";
import { Search, X, Puzzle, ChevronDown, ChevronRight } from "lucide-react";
import { metricCards, sections } from "../components/dashboard/widgetDefinitions";
import { renderAppointmentWidget, AppointmentMetricCard } from "../components/dashboard/WidgetRenderer";

const categories = [
  { id: "all", label: "All" },
  { id: "metrics", label: "Metric Cards" },
  { id: "charts", label: "Charts" },
  { id: "filters", label: "Filters" },
  { id: "text", label: "Text" },
];

function MetricCardFull({ m }) {
  const Icon = m.icon;
  return (
    <div className="h-full bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:border-indigo-200/60 transition-all duration-200 overflow-hidden">
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
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:border-indigo-200/60 transition-all duration-200 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-7 h-7 min-w-[28px] rounded-lg bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border border-indigo-100/60 flex items-center justify-center text-indigo-600 shadow-sm">
          <Icon size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-slate-800 truncate block">{item.title}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Grid: {item.defaultW}×{item.defaultH}</span>
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm opacity-50 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-7 h-7 min-w-[28px] rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
          <Icon size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-slate-400 truncate block">{item.title}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Grid: {item.defaultW}×{item.defaultH}</span>
        </div>
        <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100/60 px-1.5 py-0.5 rounded">Coming Soon</span>
      </div>
      <div className="h-[220px] p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
            <Icon size={20} className="text-slate-300" />
          </div>
          <p className="text-[11px] font-medium text-slate-400">Coming Soon</p>
        </div>
      </div>
    </div>
  );
}

export default function WidgetsCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [expanded, setExpanded] = useState(() => sections.reduce((acc, s) => ({ ...acc, [s.id]: true }), {}));

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
  const showFilters = activeCategory === "all" || activeCategory === "filters";
  const showText = activeCategory === "all" || activeCategory === "text";

  const totalVisible =
    (showMetrics ? filteredMetrics.length : 0) +
    filteredSections
      .filter((s) => {
        if (s.id === "appointments") return showCharts;
        if (s.id === "filters") return showFilters;
        if (s.id === "text") return showText;
        return true;
      })
      .reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased min-h-screen">
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
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Widgets Catalog</h1>
            </div>
            <p className="text-[13px] text-slate-500 ml-[46px]">
              {totalVisible} widget{totalVisible !== 1 ? "s" : ""} available for your dashboards
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-white border border-slate-200/60 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10"
                    : "bg-white text-slate-500 border-slate-200/60 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* No results */}
        {totalVisible === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Search size={24} className="text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">No widgets match "{searchQuery}"</p>
            <button
              onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
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
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metric Cards</span>
              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-200">{filteredMetrics.length}</span>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
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
          const isFilters = section.id === "filters";
          const isText = section.id === "text";
          if ((isCharts && !showCharts) || (isFilters && !showFilters) || (isText && !showText)) return null;

          return (
            <div key={section.id} className="mb-10">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-2 px-1 py-1.5 rounded-xl hover:bg-slate-50 transition-colors text-left font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-4"
              >
                {expanded[section.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="text-slate-800">{section.label}</span>
                <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{section.items.length}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent ml-2" />
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
