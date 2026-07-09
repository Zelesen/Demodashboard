import { useState, useEffect, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import { RefreshCw, TrendingUp, Activity, FileText, CheckCircle2, Clock, DollarSign, Target, UserCheck, Layers, Calendar, BarChart3, PieChart, ArrowRight } from 'lucide-react';
import InfoIcon from '../components/InfoIcon';
import { formatUKCurrency } from '../lib/formatCurrency';

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

export default function TreatmentPlans() {
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(() => {
    const stored = sessionStorage.getItem('treatment_plans_refresh_cooldown');
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
  const [practitionerData, setPractitionerData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [donutFilter, setDonutFilter] = useState('All');
  
  // New data states for creative charts
  const [valueDistribution, setValueDistribution] = useState(null);
  const [completionHeatmap, setCompletionHeatmap] = useState(null);
  const [funnelData, setFunnelData] = useState(null);

  const periodMap = {
    'Today': 'today', 'Last 7 days': '7d', 'Last 30 days': '30d',
    'Last 90 days': '90d', 'Last year': '1y', 'All time': 'all', 'Custom': 'all'
  };

  const populateFromData = useCallback((data) => {
    setKpiData(data.kpiData);
    setPractitionerData(data.practitionerData);
    setTrendsData(data.trendsData);
    setValueDistribution(data.valueDistribution);
    setCompletionHeatmap(data.completionHeatmap);
    setFunnelData(data.funnelData);
  }, []);

  const fetchData = async (period = '30d', startDate = null, endDate = null) => {
    try {
      const baseUrl = 'https://demodashboard-production.up.railway.app/api/dashboard';
      let periodQuery = `period=${period}`;
      if (startDate && endDate) {
        periodQuery += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const [kpiRes, pracRes, trendsRes, distributionRes, heatmapRes, funnelRes] = await Promise.all([
        fetch(`${baseUrl}/treatment-plan-kpis?${periodQuery}`),
        fetch(`${baseUrl}/treatment-plans-by-practitioner?${periodQuery}`),
        fetch(`${baseUrl}/treatment-plan-trends?${periodQuery}`),
        fetch(`${baseUrl}/treatment-plan-value-distribution?${periodQuery}`),
        fetch(`${baseUrl}/treatment-plan-completion-heatmap?${periodQuery}`),
        fetch(`${baseUrl}/treatment-plan-funnel?${periodQuery}`)
      ]);
      const data = {
        kpiData: await kpiRes.json(),
        practitionerData: await pracRes.json(),
        trendsData: await trendsRes.json(),
        valueDistribution: await distributionRes.json(),
        completionHeatmap: await heatmapRes.json(),
        funnelData: await funnelRes.json(),
      };
      populateFromData(data);
      sessionStorage.setItem('tp_data', JSON.stringify(data));
    } catch (error) {
      console.error('Error fetching treatment plan data:', error);
    }
  };

  useEffect(() => {
    const preFetch = async () => {
      const stored = sessionStorage.getItem('tp_data');
      if (stored) {
        populateFromData(JSON.parse(stored));
        return;
      }
      fetchData('7d');
    };
    preFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      fetchData('all', customStartDate, customEndDate);
    } else {
      const period = periodMap[activeFilter] || '7d';
      fetchData(period);
    }
  }, [activeFilter, customStartDate, customEndDate]);

  const syncPageCache = async () => {
    try {
      await fetch('https://demodashboard-production.up.railway.app/api/sync/page?page=treatment-plans', { method: 'POST' });
    } catch (e) {
      console.error('Page cache refresh error:', e);
    }
  };

  const handleRefresh = async () => {
    sessionStorage.removeItem('tp_data');
    setIsRefreshing(true);
    await syncPageCache();
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      await fetchData('all', customStartDate, customEndDate);
    } else {
      const period = periodMap[activeFilter] || '7d';
      await fetchData(period);
    }
    const cooldownUntil = Date.now() + 5 * 60 * 1000;
    setRefreshCooldownUntil(cooldownUntil);
    sessionStorage.setItem('treatment_plans_refresh_cooldown', String(cooldownUntil));
    setIsRefreshing(false);
  };

  const filters = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last year", "All time", "Custom"];

  const currentKpiData = kpiData;

  const getDonutSeries = () => {
    const a = currentKpiData?.activePlans || 0;
    const c = currentKpiData?.completedPlans || 0;
    const p = currentKpiData?.proposedPlans || 0;
    switch (donutFilter) {
      case 'Active': return [a, 0, 0];
      case 'Completed': return [0, c, 0];
      case 'Proposed': return [0, 0, p];
      default: return [a, c, p];
    }
  };

  const statusChartOptions = {
    series: getDonutSeries(),
    chart: {
      type: "donut",
      height: 280,
      fontFamily: "Inter, sans-serif",
      animations: { enabled: true, easing: "easeinout", speed: 1000 },
      dropShadow: { enabled: true, top: 4, left: 2, blur: 8, opacity: 0.05 }
    },
    colors: ["#3b82f6", "#10b981", "#f59e0b"],
    labels: ["Active", "Completed", "Proposed"],
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            name: { show: true, fontSize: "13px", fontWeight: 500, color: "#64748b", offsetY: -4 },
            value: { show: true, fontSize: "24px", fontWeight: 700, color: "#1e293b", offsetY: 8 },
            total: {
              show: true,
              label: "Total Plans",
              fontSize: "11px",
              fontWeight: 500,
              color: "#64748b",
              formatter: function(w) {
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString()
              }
            }
          }
        }
      }
    },
    stroke: { width: 3, colors: ["#ffffff"] },
    fill: {
      type: "gradient",
      gradient: { shade: "light", type: "diagonal1", shadeIntensity: 0.15, opacityFrom: 0.95, opacityTo: 0.85 }
    },
    dataLabels: { enabled: false },
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      fontSize: "12px",
      fontFamily: "Inter, sans-serif",
      markers: { radius: 12, width: 10, height: 10 },
      itemMargin: { horizontal: 12, vertical: 5 }
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px", fontFamily: "Inter, sans-serif" },
      y: {
        formatter: function(val) {
          return val.toLocaleString() + " plans"
        }
      }
    }
  };

  const valueMixOptions = {
    series: [
      { name: "NHS UDA Value", data: trendsData?.trends?.map(t => t.nhsValue) || [] },
      { name: "Private Value", data: trendsData?.trends?.map(t => t.privateValue) || [] }
    ],
    chart: {
      type: "bar",
      height: 300,
      stacked: true,
      toolbar: { show: false },
      fontFamily: "Inter, sans-serif",
      animations: { enabled: true, easing: "easeinout", speed: 800 },
      dropShadow: { enabled: true, top: 2, left: 2, blur: 4, opacity: 0.05 }
    },
    colors: ["#3b82f6", "#10b981"],
    plotOptions: {
      bar: { horizontal: false, borderRadius: 6, borderRadiusApplication: "end", columnWidth: "55%" }
    },
    dataLabels: { enabled: false },
    stroke: { width: 1, colors: ["#ffffff"] },
    xaxis: {
      categories: trendsData?.trends?.map(t => {
        const parts = t.month.split('-');
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${months[parseInt(parts[1])-1]} '${parts[0].slice(2)}`;
      }) || [],
      labels: { style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 },
        formatter: (val) => formatUKCurrency(val)
      }
    },
    fill: {
      type: "gradient",
      gradient: { shade: "light", type: "vertical", shadeIntensity: 0.15, opacityFrom: 0.9, opacityTo: 0.95 }
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px", fontFamily: "Inter, sans-serif" },
      y: { formatter: (val) => formatUKCurrency(val) }
    },
    grid: { borderColor: "#f8fafc", strokeDasharray: 4, padding: { top: 10, right: 10, bottom: 0, left: 10 } },
    legend: {
      position: "top", horizontalAlign: "right", fontSize: "12px", fontFamily: "Inter, sans-serif",
      markers: { radius: 12, width: 10, height: 10 }, itemMargin: { horizontal: 12, vertical: 5 }
    }
  };

  const planTrendOptions = {
    series: [
      { name: "Plans Created", data: trendsData?.trends?.map(t => t.plansCreated) || [] },
      { name: "Plans Completed", data: trendsData?.trends?.map(t => t.plansCompleted) || [] }
    ],
    chart: {
      type: "line",
      height: 280,
      toolbar: { show: false },
      fontFamily: "Inter, sans-serif",
      animations: { enabled: true, easing: "easeinout", speed: 800 },
      dropShadow: { enabled: true, top: 2, left: 2, blur: 4, opacity: 0.05 }
    },
    colors: ["#6366f1", "#10b981"],
    stroke: { curve: "smooth", width: 2.5 },
    dataLabels: { enabled: false },
    xaxis: {
      categories: trendsData?.trends?.map(t => {
        const parts = t.month.split('-');
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${months[parseInt(parts[1])-1]} '${parts[0].slice(2)}`;
      }) || [],
      labels: { style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 } }
    },
    markers: { size: 4, hover: { size: 6 } },
    grid: { borderColor: "#f8fafc", strokeDasharray: 4, padding: { top: 10, right: 10, bottom: 0, left: 10 } },
    tooltip: { theme: "light", style: { fontSize: "12px", fontFamily: "Inter, sans-serif" } },
    legend: {
      position: "top", horizontalAlign: "right", fontSize: "12px", fontFamily: "Inter, sans-serif",
      markers: { radius: 12, width: 10, height: 10 }, itemMargin: { horizontal: 12, vertical: 5 }
    }
  };

  const dateLabel = (() => {
    const today = new Date();
    const formatDate = (d) => {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };
    const end = today;
    switch (activeFilter) {
      case "Today": return formatDate(end);
      case "Last 7 days": { const s = new Date(end); s.setDate(s.getDate() - 6); return `${formatDate(s)} to ${formatDate(end)}`; }
      case "Last 30 days": { const s = new Date(end); s.setDate(s.getDate() - 29); return `${formatDate(s)} to ${formatDate(end)}`; }
      case "Last 90 days": { const s = new Date(end); s.setDate(s.getDate() - 89); return `${formatDate(s)} to ${formatDate(end)}`; }
      case "Last year": { const s = new Date(end); s.setFullYear(s.getFullYear() - 1); return `${formatDate(s)} to ${formatDate(end)}`; }
      case "All time": { const s = new Date('2020-01-01'); return `${formatDate(s)} to ${formatDate(end)}`; }
      case "Custom": {
        if (customStartDate && customEndDate) {
          const s = new Date(customStartDate);
          const e = new Date(customEndDate);
          return `${formatDate(s)} to ${formatDate(e)}`;
        }
        return "Select date range";
      }
      default: return formatDate(end);
    }
  })();

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-50 via-indigo-50/50 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-50/60 via-blue-50/30 to-transparent rounded-full blur-3xl opacity-50" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-5 space-y-3 relative z-10">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="relative group/logo">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl blur-md opacity-30 group-hover/logo:opacity-50 transition-opacity duration-500" />
              <div className="relative w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center shadow-sm">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <FileText size={14} className="text-white" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-[2px] border-white rounded-full shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-[1.3rem] font-bold tracking-tight text-slate-900 leading-tight">
                  Treatment Plans
                </h1>
                <span className="inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 rounded-md border border-indigo-100/50">
                  <FileText size={8} /> PLANS
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100/60">
                  <Layers size={10} /> Care Planning
                </span>
                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                  <Clock size={10} />
                  {dateLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} disabled={isRefreshing || cooldownSecs > 0}
              className="inline-flex items-center gap-1.5 px-3 h-[32px] bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:shadow-sm active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none">
              <RefreshCw size={11} className={`transition-transform duration-700 ease-out ${isRefreshing ? "rotate-180 text-indigo-500" : "text-slate-400"}`} />
              {isRefreshing ? "Syncing..." : cooldownSecs > 0 ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, '0')} left` : "Refresh"}
            </button>
          </div>
        </div>

        {/* ================= FILTERS ================= */}
        <div className="flex items-center gap-1 bg-white border border-slate-200/60 rounded-lg p-0.5 w-fit shadow-sm sticky top-16 z-30">
          {filters.map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <button key={filter} onClick={() => setActiveFilter(filter)}
                className={`px-2.5 h-7 text-[10px] font-semibold tracking-tight rounded-md transition-all duration-200 ${
                  isSelected ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}>
                {filter}
              </button>
            );
          })}

          {/* Custom Date Range Picker */}
          {activeFilter === "Custom" && (
            <div className="flex items-center gap-2 bg-transparent rounded-lg p-2">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-semibold text-slate-600">From:</label>
                <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-semibold text-slate-600">To:</label>
                <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
        </div>

        {/* ================= KPI STRIP ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          {!currentKpiData ? (
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
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100">
              {[
                {
                  title: "Total Plans",
                  value: (currentKpiData.totalPlans || 0).toLocaleString(),
                  icon: FileText,
                  positive: true,
                  sparklineField: 'plansCreated',
                  footer: `${(currentKpiData.activePlans || 0).toLocaleString()} active · ${(currentKpiData.proposedPlans || 0).toLocaleString()} proposed`,
                  tooltip: "All treatment plans created in this period",
                  apiEndpoint: "https://api.dentally.co/v1/treatment_plans",
                  apiFields: [{ field: "completed", role: "Boolean: true = completed, false = active/proposed" }, { field: "start_date", role: "Start date: past/current = active, future = proposed" }],
                  databaseTables: ['dentally_treatment_plans'],
                  calculations: "Counts all treatment plans created in the selected period, grouped by completed boolean and start_date."
                },
                {
                  title: "Completion Rate",
                  value: `${currentKpiData.completionRate}%`,
                  icon: CheckCircle2,
                  positive: currentKpiData.completionRate >= 50,
                  sparklineField: 'plansCompleted',
                  footer: `${(currentKpiData.completedPlans || 0).toLocaleString()} completed`,
                  tooltip: "Percentage of plans marked as completed",
                  apiEndpoint: "https://api.dentally.co/v1/treatment_plans",
                  apiFields: [{ field: "completed", role: "Boolean flag if plan is completed" }],
                  databaseTables: ['dentally_treatment_plans'],
                  calculations: "Completion Rate = (Completed Plans / Total Plans) × 100"
                },
                {
                  title: "Active Plans",
                  value: (currentKpiData.activePlans || 0).toLocaleString(),
                  icon: Activity,
                  positive: true,
                  footer: "in progress",
                  tooltip: "Plans currently active and in progress",
                  apiEndpoint: "https://api.dentally.co/v1/treatment_plans",
                  apiFields: [{ field: "completed", role: "false = not completed (active or proposed)" }, { field: "start_date", role: "≤ today = active, future = proposed" }],
                  databaseTables: ['dentally_treatment_plans'],
                  calculations: "Counts plans where completed = false and start_date ≤ today in the selected period."
                },
                {
                  title: "NHS UDA Value",
                  value: formatUKCurrency(currentKpiData.totalNhsUdaValue),
                  icon: Target,
                  positive: true,
                  sparklineField: 'nhsValue',
                  footer: `${formatUKCurrency(currentKpiData.completedNhsUdaValue)} delivered`,
                  tooltip: "Total NHS UDA value across all plans",
                  apiEndpoint: "https://api.dentally.co/v1/treatment_plans",
                  apiFields: [
                    { field: "nhs_uda_value", role: "NHS UDA value assigned to plan" },
                    { field: "nhs_completed_uda_value", role: "NHS UDA value completed" }
                  ],
                  databaseTables: ['dentally_treatment_plans'],
                  calculations: "Sums nhs_uda_value and nhs_completed_uda_value across all plans in the period."
                },
                {
                  title: "Private Value",
                  value: formatUKCurrency(currentKpiData.totalPrivateValue),
                  icon: DollarSign,
                  positive: true,
                  sparklineField: 'privateValue',
                  footer: "private treatment",
                  tooltip: "Total private treatment value across all plans",
                  apiEndpoint: "https://api.dentally.co/v1/treatment_plans",
                  apiFields: [{ field: "private_treatment_value", role: "Private treatment plan value" }],
                  databaseTables: ['dentally_treatment_plans'],
                  calculations: "Sums private_treatment_value across all plans in the selected period."
                },
                {
                  title: "Avg Item Price",
                  value: formatUKCurrency(currentKpiData.avgItemPrice, 2),
                  icon: TrendingUp,
                  positive: currentKpiData.avgItemPrice >= 50,
                  footer: "per plan item",
                  tooltip: "Average price across all treatment plan items",
                  apiEndpoint: "https://api.dentally.co/v1/treatment_plan_items",
                  apiFields: [{ field: "price", role: "Item price from treatment_plan_items" }],
                  databaseTables: ['dentally_treatment_plan_items'],
                  calculations: "Calculates the average of the price field across all treatment plan items."
                }
              ].map((m, index) => {
                const Icon = m.icon;
                const isPositive = m.positive;
                const trendColor = isPositive ? "#10b981" : "#ef4444";
                const bgAccent = isPositive ? "bg-emerald-50" : "bg-rose-50";
                const textAccent = isPositive ? "text-emerald-600" : "text-rose-500";

                return (
                  <div key={index} className="group p-3.5 hover:bg-slate-50/30 transition-colors duration-200 flex flex-col justify-between min-h-0">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`w-6 h-6 rounded-md ${bgAccent} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon size={11} className={textAccent} />
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-[7px] font-bold text-slate-500 mr-1 shrink-0 self-center">{index + 44}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate">{m.title}</span>
                        <InfoIcon
                          title={m.title}
                          additionalInfo={m.tooltip}
                          apiEndpoint={m.apiEndpoint}
                          apiFields={m.apiFields}
                          databaseTables={m.databaseTables}
                          calculations={m.calculations}
                        />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[1.25rem] font-bold tracking-tight text-slate-900 leading-none">{m.value}</span>
                    </div>
                    <div className="mt-2 h-6 w-full">
                      {(() => {
                        const rawVals = m.sparklineField ? trendsData?.trends?.map(d => d[m.sparklineField]) : null;
                        const sp = m.sparklineField ? sparklinePath(rawVals, 80, 32) : null;
                        const spLine = sp?.line || (isPositive ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4" : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26");
                        const spFill = sp?.fill || (isPositive ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4 L 80 32 L 0 32 Z" : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26 L 80 32 L 0 32 Z");
                        return (
                          <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id={`metricGradTp-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={trendColor} stopOpacity="0.18" />
                                <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
                              </linearGradient>
                              <filter id={`sparkGlow-${index}`}>
                                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>
                            <line x1="0" y1="20" x2="80" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 3" />
                            <path d={spLine} fill="none" stroke={trendColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#sparkGlow-${index})`} />
                            <path d={spLine} fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
                            <path d={spFill} fill={`url(#metricGradTp-${index})`} />
                          </svg>
                        );
                      })()}
                    </div>
                    <p className="text-[9px] font-medium text-slate-400 mt-1 truncate">{m.footer}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= PLAN STATUS DONUT + PRACTITIONER LEAGUE ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Status Donut */}
            <div className="lg:w-[45%] p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
              <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">50</span>
                    <Activity size={12} className="text-slate-400" />
                    Plan Status Breakdown
                  <InfoIcon
                    title="Plan Status"
                    additionalInfo="Distribution of treatment plans by status: Active, Completed, Proposed"
                    apiEndpoint="https://api.dentally.co/v1/treatment_plans"
                    apiFields={[
                      { field: "completed", role: "Boolean: true = completed, false = active/proposed" },
                      { field: "start_date", role: "Distinguishes active (past/current) from proposed (future)" },
                      { field: "completed_at", role: "Timestamp when plan was marked completed" },
                    ]}
                    databaseTables={['dentally_treatment_plans']}
                    calculations="Determines status: completed=true → Completed, completed=false & start_date ≤ today → Active, completed=false & start_date > today → Proposed. Shown as a donut chart with percentages."
                  />
                </h3>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  {["All", "Active", "Completed", "Proposed"].map((tab) => (
                    <button key={tab} onClick={() => setDonutFilter(tab)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all duration-200 ${
                        donutFilter === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      }`}>
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-slate-400 font-medium mb-4">Current period snapshot</p>
              <ReactApexChart options={statusChartOptions} series={statusChartOptions.series} type="donut" height={280} />
            </div>

            {/* Practitioner League */}
            <div className="lg:w-[55%]">
              <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">51</span>
                    <UserCheck size={12} className="text-slate-400" />
                    Plans by Practitioner
                  <InfoIcon
                    title="Practitioner Plans"
                    additionalInfo="Treatment plans created per practitioner with completion rates"
                    apiEndpoint="https://api.dentally.co/v1/treatment_plans , https://api.dentally.co/v1/practitioners"
                    apiFields={[
                      { field: "practitioner_id", role: "Links plan to practitioner" },
                      { field: "completed", role: "Boolean flag to calculate completion rate" },
                      { field: "first_name", role: "Practitioner first name (practitioners API)" },
                      { field: "last_name", role: "Practitioner last name (practitioners API)" },
                    ]}
                    databaseTables={['dentally_treatment_plans', 'dentally_practitioners']}
                    calculations="Groups treatment plans by practitioner_id, joins with practitioners for names. Counts total plans and completed plans per practitioner, computes completion rate as (completed / total) * 100."
                  />
                </h3>
                <p className="text-[9px] text-slate-400 font-medium">Ranked by total plans</p>
              </div>
              <div className="px-2 py-1.5 space-y-0.5 max-h-[340px] overflow-y-auto">
                {practitionerData ? (
                  practitionerData.practitioners.slice(0, 8).map((item, index) => {
                    const rateColor = item.completionRate >= 60 ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                      : item.completionRate >= 30 ? "text-amber-600 bg-amber-50 border-amber-100"
                      : "text-rose-500 bg-rose-50 border-rose-100";
                    return (
                      <div key={item.practitionerId}
                        className="group flex items-center justify-between px-3 py-2 rounded-xl border border-transparent hover:border-slate-200/70 hover:bg-white hover:shadow-sm hover:shadow-slate-200/40 active:scale-[0.99] transition-all duration-200 cursor-default">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border shrink-0 bg-slate-50 text-slate-700 border-slate-100">{index + 1}</span>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-slate-800 truncate">{item.practitionerName}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{item.role} · {item.totalPlans} plans</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${item.completionRate}%` }} />
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border shrink-0 ${rateColor}`}>
                            {item.completionRate}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-5 space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= CHARTS ROW 1 ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Value Mix Chart */}
          {trendsData ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">52</span>
                      <DollarSign size={12} className="text-slate-400" />
                      NHS vs Private Value
                      <InfoIcon
                        title="Value Mix"
                        additionalInfo="NHS UDA value vs private treatment value across treatment plans"
                        apiEndpoint="https://api.dentally.co/v1/treatment_plans"
                        apiFields={[
                          { field: "nhs_uda_value", role: "NHS UDA value assigned to plan" },
                          { field: "private_treatment_value", role: "Private treatment plan value" },
                          { field: "nhs_completed_uda_value", role: "Completed NHS UDA value" },
                        ]}
                        databaseTables={['dentally_treatment_plans']}
                        calculations="Groups plans by month using created_at, sums nhs_uda_value and private_treatment_value separately for each month. Stacked bar chart shows NHS vs private value over 12 months."
                      />
                    </h3>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <ReactApexChart options={valueMixOptions} series={valueMixOptions.series} type="bar" height={300} />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden p-5">
              <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse mb-3" />
              <div className="h-[300px] bg-slate-200 rounded animate-pulse" />
            </div>
          )}

          {/* Plan Trend Chart */}
          {trendsData ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">53</span>
                      <TrendingUp size={12} className="text-slate-400" />
                      Plan Creation vs Completion Trend
                      <InfoIcon
                        title="Plan Trends"
                        additionalInfo="Monthly treatment plan creation and completion volume"
                        apiEndpoint="https://api.dentally.co/v1/treatment_plans"
                        apiFields={[
                          { field: "created_at", role: "Plan creation date for monthly grouping" },
                          { field: "completed_at", role: "Plan completion date for monthly grouping" },
                          { field: "completed", role: "Boolean flag to identify completions" },
                        ]}
                        databaseTables={['dentally_treatment_plans']}
                        calculations="Groups plans by month using created_at (creations) and completed_at (completions). Two line series: one counting plans created per month, another counting plans completed per month over the last 12 months."
                      />
                    </h3>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <ReactApexChart options={planTrendOptions} series={planTrendOptions.series} type="line" height={280} />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden p-5">
              <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse mb-3" />
              <div className="h-[280px] bg-slate-200 rounded animate-pulse" />
            </div>
          )}
        </div>

        {/* ================= CHARTS ROW 2: CREATIVE VISUALIZATIONS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Treatment Plan Funnel */}
          {funnelData ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">54</span>
                  <BarChart3 size={12} className="text-slate-400" />
                  Plan Conversion Funnel
                  <InfoIcon
                    title="Conversion Funnel"
                    additionalInfo="Treatment plan journey from creation to NHS delivery"
                    apiEndpoint="https://api.dentally.co/v1/treatment_plans"
                    apiFields={[
                      { field: "completed", role: "Boolean completion flag" },
                      { field: "nhs_completed_uda_value", role: "NHS UDA value delivered" },
                    ]}
                    databaseTables={['dentally_treatment_plans']}
                    calculations="Tracks plans through stages: Created → Started (active/completed) → Completed → NHS UDA Delivered. Shows conversion rates between each stage."
                  />
                </h3>
              </div>
              <div className="p-5">
                <div className="space-y-1">
                  {funnelData.funnel.map((stage, idx) => {
                    const maxValue = funnelData.funnel[0].count;
                    const width = (stage.count / maxValue) * 100;
                    const prevCount = idx > 0 ? funnelData.funnel[idx - 1].count : stage.count;
                    const conversion = idx > 0 ? ((stage.count / prevCount) * 100).toFixed(1) : null;
                    const barColors = [
                      'from-indigo-500 to-blue-500',
                      'from-blue-500 to-cyan-500',
                      'from-cyan-500 to-teal-500',
                      'from-violet-500 to-purple-500',
                    ];
                    return (
                      <div key={idx} className="relative">
                        {conversion && (
                          <div className="flex justify-center -mb-1 relative z-10">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/60 shadow-sm">
                              <ArrowRight size={8} className="text-amber-500" />
                              <span className="text-[8px] font-bold text-amber-700">{conversion}% conversion</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 py-1.5">
                          <div className="w-16 sm:w-20 shrink-0 text-[10px] sm:text-xs text-slate-600 font-medium text-right leading-tight">{stage.stage}</div>
                          <div className="flex-1 h-7 sm:h-8 bg-slate-100/80 rounded-xl overflow-hidden shadow-inner">
                            <div className={`h-full bg-gradient-to-r ${barColors[idx % barColors.length]} rounded-xl transition-all duration-700 ease-out flex items-center justify-end pr-2`}
                              style={{ width: `${width}%` }}>
                              {width > 12 && <span className="text-[9px] font-bold text-white drop-shadow-sm">{stage.percentage}%</span>}
                            </div>
                          </div>
                          <div className="w-14 sm:w-16 text-[10px] sm:text-xs text-right shrink-0">
                            <span className="font-bold text-slate-800">{stage.count.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> {funnelData.funnel.length} stages</span>
                  <span className="font-medium text-slate-500">{funnelData.funnel[0]?.count.toLocaleString() || 0} total plans entering funnel</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden p-5">
              <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse mb-3" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-slate-200 rounded animate-pulse" />)}
              </div>
            </div>
          )}

          {/* Value Distribution */}
          {valueDistribution ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">55</span>
                  <PieChart size={12} className="text-slate-400" />
                  Plan Value Distribution
                  <InfoIcon
                    title="Value Distribution"
                    additionalInfo="Distribution of treatment plans by total value (NHS + Private)"
                    apiEndpoint="https://api.dentally.co/v1/treatment_plans"
                    apiFields={[
                      { field: "nhs_uda_value", role: "NHS UDA value" },
                      { field: "private_treatment_value", role: "Private treatment value" },
                    ]}
                    databaseTables={['dentally_treatment_plans']}
                    calculations="Calculates total value per plan (NHS + Private), groups into ranges: £0-100, £100-300, £300-500, £500-1000, £1000+. Shows count of plans in each range."
                  />
                </h3>
              </div>
              <div className="p-5">
                <ReactApexChart
                  options={{
                    chart: {
                      type: "donut",
                      height: 300,
                      fontFamily: "Inter, sans-serif",
                      animations: { enabled: true, easing: "easeinout", speed: 800 },
                      dropShadow: { enabled: true, top: 3, left: 1, blur: 6, opacity: 0.08 }
                    },
                    labels: valueDistribution.distribution.map(d => d.range),
                    colors: ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
                    plotOptions: {
                      pie: {
                        donut: {
                          size: "62%",
                          labels: {
                            show: true,
                            name: { show: true, fontSize: "11px", fontWeight: 600, color: "#64748b", offsetY: -4 },
                            value: { show: true, fontSize: "18px", fontWeight: 700, color: "#0f172a", offsetY: 4 },
                            total: {
                              show: true,
                              label: "Total",
                              fontSize: "10px",
                              fontWeight: 600,
                              color: "#94a3b8",
                              formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString()
                            }
                          }
                        }
                      }
                    },
                    stroke: { width: 2, colors: ["#ffffff"] },
                    fill: {
                      type: "gradient",
                      gradient: { shade: "light", type: "diagonal1", shadeIntensity: 0.2, opacityFrom: 0.92, opacityTo: 0.88 }
                    },
                    dataLabels: {
                      enabled: true,
                      formatter: (val) => `${val.toFixed(1)}%`,
                      style: { fontSize: "10px", fontWeight: 600, colors: ["#fff"] },
                      dropShadow: { enabled: true, top: 1, left: 1, blur: 1, opacity: 0.3 }
                    },
                    legend: {
                      position: "bottom",
                      fontSize: "10px",
                      fontFamily: "Inter, sans-serif",
                      markers: { radius: 10, width: 10, height: 10 },
                      itemMargin: { horizontal: 10, vertical: 4 },
                      formatter: (label, opts) => {
                        const count = valueDistribution.distribution[opts.seriesIndex]?.count || 0;
                        return `${label}  (${count.toLocaleString()})`;
                      }
                    },
                    tooltip: {
                      theme: "light",
                      style: { fontSize: "11px", fontFamily: "Inter, sans-serif" },
                      custom: ({ series, seriesIndex, w }) => {
                        const total = series.reduce((a, b) => a + b, 0);
                        const value = series[seriesIndex];
                        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        const label = w.config.labels[seriesIndex];
                        const d = valueDistribution.distribution[seriesIndex];
                        return `
                          <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);font-family:Inter,sans-serif;">
                            <div style="font-size:11px;color:#64748b;font-weight:500;margin-bottom:4px;">${label}</div>
                            <div style="font-size:18px;color:#1e293b;font-weight:700;margin-bottom:2px;">${d?.count || 0} plans</div>
                            <div style="font-size:11px;color:#10b981;font-weight:600;">${pct}% of total</div>
                          </div>
                        `;
                      }
                    },
                    responsive: [{ breakpoint: 480, options: { chart: { height: 250 }, legend: { position: "bottom" } } }]
                  }}
                  series={valueDistribution.distribution.map(d => d.count)}
                  type="donut"
                  height={300}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden p-5">
              <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse mb-3" />
              <div className="h-[280px] bg-slate-200 rounded animate-pulse" />
            </div>
          )}

        </div>



        {/* ================= COMPLETION HEATMAP ================= */}
        <div>
          {/* Completion Heatmap */}
          {completionHeatmap ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden lg:col-span-2">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">60</span>
                  <Calendar size={12} className="text-slate-400" />
                  Completion Heatmap
                  <InfoIcon
                    title="Completion Heatmap"
                    additionalInfo="Plan completions by day of week and hour"
                    apiEndpoint="https://api.dentally.co/v1/treatment_plans"
                    apiFields={[
                      { field: "completed_at", role: "Completion timestamp" },
                      { field: "completed", role: "Boolean flag for completed plans" },
                    ]}
                    databaseTables={['dentally_treatment_plans']}
                    calculations="Extracts day of week and hour from completed_at timestamp, counts completions in each time slot, shows heatmap intensity."
                  />
                </h3>
              </div>
              <div className="p-5">
                {(() => {
                  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  const heatColors = ["#f1f5f9", "#e0e7ff", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5", "#4338ca"];
                  const hmSeries = days.map(day => ({
                    name: day.slice(0, 3),
                    data: Array.from({ length: 12 }, (_, b) => {
                      const hour = b * 2;
                      const cells = completionHeatmap.heatmap.filter(h => h.day === day && (h.hour === hour || h.hour === hour + 1));
                      const val = cells.reduce((s, c) => s + c.value, 0);
                      return { x: `${String(hour).padStart(2, '0')}:00`, y: val };
                    })
                  }));
                  return (
                    <ReactApexChart
                      options={{
                        chart: {
                          type: "heatmap",
                          height: 260,
                          fontFamily: "Inter, sans-serif",
                          toolbar: { show: false },
                          animations: { enabled: true, easing: "easeinout", speed: 600 }
                        },
                        colors: heatColors,
                        plotOptions: {
                          heatmap: {
                            shadeIntensity: 0.5,
                            radius: 4,
                            useFillColorAsStroke: false,
                            colorScale: { ranges: [{ from: 0, to: 0, color: "#f1f5f9", name: "none" }] }
                          }
                        },
                        dataLabels: {
                          enabled: true,
                          style: { colors: ["#1e293b"], fontSize: "9px", fontWeight: 600 },
                          formatter: (val) => val || ""
                        },
                        xaxis: {
                          labels: { style: { colors: "#64748b", fontSize: "9px", fontWeight: 500 }, rotate: 0 },
                          axisBorder: { show: false },
                          axisTicks: { show: false }
                        },
                        yaxis: {
                          labels: { style: { colors: "#64748b", fontSize: "10px", fontWeight: 600 } },
                          show: true
                        },
                        grid: { show: false },
                        tooltip: {
                          theme: "light",
                          style: { fontSize: "11px", fontFamily: "Inter, sans-serif" },
                          y: { formatter: (val) => `${val} completions` }
                        },
                        legend: {
                          show: true,
                          position: "bottom",
                          fontSize: "9px",
                          fontFamily: "Inter, sans-serif",
                          markers: { radius: 4, width: 12, height: 12 },
                          itemMargin: { horizontal: 4 },
                          formatter: (label, opts) => {
                            const from = opts.from;
                            const to = opts.to;
                            if (from === undefined) return label;
                            return `${from}${to !== undefined ? `-${to}` : '+'}`;
                          }
                        }
                      }}
                      series={hmSeries}
                      type="heatmap"
                      height={260}
                    />
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden lg:col-span-2 p-5">
              <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse mb-3" />
              <div className="h-[280px] bg-slate-200 rounded animate-pulse" />
            </div>
          )}
        </div>




      </div>
    </div>
  );
}
