import {
  BarChart3, Activity,
  Calendar, Clock, Users, CheckCircle2, XCircle, AlertTriangle,
  AlertCircle, UserCheck, Building2, TrendingUp, CalendarRange,
  List, Grid3x3, Globe, Smartphone,
} from "lucide-react";

export const metricCards = [
  { id: "add-total-appts", title: "Total Appointments", chartType: "totalAppointments", type: "metric", icon: Calendar, value: "1,247", change: "+8.2%", positive: true, footer: "this period", defaultW: 2, defaultH: 1 },
  { id: "add-completed", title: "Completed", chartType: "completedAppointments", type: "metric", icon: CheckCircle2, value: "1,045", change: "+5.3%", positive: true, footer: "successful visits", defaultW: 2, defaultH: 1 },
  { id: "add-cancelled", title: "Cancelled", chartType: "cancelledAppointments", type: "metric", icon: XCircle, value: "158", change: "-1.2%", positive: true, footer: "cancelled visits", defaultW: 2, defaultH: 1 },
  { id: "add-dna-rate", title: "DNA Rate", chartType: "dnaRate", type: "metric", icon: AlertTriangle, value: "3.2%", change: "-0.3pp", positive: true, footer: "target < 5%", defaultW: 2, defaultH: 1 },
  { id: "add-avg-dur", title: "Avg Duration", chartType: "avgDuration", type: "metric", icon: Clock, value: "24 min", change: "+2.1%", positive: true, footer: "per appointment", defaultW: 2, defaultH: 1 },
  { id: "add-dna-count", title: "Did Not Attend", chartType: "dnaCount", type: "metric", icon: AlertCircle, value: "42", change: "-0.8%", positive: true, footer: "did not attend", defaultW: 2, defaultH: 1 },
  { id: "add-ga4-total-users", title: "Total Users", chartType: "ga4TotalUsers", type: "metric", icon: Users, value: "24,831", change: "+12.4%", positive: true, footer: "this period", defaultW: 2, defaultH: 1 },
  { id: "add-ga4-active-users", title: "Active Users", chartType: "ga4ActiveUsers", type: "metric", icon: UserCheck, value: "18,429", change: "+8.7%", positive: true, footer: "last 7 days", defaultW: 2, defaultH: 1 },
  { id: "add-ga4-new-users", title: "New Users", chartType: "ga4NewUsers", type: "metric", icon: Globe, value: "9,214", change: "+15.2%", positive: true, footer: "this period", defaultW: 2, defaultH: 1 },
  { id: "add-ga4-sessions", title: "Sessions", chartType: "ga4Sessions", type: "metric", icon: Activity, value: "42,567", change: "+6.3%", positive: true, footer: "this period", defaultW: 2, defaultH: 1 },
  { id: "add-ga4-bounce-rate", title: "Bounce Rate", chartType: "ga4BounceRate", type: "metric", icon: TrendingUp, value: "38.2%", change: "-2.1pp", positive: true, footer: "target < 40%", defaultW: 2, defaultH: 1 },
  { id: "add-ga4-avg-session", title: "Avg Session Duration", chartType: "ga4AvgSessionDuration", type: "metric", icon: Clock, value: "3m 42s", change: "+4.8%", positive: true, footer: "per session", defaultW: 2, defaultH: 1 },
  { id: "add-ga4-page-views", title: "Page Views", chartType: "ga4PageViews", type: "metric", icon: BarChart3, value: "128,432", change: "+9.1%", positive: true, footer: "this period", defaultW: 2, defaultH: 1 },
  { id: "add-ga4-conversion-rate", title: "Conversion Rate", chartType: "ga4ConversionRate", type: "metric", icon: CheckCircle2, value: "3.8%", change: "+0.5pp", positive: true, footer: "target > 3%", defaultW: 2, defaultH: 1 },
  { id: "add-ga4-revenue", title: "Revenue", chartType: "ga4Revenue", type: "metric", icon: TrendingUp, value: "$48,295", change: "+18.3%", positive: true, footer: "this period", defaultW: 2, defaultH: 1 },
  { id: "add-ga4-transactions", title: "Transactions", chartType: "ga4Transactions", type: "metric", icon: List, value: "1,847", change: "+11.2%", positive: true, footer: "completed orders", defaultW: 2, defaultH: 1 },
];

export const sections = [
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
    id: "google-analytics",
    label: "Google Analytics",
    items: [
      { id: "add-ga4-traffic-time", title: "Traffic Over Time", chartType: "ga4TrafficOverTime", icon: TrendingUp, defaultW: 6, defaultH: 2 },
      { id: "add-ga4-sources", title: "Traffic Sources", chartType: "ga4TrafficSources", icon: Globe, defaultW: 5, defaultH: 2 },
      { id: "add-ga4-pages", title: "Pages by Views", chartType: "ga4PagesPerSession", icon: List, defaultW: 5, defaultH: 2 },
      { id: "add-ga4-devices", title: "Device Breakdown", chartType: "ga4DeviceBreakdown", icon: Smartphone, defaultW: 5, defaultH: 2 },
      { id: "add-ga4-landing", title: "Top Landing Pages", chartType: "ga4TopLandingPages", icon: BarChart3, defaultW: 6, defaultH: 2 },
      { id: "add-ga4-engagement", title: "Engagement Rate", chartType: "ga4EngagementRate", icon: Activity, defaultW: 6, defaultH: 2 },
      { id: "add-ga4-conversions-time", title: "Conversions Over Time", chartType: "ga4ConversionsOverTime", icon: TrendingUp, defaultW: 6, defaultH: 2 },
      { id: "add-ga4-revenue-time", title: "Revenue Over Time", chartType: "ga4RevenueOverTime", icon: BarChart3, defaultW: 6, defaultH: 2 },
      { id: "add-ga4-user-age", title: "User Age Distribution", chartType: "ga4UserAge", icon: Users, defaultW: 5, defaultH: 2 },
      { id: "add-ga4-user-gender", title: "User Gender Split", chartType: "ga4UserGender", icon: Users, defaultW: 5, defaultH: 2 },
      { id: "add-ga4-geo", title: "Top Countries", chartType: "ga4GeoBreakdown", icon: Globe, defaultW: 5, defaultH: 2 },
      { id: "add-ga4-events", title: "Event Count by Category", chartType: "ga4EventCount", icon: Activity, defaultW: 5, defaultH: 2 },
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

export const miniPreviews = {
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
  ga4TrafficOverTime: { ...areaPreviewOption, series: [{ type: "line", smooth: true, data: [1250, 1380, 1520, 1340, 1680], lineStyle: { width: 1.5, color: "#3b82f6" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(59,130,246,0.2)" }, { offset: 1, color: "rgba(59,130,246,0.02)" }] } }, symbol: "none" }], xAxis: { ...areaPreviewOption.xAxis, data: ["1", "2", "3", "4", "5"] } },
  ga4TrafficSources: donutPreviewOption,
  ga4PagesPerSession: { grid: { left: 5, right: 5, top: 5, bottom: 5, containLabel: true }, xAxis: { type: "value", show: false }, yAxis: { type: "category", data: ["/home", "/pricing", "/blog"], axisLabel: { fontSize: 7, color: "#94a3b8" }, axisLine: { show: false }, axisTick: { show: false } }, series: [{ type: "bar", data: [84, 52, 36], barWidth: "55%", itemStyle: { color: "#3b82f6", borderRadius: [0, 2, 2, 0] } }] },
  ga4DeviceBreakdown: donutPreviewOption,
  ga4TopLandingPages: { grid: { left: 5, right: 5, top: 5, bottom: 5, containLabel: true }, xAxis: { type: "value", show: false }, yAxis: { type: "category", data: ["/home", "/blog", "/pricing"], axisLabel: { fontSize: 7, color: "#94a3b8" }, axisLine: { show: false }, axisTick: { show: false } }, series: [{ type: "bar", data: [84, 48, 36], barWidth: "55%", itemStyle: { color: "#3b82f6", borderRadius: [0, 2, 2, 0] } }] },
  ga4EngagementRate: { ...areaPreviewOption, series: [{ type: "line", smooth: true, data: [62, 65, 61, 68, 65], lineStyle: { width: 1.5, color: "#8b5cf6" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(139,92,246,0.2)" }, { offset: 1, color: "rgba(139,92,246,0.02)" }] } }, symbol: "none" }], xAxis: { ...areaPreviewOption.xAxis, data: ["1", "2", "3", "4", "5"] } },
  ga4PageViews: { ...areaPreviewOption, series: [{ type: "line", smooth: true, data: [4200, 4800, 5100, 4600, 5400], lineStyle: { width: 1.5, color: "#0ea5e9" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(14,165,233,0.2)" }, { offset: 1, color: "rgba(14,165,233,0.02)" }] } }, symbol: "none" }], xAxis: { ...areaPreviewOption.xAxis, data: ["1", "2", "3", "4", "5"] } },
  ga4ConversionRate: { ...areaPreviewOption, series: [{ type: "line", smooth: true, data: [3.2, 3.5, 3.8, 3.4, 3.8], lineStyle: { width: 1.5, color: "#10b981" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(16,185,129,0.2)" }, { offset: 1, color: "rgba(16,185,129,0.02)" }] } }, symbol: "none" }], xAxis: { ...areaPreviewOption.xAxis, data: ["1", "2", "3", "4", "5"] } },
  ga4Revenue: { ...barPreviewOption, series: [{ type: "bar", data: [82, 94, 78, 102, 89], barWidth: "60%", itemStyle: { color: "#10b981", borderRadius: [3, 3, 0, 0] } }], xAxis: { ...barPreviewOption.xAxis, data: ["Mon", "Tue", "Wed", "Thu", "Fri"] } },
  ga4Transactions: { ...barPreviewOption, series: [{ type: "bar", data: [32, 38, 29, 41, 35], barWidth: "60%", itemStyle: { color: "#6366f1", borderRadius: [3, 3, 0, 0] } }], xAxis: { ...barPreviewOption.xAxis, data: ["Mon", "Tue", "Wed", "Thu", "Fri"] } },
  ga4ConversionsOverTime: { ...areaPreviewOption, series: [{ type: "line", smooth: true, data: [42, 48, 55, 50, 58], lineStyle: { width: 1.5, color: "#10b981" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(16,185,129,0.2)" }, { offset: 1, color: "rgba(16,185,129,0.02)" }] } }, symbol: "none" }], xAxis: { ...areaPreviewOption.xAxis, data: ["1", "2", "3", "4", "5"] } },
  ga4RevenueOverTime: { ...barPreviewOption, series: [{ type: "bar", data: [82, 94, 78, 102, 89], barWidth: "60%", itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#34d399" }, { offset: 1, color: "#10b981" }] }, borderRadius: [3, 3, 0, 0] } }], xAxis: { ...barPreviewOption.xAxis, data: ["W1", "W2", "W3", "W4", "W5"] } },
  ga4UserAge: { ...barPreviewOption, series: [{ type: "bar", data: [15, 28, 35, 22, 12], barWidth: "60%", itemStyle: { color: "#6366f1", borderRadius: [3, 3, 0, 0] } }], xAxis: { ...barPreviewOption.xAxis, data: ["18-24", "25-34", "35-44", "45-54", "55+"] } },
  ga4UserGender: donutPreviewOption,
  ga4GeoBreakdown: { grid: { left: 5, right: 5, top: 5, bottom: 5, containLabel: true }, xAxis: { type: "value", show: false }, yAxis: { type: "category", data: ["US", "UK", "DE"], axisLabel: { fontSize: 7, color: "#94a3b8" }, axisLine: { show: false }, axisTick: { show: false } }, series: [{ type: "bar", data: [45, 28, 15], barWidth: "55%", itemStyle: { color: "#3b82f6", borderRadius: [0, 2, 2, 0] } }] },
  ga4EventCount: { grid: { left: 5, right: 5, top: 5, bottom: 5, containLabel: true }, xAxis: { type: "value", show: false }, yAxis: { type: "category", data: ["click", "view", "scroll"], axisLabel: { fontSize: 7, color: "#94a3b8" }, axisLine: { show: false }, axisTick: { show: false } }, series: [{ type: "bar", data: [85, 62, 45], barWidth: "55%", itemStyle: { color: "#8b5cf6", borderRadius: [0, 2, 2, 0] } }] },
};
