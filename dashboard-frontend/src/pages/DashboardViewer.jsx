import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarRange, RefreshCw, LayoutDashboard } from "lucide-react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import DashboardWidget from "../components/DashboardWidget";
import WidgetFrame from "../components/dashboard/WidgetFrame";
import useDashboardData from "../hooks/useDashboardData";

const API = "http://localhost:8000";
const ROW_HEIGHT = 100;
const COLS = 12;

const FILTERS = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last year", "All time", "Custom"];

const PERIOD_MAP = {
  "Today": "today",
  "Last 7 days": "7d",
  "Last 30 days": "30d",
  "Last 90 days": "90d",
  "Last year": "1y",
  "All time": "all",
  "Custom": "all",
};

export default function DashboardViewer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dashboardTitle, setDashboardTitle] = useState("Untitled Dashboard");
  const [dashboardDescription, setDashboardDescription] = useState("");
  const [loading, setLoading] = useState(!!id);
  const [activeFilter, setActiveFilter] = useState("Last 7 days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [containerWidth, setContainerWidth] = useState(800);
  const [widgets, setWidgets] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const containerRef = useRef(null);

  const period = activeFilter === "Custom" ? "all" : PERIOD_MAP[activeFilter];
  const startDate = activeFilter === "Custom" ? customStartDate : null;
  const endDate = activeFilter === "Custom" ? customEndDate : null;

  const { dataMap, loading: dataLoading } = useDashboardData(widgets, period, startDate, endDate);
  const widgetsWithData = widgets.map(w => ({ ...w, data: dataMap[w.i] || w.data }));

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/dashboards/${id}`);
        const data = await res.json();
        if (cancelled) return;
        const dash = data.dashboard;
        setDashboardTitle(dash.name || "Untitled Dashboard");
        setDashboardDescription(dash.description || "");
        if (dash.page_data?.widgets) {
          setWidgets(dash.page_data.widgets);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, [loading]);

  const canvasHeight = !widgets.length ? 600 : Math.max(600, widgets.reduce((max, w) => Math.max(max, w.y + w.h), 2) * ROW_HEIGHT + 48);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const until = Date.now() + 300000;
    sessionStorage.setItem("dashboard_refresh_cooldown", String(until));
    setCooldownSecs(300);
    try {
      const res = await fetch(`${API}/api/dashboards/${id}`);
      const data = await res.json();
      const dash = data.dashboard;
      if (dash.page_data?.widgets) {
        setWidgets([...dash.page_data.widgets]);
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("dashboard_refresh_cooldown");
    if (!stored) return;
    const until = parseInt(stored, 10);
    if (Date.now() >= until) {
      sessionStorage.removeItem("dashboard_refresh_cooldown");
      return;
    }
    setCooldownSecs(Math.floor((until - Date.now()) / 1000));
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((until - Date.now()) / 1000));
      setCooldownSecs(remaining);
      if (remaining <= 0) sessionStorage.removeItem("dashboard_refresh_cooldown");
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fmtDate = (d) => {
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const dateLabel = (() => {
    const today = new Date();
    const end = today;
    switch (activeFilter) {
      case "Today": return fmtDate(end);
      case "Last 7 days": { const s = new Date(end); s.setDate(s.getDate() - 6); return `${fmtDate(s)} – ${fmtDate(end)}`; }
      case "Last 30 days": { const s = new Date(end); s.setDate(s.getDate() - 29); return `${fmtDate(s)} – ${fmtDate(end)}`; }
      case "Last 90 days": { const s = new Date(end); s.setDate(s.getDate() - 89); return `${fmtDate(s)} – ${fmtDate(end)}`; }
      case "Last year": { const s = new Date(end); s.setFullYear(s.getFullYear() - 1); return `${fmtDate(s)} – ${fmtDate(end)}`; }
      case "All time": { const s = new Date("2020-01-01"); return `${fmtDate(s)} – ${fmtDate(end)}`; }
      case "Custom": {
        if (customStartDate && customEndDate) {
          return `${fmtDate(new Date(customStartDate))} – ${fmtDate(new Date(customEndDate))}`;
        }
        return "Select date range";
      }
      default: return fmtDate(end);
    }
  })();

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased min-h-screen">
      <style>{`.viewer-grid .react-resizable-handle { display: none !important; } .viewer-grid .react-grid-item { cursor: default !important; user-select: none !important; -webkit-user-drag: none !important; } .viewer-grid .react-grid-item > * { user-select: none !important; -webkit-user-drag: none !important; }`}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/20 via-blue-100/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/15 via-slate-100/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-5 space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboards")}
              className="group p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-all shadow-sm hover:shadow"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                {dashboardTitle}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {dashboardDescription && (
                  <p className="text-xs text-slate-500 font-medium max-w-lg truncate">
                    {dashboardDescription}
                  </p>
                )}
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <CalendarRange size={10} />
                  {dateLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || cooldownSecs > 0}
              className="inline-flex items-center gap-1.5 px-3 h-[32px] bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:shadow-sm active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              <RefreshCw
                size={11}
                className={`transition-transform duration-700 ease-out ${isRefreshing ? "rotate-180 text-blue-500" : "text-slate-400"}`}
              />
              {isRefreshing ? "Syncing..." : cooldownSecs > 0 ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, "0")} left` : "Refresh"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200/60 rounded-lg p-0.5 w-fit shadow-sm sticky top-16 z-30">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-2.5 h-7 text-[10px] font-semibold tracking-tight rounded-md transition-all duration-200 ${
                activeFilter === f
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
          {activeFilter === "Custom" && (
            <div className="flex items-center gap-2 px-2">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2 py-1 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <span className="text-[10px] text-slate-400">–</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2 py-1 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}
        </div>

        {dataLoading && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600">
            <RefreshCw size={12} className="animate-spin" />
            Refreshing data...
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <div>
            <div
              ref={containerRef}
              className="relative rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden bg-white"
              style={{ minHeight: `${canvasHeight}px` }}
            >
              <div className="relative z-10 w-full h-full">
                {widgetsWithData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[500px]">
                    <div className="text-center max-w-sm p-6 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-100/60">
                      <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                        <LayoutDashboard size={18} strokeWidth={2} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">Empty Dashboard</h3>
                      <p className="text-xs text-slate-500 leading-relaxed px-2">This dashboard has no widgets yet.</p>
                    </div>
                  </div>
                ) : (
                  <GridLayout
                    className="layout transitions-group relative viewer-grid"
                    layout={widgetsWithData.map(({ i, x, y, w, h, minH, minW }) => ({ i, x, y, w, h, minH: minH || 2, minW: minW || 1, static: true }))}
                    cols={COLS}
                    rowHeight={ROW_HEIGHT}
                    width={containerWidth}
                    isDraggable={false}
                    isResizable={false}
                    compactType="vertical"
                    margin={[16, 16]}
                    containerPadding={[12, 12]}
                    useCSSTransforms={true}
                  >
                    {widgetsWithData.map(widget => (
                      <div key={widget.i} className="rounded-xl overflow-hidden border border-transparent">
                        <WidgetFrame
                          widget={widget}
                          onRemove={() => {}}
                          onDuplicate={() => {}}
                          isEditMode={false}
                        >
                          <DashboardWidget
                            widget={widget}
                            onRemove={() => {}}
                            showControls={false}
                          />
                        </WidgetFrame>
                      </div>
                    ))}
                  </GridLayout>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
