import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactECharts from "echarts-for-react";
import {
  BarChart3, Activity,
  Filter, Type, ChevronDown, ChevronRight, Search, Plus,
  Calendar, Clock, Users, CheckCircle2, XCircle, AlertTriangle,
  AlertCircle, UserCheck, Building2, TrendingUp, CalendarRange,
  List, Grid3x3
} from "lucide-react";

const metricCards = [
  { id: "add-total-appts", title: "Total Appointments", chartType: "totalAppointments", type: "metric", icon: Calendar, value: "1,247", change: "+8.2%", positive: true, footer: "this period", defaultW: 2, defaultH: 1 },
  { id: "add-completed", title: "Completed", chartType: "completedAppointments", type: "metric", icon: CheckCircle2, value: "1,045", change: "+5.3%", positive: true, footer: "successful visits", defaultW: 2, defaultH: 1 },
  { id: "add-cancelled", title: "Cancelled", chartType: "cancelledAppointments", type: "metric", icon: XCircle, value: "158", change: "-1.2%", positive: true, footer: "cancelled visits", defaultW: 2, defaultH: 1 },
  { id: "add-dna-rate", title: "DNA Rate", chartType: "dnaRate", type: "metric", icon: AlertTriangle, value: "3.2%", change: "-0.3pp", positive: true, footer: "target < 5%", defaultW: 2, defaultH: 1 },
  { id: "add-avg-dur", title: "Avg Duration", chartType: "avgDuration", type: "metric", icon: Clock, value: "24 min", change: "+2.1%", positive: true, footer: "per appointment", defaultW: 2, defaultH: 1 },
  { id: "add-dna-count", title: "Did Not Attend", chartType: "dnaCount", type: "metric", icon: AlertCircle, value: "42", change: "-0.8%", positive: true, footer: "did not attend", defaultW: 2, defaultH: 1 },
];

const sections = [
  {
    id: "appointments",
    label: "Appointments",
      items: [
        { id: "add-outcome", title: "Outcome Breakdown", chartType: "outcomeBreakdown", icon: CheckCircle2, defaultW: 5, defaultH: 2 },
        { id: "add-by-practice", title: "By Practice", chartType: "appointmentsByPractice", icon: Building2, defaultW: 5, defaultH: 2 },
        { id: "add-prac-workload", title: "Practitioner Workload", chartType: "practitionerWorkload", icon: Users, defaultW: 5, defaultH: 2 },
        { id: "add-daily-volume", title: "Daily Volume", chartType: "dailyAppointmentVolume", icon: TrendingUp, defaultW: 5, defaultH: 2 },
        { id: "add-by-reason", title: "By Reason", chartType: "appointmentsByReason", icon: List, defaultW: 5, defaultH: 2 },
        { id: "add-by-hour", title: "By Hour", chartType: "appointmentsByHour", icon: Clock, defaultW: 5, defaultH: 2 },
        { id: "add-by-day", title: "By Day", chartType: "appointmentsByDay", icon: CalendarRange, defaultW: 5, defaultH: 2 },
        { id: "add-completion-rate", title: "Completion Rate", chartType: "practitionerCompletionRate", icon: UserCheck, defaultW: 5, defaultH: 2 },
        { id: "add-cancelled-day", title: "Cancelled by Day", chartType: "cancelledByDay", icon: XCircle, defaultW: 5, defaultH: 2 },
        { id: "add-lifecycle", title: "Lifecycle", chartType: "appointmentLifecycle", icon: Activity, defaultW: 5, defaultH: 2 },
        { id: "add-duration", title: "Duration Dist.", chartType: "appointmentDuration", icon: BarChart3, defaultW: 5, defaultH: 2 },
        { id: "add-heatmap", title: "Activity Heatmap", chartType: "weeklyActivityHeatmap", icon: Grid3x3, defaultW: 5, defaultH: 2 },
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

const donutPreviewOption = {
  series: [{ type: "pie", radius: ["45%", "68%"], data: [
    { value: 185, itemStyle: { color: { type: "radial", x: 0.5, y: 0.5, r: 0.5, colorStops: [{ offset: 0, color: "#5ee09e" }, { offset: 0.6, color: "#10b981" }, { offset: 1, color: "#059669" }] } } },
    { value: 58, itemStyle: { color: { type: "radial", x: 0.5, y: 0.5, r: 0.5, colorStops: [{ offset: 0, color: "#fcd46b" }, { offset: 0.6, color: "#f59e0b" }, { offset: 1, color: "#d97706" }] } } },
    { value: 22, itemStyle: { color: { type: "radial", x: 0.5, y: 0.5, r: 0.5, colorStops: [{ offset: 0, color: "#fc9b6e" }, { offset: 0.6, color: "#f97316" }, { offset: 1, color: "#ea580c" }] } } },
    { value: 15, itemStyle: { color: { type: "radial", x: 0.5, y: 0.5, r: 0.5, colorStops: [{ offset: 0, color: "#cbd5e1" }, { offset: 0.6, color: "#94a3b8" }, { offset: 1, color: "#64748b" }] } } },
  ], itemStyle: { borderColor: "#fff", borderWidth: 2 }, label: { show: false } }],
};

const barPreviewOption = {
  grid: { left: 5, right: 5, top: 5, bottom: 20, containLabel: true },
  xAxis: { type: "category", data: ["Site A", "Site B", "Site C", "Site D"], axisLabel: { fontSize: 8, color: "#94a3b8" }, axisLine: { show: false }, axisTick: { show: false } },
  yAxis: { type: "value", show: false, splitLine: { show: false } },
  series: [{ type: "bar", data: [120, 95, 78, 65], barWidth: "60%", itemStyle: { color: "#3b82f6", borderRadius: [3, 3, 0, 0] } }],
};

const hbarPreviewOption = {
  grid: { left: 5, right: 5, top: 5, bottom: 5, containLabel: true },
  xAxis: { type: "value", show: false },
  yAxis: { type: "category", data: ["Dr A", "Dr B", "Dr C"], axisLabel: { fontSize: 8, color: "#94a3b8" }, axisLine: { show: false }, axisTick: { show: false } },
  series: [
    { type: "bar", data: [45, 52, 38], barWidth: "35%", barGap: "20%", itemStyle: { color: "#6366f1", borderRadius: [0, 2, 2, 0] } },
    { type: "bar", data: [38, 42, 32], barWidth: "35%", itemStyle: { color: "#10b981", borderRadius: [0, 2, 2, 0] } },
  ],
};

const areaPreviewOption = {
  grid: { left: 5, right: 5, top: 5, bottom: 15, containLabel: true },
  xAxis: { type: "category", data: ["M", "T", "W", "T", "F"], axisLabel: { fontSize: 8, color: "#94a3b8" }, axisLine: { show: false }, axisTick: { show: false } },
  yAxis: { type: "value", show: false, splitLine: { show: false } },
  series: [{ type: "line", smooth: true, data: [28, 35, 22, 40, 32], lineStyle: { width: 1.5, color: "#3b82f6" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(59,130,246,0.2)" }, { offset: 1, color: "rgba(59,130,246,0.02)" }] } }, symbol: "none" }],
};

const heatmapPreviewOption = {
  grid: { left: 5, right: 5, top: 5, bottom: 5, containLabel: true },
  xAxis: { type: "category", data: ["8:00", "10:00", "12:00", "14:00", "16:00"], axisLabel: { fontSize: 7, color: "#94a3b8", rotate: 20 }, axisLine: { show: false }, splitArea: { show: true } },
  yAxis: { type: "category", data: ["Mon", "Wed", "Fri"], axisLabel: { fontSize: 7, color: "#94a3b8" }, axisLine: { show: false }, splitArea: { show: true } },
  visualMap: { show: false, min: 0, max: 15, inRange: { color: ["#f0f9ff", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9"] } },
  series: [{ type: "heatmap", data: [
    [0, 0, 4], [0, 1, 12], [0, 2, 5], [0, 3, 9], [0, 4, 7],
    [1, 0, 3], [1, 1, 13], [1, 2, 5], [1, 3, 10], [1, 4, 6],
    [2, 0, 2], [2, 1, 9], [2, 2, 3], [2, 3, 7], [2, 4, 5],
  ], label: { show: true, fontSize: 7, color: "#1e293b", formatter: ({ value: [, , count] }) => count || "" } }],
};

const groupedBarPreviewOption = {
  grid: { left: 5, right: 5, top: 5, bottom: 15, containLabel: true },
  xAxis: { type: "category", data: ["8:00", "10:00", "12:00", "14:00"], axisLabel: { fontSize: 7, color: "#94a3b8" }, axisLine: { show: false }, axisTick: { show: false } },
  yAxis: { type: "value", show: false, splitLine: { show: false } },
  series: [
    { type: "bar", data: [28, 30, 22, 35], barWidth: "25%", barGap: "10%", itemStyle: { color: "#8b5cf6", borderRadius: [2, 2, 0, 0] } },
    { type: "bar", data: [15, 10, 5, 15], barWidth: "25%", itemStyle: { color: "#a78bfa", borderRadius: [2, 2, 0, 0] } },
    { type: "bar", data: [55, 58, 45, 65], barWidth: "25%", itemStyle: { color: "#c4b5fd", borderRadius: [2, 2, 0, 0] } },
  ],
};

const miniPreviews = {
  outcomeBreakdown: donutPreviewOption,
  appointmentsByPractice: barPreviewOption,
  practitionerWorkload: hbarPreviewOption,
  dailyAppointmentVolume: areaPreviewOption,
  appointmentsByReason: donutPreviewOption,
  appointmentsByHour: { ...barPreviewOption, series: [{ type: "bar", data: [12, 28, 35, 30, 18, 15, 32, 38], barWidth: "60%", itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#a78bfa" }, { offset: 1, color: "#8b5cf6" }] }, borderRadius: [3, 3, 0, 0] } }], xAxis: { ...barPreviewOption.xAxis, data: ["8", "10", "12", "14", "16"] } },
  appointmentsByDay: { ...barPreviewOption, series: [{ type: "bar", data: [95, 110, 105, 98, 85].map((v, i) => ({ value: v, itemStyle: { color: ["#6366f1", "#818cf8", "#a5b4fc", "#2dd4bf", "#34d399"][i], borderRadius: [3, 3, 0, 0] } })), barWidth: "65%" }], xAxis: { ...barPreviewOption.xAxis, data: ["Mon", "Tue", "Wed", "Thu", "Fri"] } },
  practitionerCompletionRate: { ...hbarPreviewOption, xAxis: { type: "value", max: 100, show: false }, series: [{ type: "bar", data: [84, 81, 84], barWidth: "55%", itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#34d399" }, { offset: 1, color: "#10b981" }] }, borderRadius: [0, 2, 2, 0] } }] },
  cancelledByDay: { ...barPreviewOption, series: [{ type: "bar", data: [8, 12, 6, 10, 15], barWidth: "60%", itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#f43f5e" }, { offset: 1, color: "#fb7185" }] }, borderRadius: [3, 3, 0, 0] } }], xAxis: { ...barPreviewOption.xAxis, data: ["Mon", "Tue", "Wed", "Thu", "Fri"] } },
  appointmentLifecycle: groupedBarPreviewOption,
  appointmentDuration: { ...barPreviewOption, series: [{ type: "bar", data: [45, 120, 85, 55, 30], barWidth: "55%", itemStyle: { color: "#0ea5e9", borderRadius: [3, 3, 0, 0] } }], xAxis: { ...barPreviewOption.xAxis, data: ["0-15", "15-30", "30-45", "45-60", "60-90"] } },
  weeklyActivityHeatmap: heatmapPreviewOption,
};

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