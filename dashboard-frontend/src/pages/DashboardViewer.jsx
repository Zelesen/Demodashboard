import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CalendarRange, RefreshCw, LayoutDashboard, Edit3, X,
  Database, Calculator, Tag, Info, Puzzle, Search, ArrowUpDown, ArrowUp, ArrowDown,
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

function DataView({ chartType, data, title, period, filters }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState("start_time");
  const [sortDir, setSortDir] = useState("desc");
  const pageSize = 50;

  useEffect(() => { setPage(1); }, [period, filters]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ period: period || "7d", page: String(page), page_size: String(pageSize), sort_by: sortKey, sort_dir: sortDir });
    if (filters?.site_id) params.set("site_id", filters.site_id);
    if (filters?.practitioner_id) params.set("practitioner_id", filters.practitioner_id);
    if (filters?.status) params.set("status", filters.status);
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch(`${API}/api/dashboard/appointments-raw?${params}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setRows(d.rows || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 0);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period, filters, page, sortKey, sortDir, debouncedSearch]);

  const columns = [
    { key: "patientName", label: "Patient", align: "left" },
    { key: "practitionerName", label: "Practitioner", align: "left" },
    { key: "siteName", label: "Site", align: "left" },
    { key: "status", label: "Status", align: "left" },
    { key: "reason", label: "Reason", align: "left" },
    { key: "startTime", label: "Date & Time", align: "left" },
    { key: "duration", label: "Duration", align: "right" },
  ];

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const statusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "cancelled") return "bg-amber-50 text-amber-700 border-amber-200";
    if (s === "dna") return "bg-rose-50 text-rose-700 border-rose-200";
    if (s === "booked" || s === "confirmed") return "bg-blue-50 text-blue-700 border-blue-200";
    if (s === "in surgery" || s === "arrived") return "bg-violet-50 text-violet-700 border-violet-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold fs-heading">{title || "Appointments"}</h3>
          <p className="text-[10px] fs-muted mt-0.5">Raw appointment records with all details</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 fs-muted" />
            <input
              type="text"
              placeholder="Search patient, practitioner, reason..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-56 pl-7 pr-2 py-1.5 text-[10px] fs-input border border-card-border/60 rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
            />
          </div>
          <span className="text-[9px] fs-muted font-medium whitespace-nowrap">{total.toLocaleString()} records</span>
        </div>
      </div>

      <div className="rounded-xl border border-card-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="fs-card-row-even border-b border-card-border/40">
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-3 py-2.5 font-bold uppercase tracking-wider fs-section-label cursor-pointer hover:opacity-80 transition-opacity select-none whitespace-nowrap ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? <ArrowUp size={9} /> : <ArrowDown size={9} />
                      ) : (
                        <ArrowUpDown size={9} className="opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-12 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                      <span className="text-[10px] fs-muted">Loading appointments...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-12 text-center fs-muted text-[11px]">
                    No appointments found
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className={`border-b border-card-border/30 last:border-b-0 transition-colors hover:bg-indigo-500/5 ${i % 2 === 0 ? "fs-card-row-even" : "fs-card-row-odd"}`}>
                    <td className="px-3 py-2.5 font-semibold fs-heading whitespace-nowrap">{row.patientName}</td>
                    <td className="px-3 py-2.5 fs-body whitespace-nowrap">{row.practitionerName}</td>
                    <td className="px-3 py-2.5 fs-body whitespace-nowrap">{row.siteName}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${statusColor(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 fs-body whitespace-nowrap">{row.reason}</td>
                    <td className="px-3 py-2.5 fs-body whitespace-nowrap">{row.startTime}</td>
                    <td className="px-3 py-2.5 text-right font-medium fs-heading whitespace-nowrap">{row.duration ? `${row.duration} min` : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[9px] fs-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 text-[9px] font-semibold fs-filter-pill border rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 text-[9px] font-semibold fs-filter-pill border rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [modalChartTab, setModalChartTab] = useState("chart");
  const [modalFilters, setModalFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({ sites: [], practitioners: [] });

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

  const { dataMap: modalDataMap, loading: modalDataLoading } = useDashboardData(modalWidgetArr, modalPeriod, modalStartDate, modalEndDate, modalFilters);

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

  useEffect(() => {
    if (fullscreenWidgetId) {
      fetch(`${API}/api/dashboard/filter-options`)
        .then(r => r.json())
        .then(d => setFilterOptions(d))
        .catch(() => {});
    }
  }, [fullscreenWidgetId]);

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
    <div className="font-sans antialiased min-h-screen">
      <style>{`
        .viewer-grid .react-resizable-handle { display: none !important; }
        .viewer-grid .react-grid-item { cursor: default !important; user-select: none !important; -webkit-user-drag: none !important; }
        .viewer-grid .react-grid-item > * { user-select: none !important; -webkit-user-drag: none !important; }
        @property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes gradientSpin { from { --angle: 0deg; } to { --angle: 360deg; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orbFloat { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.12), 0 0 60px rgba(99,102,241,0.04); } 50% { box-shadow: 0 0 30px rgba(99,102,241,0.2), 0 0 80px rgba(99,102,241,0.08); } }

        .fs-modal-card { animation: fadeSlideUp 0.4s ease-out both; }
        .fs-modal-card:nth-child(1) { animation-delay: 0.05s; }
        .fs-modal-card:nth-child(2) { animation-delay: 0.1s; }
        .fs-modal-card:nth-child(3) { animation-delay: 0.15s; }
        .fs-modal-card:nth-child(4) { animation-delay: 0.2s; }
        .fs-modal-card:nth-child(5) { animation-delay: 0.25s; }

        .fs-backdrop { background: var(--c-page); }
        .dark .fs-backdrop { background: rgba(8,12,24,0.92); backdrop-filter: blur(48px); }

        .fs-dots { background-image: radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px); }
        .dark .fs-dots { background-image: radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px); }

        .fs-orb-i { background: rgba(99,102,241,0.03); }
        .dark .fs-orb-i { background: rgba(99,102,241,0.08); }
        .fs-orb-v { background: rgba(139,92,246,0.025); }
        .dark .fs-orb-v { background: rgba(139,92,246,0.06); }
        .fs-orb-b { background: rgba(59,130,246,0.015); }
        .dark .fs-orb-b { background: rgba(59,130,246,0.04); }

        .fs-chart-surface { background: var(--c-card); }
        .dark .fs-chart-surface { background: linear-gradient(145deg, #0d1117, #0f1420, #111827); }

        .fs-filter-bar { background: var(--c-surface); border-color: var(--c-card-border); }
        .dark .fs-filter-bar { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }

        .fs-filter-pill { color: var(--c-muted); }
        .fs-filter-pill:hover { color: var(--c-heading); background: var(--c-surface-alt); }
        .dark .fs-filter-pill { color: rgba(255,255,255,0.3); }
        .dark .fs-filter-pill:hover { color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.04); }

        .fs-filter-pill-active { background: var(--c-heading); color: var(--c-card); }
        .dark .fs-filter-pill-active { background: rgba(99,102,241,0.2); color: #a5b4fc; }

        .fs-close-btn { color: var(--c-muted); }
        .fs-close-btn:hover { color: var(--c-heading); background: var(--c-surface-alt); }
        .dark .fs-close-btn { color: rgba(255,255,255,0.3); }
        .dark .fs-close-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }

        .fs-badge { background: var(--c-brand-tint); color: var(--c-brand); border-color: color-mix(in srgb, var(--c-brand) 25%, transparent); }
        .dark .fs-badge { background: rgba(99,102,241,0.15); color: #a5b4fc; border-color: rgba(99,102,241,0.2); }

        .fs-badge-v { background: var(--c-brand-tint); color: var(--c-brand); border-color: color-mix(in srgb, var(--c-brand) 25%, transparent); }
        .dark .fs-badge-v { background: rgba(139,92,246,0.15); color: #c4b5fd; border-color: rgba(139,92,246,0.2); }

        .fs-section-label { color: var(--c-muted); }
        .dark .fs-section-label { color: rgba(165,180,252,0.6); }

        .fs-card { background: var(--c-card); border-color: var(--c-card-border); }
        .dark .fs-card { background: rgba(255,255,255,0.025); border-color: rgba(255,255,255,0.06); }
        .fs-card:hover { border-color: color-mix(in srgb, var(--c-card-border) 100%, var(--c-heading) 20%); }
        .dark .fs-card:hover { border-color: rgba(255,255,255,0.1); }

        .fs-card-row-even { background: var(--c-surface); }
        .dark .fs-card-row-even { background: rgba(255,255,255,0.02); }
        .fs-card-row-odd { background: var(--c-card); }
        .dark .fs-card-row-odd { background: rgba(255,255,255,0.04); }

        .fs-api-badge { background: var(--c-brand-tint); color: var(--c-brand); }
        .dark .fs-api-badge { background: rgba(52,211,153,0.15); color: #6ee7b7; }

        .fs-api-path { color: var(--c-brand); }
        .dark .fs-api-path { color: rgba(110,231,183,0.7); }

        .fs-field-name { color: #d97706; }
        .dark .fs-field-name { color: rgba(251,191,36,0.8); }

        .fs-field-role { color: var(--c-muted); }
        .dark .fs-field-role { color: rgba(255,255,255,0.35); }

        .fs-table-pill { background: var(--c-brand-tint); color: var(--c-brand); border-color: color-mix(in srgb, var(--c-brand) 25%, transparent); }
        .dark .fs-table-pill { background: rgba(96,165,250,0.1); color: rgba(147,197,253,0.8); border-color: rgba(96,165,250,0.2); }

        .fs-code-block { background: var(--c-surface); color: var(--c-body); border-color: var(--c-card-border); }
        .dark .fs-code-block { background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5); border-color: rgba(255,255,255,0.05); }

        .fs-info-block { background: var(--c-surface); color: var(--c-body); border-color: var(--c-card-border); }
        .dark .fs-info-block { background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.45); border-color: rgba(255,255,255,0.05); }

        .fs-heading { color: var(--c-heading); }
        .fs-body { color: var(--c-body); }
        .fs-muted { color: var(--c-muted); }
        .dark .fs-heading { color: #fff; }
        .dark .fs-body { color: rgba(255,255,255,0.6); }
        .dark .fs-muted { color: rgba(255,255,255,0.3); }

        .fs-input { background: var(--c-surface); color: var(--c-heading); border-color: var(--c-card-border); }
        .dark .fs-input { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.08); }

        .fs-dot-indicator-i { background: var(--c-brand); }
        .dark .fs-dot-indicator-i { background: rgba(165,180,252,0.6); }
        .fs-dot-indicator-a { background: #f59e0b; }
        .dark .fs-dot-indicator-a { background: rgba(251,191,36,0.6); }
        .fs-dot-indicator-b { background: var(--c-brand); }
        .dark .fs-dot-indicator-b { background: rgba(96,165,250,0.6); }
        .fs-dot-indicator-v { background: #8b5cf6; }
        .dark .fs-dot-indicator-v { background: rgba(196,181,253,0.6); }
        .fs-dot-indicator-s { background: #0ea5e9; }
        .dark .fs-dot-indicator-s { background: rgba(56,189,248,0.6); }
      `}</style>
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
                            onFullscreen={() => { setFullscreenWidgetId(widget.i); setModalFilter("Last 7 days"); setModalCustomStart(""); setModalCustomEnd(""); setModalChartTab("chart"); setModalFilters({}); }}
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
          className="fixed inset-0 z-50"
          onClick={() => setFullscreenWidgetId(null)}
        >
          <div className="absolute inset-0 fs-backdrop" />
          <div
            className="absolute inset-0 fs-dots"
            style={{ backgroundSize: "28px 28px" }}
          />

          <div className="absolute top-16 -left-40 w-[500px] h-[500px] fs-orb-i rounded-full blur-[140px] pointer-events-none" style={{ animation: "orbFloat 8s ease-in-out infinite" }} />
          <div className="absolute bottom-16 -right-40 w-[400px] h-[400px] fs-orb-v rounded-full blur-[120px] pointer-events-none" style={{ animation: "orbFloat 10s ease-in-out infinite 2s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] fs-orb-b rounded-full blur-[160px] pointer-events-none" />

          <div
            className="relative h-full flex flex-col"
            style={{ animation: "modalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative shrink-0">
              <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {modalMeta?.icon && (
                    <div className="relative shrink-0">
                      <div
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 flex items-center justify-center"
                        style={{ animation: "pulseGlow 3s ease-in-out infinite" }}
                      >
                        <modalMeta.icon size={18} className="text-white drop-shadow-sm" />
                      </div>
                      <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 opacity-20 blur-md -z-10" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold fs-heading truncate drop-shadow-sm">{modalMeta?.title || modalWidgetData.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest fs-badge border">
                        {modalMeta?.section || "Appointments"}
                      </span>
                      {modalMeta?.type && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest fs-badge-v border">
                          {modalMeta.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="hidden sm:flex items-center gap-0.5 fs-filter-bar border rounded-lg p-0.5">
                    {availableFilters.map(f => (
                      <button
                        key={f}
                        onClick={() => setModalFilter(f)}
                        className={`px-2.5 h-7 text-[10px] font-semibold tracking-tight rounded-md transition-all duration-200 ${
                          modalFilter === f
                            ? "fs-filter-pill-active shadow-sm"
                            : "fs-filter-pill"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                    {modalFilter === "Custom" && (
                      <div className="flex items-center gap-1 px-1.5">
                        <input type="date" value={modalCustomStart} onChange={e => setModalCustomStart(e.target.value)} className="px-1.5 py-0.5 text-[9px] fs-input border rounded focus:outline-none focus:ring-1 focus:ring-indigo-400/50" />
                        <span className="text-[9px] fs-muted">–</span>
                        <input type="date" value={modalCustomEnd} onChange={e => setModalCustomEnd(e.target.value)} className="px-1.5 py-0.5 text-[9px] fs-input border rounded focus:outline-none focus:ring-1 focus:ring-indigo-400/50" />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setFullscreenWidgetId(null)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center fs-close-btn border border-transparent transition-all duration-200 group/close"
                    title="Close"
                  >
                    <X size={17} className="group-hover/close:rotate-90 transition-transform duration-300" />
                  </button>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-px">
                <div className="h-full bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-violet-400/15 to-transparent blur-sm" />
              </div>
            </div>

            <div className="sm:hidden px-5 pb-2 shrink-0">
              <div className="flex items-center gap-0.5 fs-filter-bar border rounded-lg p-0.5 overflow-x-auto">
                {availableFilters.map(f => (
                  <button
                    key={f}
                    onClick={() => setModalFilter(f)}
                    className={`px-2.5 h-7 text-[10px] font-semibold tracking-tight rounded-md whitespace-nowrap transition-all duration-200 ${
                      modalFilter === f
                        ? "fs-filter-pill-active shadow-sm"
                        : "fs-filter-pill"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {modalDataLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                      <div className="absolute inset-0 w-10 h-10 border-2 border-violet-400/10 border-b-violet-400 rounded-full animate-spin" style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />
                    </div>
                    <span className="text-xs fs-muted font-medium tracking-wide">Loading data...</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 lg:p-5">
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 h-full">
                    <div className={`flex-1 min-w-0 ${modalMeta?.type === "metric" ? "lg:max-w-[45%]" : ""}`}>
                      <div className="relative group/chart rounded-2xl overflow-hidden" style={{ animation: "pulseGlow 4s ease-in-out infinite" }}>
                        <div
                          className="absolute -inset-px rounded-2xl opacity-25 group-hover/chart:opacity-50 transition-opacity duration-700"
                          style={{
                            background: "conic-gradient(from var(--angle), #6366f1, #8b5cf6, #a855f7, #6366f1)",
                            animation: "gradientSpin 6s linear infinite",
                          }}
                        />
                        <div className="absolute -inset-1 rounded-2xl bg-indigo-500/10 blur-xl opacity-0 group-hover/chart:opacity-100 transition-opacity duration-700" />

                        <div className="relative rounded-2xl p-[1px] fs-chart-surface">
                          <div className="relative rounded-[15px] fs-chart-surface overflow-hidden">
                            <div className="absolute top-3 left-3 z-10">
                              <div className="flex items-center gap-0.5 fs-filter-bar border rounded-lg p-0.5 backdrop-blur-sm">
                                <button
                                  onClick={() => setModalChartTab("chart")}
                                  className={`px-2.5 h-6 text-[9px] font-semibold tracking-tight rounded-md transition-all duration-200 ${
                                    modalChartTab === "chart"
                                      ? "fs-filter-pill-active shadow-sm"
                                      : "fs-filter-pill"
                                  }`}
                                >
                                  Chart View
                                </button>
                                <button
                                  onClick={() => setModalChartTab("data")}
                                  className={`px-2.5 h-6 text-[9px] font-semibold tracking-tight rounded-md transition-all duration-200 ${
                                    modalChartTab === "data"
                                      ? "fs-filter-pill-active shadow-sm"
                                      : "fs-filter-pill"
                                  }`}
                                >
                                  Data View
                                </button>
                              </div>
                            </div>

                            {(() => {
                              const chartType = modalWidgetData.chartType;
                              const FILTER_META_LOCAL = {
                                site:          { key: "site_id",          label: "All Sites",          optKey: "sites" },
                                practitioner:  { key: "practitioner_id",  label: "All Practitioners",  optKey: "practitioners" },
                                status:        { key: "status",           label: "All Statuses",       optKey: "statuses" },
                                type:          { key: "appointment_type", label: "All Types",          optKey: "appointment_types" },
                              };
                              const FILTER_KEYS = {
                                totalAppointments:          ["site", "practitioner", "status", "type"],
                                completedAppointments:      ["site", "practitioner", "status", "type"],
                                cancelledAppointments:      ["site", "practitioner", "status", "type"],
                                dnaRate:                    ["site", "practitioner"],
                                dnaCount:                   ["site", "practitioner"],
                                avgDuration:                ["site", "practitioner", "type"],
                                dailyAppointmentVolume:     ["site", "practitioner", "status", "type"],
                                appointmentsByReason:       ["site", "practitioner", "status"],
                                appointmentsByHour:         ["site", "practitioner", "status", "type"],
                                appointmentsByDay:          ["site", "practitioner", "status", "type"],
                                cancelledByDay:             ["site", "practitioner"],
                                appointmentLifecycle:       ["site", "practitioner", "status", "type"],
                                appointmentDuration:        ["site", "practitioner", "type"],
                                weeklyActivityHeatmap:      ["site", "practitioner", "status", "type"],
                                practitionerWorkload:       ["site"],
                                practitionerCompletionRate: ["site"],
                                outcomeBreakdown:           ["site", "practitioner", "status", "type"],
                              };
                              const activeKeys = FILTER_KEYS[chartType] || [];
                              if (!activeKeys.length || !filterOptions) return null;
                              return (
                                <div className="absolute top-10 left-3 right-3 z-10">
                                  <div className="flex items-center gap-1.5 px-2 py-1.5 fs-filter-bar border rounded-lg backdrop-blur-sm flex-wrap">
                                    <span className="text-[8px] font-bold uppercase tracking-wider fs-muted shrink-0">Filters</span>
                                    {activeKeys.map((fk) => {
                                      const meta = FILTER_META_LOCAL[fk];
                                      if (!meta) return null;
                                      const opts = filterOptions[meta.optKey] || [];
                                      const value = modalFilters?.[meta.key] || "";
                                      return (
                                        <div key={fk} className="relative min-w-[100px] max-w-[170px] flex-1">
                                          <select
                                            className="w-full px-2 py-1 text-[9px] font-medium bg-white/80 border border-gray-200/60 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400/40 appearance-none truncate cursor-pointer"
                                            value={value}
                                            onChange={(e) => setModalFilters({ ...modalFilters, [meta.key]: e.target.value || undefined })}
                                          >
                                            <option value="">{meta.label}</option>
                                            {opts.map((o) => (
                                              <option key={typeof o === "string" ? o : o.id} value={typeof o === "string" ? o : o.id}>
                                                {typeof o === "string" ? o : o.name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {modalChartTab === "chart" ? (
                              modalMeta?.type === "metric" ? (
                                <div className="p-5 pt-10 min-h-[340px]">
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
                                </div>
                              ) : (
                                <div className="pt-20">
                                  <EnhancedWidgetChart
                                    chartType={modalWidgetData.chartType}
                                    data={modalWidgetData.data}
                                    height={480}
                                    filters={modalFilters}
                                    onFilterChange={setModalFilters}
                                    filterOptions={filterOptions}
                                    hideFilters
                                  />
                                </div>
                              )
                            ) : (
                              <div className="p-5 pt-20 min-h-[480px]">
                                <DataView chartType={modalWidgetData.chartType} data={modalWidgetData.data} title={modalWidgetData.title} period={modalPeriod} filters={modalFilters} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`lg:w-[340px] shrink-0 space-y-3 ${modalMeta?.type === "metric" ? "lg:w-full" : ""}`}>
                      {modalMeta?.api && (
                        <div className="fs-modal-card rounded-xl fs-card border p-4 transition-colors duration-300">
                          <h4 className="text-[9px] font-bold fs-section-label uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full fs-dot-indicator-i" />
                            <Database size={10} className="fs-section-label" />
                            Dentally API Source
                          </h4>
                          <div className="space-y-1.5">
                            {modalMeta.api.split(",").map((ep, i) => (
                              <div key={i} className="flex items-center gap-2 fs-card-row-even rounded-lg px-3 py-2 border border-card-border/40 hover:border-card-border transition-colors">
                                <span className="text-[7px] font-bold px-1.5 py-0.5 fs-api-badge rounded uppercase tracking-widest">GET</span>
                                <span className="fs-api-path text-[10px] font-mono truncate">{ep.trim().replace("https://api.dentally.co", "")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {modalMeta?.api_fields && modalMeta.api_fields.length > 0 && (
                        <div className="fs-modal-card rounded-xl fs-card border p-4 transition-colors duration-300">
                          <h4 className="text-[9px] font-bold fs-section-label uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full fs-dot-indicator-a" />
                            <Tag size={10} className="fs-section-label" />
                            Response Fields Used
                          </h4>
                          <div className="rounded-lg overflow-hidden border border-card-border/40">
                            {modalMeta.api_fields.map((f, i) => (
                              <div key={i} className={`flex items-start gap-2 px-3 py-2 ${i % 2 === 0 ? "fs-card-row-even" : "fs-card-row-odd"}`}>
                                <span className="font-mono fs-field-name text-[10px] whitespace-nowrap shrink-0 pt-px">{f.field}</span>
                                <span className="fs-field-role text-[9px] leading-relaxed">{f.role}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-[8px] fs-muted mt-1.5 text-right italic">via developer.dentally.co</div>
                        </div>
                      )}

                      {modalMeta?.database_tables && (
                        <div className="fs-modal-card rounded-xl fs-card border p-4 transition-colors duration-300">
                          <h4 className="text-[9px] font-bold fs-section-label uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full fs-dot-indicator-b" />
                            <Database size={10} className="fs-section-label" />
                            Database Tables
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {modalMeta.database_tables.split(",").map((t, i) => (
                              <span key={i} className="text-[10px] font-mono fs-table-pill px-2 py-0.5 rounded-md transition-colors">{t.trim()}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {modalMeta?.calculations && (
                        <div className="fs-modal-card rounded-xl fs-card border p-4 transition-colors duration-300">
                          <h4 className="text-[9px] font-bold fs-section-label uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full fs-dot-indicator-v" />
                            <Calculator size={10} className="fs-section-label" />
                            Calculations
                          </h4>
                          <p className="text-[10px] fs-body leading-relaxed fs-code-block rounded-lg px-3 py-2.5 font-mono">{modalMeta.calculations}</p>
                        </div>
                      )}

                      {modalMeta?.description && (
                        <div className="fs-modal-card rounded-xl fs-card border p-4 transition-colors duration-300">
                          <h4 className="text-[9px] font-bold fs-section-label uppercase tracking-[0.15em] mb-2.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full fs-dot-indicator-s" />
                            <Info size={10} className="fs-section-label" />
                            Additional Info
                          </h4>
                          <p className="text-[10px] fs-body leading-relaxed fs-info-block rounded-lg px-3 py-2.5">{modalMeta.description}</p>
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
