import { useState } from "react";
import { BarChart3, LineChart, PieChart, AreaChart, Activity, Table2, GripVertical, Search, X } from "lucide-react";

const widgetTypes = [
  { type: "bar", label: "Bar Chart", icon: BarChart3, description: "Compare values across categories", defaultW: 2, defaultH: 2 },
  { type: "line", label: "Line Chart", icon: LineChart, description: "Show trends over time", defaultW: 2, defaultH: 2 },
  { type: "pie", label: "Pie Chart", icon: PieChart, description: "Display proportional data", defaultW: 2, defaultH: 2 },
  { type: "area", label: "Area Chart", icon: AreaChart, description: "Emphasize magnitude of change", defaultW: 2, defaultH: 2 },
  { type: "metric", label: "Metric Card", icon: Activity, description: "Key performance indicator", defaultW: 1, defaultH: 1 },
  { type: "table", label: "Data Table", icon: Table2, description: "Tabular data view", defaultW: 3, defaultH: 2 },
];

const generatedWidgets = [
  { type: "bar", title: "Revenue by Practice", defaultW: 2, defaultH: 2 },
  { type: "line", title: "Monthly Trends", defaultW: 2, defaultH: 2 },
  { type: "pie", title: "Patient Demographics", defaultW: 2, defaultH: 2 },
  { type: "metric", title: "Total Patients", defaultW: 1, defaultH: 1 },
  { type: "metric", title: "Avg Revenue/Patient", defaultW: 1, defaultH: 1 },
  { type: "area", title: "Cash Flow", defaultW: 2, defaultH: 2 },
  { type: "table", title: "Recent Appointments", defaultW: 3, defaultH: 2 },
  { type: "bar", title: "Treatment Breakdown", defaultW: 2, defaultH: 2 },
];

export default function WidgetLibrary({ onAddWidget, generated, onClose }) {
  const [search, setSearch] = useState("");
  const [dragWidget, setDragWidget] = useState(null);

  const widgets = generated ? generatedWidgets : widgetTypes;

  const filtered = widgets.filter(w =>
    w.title?.toLowerCase().includes(search.toLowerCase()) ||
    w.type?.toLowerCase().includes(search.toLowerCase()) ||
    widgetTypes.find(t => t.type === w.type)?.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleDragStart = (e, w) => {
    setDragWidget(w);
    e.dataTransfer.setData("text/plain", JSON.stringify(w));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = () => {
    setDragWidget(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
            <BarChart3 size={12} className="text-indigo-600" />
          </div>
          Widget Library
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{filtered.length}</span>
        </h3>
        <button onClick={onClose} className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-2">
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

      {generated && (
        <div className="px-3 py-1.5">
          <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Generated from your prompt
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 scrollbar-none">
        {filtered.map((w, i) => {
          const typeInfo = widgetTypes.find(t => t.type === w.type);
          const Icon = typeInfo?.icon || BarChart3;

          return (
            <div
              key={`${w.type}-${i}`}
              draggable
              onDragStart={e => handleDragStart(e, w)}
              onDragEnd={handleDragEnd}
              onClick={() => onAddWidget(w)}
              className={`group flex items-center gap-3 p-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-150
                ${dragWidget === w ? "opacity-50 scale-95 shadow-inner" : "hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-sm"}
                border-slate-200/60 bg-white}`}
            >
              <div className="w-8 h-8 min-w-[32px] rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon size={14} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-slate-700 truncate">{w.title || typeInfo?.label}</span>
                  <span className="text-[8px] font-medium text-slate-400 bg-slate-100 px-1 rounded shrink-0">{w.type}</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate leading-tight">{typeInfo?.description || ""}</p>
              </div>
              <div className="flex items-center gap-1 text-slate-300 shrink-0">
                <span className="text-[8px] font-mono">{w.defaultW}×{w.defaultH}</span>
                <GripVertical size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
