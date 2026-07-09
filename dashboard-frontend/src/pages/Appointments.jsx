import { useState, useEffect, useRef, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import { RefreshCw, Calendar, Clock, Users, CheckCircle2, XCircle, AlertTriangle, AlertCircle, UserCheck, Building2, TrendingUp, ArrowRight, CalendarRange, Activity, PieChart, List, BarChart3, Grid3x3 } from 'lucide-react';
import InfoIcon from '../components/InfoIcon';

// ==================== state DOT ====================
function stateDot({ state }) {
  const dotMap = {
    Completed: "bg-emerald-500",
    Cancelled: "bg-red-400",
    DNA: "bg-orange-400",
    Pending: "bg-slate-300",
    Confirmed: "bg-blue-400",
    "In Surgery": "bg-purple-400",
    Arrived: "bg-teal-400",
  };
  const dotClass = dotMap[state] || "bg-slate-300";
  return <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />;
}

// ==================== TIME TAG ====================
function TimeTag({ dateStr }) {
  if (!dateStr) return <span className="text-slate-300 text-[10px]">—</span>;
  return <span className="text-[10px] font-medium text-slate-400">{dateStr}</span>;
}

// ==================== ACTIVITY FEED ====================
function ActivityFeed({ appointments }) {
  if (!appointments || !appointments.appointments || appointments.appointments.length === 0) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-start gap-3 p-3">
            <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-200 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-2.5 w-36 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getColor = (state) => {
    switch(state) {
      case "Completed": return "border-emerald-400 bg-emerald-50";
      case "Cancelled": return "border-red-300 bg-red-50";
      case "DNA": return "border-orange-300 bg-orange-50";
      default: return "border-slate-300 bg-slate-50";
    }
  };

  const getDotColor = (state) => {
    switch(state) {
      case "Completed": return "bg-emerald-500";
      case "Cancelled": return "bg-red-400";
      case "DNA": return "bg-orange-400";
      default: return "bg-slate-300";
    }
  };

  return (
    <div className="space-y-1">
      {appointments.appointments.slice(0, 8).map((item, index) => {
        const firstCol = index === 0;
        return (
          <div key={item.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors rounded-lg group">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full border-2 ${getDotColor(item.state)} ${firstCol ? 'ring-2 ring-offset-1 ring-emerald-200' : ''}`} />
              {index < Math.min(appointments.appointments.length, 8) - 1 && (
                <div className="w-0.5 h-full bg-slate-100 group-hover:bg-slate-200 transition-colors mt-0.5" style={{ minHeight: '16px' }} />
              )}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 pb-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-slate-800 truncate">{item.patientName}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                  item.state === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                  item.state === 'Cancelled' ? 'bg-red-50 text-red-600' :
                  item.state === 'DNA' ? 'bg-orange-50 text-orange-700' :
                  'bg-slate-100 text-slate-500'
                }`}>{item.state}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                <span>{item.practitionerName}</span>
                <span className="w-px h-2.5 bg-slate-200" />
                <span>{item.reason}</span>
                {item.duration && (
                  <>
                    <span className="w-px h-2.5 bg-slate-200" />
                    <span>{item.duration} min</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== SPARKLINE HELPER ====================
function sparklinePath(values, width = 80, height = 32) {
  const valid = values?.filter(v => v != null && !isNaN(v));
  if (!valid || valid.length < 2) return null;
  const pts = valid.slice(-40);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const stepX = width / (pts.length - 1);
  const pad = 2;
  const coords = pts.map((v, i) => ({
    x: i * stepX,
    y: height - pad - ((v - min) / range) * (height - 2 * pad)
  }));
  const line = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const fill = line + `L${coords[coords.length - 1].x} ${height} L${coords[0].x} ${height} Z`;
  return { line, fill };
}

// ==================== MAIN PAGE ====================
export default function Appointments() {
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(() => {
    const stored = sessionStorage.getItem('appointments_refresh_cooldown');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [cooldownSecs, setCooldownSecs] = useState(0);

  useEffect(() => {
    if (refreshCooldownUntil <= Date.now()) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((refreshCooldownUntil - Date.now()) / 1000));
      setCooldownSecs(remaining);
      if (remaining <= 0) setRefreshCooldownUntil(0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [refreshCooldownUntil]);
  const [kpiData, setKpiData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [siteData, setSiteData] = useState(null);
  const [practitionerData, setPractitionerData] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState(null);
  const [reasonData, setReasonData] = useState(null);
  const [hourData, setHourData] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [cancelByDay, setCancelByDay] = useState(null);
  const [lifecycleData, setLifecycleData] = useState(null);
  const [durationData, setDurationData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const dataCache = useRef(new Map());
  const isMounted = useRef(false);
  const allPeriods = ['today', '7d', '30d', '90d', '1y', 'all'];

  const getPeriodParam = () => {
    const map = { "Today": "today", "Last 7 days": "7d", "Last 30 days": "30d", "Last 90 days": "90d", "Last year": "1y", "All time": "all" };
    return map[activeFilter] || "7d";
  };

  const fetchDataForPeriod = async (period) => {
    try {
      const baseUrl = 'https://demodashboard-production.up.railway.app/api/dashboard';
      const [kpiRes, trendRes, siteRes, pracRes, recentRes, reasonRes, hourRes, dayRes, ctRes, lcRes, durRes, hmRes] = await Promise.all([
        fetch(`${baseUrl}/appointments-kpis?period=${period}`),
        fetch(`${baseUrl}/appointments-trend?period=${period}`),
        fetch(`${baseUrl}/appointments-by-site?period=${period}`),
        fetch(`${baseUrl}/appointments-by-practitioner?period=${period}`),
        fetch(`${baseUrl}/recent-appointments?period=${period}&limit=10`),
        fetch(`${baseUrl}/appointments-by-reason?period=${period}`),
        fetch(`${baseUrl}/appointments-by-hour?period=${period}`),
        fetch(`${baseUrl}/appointments-by-day?period=${period}`),
        fetch(`${baseUrl}/appointments-cancellation-by-day?period=${period}`),
        fetch(`${baseUrl}/appointments-lifecycle?period=${period}`),
        fetch(`${baseUrl}/appointments-duration?period=${period}`),
        fetch(`${baseUrl}/appointments-heatmap?period=${period}`)
      ]);
      return {
        kpiData: await kpiRes.json(),
        trendData: await trendRes.json(),
        siteData: await siteRes.json(),
        practitionerData: await pracRes.json(),
        recentAppointments: await recentRes.json(),
        reasonData: await reasonRes.json(),
        hourData: await hourRes.json(),
        dayData: await dayRes.json(),
        cancelByDay: await ctRes.json(),
        lifecycleData: await lcRes.json(),
        durationData: await durRes.json(),
        heatmapData: await hmRes.json(),
      };
    } catch (error) {
      console.error('Error fetching appointment data:', error);
      return null;
    }
  };

  const applyCachedData = useCallback((period) => {
    const cached = dataCache.current.get(period);
    if (!cached) return;
    setKpiData(cached.kpiData);
    setTrendData(cached.trendData);
    setSiteData(cached.siteData);
    setPractitionerData(cached.practitionerData);
    setRecentAppointments(cached.recentAppointments);
    setReasonData(cached.reasonData);
    setHourData(cached.hourData);
    setDayData(cached.dayData);
    setCancelByDay(cached.cancelByDay);
    setLifecycleData(cached.lifecycleData);
    setDurationData(cached.durationData);
    setHeatmapData(cached.heatmapData);
  }, []);

  const fetchCustomData = async (startDate, endDate) => {
    try {
      const baseUrl = 'https://demodashboard-production.up.railway.app/api/dashboard';
      const [kpiRes, trendRes, siteRes, pracRes, recentRes, reasonRes, hourRes, dayRes, ctRes, lcRes, durRes, hmRes] = await Promise.all([
        fetch(`${baseUrl}/appointments-kpis?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/appointments-trend?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/appointments-by-site?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/appointments-by-practitioner?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/recent-appointments?period=all&start_date=${startDate}&end_date=${endDate}&limit=10`),
        fetch(`${baseUrl}/appointments-by-reason?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/appointments-by-hour?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/appointments-by-day?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/appointments-cancellation-by-day?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/appointments-lifecycle?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/appointments-duration?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/appointments-heatmap?period=all&start_date=${startDate}&end_date=${endDate}`)
      ]);
      return {
        kpiData: await kpiRes.json(),
        trendData: await trendRes.json(),
        siteData: await siteRes.json(),
        practitionerData: await pracRes.json(),
        recentAppointments: await recentRes.json(),
        reasonData: await reasonRes.json(),
        hourData: await hourRes.json(),
        dayData: await dayRes.json(),
        cancelByDay: await ctRes.json(),
        lifecycleData: await lcRes.json(),
        durationData: await durRes.json(),
        heatmapData: await hmRes.json(),
      };
    } catch (error) {
      console.error('Error fetching custom data:', error);
      return null;
    }
  };

  useEffect(() => {
    const preFetchAll = async () => {
      const fetches = allPeriods.map(async (period) => {
        const data = await fetchDataForPeriod(period);
        if (data) dataCache.current.set(period, data);
      });
      await Promise.all(fetches);
      applyCachedData(getPeriodParam());
      setLoading(false);
      isMounted.current = true;
    };
    preFetchAll();
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      const customKey = `custom_${customStartDate}_${customEndDate}`;
      if (!dataCache.current.has(customKey)) {
        fetchCustomData(customStartDate, customEndDate).then(data => {
          if (data) {
            dataCache.current.set(customKey, data);
            applyCachedData(customKey);
          }
        });
      } else {
        applyCachedData(customKey);
      }
    } else {
      applyCachedData(getPeriodParam());
    }
  }, [activeFilter, customStartDate, customEndDate, applyCachedData]);

  const filters = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last year", "All time", "Custom"];

  const refreshPageCache = async () => {
    try {
      await fetch('https://demodashboard-production.up.railway.app/api/admin/cache/refresh-page?page=appointments', { method: 'POST' });
    } catch (e) {
      console.error('Page cache refresh error:', e);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPageCache();
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      const data = await fetchCustomData(customStartDate, customEndDate);
      if (data) {
        const customKey = `custom_${customStartDate}_${customEndDate}`;
        dataCache.current.set(customKey, data);
        applyCachedData(customKey);
      }
    } else {
      const fetches = allPeriods.map(async (period) => {
        const data = await fetchDataForPeriod(period);
        if (data) dataCache.current.set(period, data);
      });
      await Promise.all(fetches);
      applyCachedData(getPeriodParam());
    }
    const cooldownUntil = Date.now() + 5 * 60 * 1000;
    setRefreshCooldownUntil(cooldownUntil);
    sessionStorage.setItem('appointments_refresh_cooldown', String(cooldownUntil));
    setIsRefreshing(false);
    window.location.reload();
  };

  const dateLabel = (() => {
    const today = new Date();
    const fmt = (d) => {
      const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
    };
    const end = today;
    switch (activeFilter) {
      case "Today": return fmt(end);
      case "Last 7 days": { const s = new Date(end); s.setDate(s.getDate()-6); return `${fmt(s)} – ${fmt(end)}`; }
      case "Last 30 days": { const s = new Date(end); s.setDate(s.getDate()-29); return `${fmt(s)} – ${fmt(end)}`; }
      case "Last 90 days": { const s = new Date(end); s.setDate(s.getDate()-89); return `${fmt(s)} – ${fmt(end)}`; }
      case "Last year": { const s = new Date(end); s.setFullYear(s.getFullYear()-1); return `${fmt(s)} – ${fmt(end)}`; }
      case "All time": { const s = new Date('2020-01-01'); return `${fmt(s)} – ${fmt(end)}`; }
      case "Custom": {
        if (customStartDate && customEndDate) {
          return `${fmt(new Date(customStartDate))} – ${fmt(new Date(customEndDate))}`;
        }
        return "Select date range";
      }
      default: return fmt(end);
    }
  })();

  // ---- Practitioner bar chart ----
  const pracChartOptions = {
    series: [{
      name: "Appointments",
      data: practitionerData?.practitioners?.slice(0, 10).map(p => p.appointments) || []
    }, {
      name: "Completed",
      data: practitionerData?.practitioners?.slice(0, 10).map(p => p.completed) || []
    }],
    chart: {
      type: "bar",
      height: 280,
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      animations: { enabled: true, easing: "easeinout", speed: 600 }
    },
    colors: ["#6366f1", "#10b981"],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: "55%",
        borderRadiusApplication: "end"
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: practitionerData?.practitioners?.slice(0, 10).map(p => p.name?.split(' ')[0]) || [],
      labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 600 } }
    },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: {
      theme: "light",
      style: { fontSize: "11px", fontFamily: "Inter, sans-serif" },
      y: { formatter: (val) => val + " appointments" }
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "10px",
      fontFamily: "Inter, sans-serif",
      markers: { radius: 8, width: 8, height: 8 },
      itemMargin: { horizontal: 10 }
    }
  };

  // ---- Site bar chart ----
  const siteChartOptions = {
    series: [{
      name: "Appointments",
      data: siteData?.sites?.slice(0, 8).map(s => s.appointments) || []
    }],
    chart: {
      type: "bar",
      height: 220,
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      animations: { enabled: true, easing: "easeinout", speed: 600 }
    },
    colors: ["#3b82f6"],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "55%",
        distributed: true,
        borderRadiusApplication: "end"
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: siteData?.sites?.slice(0, 8).map(s => s.name.split(' ')[2]) || [],
      labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } }
    },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4 },
    tooltip: {
      theme: "light",
      style: { fontSize: "11px", fontFamily: "Inter, sans-serif" },
      y: { formatter: (val) => val + " appointments" }
    },
    legend: { show: false }
  };

  // ---- state donut ----
  const totalApps = kpiData?.totalAppointments || 0;
  const completedApps = kpiData?.completedAppointments || 0;
  const cancelledApps = kpiData?.cancelledAppointments || 0;
  const ftaCount = kpiData?.dnaCount || 0;

  const stateColorMap = {
    "completed": "#10b981",
    "cancelled": "#f59e0b",
    "did not attend": "#f97316",
    "pending": "#94a3b8",
    "confirmed": "#60a5fa",
    "in surgery": "#a78bfa",
    "arrived": "#2dd4bf",
    "booked": "#818cf8"
  };

  const statusBreakdown = kpiData?.statusBreakdown || {};
  const breakdownEntries = Object.entries(statusBreakdown)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  const stateChartOptions = {
    series: breakdownEntries.map(e => e.value),
    chart: {
      type: "donut",
      height: 260,
      fontFamily: "Inter, sans-serif",
      animations: { enabled: true, easing: "easeinout", speed: 800 }
    },
    colors: breakdownEntries.map(e => stateColorMap[e.label.toLowerCase()] || "#94a3b8"),
    labels: breakdownEntries.map(e => e.label),
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            name: { show: true, fontSize: "11px", fontWeight: 600, color: "#64748b", offsetY: -4 },
            value: { show: true, fontSize: "20px", fontWeight: 700, color: "#1e293b", offsetY: 6 },
            total: {
              show: true,
              label: "Total",
              fontSize: "10px",
              fontWeight: 500,
              color: "#64748b",
              offsetY: 22,
              formatter: () => totalApps.toLocaleString()
            }
          }
        }
      }
    },
    stroke: { width: 3, colors: ["#ffffff"] },
    fill: { type: "gradient", gradient: { shade: "light", type: "diagonal1", shadeIntensity: 0.2, opacityFrom: 0.95, opacityTo: 0.85 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: {
      theme: "light",
      style: { fontSize: "11px", fontFamily: "Inter, sans-serif" },
      y: { formatter: (val) => val.toLocaleString() + " appointments" }
    }
  };

  // ---- Trend mini chart ----
  const trendMiniOptions = {
    series: [{
      name: "Total",
      data: trendData?.chart_data?.map(d => d.total) || []
    }, {
      name: "Completed",
      data: trendData?.chart_data?.map(d => d.completed) || []
    }],
    chart: {
      type: "area",
      height: 200,
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      animations: { enabled: true, easing: "easeinout", speed: 600 },
      sparkline: { enabled: false }
    },
    colors: ["#3b82f6", "#10b981"],
    fill: {
      type: "gradient",
      gradient: { shade: "light", type: "vertical", shadeIntensity: 0.1, opacityFrom: 0.85, opacityTo: 0.9, stops: [0, 90, 100] }
    },
    stroke: { width: 1.5, curve: "smooth" },
    xaxis: {
      categories: trendData?.chart_data?.map(d => {
        const p = d.date?.split('-');
        if (!p || p.length < 3) return d.date;
        return `${parseInt(p[2])}/${parseInt(p[1])}`;
      }) || [],
      labels: { style: { colors: "#94a3b8", fontSize: "9px", fontWeight: 500 }, rotate: -30 },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "9px", fontWeight: 500 } } },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 3 },
    tooltip: {
      theme: "light",
      style: { fontSize: "10px", fontFamily: "Inter, sans-serif" },
      y: { formatter: (val) => val + " apps" }
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "10px",
      fontFamily: "Inter, sans-serif",
      markers: { radius: 8, width: 8, height: 8 },
      itemMargin: { horizontal: 8 }
    },
    dataLabels: { enabled: false }
  };

  // ---- Reason donut ----
  const reasonTotal = reasonData?.reasons?.reduce((s, r) => s + r.count, 0) || 0;
  const reasonChartOptions = {
    series: reasonData?.reasons?.slice(0, 8).map(r => r.count) || [],
    chart: { type: "donut", height: 260, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 } },
    colors: ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6", "#f97316"],
    labels: reasonData?.reasons?.slice(0, 8).map(r => r.reason) || [],
    plotOptions: { pie: { donut: { size: "62%", labels: { show: true, name: { show: true, fontSize: "11px", fontWeight: 600, color: "#64748b", offsetY: -4 }, value: { show: true, fontSize: "18px", fontWeight: 700, color: "#1e293b", offsetY: 6 }, total: { show: true, label: "Total", fontSize: "10px", fontWeight: 500, color: "#64748b", offsetY: 22, formatter: () => (reasonData?.reasons?.reduce((s, r) => s + r.count, 0) || 0).toLocaleString() } } } } },
    stroke: { width: 3, colors: ["#ffffff"] },
    fill: { type: "gradient", gradient: { shade: "light", type: "diagonal1", shadeIntensity: 0.2, opacityFrom: 0.95, opacityTo: 0.85 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toLocaleString() + " appointments" } }
  };

  // ---- Hour bar ----
  const hourChartOptions = {
    series: [{ name: "Appointments", data: hourData?.hours?.map(h => h.count) || [] }],
    chart: { type: "bar", height: 220, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 } },
    colors: ["#8b5cf6"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "60%", distributed: true, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: hourData?.hours?.map(h => `${h.hour}:00`) || [], labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } } },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4 },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toLocaleString() + " appointments" } },
    legend: { show: false }
  };

  // ---- Day bar ----
  const dayLabels = dayData?.days?.map(d => d.day?.slice(0, 3)) || [];
  const dayChartOptions = {
    series: [{ name: "Appointments", data: dayData?.days?.map(d => d.count) || [] }],
    chart: { type: "bar", height: 220, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 } },
    colors: ["#6366f1", "#818cf8", "#a5b4fc", "#2dd4bf", "#34d399", "#f59e0b", "#f97316"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "65%", distributed: true, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: dayLabels, labels: { style: { colors: "#64748b", fontSize: "11px", fontWeight: 600 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } } },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4 },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toLocaleString() + " appointments" } },
    legend: { show: false }
  };

  // ---- Practitioner completion bar ----
  const pracCompletionOptions = {
    series: [{ name: "Completion Rate", data: practitionerData?.practitioners?.slice(0, 10).map(p => p.completionRate) || [] }],
    chart: { type: "bar", height: 260, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 } },
    colors: ["#10b981"],
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "55%", borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: practitionerData?.practitioners?.slice(0, 10).map(p => p.name?.split(' ')[0]) || [], labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } }, axisBorder: { show: false }, axisTicks: { show: false }, max: 100 },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 600 } } },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toFixed(1) + "%" } },
    legend: { show: false }
  };

  // ---- Cancellations by Day ----
  const cancelDays = cancelByDay?.days || [];
  const cancelByDayOptions = {
    series: [{ name: "Cancelled", data: cancelDays.map(d => d.cancelled) }],
    chart: { type: "bar", height: 260, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 } },
    colors: ["#f43f5e"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "60%", distributed: false, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: cancelDays.map(d => d.day?.slice(0, 3)), labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 600 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "9px", fontWeight: 500 } } },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4 },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val, { seriesIndex, dataPointIndex }) => val + " / " + cancelDays[dataPointIndex]?.total + " total (" + cancelDays[dataPointIndex]?.rate + "%)" } },
    legend: { show: false }
  };

  // ---- Appointment Lifecycle (duration min/avg/max by hour) ----
  const lcHours = lifecycleData?.hours || [];
  const lifecycleOptions = {
    series: [
      { name: "Avg Duration", data: lcHours.map(h => h.avg) },
      { name: "Min Duration", data: lcHours.map(h => h.min) },
      { name: "Max Duration", data: lcHours.map(h => h.max) }
    ],
    chart: { type: "bar", height: 260, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 } },
    colors: ["#8b5cf6", "#a78bfa", "#c4b5fd"],
    plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: "60%", borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: lcHours.map(h => `${h.hour}:00`), labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 600 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "9px", fontWeight: 500 } }, title: { text: "minutes", style: { fontSize: "9px", color: "#94a3b8" } } },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4 },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toFixed(1) + " min" } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "9px", fontFamily: "Inter, sans-serif", markers: { radius: 8, width: 8, height: 8 }, itemMargin: { horizontal: 6 } }
  };

  // ---- Actual Duration (horizontal bar) ----
  const durationTotal = durationData?.buckets?.reduce((s, b) => s + b.count, 0) || 0;
  const durationOptions = {
    series: [{ name: "Appointments", data: durationData?.buckets?.map(b => b.count) || [] }],
    chart: { type: "bar", height: 200, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 } },
    colors: ["#0ea5e9"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%", distributed: true, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: durationData?.buckets?.map(b => b.bucket) || [], labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } } },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4 },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toLocaleString() + " appointments (" + (durationTotal > 0 ? (val / durationTotal * 100).toFixed(1) : "0") + "%)" } },
    legend: { show: false }
  };

  // ---- Day-Hour Heatmap ----
  const heatColors = ["#f0f9ff", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1"];
  const hmSeries = heatmapData?.heatmap?.map(d => ({
    name: d.day?.slice(0, 3),
    data: d.data?.map(h => ({ x: h.hour + ":00", y: h.count })) || []
  })) || [];
  const heatmapOptions = {
    series: hmSeries,
    chart: { type: "heatmap", height: 280, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 } },
    colors: heatColors,
    plotOptions: { heatmap: { shadeIntensity: 0.6, radius: 3, useFillColorAsStroke: false, colorScale: { ranges: [{ from: 0, to: 0, color: "#f1f5f9", name: "none" }] } } },
    dataLabels: { enabled: true, style: { colors: ["#1e293b"], fontSize: "9px", fontWeight: 600 }, formatter: (val) => val || "" },
    xaxis: { labels: { style: { colors: "#64748b", fontSize: "9px", fontWeight: 500 }, rotate: -30 }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 600 } } },
    grid: { show: false },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val + " appointments" } },
    legend: { show: true, position: "bottom", fontSize: "9px", fontFamily: "Inter, sans-serif", markers: { radius: 4, width: 12, height: 12 }, itemMargin: { horizontal: 4 } }
  };

  return (
    <div className="bg-[#f4f6fb] font-sans antialiased min-h-screen">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-5 space-y-4 relative z-10">

        {/* ======= HEADER ======= */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Calendar size={18} className="text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Appointments</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100/60">
                  <Calendar size={10} /> Schedule
                </span>
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <CalendarRange size={10} />
                  {dateLabel}
                </span>
              </div>
            </div>
          </div>

          <button onClick={handleRefresh} disabled={isRefreshing || cooldownSecs > 0}
            className="inline-flex items-center gap-1.5 px-3 h-8 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:shadow-sm active:scale-[0.97] transition-all duration-200 disabled:opacity-50">
            <RefreshCw size={11} className={`transition-transform duration-700 ${isRefreshing ? "rotate-180 text-indigo-500" : "text-slate-400"}`} />
            {isRefreshing ? "Refreshing..." : cooldownSecs > 0 ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, '0')} left` : "Refresh"}
          </button>
        </div>

        {/* ======= FILTERS ======= */}
        <div className="flex items-center gap-1 bg-white border border-slate-200/60 rounded-lg p-0.5 w-fit shadow-sm sticky top-16 z-30">
          {filters.map((f) => {
            const sel = activeFilter === f;
            return (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`px-2.5 h-7 text-[10px] font-semibold tracking-tight rounded-md transition-all ${
                  sel ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}>{f}</button>
            );
          })}
          {activeFilter === "Custom" && (
            <div className="flex items-center gap-2 px-2">
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                className="px-2 py-1 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <span className="text-[10px] text-slate-400">–</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                className="px-2 py-1 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          )}
        </div>

        {/* ======= KPI STRIP ======= */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-3.5 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-200 animate-pulse" />
                    <div className="h-2.5 w-14 bg-slate-200 rounded animate-pulse" />
                  </div>
                  <div className="h-7 w-16 bg-slate-200 rounded animate-pulse mb-1.5" />
                  <div className="h-2.5 w-12 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : kpiData && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100">
              {[
                {
                  title: "Total Appointments",
                  value: (kpiData.totalAppointments || 0).toLocaleString(),
                  change: "+8.2%",
                  positive: true,
                  sparklineField: 'total',
                  footer: "this period",
                  icon: Calendar,
                  tooltip: "Total number of appointments in the period",
                  fields: [{ field: 'id', role: 'Each row counted = one appointment' }, { field: 'start_time', role: 'Scoped to the selected date period' }],
                  calc: "Counts all appointment records created in the selected period."
                },
                {
                  title: "Completed",
                  value: (kpiData.completedAppointments || 0).toLocaleString(),
                  change: "+5.3%",
                  positive: true,
                  sparklineField: 'completed',
                  footer: "successful visits",
                  icon: CheckCircle2,
                  tooltip: "Appointments where state = completed",
                  fields: [{ field: 'state', role: 'Filtered where state = completed' }, { field: 'start_time', role: 'Scoped to the selected date period' }],
                  calc: "Counts appointments where state = 'completed' in the selected period."
                },
                {
                  title: "Cancelled",
                  value: (kpiData.cancelledAppointments || 0).toLocaleString(),
                  change: "-1.2%",
                  positive: true,
                  sparklineField: 'cancelled',
                  footer: "cancelled visits",
                  icon: XCircle,
                  tooltip: "Appointments where state = cancelled",
                  fields: [{ field: 'state', role: 'Filtered where state = cancelled' }, { field: 'start_time', role: 'Scoped to the selected date period' }],
                  calc: "Counts appointments where state = 'cancelled' in the selected period."
                },
                {
                  title: "DNA Rate",
                  value: (kpiData.dnaRate || 0) + "%",
                  change: "-0.3pp",
                  positive: true,
                  sparklineField: 'dna',
                  footer: "target < 5%",
                  icon: AlertTriangle,
                  tooltip: "Did not attend rate",
                  calc: "DNA Rate = (DNA count / total appointments) × 100. DNA = did_not_attend_at IS NOT NULL"
                },
                {
                  title: "Avg Duration",
                  value: (kpiData.avgDuration || 0) + " min",
                  change: "+2.1%",
                  positive: true,
                  footer: "per appointment",
                  icon: Clock,
                  tooltip: "Average appointment duration in minutes",
                  fields: [{ field: 'duration', role: 'Duration of each appointment in minutes' }, { field: 'start_time', role: 'Scoped to the selected date period' }],
                  calc: "Avg Duration = sum of duration / total appointments. Only non-cancelled appointments included."
                },
                {
                  title: "Did Not Attend",
                  value: (kpiData.dnaCount || 0).toLocaleString(),
                  change: "-0.8%",
                  positive: true,
                  sparklineField: 'dna',
                  footer: "did not attend",
                  icon: AlertCircle,
                  tooltip: "Total number of did not attend appointments",
                  fields: [{ field: 'did_not_attend_at', role: 'Presence of this timestamp indicates DNA' }, { field: 'start_time', role: 'Scoped to the selected date period' }],
                  calc: "Counts appointments where did_not_attend_at is not null in the selected period."
                }
              ].map((m, index) => {
                const Icon = m.icon;
                const bgAccent = m.positive ? "bg-emerald-50" : "bg-rose-50";
                const textAccent = m.positive ? "text-emerald-600" : "text-rose-500";

                return (
                  <div key={index} className="group p-3.5 hover:bg-slate-50/30 transition-colors duration-200 flex flex-col justify-between min-h-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`w-6 h-6 rounded-md ${bgAccent} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon size={11} className={textAccent} />
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-[7px] font-bold text-slate-500 mr-1 shrink-0 self-center">{index + 33}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate">
                          {m.title}
                        </span>
                        <InfoIcon
                          title={m.title}
                          additionalInfo={m.tooltip}
                          apiEndpoint="https://api.dentally.co/v1/appointments"
                          apiFields={m.fields}
                          databaseTables={['dentally_appointments']}
                          calculations={m.calc}
                        />
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[1.25rem] font-bold tracking-tight text-slate-900 leading-none">
                        {m.value}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                        m.positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                      }`}>
                        {m.change}
                      </span>
                    </div>

                    {/* Sparkline */}
                    <div className="mt-2 h-6 w-full">
                      {(() => {
                        const rawVals = m.sparklineField ? trendData?.chart_data?.map(d => d[m.sparklineField]) : null;
                        const sp = m.sparklineField ? sparklinePath(rawVals, 80, 32) : null;
                        const spLine = sp?.line || (m.positive ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4" : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26");
                        const spFill = sp?.fill || (m.positive ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4 L 80 32 L 0 32 Z" : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26 L 80 32 L 0 32 Z");
                        return (
                          <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id={`metricGrad-app-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={m.positive ? "#10b981" : "#ef4444"} stopOpacity="0.1" />
                                <stop offset="100%" stopColor={m.positive ? "#10b981" : "#ef4444"} stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <line x1="0" y1="20" x2="80" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 3" />
                            <path d={spLine} fill="none" stroke={m.positive ? "#10b981" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={spFill} fill={`url(#metricGrad-app-${index})`} />
                          </svg>
                        );
                      })()}
                    </div>

                    <p className="text-[9px] font-medium text-slate-400 mt-1 truncate">
                      {m.footer}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======= state DONUT + SITE BARS ======= */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 p-5">
              <div className="w-full h-[260px] bg-slate-100 rounded-lg animate-pulse" />
            </div>
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 p-5">
              <div className="w-full h-[220px] bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* state donut */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">39</span>
                  <CheckCircle2 size={12} className="text-slate-400" />
                  Outcome Breakdown
                  <InfoIcon
                    title="Outcome Breakdown"
                    additionalInfo="Distribution of appointments by final outcome state"
                    apiEndpoint="https://api.dentally.co/v1/appointments"
                    apiFields={[
                      { field: 'state', role: 'Appointment state field used to categorise' },
                      { field: 'did_not_attend_at', role: 'Presence of this timestamp indicates DNA' }
                    ]}
                    databaseTables={['dentally_appointments']}
                    calculations="Groups appointments by state (completed, cancelled) and flags DNA via did_not_attend_at. Shown as a donut chart with percentages."
                  />
                </h3>
              </div>
              <div className="p-4 flex flex-col items-center">
                <ReactApexChart options={stateChartOptions} series={stateChartOptions.series} type="donut" height={260} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px]">
                  {breakdownEntries.map(e => (
                    <span key={e.label} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stateColorMap[e.label.toLowerCase()] || "#94a3b8" }} />
                      {e.value.toLocaleString()} {e.label.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Site bars */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">40</span>
                    <Building2 size={12} className="text-slate-400" />
                    Appointments by Practice
                  <InfoIcon
                    title="Appointments by Practice"
                    additionalInfo="Appointment volume and completions broken down by practice location"
                    apiEndpoint="https://api.dentally.co/v1/appointments , https://api.dentally.co/v1/sites , https://api.dentally.co/v1/practitioners"
                    apiFields={[
                      { field: 'practitioner_id', role: 'Links appointment to practitioner' },
                      { field: 'site_id', role: 'Links appointment to site location' },
                      { field: 'name', role: 'Site name from the sites API' },
                      { field: 'state', role: 'Used to count completed appointments per site' }
                    ]}
                    databaseTables={['dentally_appointments', 'dentally_sites']}
                    calculations="Joins dentally_sites with dentally_appointments on site_id, counts total and completed appointments grouped by site name. Sorted by total volume descending."
                  />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={siteChartOptions} series={siteChartOptions.series} type="bar" height={220} />
              </div>
            </div>
          </div>
        )}

        {/* ======= PRACTITIONER WORKLOAD + ACTIVITY FEED ======= */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 p-5">
              <div className="w-full h-[280px] bg-slate-100 rounded-lg animate-pulse" />
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 p-5">
              <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            </div>
          </div>
        ) : practitionerData && recentAppointments && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Practitioner bars */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">41</span>
                    <Users size={12} className="text-slate-400" />
                    Practitioner Workload
                  <InfoIcon
                    title="Practitioner Workload"
                    additionalInfo="Total appointments and completed counts per practitioner"
                    apiEndpoint="https://api.dentally.co/v1/appointments , https://api.dentally.co/v1/practitioners"
                    apiFields={[
                      { field: 'practitioner_id', role: 'Links appointment to practitioner' },
                      { field: 'first_name', role: 'Practitioner first name (practitioners API)' },
                      { field: 'last_name', role: 'Practitioner last name (practitioners API)' },
                      { field: 'state', role: 'Used to count completed appointments per practitioner' }
                    ]}
                    databaseTables={['dentally_appointments', 'dentally_practitioners']}
                    calculations="Groups appointments by practitioner_id, joins with practitioners for names. Counts total appointments and completed per practitioner. Shown as horizontal grouped bar chart."
                  />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={pracChartOptions} series={pracChartOptions.series} type="bar" height={280} />
              </div>
            </div>

            {/* Activity feed */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">42</span>
                    <ArrowRight size={12} className="text-slate-400" />
                    Recent Activity
                    <InfoIcon
                      title="Recent Activity"
                      additionalInfo="Latest appointment activity across all sites, ordered by start time"
                      apiEndpoint="https://api.dentally.co/v1/appointments , https://api.dentally.co/v1/practitioners"
                      apiFields={[
                        { field: 'patient_name', role: 'Patient name from appointment record' },
                        { field: 'practitioner_id', role: 'Practitioner assigned to the appointment' },
                        { field: 'first_name', role: 'Practitioner first name (practitioners API)' },
                        { field: 'last_name', role: 'Practitioner last name (practitioners API)' },
                        { field: 'reason', role: 'Reason for the appointment' },
                        { field: 'start_time', role: 'Appointment start date/time' },
                        { field: 'state', role: 'Current appointment state' }
                      ]}
                      databaseTables={['dentally_appointments', 'dentally_practitioners']}
                      calculations="Returns the most recent appointments ordered by start_time DESC, limited to the 10 latest records."
                    />
                  </h3>
                  <span className="text-[9px] font-medium text-slate-400">
                    {recentAppointments.appointments?.length || 0} entries
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-50 max-h-[320px] overflow-y-auto">
                <ActivityFeed appointments={recentAppointments} />
              </div>
            </div>
          </div>
        )}

        {/* ======= TREND CHART ======= */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200/50 p-5">
            <div className="w-full h-[200px] bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : trendData && (
          <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">43</span>
                      <TrendingUp size={12} className="text-slate-400" />
                      Daily Appointment Volume
                    <InfoIcon
                      title="Appointment Trend"
                      additionalInfo="Track daily appointment volume and completion trends over time"
                      apiEndpoint="https://api.dentally.co/v1/appointments"
                      apiFields={[
                        { field: 'start_time', role: 'Grouped by date to calculate daily counts' },
                        { field: 'state', role: 'Filtered by completed state for completion trend' }
                      ]}
                      databaseTables={['dentally_appointments']}
                      calculations="Groups appointments by start_time date. Counts total and completed per day. Shown as an area chart comparing total volume vs completed volume."
                    />
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium">Total vs completed per day</p>
                </div>
              </div>
            </div>
            <div className="p-3">
              <ReactApexChart options={trendMiniOptions} series={trendMiniOptions.series} type="area" height={200} />
            </div>
          </div>
        )}

        {/* ======= NEW CHARTS ROW: REASON + HOUR ======= */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 p-5"><div className="w-full h-[260px] bg-slate-100 rounded-lg animate-pulse" /></div>
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 p-5"><div className="w-full h-[220px] bg-slate-100 rounded-lg animate-pulse" /></div>
          </div>
        ) : (reasonData || hourData) && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Reason donut */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">44</span>
                  <List size={12} className="text-slate-400" />
                  Appointments by Reason
                  <InfoIcon
                    title="Appointments by Reason"
                    additionalInfo="Distribution of appointments grouped by reason/treatment type"
                    apiEndpoint="https://api.dentally.co/v1/appointments"
                    apiFields={[{ field: 'reason', role: 'Reason for the appointment' }]}
                    databaseTables={['dentally_appointments']}
                    calculations="Groups appointments by reason and counts them. Shown as a donut chart with the top 8 reasons."
                  />
                </h3>
              </div>
              <div className="p-4 flex flex-col items-center">
                <ReactApexChart options={reasonChartOptions} series={reasonChartOptions.series} type="donut" height={260} />
                <div className="w-full mt-3 grid grid-cols-3 gap-x-3 gap-y-1.5">
                  {(reasonData?.reasons || []).slice(0, 9).map((r, i) => {
                    const pct = reasonTotal > 0 ? ((r.count / reasonTotal) * 100).toFixed(1) : "0.0";
                    const colors = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6", "#f97316", "#6366f1"];
                    return (
                      <div key={r.reason} className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="truncate font-medium text-slate-700 leading-tight">{r.reason}</span>
                        <span className="shrink-0 font-semibold text-slate-600">{r.count.toLocaleString()}</span>
                        <span className="shrink-0 text-slate-400">({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Hour bar */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">45</span>
                  <Clock size={12} className="text-slate-400" />
                  Appointments by Hour
                  <InfoIcon
                    title="Appointments by Hour"
                    additionalInfo="Distribution of appointments across hours of the day"
                    apiEndpoint="https://api.dentally.co/v1/appointments"
                    apiFields={[{ field: 'start_time', role: 'Extracts hour to group appointments by time of day' }]}
                    databaseTables={['dentally_appointments']}
                    calculations="Groups appointments by the hour of their start_time. Shown as a bar chart to visualise peak booking times."
                  />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={hourChartOptions} series={hourChartOptions.series} type="bar" height={220} />
              </div>
            </div>
          </div>
        )}

        {/* ======= DAY + PRACTITIONER COMPLETION RATE ======= */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 p-5"><div className="w-full h-[220px] bg-slate-100 rounded-lg animate-pulse" /></div>
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 p-5"><div className="w-full h-[260px] bg-slate-100 rounded-lg animate-pulse" /></div>
          </div>
        ) : (dayData || practitionerData) && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Day bar */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">46</span>
                  <CalendarRange size={12} className="text-slate-400" />
                  Appointments by Day
                  <InfoIcon
                    title="Appointments by Day"
                    additionalInfo="Distribution of appointments across days of the week"
                    apiEndpoint="https://api.dentally.co/v1/appointments"
                    apiFields={[{ field: 'start_time', role: 'Extracts day of week to group appointments' }]}
                    databaseTables={['dentally_appointments']}
                    calculations="Groups appointments by day of the week using their start_time. Shown as a bar chart to visualise busy days."
                  />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={dayChartOptions} series={dayChartOptions.series} type="bar" height={220} />
              </div>
            </div>

            {/* Practitioner completion */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">47</span>
                  <UserCheck size={12} className="text-slate-400" />
                  Practitioner Completion Rate
                  <InfoIcon
                    title="Practitioner Completion Rate"
                    additionalInfo="Percentage of appointments completed per practitioner"
                    apiEndpoint="https://api.dentally.co/v1/appointments , https://api.dentally.co/v1/practitioners"
                    apiFields={[
                      { field: 'practitioner_id', role: 'Links appointment to practitioner' },
                      { field: 'state', role: 'Used to count completed appointments' }
                    ]}
                    databaseTables={['dentally_appointments', 'dentally_practitioners']}
                    calculations="For each practitioner: completed appointments / total appointments * 100. Only practitioners with active status are included."
                  />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={pracCompletionOptions} series={pracCompletionOptions.series} type="bar" height={260} />
              </div>
            </div>
          </div>
        )}

        {/* ======= CANCELLATIONS BY DAY + RATE ======= */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 p-5"><div className="w-full h-[260px] bg-slate-100 rounded-lg animate-pulse" /></div>
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 p-5"><div className="w-full h-[260px] bg-slate-100 rounded-lg animate-pulse" /></div>
          </div>
        ) : cancelByDay && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Cancellations count by day */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">48</span>
                  <XCircle size={12} className="text-slate-400" />
                  Cancelled by Day
                  <InfoIcon
                    title="Cancelled by Day"
                    additionalInfo="Absolute number of cancellations per day of the week"
                    apiEndpoint="https://api.dentally.co/v1/appointments"
                    apiFields={[{ field: 'State', role: 'Filtered where status = Cancelled' }, { field: 'start_time', role: 'Extracts day of week' }]}
                    databaseTables={['dentally_appointments']}
                    calculations="Groups cancelled appointments by day of the week. Shows raw cancellation volume per day."
                  />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={cancelByDayOptions} series={cancelByDayOptions.series} type="bar" height={260} />
              </div>
            </div>

            {/* Appointment Lifecycle */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">49</span>
                  <Activity size={12} className="text-slate-400" />
                  Appointment Lifecycle
                  <InfoIcon
                    title="Appointment Lifecycle"
                    additionalInfo="Average, minimum, and maximum appointment duration broken down by hour of day"
                    apiEndpoint="https://api.dentally.co/v1/appointments"
                    apiFields={[{ field: 'completed_at', role: 'Completion timestamp' }, { field: 'start_time', role: 'Appointment start time' }]}
                    databaseTables={['dentally_appointments']}
                    calculations="For each hour of the day: calculates min, avg, and max of (completed_at - start_time) in minutes. Shows the lifecycle range of appointment durations."
                  />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={lifecycleOptions} series={lifecycleOptions.series} type="bar" height={260} />
              </div>
            </div>
          </div>
        )}

        {/* ======= DURATION + HEATMAP ======= */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 p-5"><div className="w-full h-[200px] bg-slate-100 rounded-lg animate-pulse" /></div>
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 p-5"><div className="w-full h-[280px] bg-slate-100 rounded-lg animate-pulse" /></div>
          </div>
        ) : (durationData || heatmapData) && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Duration bar */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">50</span>
                  <Clock size={12} className="text-slate-400" />
                  Actual Appointment Duration
                  <InfoIcon
                    title="Actual Duration"
                    additionalInfo="Distribution of actual appointment durations (completed_at - start_time)"
                    apiEndpoint="https://api.dentally.co/v1/appointments"
                    apiFields={[{ field: 'completed_at', role: 'Completion timestamp' }, { field: 'start_time', role: 'Start time' }]}
                    databaseTables={['dentally_appointments']}
                    calculations="Groups completed appointments by time difference between completed_at and start_time into 15-min buckets."
                  />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={durationOptions} series={durationOptions.series} type="bar" height={200} />
              </div>
            </div>

            {/* Heatmap */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">51</span>
                  <Grid3x3 size={12} className="text-slate-400" />
                  Weekly Activity Heatmap
                  <InfoIcon
                    title="Activity Heatmap"
                    additionalInfo="Appointment volume by day of week and hour of day. Darker cells indicate peak times."
                    apiEndpoint="https://api.dentally.co/v1/appointments"
                    apiFields={[{ field: 'start_time', role: 'Extracts day of week and hour for grouping' }]}
                    databaseTables={['dentally_appointments']}
                    calculations="Groups appointments by day of week and hour of start_time. Displayed as a heatmap to visualise peak periods."
                  />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={heatmapOptions} series={heatmapOptions.series} type="heatmap" height={280} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}