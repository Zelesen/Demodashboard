import { useState } from "react";
import { BarChart3, Calendar, CheckCircle2, XCircle, AlertTriangle, AlertCircle, Clock, Users, Building2, TrendingUp, CalendarRange, List, UserCheck, Grid3x3, Activity, Maximize2 } from "lucide-react";
import { renderAppointmentWidget } from "./dashboard/WidgetRenderer";

const APPOINTMENT_CHART_TYPES = new Set([
  "totalAppointments", "completedAppointments", "cancelledAppointments",
  "dnaRate", "avgDuration", "dnaCount", "outcomeBreakdown",
  "appointmentsByPractice", "practitionerWorkload", "dailyAppointmentVolume",
  "appointmentsByReason", "appointmentsByHour", "appointmentsByDay",
  "practitionerCompletionRate", "cancelledByDay", "appointmentLifecycle",
  "appointmentDuration", "weeklyActivityHeatmap",
]);

export default function DashboardWidget({ widget, showControls = true, onFullscreen }) {
  const [isHovered, setIsHovered] = useState(false);

  const renderChart = () => {
    if (APPOINTMENT_CHART_TYPES.has(widget.chartType)) {
      return renderAppointmentWidget(widget);
    }
    return null;
  };

  const chartTypeIcons = {
    outcomeBreakdown: CheckCircle2, appointmentsByPractice: Building2, practitionerWorkload: Users,
    dailyAppointmentVolume: TrendingUp, appointmentsByReason: List, appointmentsByHour: Clock,
    appointmentsByDay: CalendarRange, practitionerCompletionRate: UserCheck, cancelledByDay: XCircle,
    appointmentLifecycle: Activity, appointmentDuration: BarChart3, weeklyActivityHeatmap: Grid3x3,
    totalAppointments: Calendar, completedAppointments: CheckCircle2, cancelledAppointments: XCircle,
    dnaRate: AlertTriangle, avgDuration: Clock, dnaCount: AlertCircle,
  };
  const Icon = chartTypeIcons[widget.chartType] || BarChart3;

  return (
    <div
      className="h-full w-full bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
            <Icon size={10} className="text-indigo-600" />
          </div>
          <span className="text-[10px] font-semibold text-slate-700 truncate">{widget.title}</span>
        </div>
        {showControls && (
          <div className={`flex items-center gap-1 transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}>
            <button
              onClick={(e) => { e.stopPropagation(); onFullscreen?.(); }}
              className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              title="Full screen"
            >
              <Maximize2 size={10} />
            </button>
          </div>
        )}
      </div>
      <div className="h-[calc(100%-28px)]">
        {renderChart()}
      </div>
    </div>
  );
}
