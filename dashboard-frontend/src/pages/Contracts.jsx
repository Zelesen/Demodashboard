import { useState, useEffect, useRef, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import { RefreshCw, FileText, Building2, CalendarRange, Target, CheckCircle2, TrendingUp, Users, Activity, DollarSign } from 'lucide-react';
import InfoIcon from '../components/InfoIcon';

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

export default function Contracts() {
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(() => {
    const stored = sessionStorage.getItem('contracts_refresh_cooldown');
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
  const [siteData, setSiteData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [deliveryData, setDeliveryData] = useState(null);
  const [valueDist, setValueDist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const dataCache = useRef(new Map());
  const isMounted = useRef(false);
  const allPeriods = ['today', '7d', '30d', '90d', '1y', 'all'];

  const getPeriodParam = () => {
    const map = { "Today": "today", "Last 7 days": "7d", "Last 30 days": "30d", "Last 90 days": "90d", "Last year": "1y", "All time": "all" };
    return map[activeFilter] || "all";
  };

  const fetchDataForPeriod = async (period) => {
    try {
      const baseUrl = 'http://localhost:8000/api/dashboard';
      const [kpisRes, siteRes, timelineRes, deliveryRes, valueDistRes] = await Promise.all([
        fetch(`${baseUrl}/contracts/kpis?period=${period}`),
        fetch(`${baseUrl}/contracts/by-site?period=${period}`),
        fetch(`${baseUrl}/contracts/timeline?period=${period}`),
        fetch(`${baseUrl}/contracts/uda-delivery?period=${period}`),
        fetch(`${baseUrl}/contracts/value-distribution?period=${period}`),
      ]);
      return {
        kpis: await kpisRes.json(),
        siteData: await siteRes.json(),
        timelineData: await timelineRes.json(),
        deliveryData: await deliveryRes.json(),
        valueDist: await valueDistRes.json(),
      };
    } catch (error) {
      console.error('Error fetching contracts data:', error);
      return null;
    }
  };

  const populateFromData = useCallback((data) => {
    setKpiData(data.kpis);
    setSiteData(data.siteData);
    setTimelineData(data.timelineData);
    setDeliveryData(data.deliveryData);
    setValueDist(data.valueDist);
  }, []);

  const applyCachedData = useCallback((period) => {
    const cached = dataCache.current.get(period);
    if (!cached) return;
    populateFromData(cached);
    sessionStorage.setItem('contracts_data', JSON.stringify(cached));
  }, [populateFromData]);

  const fetchCustomData = async (startDate, endDate) => {
    try {
      const baseUrl = 'http://localhost:8000/api/dashboard';
      const [kpisRes, siteRes, timelineRes, deliveryRes, valueDistRes] = await Promise.all([
        fetch(`${baseUrl}/contracts/kpis?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/contracts/by-site?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/contracts/timeline?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/contracts/uda-delivery?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`${baseUrl}/contracts/value-distribution?period=all&start_date=${startDate}&end_date=${endDate}`),
      ]);
      return {
        kpis: await kpisRes.json(),
        siteData: await siteRes.json(),
        timelineData: await timelineRes.json(),
        deliveryData: await deliveryRes.json(),
        valueDist: await valueDistRes.json(),
      };
    } catch (error) {
      console.error('Error fetching custom contracts data:', error);
      return null;
    }
  };

  const seedContracts = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/dashboard/contracts/seed', { method: 'POST' });
      return await res.json();
    } catch (error) {
      console.error('Error seeding contracts:', error);
      return null;
    }
  };

  useEffect(() => {
    const preFetchAll = async () => {
      const stored = sessionStorage.getItem('contracts_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.kpis?.total_contracts > 0) {
          populateFromData(parsed);
          setLoading(false);
          isMounted.current = true;
          return;
        }
      }
      await seedContracts();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      const customKey = `custom_${customStartDate}_${customEndDate}`;
      if (!dataCache.current.has(customKey)) {
        fetchCustomData(customStartDate, customEndDate).then(data => {
          if (data) { dataCache.current.set(customKey, data); applyCachedData(customKey); }
        });
      } else { applyCachedData(customKey); }
    } else {
      const period = getPeriodParam();
      if (dataCache.current.has(period)) { applyCachedData(period); }
      else {
        fetchDataForPeriod(period).then(data => {
          if (data) { dataCache.current.set(period, data); applyCachedData(period); }
        });
      }
    }
  }, [activeFilter, customStartDate, customEndDate, applyCachedData]);

  const filters = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last year", "All time", "Custom"];

  const syncPageCache = async () => {
    try { await fetch('http://localhost:8000/api/sync/page?page=contracts', { method: 'POST' }); }
    catch (e) { console.error('Page cache refresh error:', e); }
  };

  const handleRefresh = async () => {
    sessionStorage.removeItem('contracts_data');
    setIsRefreshing(true);
    await syncPageCache();
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      const data = await fetchCustomData(customStartDate, customEndDate);
      if (data) { const customKey = `custom_${customStartDate}_${customEndDate}`; dataCache.current.set(customKey, data); applyCachedData(customKey); }
    } else {
      const fetches = allPeriods.map(async (period) => { const data = await fetchDataForPeriod(period); if (data) dataCache.current.set(period, data); });
      await Promise.all(fetches);
      applyCachedData(getPeriodParam());
    }
    const cooldownUntil = Date.now() + 5 * 60 * 1000;
    setRefreshCooldownUntil(cooldownUntil);
    sessionStorage.setItem('contracts_refresh_cooldown', String(cooldownUntil));
    setIsRefreshing(false);
  };

  const dateLabel = (() => {
    const today = new Date();
    const fmt = (d) => { const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`; };
    const end = today;
    switch (activeFilter) {
      case "Today": return fmt(end);
      case "Last 7 days": { const s = new Date(end); s.setDate(s.getDate()-6); return `${fmt(s)} – ${fmt(end)}`; }
      case "Last 30 days": { const s = new Date(end); s.setDate(s.getDate()-29); return `${fmt(s)} – ${fmt(end)}`; }
      case "Last 90 days": { const s = new Date(end); s.setDate(s.getDate()-89); return `${fmt(s)} – ${fmt(end)}`; }
      case "Last year": { const s = new Date(end); s.setFullYear(s.getFullYear()-1); return `${fmt(s)} – ${fmt(end)}`; }
      case "All time": { const s = new Date('2020-01-01'); return `${fmt(s)} – ${fmt(end)}`; }
      case "Custom": { if (customStartDate && customEndDate) return `${fmt(new Date(customStartDate))} – ${fmt(new Date(customEndDate))}`; return "Select date range"; }
      default: return fmt(end);
    }
  })();

  // --- ApexCharts options ---

  // Status Donut
  const activeContracts = kpiData?.active_contracts || 0;
  const inactiveContracts = (kpiData?.total_contracts || 0) - activeContracts;
  const statusDonutOptions = {
    series: [activeContracts, inactiveContracts],
    chart: { type: "donut", height: 260, fontFamily: "Inter, sans-serif", animations: { enabled: true, easing: "easeinout", speed: 800 } },
    colors: ["#10b981", "#94a3b8"],
    labels: ["Active", "Inactive"],
    plotOptions: { pie: { donut: { size: "68%", labels: { show: true, name: { show: true, fontSize: "11px", fontWeight: 600, color: "#64748b", offsetY: -4 }, value: { show: true, fontSize: "20px", fontWeight: 700, color: "#1e293b", offsetY: 6 }, total: { show: true, label: "Total", fontSize: "10px", fontWeight: 500, color: "#64748b", offsetY: 22, formatter: () => (kpiData?.total_contracts || 0).toLocaleString() } } } } },
    stroke: { width: 3, colors: ["#ffffff"] },
    fill: { type: "gradient", gradient: { shade: "light", type: "diagonal1", shadeIntensity: 0.2, opacityFrom: 0.95, opacityTo: 0.85 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toLocaleString() + " contracts" } }
  };

  // PDS Plus Donut
  const pdsPlus = kpiData?.pds_plus_count || 0;
  const standardContracts = (kpiData?.total_contracts || 0) - pdsPlus;
  const pdsDonutOptions = {
    series: [standardContracts, pdsPlus],
    chart: { type: "donut", height: 260, fontFamily: "Inter, sans-serif", animations: { enabled: true, easing: "easeinout", speed: 800 } },
    colors: ["#3b82f6", "#a855f7"],
    labels: ["Standard", "PDS Plus"],
    plotOptions: { pie: { donut: { size: "68%", labels: { show: true, name: { show: true, fontSize: "11px", fontWeight: 600, color: "#64748b", offsetY: -4 }, value: { show: true, fontSize: "20px", fontWeight: 700, color: "#1e293b", offsetY: 6 }, total: { show: true, label: "Total", fontSize: "10px", fontWeight: 500, color: "#64748b", offsetY: 22, formatter: () => (kpiData?.total_contracts || 0).toLocaleString() } } } } },
    stroke: { width: 3, colors: ["#ffffff"] },
    fill: { type: "gradient", gradient: { shade: "light", type: "diagonal1", shadeIntensity: 0.2, opacityFrom: 0.95, opacityTo: 0.85 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toLocaleString() + " contracts" } }
  };

  // UDA Targets by Site (horizontal bar)
  const siteBarOptions = {
    series: [{ name: "UDA Target", data: siteData?.sites?.slice(0, 8).map(s => s.total_target) || [] }],
    chart: { type: "bar", height: 280, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 } },
    colors: ["#6366f1"],
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "55%", borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: siteData?.sites?.slice(0, 8).map(s => s.site_name?.split(' ').slice(0, 2).join(' ') || s.site_name) || [], labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 600 } } },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toLocaleString() + " UDAs" } },
    legend: { show: false }
  };

  // UDA Value Distribution (vertical bar)
  const valueDistOptions = {
    series: [{ name: "Contracts", data: valueDist?.distribution?.map(d => d.contract_count) || [] }],
    chart: { type: "bar", height: 220, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 } },
    colors: ["#8b5cf6"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%", distributed: true, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: valueDist?.distribution?.map(d => `£${d.uda_value.toFixed(2)}`) || [], labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } } },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4 },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toLocaleString() + " contracts" } },
    legend: { show: false }
  };

  // Delivery Rate by Contract (vertical bar)
  const deliveryBarData = deliveryData?.contracts?.slice(0, 10) || [];
  const deliveryBarOptions = {
    series: [{ name: "Delivery Rate", data: deliveryBarData.map(c => c.delivery_rate) }],
    chart: { type: "bar", height: 260, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 } },
    colors: ["#10b981"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "60%", distributed: true, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: deliveryBarData.map(c => c.contract_number || c.name?.slice(0, 12)), labels: { style: { colors: "#64748b", fontSize: "9px", fontWeight: 500 }, rotate: -30 }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 500 } }, max: 100 },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4 },
    tooltip: { theme: "light", style: { fontSize: "11px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toFixed(1) + "% delivery" } },
    legend: { show: false }
  };

  // Timeline trend (area chart using delivery rates)
  const timelineTrendOptions = {
    series: [{ name: "Delivery Rate", data: deliveryData?.contracts?.map(c => c.delivery_rate) || [] }],
    chart: { type: "area", height: 200, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 }, sparkline: { enabled: false } },
    colors: ["#8b5cf6"],
    fill: { type: "gradient", gradient: { shade: "light", type: "vertical", shadeIntensity: 0.1, opacityFrom: 0.85, opacityTo: 0.9, stops: [0, 90, 100] } },
    stroke: { width: 1.5, curve: "smooth" },
    xaxis: { categories: deliveryData?.contracts?.map(c => c.contract_number || c.name?.slice(0, 10)) || [], labels: { style: { colors: "#94a3b8", fontSize: "9px", fontWeight: 500 }, rotate: -30 }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "9px", fontWeight: 500 } }, max: 100 },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 3 },
    tooltip: { theme: "light", style: { fontSize: "10px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => val.toFixed(1) + "%" } },
    legend: { show: false },
    dataLabels: { enabled: false }
  };

  return (
    <div className="bg-[#f4f6fb] font-sans antialiased min-h-screen">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-5 space-y-4 relative z-10">

        {/* ======= HEADER ======= */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <FileText size={18} className="text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-heading leading-tight">Contracts</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100/60">
                  <FileText size={10} /> NHS Dental
                </span>
                <span className="text-[10px] text-muted font-medium flex items-center gap-1">
                  <CalendarRange size={10} />
                  {dateLabel}
                </span>
              </div>
            </div>
          </div>

          <button onClick={handleRefresh} disabled={isRefreshing || cooldownSecs > 0}
            className="inline-flex items-center gap-1.5 px-3 h-8 bg-card border border-card-border/80 hover:border-card-border rounded-xl text-[10px] font-semibold text-body hover:text-heading hover:shadow-sm active:scale-[0.97] transition-all duration-200 disabled:opacity-50">
            <RefreshCw size={11} className={`transition-transform duration-700 ${isRefreshing ? "rotate-180 text-indigo-500" : "text-muted"}`} />
            {isRefreshing ? "Refreshing..." : cooldownSecs > 0 ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, '0')} left` : "Refresh"}
          </button>
        </div>

        {/* ======= FILTERS ======= */}
        <div className="flex items-center gap-1 bg-card border border-card-border/60 rounded-lg p-0.5 w-fit shadow-sm sticky top-16 z-30">
          {filters.map((f) => {
            const sel = activeFilter === f;
            return (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`px-2.5 h-7 text-[10px] font-semibold tracking-tight rounded-md transition-all ${sel ? "bg-slate-900 text-white shadow-sm" : "text-muted hover:text-heading hover:bg-surface"}`}>{f}</button>
            );
          })}
          {activeFilter === "Custom" && (
            <div className="flex items-center gap-2 px-2">
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                className="px-2 py-1 text-[10px] border border-card-border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <span className="text-[10px] text-muted">–</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                className="px-2 py-1 text-[10px] border border-card-border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          )}
        </div>

        {/* ======= KPI STRIP ======= */}
        {loading ? (
          <div className="bg-card rounded-2xl border border-card-border/60 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-card-border">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-3.5 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-surface-alt animate-pulse" />
                    <div className="h-2.5 w-14 bg-surface-alt rounded animate-pulse" />
                  </div>
                  <div className="h-7 w-16 bg-surface-alt rounded animate-pulse mb-1.5" />
                  <div className="h-2.5 w-12 bg-surface-alt rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : kpiData && (
          <div className="bg-card rounded-2xl border border-card-border/60 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-card-border">
              {[
                {
                  title: "Active Contracts",
                  value: (kpiData.active_contracts || 0).toLocaleString(),
                  change: `${Math.round((kpiData.active_contracts || 0) / (kpiData.total_contracts || 1) * 100)}%`,
                  positive: true,
                  footer: `of ${kpiData.total_contracts || 0} total`,
                  icon: CheckCircle2,
                  tooltip: "Count of contracts where active = true",
                  calc: "Counts dentally_contracts rows where active = true. Scoped to start_date period."
                },
                {
                  title: "Total UDA Target",
                  value: (kpiData.total_target || 0).toLocaleString(),
                  change: `${kpiData.active_contracts || 0} contracts`,
                  positive: true,
                  footer: `avg £${kpiData.avg_uda_value?.toFixed(2) || '0.00'}/UDA`,
                  icon: Target,
                  tooltip: "Sum of all UDA targets across all contracts",
                  calc: "SUM(target) from dentally_contracts. Scoped to start_date period."
                },
                {
                  title: "Avg UDA Value",
                  value: `£${kpiData.avg_uda_value?.toFixed(2) || '0.00'}`,
                  change: `vs £${kpiData.avg_uoa_value?.toFixed(2) || '0.00'} UOA`,
                  positive: true,
                  footer: `${kpiData.total_contracts || 0} contracts`,
                  icon: DollarSign,
                  tooltip: "Average UDA monetary value per contract",
                  calc: "AVG(uda_value) from dentally_contracts."
                },
                {
                  title: "Total UOA Target",
                  value: (kpiData.total_uoa_target || 0).toLocaleString(),
                  change: `${Math.round((kpiData.total_uoa_target || 0) / (kpiData.total_target || 1) * 100)}% of UDA`,
                  positive: true,
                  footer: `avg £${kpiData.avg_uoa_value?.toFixed(2) || '0.00'}/UOA`,
                  icon: Activity,
                  tooltip: "Sum of all UOA targets across contracts",
                  calc: "SUM(uoa_target) from dentally_contracts."
                },
                {
                  title: "PDS Plus",
                  value: (kpiData.pds_plus_count || 0).toLocaleString(),
                  change: `${Math.round((kpiData.pds_plus_count || 0) / (kpiData.total_contracts || 1) * 100)}%`,
                  positive: true,
                  footer: "enhanced contracts",
                  icon: Building2,
                  tooltip: "Contracts with PDS Plus enabled",
                  calc: "COUNT where pds_plus = true from dentally_contracts."
                },
                {
                  title: "Delivery Rate",
                  value: `${deliveryData?.overall_delivery_rate?.toFixed(1) || 0}%`,
                  change: `${deliveryData?.total_delivered?.toLocaleString() || 0} delivered`,
                  positive: (deliveryData?.overall_delivery_rate || 0) >= 80,
                  footer: `of ${deliveryData?.total_target?.toLocaleString() || 0} target`,
                  icon: TrendingUp,
                  tooltip: "Overall UDA delivery rate against targets",
                  calc: "(SUM delivered UDAs / SUM target UDAs) × 100. Links to dentally_nhs_claims via contract_id."
                }
              ].map((m, index) => {
                const Icon = m.icon;
                const bgAccent = m.positive ? "bg-emerald-50" : "bg-rose-50";
                const textAccent = m.positive ? "text-emerald-600" : "text-rose-500";

                return (
                  <div key={index} className="group p-3.5 hover:bg-surface/30 transition-colors duration-200 flex flex-col justify-between min-h-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`w-6 h-6 rounded-md ${bgAccent} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon size={11} className={textAccent} />
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-surface-alt text-[7px] font-bold text-muted mr-1 shrink-0 self-center">{index + 52}</span>
                        <span className="text-[9px] font-bold text-muted uppercase tracking-wider leading-none truncate">{m.title}</span>
                        <InfoIcon title={m.title} additionalInfo={m.tooltip} apiEndpoint="/api/dashboard/contracts/kpis" databaseTables={['dentally_contracts']} calculations={m.calc} />
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[1.25rem] font-bold tracking-tight text-heading leading-none">{m.value}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold shrink-0 ${m.positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>{m.change}</span>
                    </div>

                    <div className="mt-2 h-6 w-full">
                      {(() => {
                        const sp = m.positive
                          ? sparklinePath([40, 50, 45, 55, 48, 60, 52, 58, 55, 62, 58, 65])
                          : sparklinePath([60, 55, 58, 50, 52, 45, 48, 40, 42, 35, 38, 30]);
                        const spLine = sp?.line || (m.positive ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4" : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26");
                        const spFill = sp?.fill || (m.positive ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4 L 80 32 L 0 32 Z" : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26 L 80 32 L 0 32 Z");
                        return (
                          <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id={`metricGrad-c-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={m.positive ? "#10b981" : "#ef4444"} stopOpacity="0.1" />
                                <stop offset="100%" stopColor={m.positive ? "#10b981" : "#ef4444"} stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <line x1="0" y1="20" x2="80" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 3" />
                            <path d={spLine} fill="none" stroke={m.positive ? "#10b981" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={spFill} fill={`url(#metricGrad-c-${index})`} />
                          </svg>
                        );
                      })()}
                    </div>

                    <p className="text-[9px] font-medium text-muted mt-1 truncate">{m.footer}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======= STATUS DONUT + UDA TARGETS BY SITE ======= */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 bg-card rounded-xl border border-card-border/50 p-5"><div className="w-full h-[260px] bg-surface-alt rounded-lg animate-pulse" /></div>
            <div className="lg:col-span-3 bg-card rounded-xl border border-card-border/50 p-5"><div className="w-full h-[280px] bg-surface-alt rounded-lg animate-pulse" /></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Status donut */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-card-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-card-border">
                <h3 className="font-bold text-xs text-heading flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt text-[8px] font-bold text-muted">58</span>
                  <CheckCircle2 size={12} className="text-muted" />
                  Contract Status
                  <InfoIcon title="Contract Status" additionalInfo="Active vs inactive contract distribution" apiEndpoint="/api/dashboard/contracts/kpis" databaseTables={['dentally_contracts']} calculations="Counts contracts grouped by active=true/false. Shown as a donut chart." />
                </h3>
              </div>
              <div className="p-4 flex flex-col items-center">
                <ReactApexChart options={statusDonutOptions} series={statusDonutOptions.series} type="donut" height={260} />
                <div className="flex items-center gap-4 mt-2 text-[10px]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{activeContracts} Active</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-muted" />{inactiveContracts} Inactive</span>
                </div>
              </div>
            </div>

            {/* UDA Targets by Site */}
            <div className="lg:col-span-3 bg-card rounded-xl border border-card-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-card-border">
                <h3 className="font-bold text-xs text-heading flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt text-[8px] font-bold text-muted">59</span>
                  <Building2 size={12} className="text-muted" />
                  UDA Targets by Site
                  <InfoIcon title="UDA Targets by Site" additionalInfo="Sum of UDA targets grouped by dental practice site" apiEndpoint="/api/dashboard/contracts/by-site" databaseTables={['dentally_contracts', 'dentally_sites']} calculations="Groups contracts by site_id, joins with dentally_sites for names. Shows total UDA targets per site as horizontal bar chart." />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={siteBarOptions} series={siteBarOptions.series} type="bar" height={280} />
              </div>
            </div>
          </div>
        )}

        {/* ======= PDS PLUS DONUT + UDA VALUE DISTRIBUTION ======= */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 bg-card rounded-xl border border-card-border/50 p-5"><div className="w-full h-[260px] bg-surface-alt rounded-lg animate-pulse" /></div>
            <div className="lg:col-span-3 bg-card rounded-xl border border-card-border/50 p-5"><div className="w-full h-[220px] bg-surface-alt rounded-lg animate-pulse" /></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* PDS Plus Donut */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-card-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-card-border">
                <h3 className="font-bold text-xs text-heading flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt text-[8px] font-bold text-muted">60</span>
                  <Building2 size={12} className="text-muted" />
                  PDS Plus vs Standard
                  <InfoIcon title="PDS Plus" additionalInfo="Contracts with Personal Dental Services (PDS) Plus enabled" apiEndpoint="/api/dashboard/contracts/kpis" databaseTables={['dentally_contracts']} calculations="Counts contracts where pds_plus = true vs false. Shown as a donut chart." />
                </h3>
              </div>
              <div className="p-4 flex flex-col items-center">
                <ReactApexChart options={pdsDonutOptions} series={pdsDonutOptions.series} type="donut" height={260} />
                <div className="flex items-center gap-4 mt-2 text-[10px]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />{standardContracts} Standard</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" />{pdsPlus} PDS Plus</span>
                </div>
              </div>
            </div>

            {/* UDA Value Distribution */}
            <div className="lg:col-span-3 bg-card rounded-xl border border-card-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-card-border">
                <h3 className="font-bold text-xs text-heading flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt text-[8px] font-bold text-muted">61</span>
                  <DollarSign size={12} className="text-muted" />
                  UDA Value Distribution
                  <InfoIcon title="UDA Value Distribution" additionalInfo="Contract count by UDA monetary value bands" apiEndpoint="/api/dashboard/contracts/value-distribution" databaseTables={['dentally_contracts']} calculations="Groups contracts by uda_value field, counts contracts in each value band. Shown as a column chart." />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={valueDistOptions} series={valueDistOptions.series} type="bar" height={220} />
              </div>
            </div>
          </div>
        )}

        {/* ======= DELIVERY RATE CHART + CONTRACT TIMELINE ======= */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 bg-card rounded-xl border border-card-border/50 p-5"><div className="w-full h-[260px] bg-surface-alt rounded-lg animate-pulse" /></div>
            <div className="lg:col-span-3 bg-card rounded-xl border border-card-border/50 p-5"><div className="w-full h-[200px] bg-surface-alt rounded-lg animate-pulse" /></div>
          </div>
        ) : deliveryData?.contracts?.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            {/* Delivery Rate by Contract */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-card-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-card-border">
                <h3 className="font-bold text-xs text-heading flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt text-[8px] font-bold text-muted">62</span>
                  <TrendingUp size={12} className="text-muted" />
                  Delivery Rate by Contract
                  <InfoIcon title="Delivery Rate" additionalInfo="UDA delivery percentage per contract" apiEndpoint="/api/dashboard/contracts/uda-delivery" databaseTables={['dentally_contracts', 'dentally_nhs_claims']} calculations="For each contract: (delivered UDAs / target UDAs) × 100. Joined with dentally_nhs_claims via contract_id." />
                </h3>
              </div>
              <div className="p-3">
                <ReactApexChart options={deliveryBarOptions} series={deliveryBarOptions.series} type="bar" height={260} />
              </div>
            </div>

            {/* Delivery Trend Area */}
            <div className="lg:col-span-3 bg-card rounded-xl border border-card-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-card-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-heading flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt text-[8px] font-bold text-muted">63</span>
                      <Activity size={12} className="text-muted" />
                      Contract Delivery Performance
                      <InfoIcon title="Delivery Performance" additionalInfo="Overview of delivery rates across all contracts" apiEndpoint="/api/dashboard/contracts/uda-delivery" databaseTables={['dentally_contracts', 'dentally_nhs_claims']} calculations="Delivery rate per contract displayed as an area chart to compare performance across contracts." />
                    </h3>
                    <p className="text-[9px] text-muted font-medium">UDA delivery rate per contract</p>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <ReactApexChart options={timelineTrendOptions} series={timelineTrendOptions.series} type="area" height={200} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-card-border/50 p-8 text-center">
            <p className="text-xs text-muted">No delivery data available</p>
          </div>
        )}

        {/* ======= CONTRACT TIMELINE ======= */}
        {loading ? (
          <div className="bg-card rounded-xl border border-card-border/50 p-5">
            <div className="w-full h-[200px] bg-surface-alt rounded-lg animate-pulse" />
          </div>
        ) : timelineData?.timeline?.length > 0 && (
          <div className="bg-card rounded-xl border border-card-border/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-card-border">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-heading flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt text-[8px] font-bold text-muted">64</span>
                  <CalendarRange size={12} className="text-muted" />
                  Contract Timeline
                  <InfoIcon title="Contract Timeline" additionalInfo="Visual timeline of contract start/end dates with progress" apiEndpoint="/api/dashboard/contracts/timeline" databaseTables={['dentally_contracts']} calculations="Each contract is shown as a bar from start_date to end_date. Progress is calculated as elapsed days / total duration × 100." />
                </h3>
                <span className="text-[9px] font-medium text-muted">{timelineData.total} contracts</span>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {timelineData.timeline.slice(0, 8).map((contract) => {
                  const barColor = contract.active ? "#10b981" : "#94a3b8";
                  const progressColor = contract.pds_plus ? "#a855f7" : "#3b82f6";
                  const progressPct = contract.progress || 0;
                  return (
                    <div key={contract.id} className="flex items-center gap-3">
                      <div className="w-36 shrink-0">
                        <p className="text-[11px] font-semibold text-body truncate leading-tight">{contract.name}</p>
                        <p className="text-[9px] text-muted truncate">{contract.site_name || 'Unknown'}</p>
                      </div>
                      <div className="flex-1 h-6 bg-surface-alt rounded-md overflow-hidden relative">
                        <div className="absolute inset-0" style={{ backgroundColor: barColor, opacity: 0.15 }}></div>
                        <div className="h-full rounded-md transition-all duration-500" style={{ width: `${Math.min(progressPct, 100)}%`, backgroundColor: progressColor, opacity: 0.8 }}></div>
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="text-[9px] font-semibold text-body drop-shadow-sm">{contract.start_date} – {contract.end_date}</span>
                        </div>
                      </div>
                      <div className="w-12 text-right shrink-0">
                        <span className="text-[11px] font-bold text-body">{Math.round(progressPct)}%</span>
                      </div>
                      <div className="w-16 text-right shrink-0">
                        <span className="text-[9px] text-muted font-medium">{(contract.target || 0).toLocaleString()} UDAs</span>
                      </div>
                      <div className="w-12 shrink-0 flex justify-center">
                        {contract.pds_plus ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">PDS+</span>
                        ) : contract.active ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">A</span>
                        ) : (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-surface-alt text-muted">I</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======= DELIVERY TABLE ======= */}
        {loading ? (
          <div className="bg-card rounded-xl border border-card-border/50 p-5">
            <div className="w-full h-[200px] bg-surface-alt rounded-lg animate-pulse" />
          </div>
        ) : deliveryData?.contracts?.length > 0 && (
          <div className="bg-card rounded-xl border border-card-border/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-card-border">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-heading flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt text-[8px] font-bold text-muted">65</span>
                  <Users size={12} className="text-muted" />
                  Contract Delivery Details
                  <InfoIcon title="Contract Delivery" additionalInfo="Per-contract UDA target, delivered, and remaining" apiEndpoint="/api/dashboard/contracts/uda-delivery" databaseTables={['dentally_contracts', 'dentally_nhs_claims']} calculations="Full breakdown of UDA target vs delivered vs remaining per contract." />
                </h3>
                <span className="text-[9px] font-medium text-muted">{deliveryData.total} contracts</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-card-border bg-surface/50">
                    <th className="text-left py-2.5 px-3 font-semibold text-muted">Contract</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-muted">Site</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted">UDA Target</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted">UDA Value</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted">Delivered</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted">Remaining</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-muted">Rate</th>
                    <th className="text-center py-2.5 px-3 font-semibold text-muted">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface">
                  {deliveryData.contracts.map((c, i) => (
                    <tr key={i} className="hover:bg-surface/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-body">{c.name}</td>
                      <td className="py-2.5 px-3 text-muted">{c.site_name || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-body">{c.target.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-body">£{c.uda_value.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{c.uda_delivered.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-amber-600">{c.remaining.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-bold" style={{ color: c.delivery_rate >= 90 ? '#10b981' : c.delivery_rate >= 70 ? '#f59e0b' : '#ef4444' }}>{c.delivery_rate}%</td>
                      <td className="py-2.5 px-3 text-center">
                        {c.active ? (
                          <span className="inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded bg-surface-alt text-muted">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
