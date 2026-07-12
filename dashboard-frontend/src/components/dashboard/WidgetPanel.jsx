import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, LineChart, PieChart, AreaChart, Activity,
  Table2, Filter, Type, ChevronDown, ChevronRight, Search, Plus,
} from "lucide-react";

const sections = [
  {
    id: "charts",
    label: "Charts",
    items: [
      { id: "add-bar", title: "Bar Chart", type: "bar", icon: BarChart3, defaultW: 4, defaultH: 3 },
      { id: "add-line", title: "Line Chart", type: "line", icon: LineChart, defaultW: 4, defaultH: 3 },
      { id: "add-area", title: "Area Chart", type: "area", icon: AreaChart, defaultW: 4, defaultH: 3 },
      { id: "add-pie", title: "Pie Chart", type: "pie", icon: PieChart, defaultW: 3, defaultH: 3 },
    ],
  },
  {
    id: "metrics",
    label: "Metrics",
    items: [
      { id: "add-metric", title: "Metric Card", type: "metric", icon: Activity, defaultW: 2, defaultH: 2 },
    ],
  },
  {
    id: "tables",
    label: "Tables",
    items: [
      { id: "add-table", title: "Data Table", type: "table", icon: Table2, defaultW: 6, defaultH: 3 },
    ],
  },
  {
    id: "filters",
    label: "Filters",
    items: [
      { id: "add-date-filter", title: "Date Range Picker", type: "filter", icon: Filter, defaultW: 3, defaultH: 1, disabled: true },
      { id: "add-dropdown-filter", title: "Dropdown Filter", type: "filter", icon: Filter, defaultW: 2, defaultH: 1, disabled: true },
    ],
  },
  {
    id: "text",
    label: "Text",
    items: [
      { id: "add-heading", title: "Heading", type: "text", icon: Type, defaultW: 4, defaultH: 1, disabled: true },
      { id: "add-paragraph", title: "Paragraph", type: "text", icon: Type, defaultW: 6, defaultH: 2, disabled: true },
    ],
  },
];

export default function WidgetPanel({ onAddWidget }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(() => sections.reduce((acc, s) => ({ ...acc, [s.id]: true }), {}));

  const toggleSection = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = sections.map(s => ({
    ...s,
    items: s.items.filter(item =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      s.label.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(s => s.items.length > 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-2">Widgets</h3>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search widgets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-8 pl-7 pr-2 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-none">
        {filtered.map(section => (
          <div key={section.id}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
            >
              {expanded[section.id] ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{section.label}</span>
              <span className="text-[9px] font-medium text-slate-400 ml-auto">{section.items.length}</span>
            </button>

            <AnimatePresence initial={false}>
              {expanded[section.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 pl-1 pt-1 pb-1">
                    {section.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => !item.disabled && onAddWidget(item)}
                          disabled={item.disabled}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-lg border transition-all text-left group
                            ${item.disabled
                              ? "border-slate-100 bg-slate-50/50 opacity-40 cursor-not-allowed"
                              : "border-slate-200/60 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-sm cursor-pointer"
                            }`}
                        >
                          <div className={`w-7 h-7 min-w-[28px] rounded-lg flex items-center justify-center
                            ${item.disabled
                              ? "bg-slate-100 text-slate-400"
                              : "bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/60 text-indigo-600 group-hover:scale-110"
                            } transition-transform`}
                          >
                            <Icon size={13} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] font-semibold truncate ${item.disabled ? "text-slate-400" : "text-slate-700"}`}>
                                {item.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-medium ${item.disabled ? "text-slate-300" : "text-slate-400"}`}>
                                {item.defaultW}×{item.defaultH}
                              </span>
                              {item.disabled && (
                                <span className="text-[8px] font-medium text-amber-500 bg-amber-50 px-1 rounded">Soon</span>
                              )}
                            </div>
                          </div>
                          {!item.disabled && (
                            <Plus size={11} className="text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                          )}
                        </button>
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
