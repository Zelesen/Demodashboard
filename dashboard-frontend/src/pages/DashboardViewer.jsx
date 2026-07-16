import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CalendarRange, RefreshCw, LayoutDashboard, Edit3, X,
  Database, Calculator, Tag, Info, Puzzle,
  Calendar, CheckCircle2, XCircle, AlertTriangle, Clock, AlertCircle,
  Building2, Users, TrendingUp, List, UserCheck, Activity, Grid3x3, BarChart3,
} from "lucide-react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import DashboardWidget from "../components/DashboardWidget";
import WidgetFrame from "../components/dashboard/WidgetFrame";
import useDashboardData from "../hooks/useDashboardData";
import { renderAppointmentWidget, AppointmentMetricCard } from "../components/dashboard/WidgetRenderer";
import EnhancedWidgetChart from "../components/dashboard/EnhancedWidgetChart";
import { metricCards, sections } from "../components/dashboard/widgetDefinitions";

const API = "http://localhost:8000";
const ROW_HEIGHT = 100;
const COLS = 12;

const PERIOD_MAP = {
  "Today": "today",
  "Last 7 days": "7d",
  "Last 30 days": "30d",
  "Last 90 days": "90d",
  "Last year": "1y",
  "Custom": "all",
};

const ICON_MAP = {
  Calendar, CheckCircle2, XCircle, AlertTriangle, Clock, AlertCircle,
  Building2, Users, TrendingUp, List, CalendarRange, UserCheck,
  Activity, Grid3x3, BarChart3, Puzzle,
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
  const [cooldownSecs, setCooldownSecs] = useState(() => {
    const stored = sessionStorage.getItem("dashboard_refresh_cooldown");
    if (!stored) return 0;
    const until = parseInt(stored, 10);
    if (Date.now() >= until) {
      sessionStorage.removeItem("dashboard_refresh_cooldown");
      return 0;
    }
    return Math.floor((until - Date.now()) / 1000);
  });
  const containerRef = useRef(null);
  const [fullscreenWidgetId, setFullscreenWidgetId] = useState(null);
  const [modalFilter, setModalFilter] = useState("Last 7 days");
  const [modalCustomStart, setModalCustomStart] = useState("");
  const [modalCustomEnd, setModalCustomEnd] = useState("");

  const period = activeFilter === "Custom" ? "all" : PERIOD_MAP[activeFilter];
  const startDate = activeFilter === "Custom" ? customStartDate : null;
  const endDate = activeFilter === "Custom" ? customEndDate : null;

  const { dataMap, loading: dataLoading } = useDashboardData(widgets, period, startDate, endDate);
  const widgetsWithData = widgets.map(w => ({ ...w, data: dataMap[w.i] || w.data }));

  const modalPeriod = modalFilter === "Custom" ? "all" : PERIOD_MAP[modalFilter];
  const modalStartDate = modalFilter === "Custom" ? modalCustomStart : null;
  const modalEndDate = modalFilter === "Custom" ? modalCustomEnd : null;

  const fullscreenWidget = fullscreenWidgetId ? widgetsWithData.find(w => w.i === fullscreenWidgetId) : null;

  const modalWidgetArr = useMemo(() => {
    if (!fullscreenWidget) return [];
    return [{ i: "modal_main", chartType: fullscreenWidget.chartType }];
  }, [fullscreenWidgetId, fullscreenWidget?.chartType]);

  const { dataMap: modalDataMap, loading: modalDataLoading } = useDashboardData(modalWidgetArr, modalPeriod, modalStartDate, modalEndDate);

  const [widgetMeta, setWidgetMeta] = useState([]);
  const [availableFilters, setAvailableFilters] = useState([]);
  useEffect(() => {
    fetch(`${API}/api/widgets`)
      .then(r => r.json())
      .then(d => {
        setWidgetMeta(d.widgets || []);
        // Extract available filters from widget metadata if provided
        if (d.filters && Array.isArray(d.filters)) {
          setAvailableFilters(d.filters);
        } else {
          // Fallback to default filters
          setAvailableFilters(["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last year", "Custom"]);
        }
      })
      .catch(() => {
        setWidgetMeta([]);
        setAvailableFilters(["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last year", "Custom"]);
      });
  }, []);

  const modalWidgetData = fullscreenWidget ? {
    ...fullscreenWidget,
    i: "modal_main",
    data: modalDataMap["modal_main"] || fullscreenWidget.data,
  } : null;

  const modalMeta = useMemo(() => {
    if (!modalWidgetData) return null;
    const dbMatch = widgetMeta.find(m => m.chart_type === modalWidgetData.chartType);
    const allDefs = [...metricCards.flatMap(m => [m]), ...sections.flatMap(s => s.items)];
    const feMatch = allDefs.find(d => d.chartType === modalWidgetData.chartType);
    if (!dbMatch && !feMatch) return null;
    const source = dbMatch || {};
    let parsedFields = source.api_fields;
    if (typeof parsedFields === "string") { try { parsedFields = JSON.parse(parsedFields); } catch { parsedFields = null; } }
    const iconName = source.icon;
    const IconComp = iconName && ICON_MAP[iconName] ? ICON_MAP[iconName] : (feMatch?.icon || null);
    return {
      title: source.title || feMatch?.title || modalWidgetData.title,
      icon: IconComp,
      type: source.type || feMatch?.type || "chart",
      section: source.section || "Appointments",
      api: source.api || null,
      description: source.description || null,
      calculations: source.calculations || null,
      database_tables: source.database_tables || null,
      api_fields: parsedFields || null,
      value: feMatch?.value, change: feMatch?.change, positive: feMatch?.positive, footer: feMatch?.footer,
    };
  }, [modalWidgetData, widgetMeta]);

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
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/15 via-surface-alt/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-5 space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboards")}
              className="group p-2 text-muted hover:text-heading bg-card border border-card-border rounded-xl transition-all shadow-sm hover:shadow"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="h-6 w-px bg-surface-alt" />
            <div>
              <h1 className="text-lg font-bold text-heading tracking-tight leading-none">
                {dashboardTitle}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {dashboardDescription && (
                  <p className="text-xs text-muted font-medium max-w-lg truncate">
                    {dashboardDescription}
                  </p>
                )}
                <span className="text-[10px] text-muted font-medium flex items-center gap-1">
                  <CalendarRange size={10} />
                  {dateLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/dashboard/${id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3 h-[32px] bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 rounded-xl text-[10px] font-bold shadow-sm transition-all"
            >
              <Edit3 size={11} />
              Edit Dashboard
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || cooldownSecs > 0}
              className="inline-flex items-center gap-1.5 px-3 h-[32px] bg-card border border-card-border/80 hover:border-card-border rounded-xl text-[10px] font-semibold text-body hover:text-heading hover:shadow-sm active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              <RefreshCw
                size={11}
                className={`transition-transform duration-700 ease-out ${isRefreshing ? "rotate-180 text-blue-500" : "text-muted"}`}
              />
              {isRefreshing ? "Syncing..." : cooldownSecs > 0 ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, "0")} left` : "Refresh"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-card border border-card-border/60 rounded-lg p-0.5 w-fit shadow-sm sticky top-16 z-30">
          {availableFilters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-2.5 h-7 text-[10px] font-semibold tracking-tight rounded-md transition-all duration-200 ${
                activeFilter === f
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-muted hover:text-heading hover:bg-surface"
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
                className="px-2 py-1 text-[10px] border border-card-border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <span className="text-[10px] text-muted">–</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2 py-1 text-[10px] border border-card-border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
              <p className="text-sm text-muted font-medium">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <div>
            <div
              ref={containerRef}
              className="relative rounded-2xl border border-card-border/60 shadow-sm overflow-hidden bg-card"
              style={{ minHeight: `${canvasHeight}px` }}
            >
              <div className="relative z-10 w-full h-full">
                {widgetsWithData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[500px]">
                    <div className="text-center max-w-sm p-6 rounded-2xl border border-card-border bg-card shadow-xl shadow-card-border/60">
                      <div className="w-11 h-11 bg-surface border border-card-border rounded-xl flex items-center justify-center mx-auto mb-3.5 text-muted">
                        <LayoutDashboard size={18} strokeWidth={2} />
                      </div>
                      <h3 className="text-sm font-bold text-heading tracking-tight mb-1">Empty Dashboard</h3>
                      <p className="text-xs text-muted leading-relaxed px-2">This dashboard has no widgets yet.</p>
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
                            showControls={true}
                            onFullscreen={() => { setFullscreenWidgetId(widget.i); setModalFilter("Last 7 days"); setModalCustomStart(""); setModalCustomEnd(""); }}
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

      {modalWidgetData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setFullscreenWidgetId(null)}
        >
          <div
            className="relative bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ width: "100vw", height: "100vh", maxWidth: "100vw", maxHeight: "100vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-card-border shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {modalMeta?.icon && (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
                    <modalMeta.icon size={16} className="text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-heading truncate">{modalMeta?.title || modalWidgetData.title}</h2>
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{modalMeta?.section || "Appointments"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-0.5 bg-card border border-card-border/60 rounded-md p-0.5">
                  {availableFilters.map(f => (
                    <button
                      key={f}
                      onClick={() => setModalFilter(f)}
                      className={`px-2 h-6 text-[9px] font-semibold tracking-tight rounded transition-all duration-200 ${
                        modalFilter === f
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-muted hover:text-heading hover:bg-surface"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                  {modalFilter === "Custom" && (
                    <div className="flex items-center gap-1 px-1.5">
                      <input type="date" value={modalCustomStart} onChange={e => setModalCustomStart(e.target.value)} className="px-1.5 py-0.5 text-[9px] border border-card-border rounded focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                      <span className="text-[9px] text-muted">–</span>
                      <input type="date" value={modalCustomEnd} onChange={e => setModalCustomEnd(e.target.value)} className="px-1.5 py-0.5 text-[9px] border border-card-border rounded focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                    </div>
                  )}
                </div>
                <button onClick={() => setFullscreenWidgetId(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-body hover:bg-surface-alt transition-all">
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {modalDataLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className={`rounded-xl border border-card-border bg-surface/50 p-3 ${modalMeta?.type === "metric" ? "lg:col-span-1" : "lg:col-span-2"}`}>
                      <div className={`w-full ${modalMeta?.type === "metric" ? "h-[160px]" : "h-[340px]"}`}>
                        {modalMeta?.type === "metric" ? (
                          <AppointmentMetricCard
                            title={modalWidgetData.title}
                            value={(() => {
                              const d = modalWidgetData.data;
                              if (!d) return modalMeta.value;
                              switch (modalWidgetData.chartType) {
                                case "totalAppointments": return String(d.totalAppointments ?? modalMeta.value);
                                case "completedAppointments": return String(d.completedAppointments ?? modalMeta.value);
                                case "cancelledAppointments": return String(d.cancelledAppointments ?? modalMeta.value);
                                case "dnaRate": return `${d.dnaRate ?? modalMeta.value}%`;
                                case "avgDuration": return `${d.avgDuration ?? modalMeta.value} min`;
                                case "dnaCount": return String(d.dnaCount ?? modalMeta.value);
                                default: return modalMeta.value;
                              }
                            })()}
                            change={modalMeta.change}
                            positive={modalMeta.positive}
                            footer={modalMeta.footer}
                            icon={modalMeta.icon}
                          />
                        ) : (
                          <EnhancedWidgetChart
                            chartType={modalWidgetData.chartType}
                            data={modalWidgetData.data}
                          />
                        )}
                      </div>
                    </div>

                    <div className={`space-y-4 ${modalMeta?.type === "metric" ? "lg:col-span-2" : "lg:col-span-1"}`}>
                      {modalMeta?.api && (
                        <div>
                          <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Database size={11} /> Dentally API Source
                          </h4>
                          <div className="space-y-1.5">
                            {modalMeta.api.split(",").map((ep, i) => (
                              <div key={i} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                                <span className="text-[8px] font-bold px-1.5 py-0.5 bg-indigo-600/30 text-indigo-300 rounded uppercase tracking-wider">GET</span>
                                <span className="text-indigo-200 text-[11px] font-mono">{ep.trim().replace("https://api.dentally.co", "")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {modalMeta?.api_fields && modalMeta.api_fields.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Tag size={11} /> Response Fields Used
                          </h4>
                          <div className="rounded-lg overflow-hidden border border-card-border">
                            {modalMeta.api_fields.map((f, i) => (
                              <div key={i} className={`flex items-start gap-2 px-3 py-2 ${i % 2 === 0 ? "bg-surface" : "bg-card"}`}>
                                <span className="font-mono text-amber-600 text-[11px] whitespace-nowrap shrink-0 pt-px">{f.field}</span>
                                <span className="text-muted text-[10px] leading-relaxed">{f.role}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-[9px] text-muted mt-1 text-right">via developer.dentally.co</div>
                        </div>
                      )}

                      {modalMeta?.database_tables && (
                        <div>
                          <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Database size={11} /> Database Tables
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {modalMeta.database_tables.split(",").map((t, i) => (
                              <span key={i} className="text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">{t.trim()}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {modalMeta?.calculations && (
                        <div>
                          <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Calculator size={11} /> Calculations
                          </h4>
                          <p className="text-[11px] text-body leading-relaxed bg-surface rounded-lg border border-card-border px-3 py-2">{modalMeta.calculations}</p>
                        </div>
                      )}

                      {modalMeta?.description && (
                        <div>
                          <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Info size={11} /> Additional Info
                          </h4>
                          <p className="text-[11px] text-body leading-relaxed bg-surface rounded-lg border border-card-border px-3 py-2">{modalMeta.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
