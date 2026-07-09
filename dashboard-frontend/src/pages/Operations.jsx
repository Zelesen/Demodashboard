import { useState, useEffect, Fragment } from 'react';
import ReactApexChart from 'react-apexcharts';
import { RefreshCw, TrendingUp, TrendingDown, Activity, Building2, CalendarRange, AlertCircle, CheckCircle2, Cpu, MapPin, Layers, Target } from 'lucide-react';
import InfoIcon from '../components/InfoIcon';

export default function Operations() {
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [operationsData, setOperationsData] = useState(null);
  const [practiceLeague, setPracticeLeague] = useState(null);
  const [capacityData, setCapacityData] = useState(null);
  const [recallData, setRecallData] = useState(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(() => {
    const stored = sessionStorage.getItem('operations_refresh_cooldown');
    return stored ? Number(stored) : 0;
  });
  const [cooldownSecs, setCooldownSecs] = useState(0);

  useEffect(() => {
    if (refreshCooldownUntil <= Date.now()) {
      setCooldownSecs(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((refreshCooldownUntil - Date.now()) / 1000));
      setCooldownSecs(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [refreshCooldownUntil]);

  const periodMap = {
    'Today': 'today', 'Last 7 days': '7d', 'Last 30 days': '30d',
    'Last 90 days': '90d', 'Last year': '1y', 'All time': 'all', 'Custom': 'all'
  };

  const fetchOperationsData = async (period = '7d', startDate = null, endDate = null) => {
    try {
      const baseUrl = 'https://demodashboard-production.up.railway.app/api/dashboard';
      let periodQuery = `period=${period}`;
      if (startDate && endDate) {
        periodQuery += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const [kpiRes, leagueRes, capacityRes, recallRes] = await Promise.all([
        fetch(`${baseUrl}/operations-kpis?${periodQuery}`),
        fetch(`${baseUrl}/practice-league?${periodQuery}`),
        fetch(`${baseUrl}/capacity-data`),
        fetch(`${baseUrl}/recall-backlog`)
      ]);
      const kpiData = await kpiRes.json();
      const leagueData = await leagueRes.json();
      const capacity = await capacityRes.json();
      const recall = await recallRes.json();
      setOperationsData(kpiData);
      setPracticeLeague(leagueData);
      setCapacityData(capacity);
      setRecallData(recall);
    } catch (error) {
      console.error('Error fetching operations data:', error);
    }
  };
  
  useEffect(() => {
    (async () => {
      await syncPageCache();
      fetchOperationsData('7d');
    })();
  }, []);
  
  useEffect(() => {
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      fetchOperationsData('all', customStartDate, customEndDate);
    } else {
      const period = periodMap[activeFilter] || '7d';
      fetchOperationsData(period);
    }
  }, [activeFilter, customStartDate, customEndDate]);

  const syncPageCache = async () => {
    try {
      await fetch('https://demodashboard-production.up.railway.app/api/sync/page?page=operations', { method: 'POST' });
    } catch (error) {
      console.error('Error refreshing page cache:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await syncPageCache();
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      await fetchOperationsData('all', customStartDate, customEndDate);
    } else {
      const period = periodMap[activeFilter] || '7d';
      await fetchOperationsData(period);
    }
    const cooldownUntil = Date.now() + 5 * 60 * 1000;
    setRefreshCooldownUntil(cooldownUntil);
    sessionStorage.setItem('operations_refresh_cooldown', String(cooldownUntil));
    setIsRefreshing(false);
    window.location.reload();
  };

  const filters = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last year", "All time", "Custom"];

  const currentKpiData = operationsData;

  const fallbackRecallData = [
    { category: "30 days overdue", count: 874, percentage: 100 },
    { category: "60 days overdue", count: 621, percentage: 71 },
    { category: "90 days overdue", count: 489, percentage: 56 },
    { category: "180+ days overdue", count: 538, percentage: 62 },
  ];

  const heatmapData = [
    { time: "08", mon: "empty", tue: "empty", wed: "empty", thu: "empty", fri: "empty", sat: "empty" },
    { time: "09", mon: "empty", tue: "empty", wed: "empty", thu: "empty", fri: "empty", sat: "empty" },
    { time: "10", mon: "patchy", tue: "empty", wed: "empty", thu: "empty", fri: "empty", sat: "empty" },
    { time: "11", mon: "full", tue: "full", wed: "full", thu: "full", fri: "full", sat: "full" },
    { time: "12", mon: "full", tue: "full", wed: "full", thu: "full", fri: "full", sat: "full" },
    { time: "13", mon: "full", tue: "full", wed: "full", thu: "full", fri: "full", sat: "full" },
    { time: "14", mon: "full", tue: "full", wed: "full", thu: "full", fri: "full", sat: "full" },
    { time: "15", mon: "full", tue: "full", wed: "full", thu: "full", fri: "full", sat: "full" },
    { time: "16", mon: "full", tue: "full", wed: "full", thu: "full", fri: "full", sat: "full" },
    { time: "17", mon: "full", tue: "full", wed: "full", thu: "full", fri: "full", sat: "full" },
    { time: "18", mon: "full", tue: "full", wed: "full", thu: "full", fri: "full", sat: "full" },
    { time: "19", mon: "full", tue: "full", wed: "full", thu: "full", fri: "full", sat: "full" },
  ];

  const udaData = [
    { name: "Northampton", progress: 95, delivered: "3,456 / 3,611", status: "on track" },
    { name: "Coventry", progress: 87, delivered: "7,800 / 34,853", status: "watch" },
    { name: "Lincoln", progress: 82, delivered: "8,385 / 27,316", status: "on track" },
    { name: "Peterborough", progress: 80, delivered: "8,009 / 37,634", status: "on track" },
    { name: "Derby", progress: 78, delivered: "5,892 / 23,948", status: "on track" },
    { name: "Kettering", progress: 75, delivered: "8,043 / 33,812", status: "on track" },
    { name: "Loughborough", progress: 72, delivered: "4,173 / 17,489", status: "on track" },
    { name: "Nottingham", progress: 68, delivered: "6,581 / 28,231", status: "on track" },
  ];

  const conversionData = {
    enquiries: "283",
    attended: "70% - 79%",
    breakdown: [
      { stage: "Enquiries", count: 283, percentage: 100 },
      { stage: "Contacted", count: 245, percentage: 87 },
      { stage: "Booked", count: 198, percentage: 70 },
      { stage: "Attended 1st visit", count: 176, percentage: 62 },
    ]
  };

  const timeLeakData = [
    { category: "Booked chair value", value: 240.4, color: "#3b82f6" },
    { category: "FTA", value: 124.8, color: "#ef4444" },
    { category: "Short-notice cancel", value: 130.6, color: "#f97316" },
    { category: "White space", value: 142.4, color: "#e5e7eb" },
    { category: "Recall production", value: 124.4, color: "#10b981" },
  ];

  const lostChairLeague = [
    { rank: 1, name: "Loughborough", value: "£23.8k", fta: "4.9% FTA" },
    { rank: 2, name: "Coventry", value: "£23.5k", fta: "5.7% FTA" },
    { rank: 3, name: "Rugby", value: "£22.8k", fta: "7.2% FTA" },
    { rank: 4, name: "Kettering", value: "£22.5k", fta: "8.1% FTA" },
    { rank: 5, name: "Nottingham", value: "£21.9k", fta: "10.2% FTA" },
    { rank: 6, name: "Leicester", value: "£21.6k", fta: "10.0% FTA" },
    { rank: 7, name: "Peterborough", value: "£14.9k", fta: "8.2% FTA" },
    { rank: 8, name: "Lincoln", value: "£12.7k", fta: "9.9% FTA" },
  ];

  const getCapacityData = () => {
    return [];
  };

  const getUtilisationColor = (value) => {
    if (value >= 85) return "#10b981";
    if (value >= 75) return "#f59e0b";
    return "#ef4444";
  };

  const getHeatmapColor = (status) => {
    switch(status) {
      case "empty": return "#fef3c7";
      case "patchy": return "#fed7aa";
      case "full": return "#3b82f6";
      default: return "#e5e7eb";
    }
  };

  const currentData = capacityData?.chart_data || getCapacityData();
  const capacityChartOptions = {
    series: [
      { name: "Attended", data: currentData.map(d => d.attended) },
      { name: "FTA", data: currentData.map(d => d.fta) },
      { name: "Cancelled", data: currentData.map(d => d.cancelled) },
      { name: "Capacity", data: currentData.map(d => d.capacity) }
    ],
    chart: {
      type: "bar",
      height: 350,
      stacked: true,
      toolbar: { show: false },
      fontFamily: "Inter, sans-serif",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800
      },
      dropShadow: {
        enabled: true,
        top: 2,
        left: 2,
        blur: 4,
        opacity: 0.05
      }
    },
    colors: ["#3b82f6", "#ef4444", "#f97316", "#cbd5e1"],
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 6,
        borderRadiusApplication: "end",
        columnWidth: "55%"
      }
    },
    dataLabels: { enabled: false },
    stroke: {
      width: 1,
      colors: ["#ffffff"]
    },
    xaxis: {
      categories: currentData.map(d => d.day),
      labels: {
        style: { colors: "#64748b", fontSize: "12px", fontWeight: 500 }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: "#64748b", fontSize: "12px", fontWeight: 500 }
      }
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.15,
        opacityFrom: 0.9,
        opacityTo: 0.95,
        stops: [0, 90, 100]
      }
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px", fontFamily: "Inter, sans-serif" },
      y: {
        formatter: (val) => val + " hrs"
      },
      shared: true,
      intersect: false
    },
    grid: {
      borderColor: "#f8fafc",
      strokeDasharray: 4,
      padding: { top: 10, right: 10, bottom: 0, left: 10 }
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      fontFamily: "Inter, sans-serif",
      markers: { radius: 12, width: 10, height: 10 },
      itemMargin: { horizontal: 12, vertical: 5 }
    }
  };

  // ApexCharts configuration for UDA Donut Chart
  const udaDonutOptions = {
    series: [23.7, 76.3],
    chart: {
      type: "donut",
      height: 280,
      fontFamily: "Inter, sans-serif",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 1000
      },
      dropShadow: {
        enabled: true,
        top: 4,
        left: 2,
        blur: 8,
        opacity: 0.05
      }
    },
    colors: ["#3b82f6", "#f1f5f9"],
    labels: ["UDA Delivered", "Remaining"],
    plotOptions: {
      pie: {
        donut: {
          size: "78%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "13px",
              fontWeight: 500,
              color: "#64748b",
              offsetY: -4
            },
            value: {
              show: true,
              fontSize: "30px",
              fontWeight: 700,
              color: "#1e293b",
              offsetY: 8,
              formatter: (val) => val + "%"
            },
            total: {
              show: true,
              label: "UDA Delivered",
              fontSize: "11px",
              fontWeight: 500,
              color: "#64748b",
              formatter: () => "23.7%"
            }
          }
        }
      }
    },
    stroke: {
      width: 3,
      colors: ["#ffffff"]
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "diagonal1",
        shadeIntensity: 0.15,
        opacityFrom: 0.95,
        opacityTo: 0.85
      }
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px", fontFamily: "Inter, sans-serif" }
    }
  };

  // ApexCharts configuration for Recall Funnel
  const recallFunnelOptions = {
    series: [{
      name: "Patients",
      data: (recallData?.recall_data || fallbackRecallData).map(d => d.count)
    }],
    chart: {
      type: "bar",
      height: 300,
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800
      }
    },
    colors: ["#f43f5e", "#fb7185", "#fda4af", "#ffe4e6"],
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "60%",
        distributed: true
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => val,
      style: {
        fontSize: "12px",
        fontWeight: 600,
        colors: ["#ffffff"]
      }
    },
    xaxis: {
      categories: (recallData?.recall_data || fallbackRecallData).map(d => d.category),
      labels: {
        rotate: -30,
        rotateAlways: false,
        style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { show: false },
    grid: { show: false },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.15,
        opacityFrom: 0.95,
        opacityTo: 0.8,
        stops: [0, 90, 100]
      }
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px", fontFamily: "Inter, sans-serif" },
      y: {
        formatter: (val) => val + " patients"
      }
    }
  };

  // ApexCharts configuration for Conversion Funnel
  const conversionFunnelOptions = {
    series: [{
      name: "Enquiries",
      data: conversionData.breakdown.map(d => d.count)
    }],
    chart: {
      type: "bar",
      height: 300,
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800
      }
    },
    colors: ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"],
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "60%",
        distributed: true,
        horizontal: true
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => val,
      style: {
        fontSize: "12px",
        fontWeight: 600,
        colors: ["#ffffff"]
      }
    },
    xaxis: {
      categories: conversionData.breakdown.map(d => d.stage),
      labels: {
        style: { colors: "#64748b", fontSize: "12px", fontWeight: 500 }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 }
      }
    },
    grid: { show: false },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "horizontal",
        shadeIntensity: 0.15,
        opacityFrom: 0.95,
        opacityTo: 0.8,
        stops: [0, 100]
      }
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px", fontFamily: "Inter, sans-serif" }
    }
  };

  // ApexCharts configuration for Time Leak Horizontal Bar
  const timeLeakOptions = {
    series: [{
      name: "Lost Value",
      data: timeLeakData.map(d => d.value)
    }],
    chart: {
      type: "bar",
      height: 300,
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800
      }
    },
    colors: timeLeakData.map(d => d.color),
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "60%",
        distributed: true,
        horizontal: true
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => "£" + val + "k",
      style: {
        fontSize: "11px",
        fontWeight: 600,
        colors: ["#1e293b"]
      }
    },
    xaxis: {
      categories: timeLeakData.map(d => d.category),
      labels: {
        style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 }
      }
    },
    grid: {
      borderColor: "#f8fafc",
      strokeDasharray: 4,
      padding: { top: 0, right: 10, bottom: 0, left: 0 }
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "horizontal",
        shadeIntensity: 0.15,
        opacityFrom: 0.95,
        opacityTo: 0.8
      }
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px", fontFamily: "Inter, sans-serif" },
      y: {
        formatter: (val) => "£" + val + "k"
      }
    }
  };

  const dateLabel = (() => {
    const today = new Date();
    const formatDate = (d) => {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };
    const formatMonthYear = (d) => {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[d.getMonth()]} ${d.getFullYear()}`;
    };
    const end = today;
    switch (activeFilter) {
      case "Today": return formatDate(end);
      case "Last 7 days": {
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        return `${formatDate(start)} to ${formatDate(end)}`;
      }
      case "Last 30 days": {
        const start = new Date(end);
        start.setDate(start.getDate() - 29);
        return `${formatDate(start)} to ${formatDate(end)}`;
      }
      case "Last 90 days": {
        const start = new Date(end);
        start.setDate(start.getDate() - 89);
        return `${formatDate(start)} to ${formatDate(end)}`;
      }
      case "Last year": {
        const start = new Date(end);
        start.setFullYear(start.getFullYear() - 1);
        return `${formatMonthYear(start)} to ${formatMonthYear(end)}`;
      }
      case "All time": return "All available history";
      case "Custom": {
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          return `${formatDate(start)} to ${formatDate(end)}`;
        }
        return "Select date range";
      }
      default: return formatDate(end);
    }
  })();

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased">
      
      {/* ============ AMBIENT BACKGROUND DECOR ============ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-50 via-indigo-50/50 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-50/60 via-blue-50/30 to-transparent rounded-full blur-3xl opacity-50" />
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-5 space-y-3 relative z-10">
        
        {/* ================= HEADER ROW ================= */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="relative group/logo">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl blur-md opacity-30 group-hover/logo:opacity-50 transition-opacity duration-500" />
              <div className="relative w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center shadow-sm">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Activity size={14} className="text-white" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-[2px] border-white rounded-full shadow-sm" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-[1.3rem] font-bold tracking-tight text-slate-900 leading-tight">
                  Operations
                </h1>
                <span className="inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 rounded-md border border-indigo-100/50">
                  <Cpu size={8} /> IDA
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100/60">
                  <Building2 size={10} /> 10 Practices Active
                </span>
                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
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
              {isRefreshing ? "Syncing..." : cooldownSecs > 0 ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, '0')} left` : "Refresh"}
            </button>
          </div>
        </div>

        {/* ================= FILTER TABS ================= */}
        <div className="flex items-center gap-1 bg-white border border-slate-200/60 rounded-lg p-0.5 w-fit shadow-sm sticky top-16 z-30">
          {filters.map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2.5 h-7 text-[10px] font-semibold tracking-tight rounded-md transition-all duration-200 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* Custom Date Range Picker */}
        {activeFilter === "Custom" && (
          <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-lg p-2 shadow-sm w-fit">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-slate-600">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-slate-600">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* ================= KPI METRICS STRIP ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          {!operationsData ? (
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
                  title: "Chair Utilisation",
                  value: `${currentKpiData.utilisation}%`,
                  change: `${currentKpiData.utilisationChange < 0 ? '' : '+'}${currentKpiData.utilisationChange}pp`,
                  positive: currentKpiData.utilisationChange >= 0,
                  footer: "target 85%",
                  icon: TrendingUp,
                  tooltip: "Percentage of available chair time that is booked"
                },
                {
                  title: "Diary White Space",
                  value: `${currentKpiData.whiteSpace} hrs`,
                  change: `${currentKpiData.whiteSpaceChange > 0 ? '+' : ''}${currentKpiData.whiteSpaceChange}%`,
                  positive: currentKpiData.whiteSpaceChange <= 0,
                  footer: "unbooked chair time",
                  icon: TrendingDown,
                  tooltip: "Unbooked chair time in the diary"
                },
                {
                  title: "UDA Delivery Pace",
                  value: currentKpiData.udaPace,
                  change: `${currentKpiData.udaChange > 0 ? '+' : ''}${currentKpiData.udaChange}pp`,
                  positive: currentKpiData.udaChange >= 0,
                  footer: "on-pace 100",
                  icon: Target,
                  tooltip: "NHS UDA delivery rate vs target pace"
                },
                {
                  title: "Recalls Overdue",
                  value: currentKpiData.recallsOverdue.toLocaleString(),
                  change: `${currentKpiData.recallsChange > 0 ? '+' : ''}${currentKpiData.recallsChange}%`,
                  positive: currentKpiData.recallsChange <= 0,
                  footer: "patients past recall",
                  icon: AlertCircle,
                  tooltip: "Patients with overdue recall appointments"
                },
                {
                  title: "FTA + Short Notice",
                  value: `${currentKpiData.ftaShortNotice}%`,
                  change: `${currentKpiData.ftaChange > 0 ? '+' : ''}${currentKpiData.ftaChange}pp`,
                  positive: currentKpiData.ftaChange <= 0,
                  footer: "target 5%",
                  icon: CheckCircle2,
                  tooltip: "Failed to attend and short notice cancellations"
                },
                {
                  title: "New-Patient Attend Rate",
                  value: `${currentKpiData.newPatientRate}%`,
                  change: `${currentKpiData.newPatientChange > 0 ? '+' : ''}${currentKpiData.newPatientChange}pp`,
                  positive: currentKpiData.newPatientChange >= 0,
                  footer: "enquiry to 1st visit",
                  icon: Activity,
                  tooltip: "Enquiry to first visit conversion rate"
                }
              ].map((m, index) => {
                const isPositive = m.positive;
                const Icon = m.icon;
                const trendColor = isPositive ? "#10b981" : "#ef4444";
                const bgAccent = isPositive ? "bg-emerald-50" : "bg-rose-50";
                const textAccent = isPositive ? "text-emerald-600" : "text-rose-500";
                
                return (
                  <div key={index} className="group p-3.5 hover:bg-slate-50/30 transition-colors duration-200 flex flex-col justify-between min-h-0">
                    {/* Header: icon + title + info */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`w-6 h-6 rounded-md ${bgAccent} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon size={11} className={textAccent} />
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate">
                          {m.title}
                        </span>
                        <InfoIcon 
                          title={m.title}
                          additionalInfo={m.tooltip}
                        />
                      </div>
                    </div>

                    {/* Value + badge */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[1.25rem] font-bold tracking-tight text-slate-900 leading-none">
                        {m.value}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                        isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                      }`}>
                        {isPositive ? '+' : ''}{m.change}
                      </span>
                    </div>

                    {/* Sparkline */}
                    <div className="mt-2 h-6 w-full">
                      <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={`metricGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={trendColor} stopOpacity="0.1" />
                            <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <line x1="0" y1="20" x2="80" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 3" />
                        <path 
                          d={isPositive 
                            ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4" 
                            : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26"
                          } 
                          fill="none" stroke={trendColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" 
                        />
                        <path 
                          d={isPositive 
                            ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4 L 80 32 L 0 32 Z"
                            : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26 L 80 32 L 0 32 Z"
                          }
                          fill={`url(#metricGrad-${index})`} 
                        />
                      </svg>
                    </div>

                    {/* Footer */}
                    <p className="text-[9px] font-medium text-slate-400 mt-1 truncate">
                      {m.footer}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= PRACTICE UTILISATION LEAGUE ================= */}
        {practiceLeague ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* League Table - ~50% width */}
              <div className="lg:w-[50%] relative">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-400" />
                      Practice Utilisation League
                      <InfoIcon 
                        title="Practice Utilisation League"
                        additionalInfo="Every practice ranked on chair utilisation vs target"
                      />
                    </h3>
                    <p className="text-[9px] text-slate-400 font-medium">Ranked by chair utilisation vs 85% target</p>
                  </div>
                </div>

                {/* Ranking Rows */}
                <div className="px-2 py-1.5 space-y-0.5">
                  {practiceLeague.practices.slice(0, 5).map((item, index) => {
                    const statusDot = item.utilisation >= 85 ? "bg-emerald-500" : item.utilisation >= 75 ? "bg-amber-400" : "bg-rose-500";
                    const scoreColor = item.utilisation >= 85 ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
                      : item.utilisation >= 75 ? "text-amber-600 bg-amber-50 border-amber-100" 
                      : "text-rose-500 bg-rose-50 border-rose-100";

                    return (
                      <div
                        key={item.name}
                        className="group flex items-center justify-between px-3 py-2 rounded-xl border border-transparent hover:border-slate-200/70 hover:bg-white hover:shadow-sm hover:shadow-slate-200/40 active:scale-[0.99] transition-all duration-200 cursor-default"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border shrink-0 transition-all duration-200 group-hover:scale-105 bg-slate-50 text-slate-700 border-slate-100">
                            {index + 1}
                          </span>
                          <div className="relative">
                            <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border-[1.5px] border-white shrink-0 ${statusDot}`} />
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200/60`}>
                              {item.name.charAt(0)}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-slate-800 truncate group-hover:text-slate-900 transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              {item.appointments || 0} appointments · target 85%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${item.utilisation}%`, backgroundColor: getUtilisationColor(item.utilisation) }}
                            />
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border shrink-0 transition-all duration-200 group-hover:scale-105 ${scoreColor}`}>
                            {item.utilisation}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtle Vertical Divider */}
                <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
              </div>

              {/* White-space Heatmap - ~50% width */}
              <div className="lg:w-[50%] flex flex-col">
                {/* Header */}
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    White-space Heatmap
                    <InfoIcon 
                      title="White-space Heatmap"
                      additionalInfo="When the chairs sit empty across the estate - weekday by working hour"
                    />
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium">Estate average fill: 70%</p>
                </div>

                {/* Heatmap Container */}
                <div className="flex-1 px-2 pb-2">
                  <div className="h-full rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-200/50 overflow-hidden flex flex-col min-h-[200px]">
                    <div className="flex-1 overflow-x-auto">
                      <div className="grid grid-cols-13 gap-1.5 min-w-[500px] p-2">
                        {/* Header row with time labels */}
                        <div className="text-[9px] text-slate-400 p-1"></div>
                        {heatmapData.map((row) => (
                          <div key={`time-${row.time}`} className="text-[9px] text-slate-500 font-medium p-1 text-center">{row.time}:00</div>
                        ))}
                        
                        {/* Day rows */}
                        {["mon", "tue", "wed", "thu", "fri", "sat"].map((dayKey) => {
                          const dayName = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" }[dayKey];
                          
                          return (
                            <Fragment key={dayKey}>
                              {/* Day label */}
                              <div className="text-[9px] text-slate-500 p-1 flex items-center font-semibold">{dayName}</div>
                              
                              {/* Heatmap cells for each time slot */}
                              {heatmapData.map((row) => {
                                const status = row[dayKey];
                                const color = getHeatmapColor(status);
                                const isDeadest = row.time === "19" && dayKey === "sat";

                                return (
                                  <div key={`${dayKey}-${row.time}`} className="relative group aspect-square p-0.5">
                                    <div
                                      className={`w-full h-full rounded shadow-sm hover:scale-110 hover:shadow-md hover:z-10 transition-all duration-200 cursor-pointer ${
                                        isDeadest ? "ring-2 ring-red-500 animate-pulse" : ""
                                      }`}
                                      style={{ backgroundColor: color }}
                                    />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 bg-slate-900 text-white text-[10px] rounded-lg p-2 shadow-xl whitespace-nowrap z-30 font-medium">
                                      <div className="font-bold text-[11px] mb-1 text-slate-200">{dayName} {row.time}:00</div>
                                      <div className="flex items-center gap-1.5 text-slate-300">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                        {status === "full" ? "Full (>82%)" : status === "patchy" ? "Patchy (50-82%)" : "Empty (<50%)"}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 px-5 py-2 border-t border-slate-100 bg-slate-50/30">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Status</span>
                  <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-500">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/30" /> On Target
                  </span>
                  <span className="w-px h-2.5 bg-slate-200" />
                  <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-500">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shadow-sm shadow-amber-400/30" /> Near Baseline
                  </span>
                  <span className="w-px h-2.5 bg-slate-200" />
                  <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-500">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-sm shadow-rose-500/30" /> Behind
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              <div className="lg:w-[50%] p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse"></div>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 bg-slate-200 rounded animate-pulse"></div>
                ))}
              </div>
              <div className="lg:w-[50%] p-5">
                <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse mb-3"></div>
                <div className="h-[200px] bg-slate-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CAPACITY VS BOOKED VS ATTENDED ================= */}
        {capacityData ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Layers size={12} className="text-slate-400" />
                    Capacity vs Booked vs Attended
                    <InfoIcon 
                      title="Capacity Analysis"
                      additionalInfo="Chair hours attended against available capacity, with the leakage breakdown"
                    />
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium">Chair hours attended against available capacity</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                    <span className="text-[10px] text-slate-600">Attended</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                    <span className="text-[10px] text-slate-600">FTA</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>
                    <span className="text-[10px] text-slate-600">Cancelled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 bg-slate-300 rounded-full"></div>
                    <span className="text-[10px] text-slate-600">Capacity</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5">
              <ReactApexChart
                options={capacityChartOptions}
                series={capacityChartOptions.series}
                type="bar"
                height={300}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden p-5">
            <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse mb-3"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse mb-6"></div>
            <div className="h-[300px] bg-slate-200 rounded animate-pulse"></div>
          </div>
        )}

        {/* ================= UDA CONTRACT PACE BOARD ================= */}
        {operationsData ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-400" />
                    UDA Contract Pace Board (NHS)
                    <InfoIcon 
                      title="UDA Contract Pace Board"
                      additionalInfo="Delivery against the contract-year glidepath, by NHS practice"
                    />
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium">Year-end clawback exposure: £60.5k</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex items-center justify-center">
                  <ReactApexChart
                    options={udaDonutOptions}
                    series={udaDonutOptions.series}
                    type="donut"
                    height={250}
                  />
                </div>

                <div className="space-y-3">
                  {udaData.map((practice, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{practice.name}</span>
                          <span className="text-xs text-slate-500">{practice.delivered}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${practice.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        practice.status === "watch" ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {practice.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Bar = delivered to date · vertical mark = on-pace by today</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden p-5">
            <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse mb-3"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse mb-6"></div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-[280px] bg-slate-200 rounded animate-pulse"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-12 bg-slate-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= RECALL REACTIVATION FUNNEL ================= */}
        {recallData ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Activity size={12} className="text-slate-400" />
                    Recall Reactivation Funnel
                    <InfoIcon 
                      title="Recall Reactivation Funnel"
                      additionalInfo="Due to attended, with the overdue backlog by age"
                    />
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium">Reactivation value: £68.3k</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Overdue backlog by age</h3>
                  <ReactApexChart
                    options={recallFunnelOptions}
                    series={recallFunnelOptions.series}
                    type="bar"
                    height={250}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">New-patient flow & front-desk conversion</h3>
                  <p className="text-xs text-slate-500 mb-4">Enquiries to attended first visit, by source</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-slate-500">Booking to attend</p>
                      <p className="text-lg font-bold text-slate-800">70% - 79%</p>
                    </div>
                  </div>

                  <ReactApexChart
                    options={conversionFunnelOptions}
                    series={conversionFunnelOptions.series}
                    type="bar"
                    height={250}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden p-5">
            <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse mb-3"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse mb-6"></div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-[300px] bg-slate-200 rounded animate-pulse"></div>
              <div className="h-[300px] bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
        )}

        {/* ================= WHERE TIME LEAKS & LOST CHAIR TIME LEAGUE ================= */}
        {operationsData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Where Time Leaks - Enhanced with ApexCharts */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <TrendingDown size={12} className="text-slate-400" />
                    Where Time Leaks: FTA & Cancellation
                    <InfoIcon 
                      title="Time Leaks Analysis"
                      additionalInfo="Bookable chair value leaked down to unrealised production"
                    />
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium">Recoverable with reminders & deposits: £64.1k</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <ReactApexChart
                options={timeLeakOptions}
                series={timeLeakOptions.series}
                type="bar"
                height={250}
              />

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                <span>£237 average chair value per hour · £40.2k lost to FTA & cancellations this period.</span>
              </div>
            </div>
          </div>

          {/* Lost Chair Time League */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <TrendingUp size={12} className="text-slate-400" />
                Lost-Chair-Time League (Top Practices)
                <InfoIcon 
                  title="Lost Chair Time League"
                  additionalInfo="Top practices by recoverable lost chair time"
                />
              </h3>
              <p className="text-[9px] text-slate-400 font-medium">Recoverable with reminders & deposits</p>
            </div>

            <div className="p-5">
              <div className="space-y-2">
                {lostChairLeague.map((practice) => (
                  <div key={practice.rank} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <span className="text-sm font-bold text-slate-500 w-6">{practice.rank}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">{practice.name}</span>
                        <span className="text-sm font-bold text-rose-600">{practice.value}</span>
                      </div>
                      <span className="text-xs text-slate-500">{practice.fta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden p-5">
              <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse mb-3"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse mb-4"></div>
              <div className="h-[250px] bg-slate-200 rounded animate-pulse"></div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden p-5">
              <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse mb-3"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 bg-slate-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}