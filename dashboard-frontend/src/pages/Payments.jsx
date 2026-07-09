import { useState, useEffect, useRef, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import { RefreshCw, TrendingUp, Activity, DollarSign, CreditCard, Building2, CalendarRange, Wallet, Banknote, PiggyBank, ArrowDownUp, Table } from 'lucide-react';
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

function PaymentsBySiteChart({ data }) {
  if (!data || !data.sites || data.sites.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-xs">No site data available</div>;
  }

  const maxTotal = Math.max(...data.sites.map(s => s.total), 1);
  const grandTotal = data.sites.reduce((a, s) => a + s.total, 0) || 1;

  return (
    <div className="space-y-0.5">
      {data.sites.slice(0, 6).map((item, index) => {
        const pctOfMax = (item.total / maxTotal) * 100;
        return (
          <div key={item.name} className="group flex items-center justify-between px-3 py-2 rounded-xl border border-transparent hover:border-slate-200/70 hover:bg-white hover:shadow-sm transition-all duration-200 cursor-default">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border bg-slate-50 text-slate-700 border-slate-100 shrink-0">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-slate-800 truncate">{item.name}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">{item.count} payments</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctOfMax}%`, backgroundColor: pctOfMax >= 75 ? "#10b981" : pctOfMax >= 40 ? "#f59e0b" : "#ef4444" }} />
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg border shrink-0 text-slate-700 bg-slate-50 border-slate-100">{formatUKCurrency(item.total, 0)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentsByPractitionerChart({ data }) {
  if (!data || !data.practitioners || data.practitioners.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-xs">No practitioner data available</div>;
  }

  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#e11d48', '#fb7185', '#f472b6', '#10b981', '#059669', '#f59e0b', '#d97706', '#ef4444'];
  const practitioners = data.practitioners.slice(0, 10);

  const chartOptions = {
    series: [{ name: "Revenue", data: practitioners.map(p => p.total) }],
    chart: { type: "bar", height: 340, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 800 } },
    colors: colors,
    plotOptions: { bar: { borderRadius: 6, borderRadiusApplication: "end", distributed: true, horizontal: true, barHeight: "65%", dataLabels: { position: "bottom" } } },
    xaxis: { categories: practitioners.map(p => p.name), labels: { style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 }, formatter: (val) => formatUKCurrency(parseFloat(val), 0) }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "11px", fontWeight: 600 }, maxWidth: 120 } },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    dataLabels: { enabled: true, textAnchor: "start", style: { fontSize: "11px", fontWeight: 700, colors: ["#1e293b"] }, offsetX: 5, formatter: (val) => formatUKCurrency(val, 0) },
    tooltip: { theme: "light", style: { fontSize: "12px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => formatUKCurrency(val, 0) } },
    legend: { show: false },
    responsive: [{ breakpoint: 480, options: { chart: { height: 300 } } }]
  };

  return (
    <ReactApexChart options={chartOptions} series={chartOptions.series} type="bar" height={340} />
  );
}

function MethodDonutChart({ data }) {
  if (!data || !data.methods || data.methods.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-xs">No payment method data available</div>;
  }

  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#94a3b8'];
  const methods = data.methods.slice(0, 7);
  const totalAmount = methods.reduce((s, m) => s + m.total, 0);

  const donutOptions = {
    series: methods.map(m => m.total),
    chart: { type: "donut", height: 320, fontFamily: "Inter, sans-serif", animations: { enabled: true, easing: "easeinout", speed: 1000 } },
    colors: colors,
    labels: methods.map(m => m.method.charAt(0).toUpperCase() + m.method.slice(1)),
    plotOptions: { pie: { donut: { size: "70%", labels: { show: true, name: { show: true, fontSize: "11px", fontWeight: 600, color: "#64748b", offsetY: -4 }, value: { show: true, fontSize: "16px", fontWeight: 700, color: "#1e293b", offsetY: 6, formatter: (val) => formatUKCurrency(parseFloat(val), 0) }, total: { show: true, label: "Total", fontSize: "10px", fontWeight: 500, color: "#64748b", offsetY: 18, formatter: () => formatUKCurrency(totalAmount, 0) } } } } },
    stroke: { width: 3, colors: ["#ffffff"] },
    fill: { type: "gradient", gradient: { shade: "light", type: "diagonal1", shadeIntensity: 0.2, opacityFrom: 0.95, opacityTo: 0.85 } },
    dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: 600, colors: ["#fff"] }, dropShadow: { enabled: false }, formatter: (val) => val.toFixed(1) + "%" },
    legend: { position: "bottom", horizontalAlign: "center", fontSize: "10px", fontFamily: "Inter, sans-serif", markers: { radius: 12, width: 10, height: 10 }, itemMargin: { horizontal: 8, vertical: 4 }, formatter: (seriesName, opts) => { const val = opts.w.globals.series[opts.seriesIndex]; return `${seriesName}: ${formatUKCurrency(val, 0)}`; } },
    tooltip: { theme: "light", style: { fontSize: "12px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => formatUKCurrency(val, 0) } },
    responsive: [{ breakpoint: 480, options: { chart: { height: 280 }, legend: { position: "bottom", fontSize: "9px" } } }]
  };

  return (
    <div className="flex flex-col items-center">
      <ReactApexChart options={donutOptions} series={donutOptions.series} type="donut" height={320} />
      <div className="mt-3 flex items-center justify-center gap-3">
        <div className="text-center">
          <p className="text-[10px] font-medium text-slate-400">Total Payments</p>
          <p className="text-xs font-bold text-slate-800">{methods.reduce((s, m) => s + m.count, 0).toLocaleString()}</p>
        </div>
        <div className="w-px h-6 bg-slate-200" />
        <div className="text-center">
          <p className="text-[10px] font-medium text-slate-400">Total Value</p>
          <p className="text-xs font-bold text-slate-800">{formatUKCurrency(totalAmount, 0)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Payments() {
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(() => {
    const stored = sessionStorage.getItem('payments_refresh_cooldown');
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
  const [methodData, setMethodData] = useState(null);
  const [siteData, setSiteData] = useState(null);
  const [practitionerData, setPractitionerData] = useState(null);
  const [recentPayments, setRecentPayments] = useState(null);
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
      const [kpiRes, trendRes, methodRes, siteRes, practitionerRes, recentRes] = await Promise.all([
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/payments-kpis?period=${period}`),
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/payments-trend?period=${period}`),
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/payments-by-method?period=${period}`),
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/payments-by-site?period=${period}`),
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/payments-by-practitioner?period=${period}`),
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/recent-payments?period=${period}`)
      ]);
      return {
        kpiData: await kpiRes.json(),
        trendData: await trendRes.json(),
        methodData: await methodRes.json(),
        siteData: await siteRes.json(),
        practitionerData: await practitionerRes.json(),
        recentPayments: await recentRes.json(),
      };
    } catch (error) {
      console.error('Error fetching payments data:', error);
      return null;
    }
  };

  const populateFromData = useCallback((data) => {
    setKpiData(data.kpiData);
    setTrendData(data.trendData);
    setMethodData(data.methodData);
    setSiteData(data.siteData);
    setPractitionerData(data.practitionerData);
    setRecentPayments(data.recentPayments);
  }, []);

  const applyCachedData = useCallback((period) => {
    const cached = dataCache.current.get(period);
    if (!cached) return;
    populateFromData(cached);
    sessionStorage.setItem('pay_data', JSON.stringify(cached));
  }, [populateFromData]);

  const fetchCustomData = async (startDate, endDate) => {
    try {
      const [kpiRes, trendRes, methodRes, siteRes, practitionerRes, recentRes] = await Promise.all([
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/payments-kpis?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/payments-trend?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/payments-by-method?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/payments-by-site?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/payments-by-practitioner?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`https://demodashboard-production.up.railway.app/api/dashboard/recent-payments?period=all&start_date=${startDate}&end_date=${endDate}`)
      ]);
      return {
        kpiData: await kpiRes.json(),
        trendData: await trendRes.json(),
        methodData: await methodRes.json(),
        siteData: await siteRes.json(),
        practitionerData: await practitionerRes.json(),
        recentPayments: await recentRes.json(),
      };
    } catch (error) {
      console.error('Error fetching custom payments data:', error);
      return null;
    }
  };

  useEffect(() => {
    const preFetchAll = async () => {
      const stored = sessionStorage.getItem('pay_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        populateFromData(parsed);
        setLoading(false);
        isMounted.current = true;
        return;
      }
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
          if (data) {
            dataCache.current.set(customKey, data);
            applyCachedData(customKey);
          }
        });
      } else {
        applyCachedData(customKey);
      }
    } else {
      const period = getPeriodParam();
      if (dataCache.current.has(period)) {
        applyCachedData(period);
      } else {
        fetchDataForPeriod(period).then(data => {
          if (data) {
            dataCache.current.set(period, data);
            applyCachedData(period);
          }
        });
      }
    }
  }, [activeFilter, customStartDate, customEndDate, applyCachedData]);

  const getDentallyEndpoint = (metric) => 'https://api.dentally.co/v1/payments';

  const getMetricTables = (metric) => ['dentally_payments'];

  const getMetricCalculation = (metric) => {
    switch(metric) {
      case "Total Payments": return 'Count of all payments in the selected period.';
      case "Total Revenue": return 'Sum of all payment amounts in the selected period.';
      case "Average Payment": return 'Total revenue / total payment count.';
      case "Top Method": return 'Most frequently used payment method.';
      case "Cash Payments": return 'Count of payments made with cash.';
      case "Card Payments": return 'Count of debit and credit card payments.';
      default: return 'Calculated from payment records in the selected period.';
    }
  };

  const getMetricApiFields = (metric) => {
    switch(metric) {
      case "Total Payments": return [{ field: 'id', role: 'Counted' }, { field: 'dated_on', role: 'Scoped to date period' }];
      case "Total Revenue": return [{ field: 'amount', role: 'Summed' }, { field: 'dated_on', role: 'Scoped to date period' }];
      case "Average Payment": return [{ field: 'amount', role: 'Averaged' }];
      case "Top Method": return [{ field: 'method', role: 'Grouped and counted' }];
      case "Cash Payments": return [{ field: 'method', role: 'Filtered to cash' }];
      case "Card Payments": return [{ field: 'method', role: 'Filtered to debit/credit card' }];
      default: return [];
    }
  };

  const filters = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last year", "All time", "Custom"];

  const syncPageCache = async () => {
    try {
      await fetch('https://demodashboard-production.up.railway.app/api/sync/page?page=payments', { method: 'POST' });
    } catch (e) {
      console.error('Page cache refresh error:', e);
    }
  };

  const handleRefresh = async () => {
    sessionStorage.removeItem('pay_data');
    setIsRefreshing(true);
    await syncPageCache();
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
    sessionStorage.setItem('payments_refresh_cooldown', String(cooldownUntil));
    setIsRefreshing(false);
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
      case "Custom": { if (customStartDate && customEndDate) { return `${formatDate(new Date(customStartDate))} to ${formatDate(new Date(customEndDate))}`; } return "Select date range"; }
      default: return formatDate(end);
    }
  })();

  const trendChartOptions = {
    series: [
      { name: "Total", data: trendData?.chart_data?.map(d => d.total) || [] },
      { name: "Count", data: trendData?.chart_data?.map(d => d.count) || [] }
    ],
    chart: { type: "area", height: 200, fontFamily: "Inter, sans-serif", toolbar: { show: false }, animations: { enabled: true, easing: "easeinout", speed: 600 }, sparkline: { enabled: false } },
    colors: ["#3b82f6", "#10b981"],
    fill: { type: "gradient", gradient: { shade: "light", type: "vertical", shadeIntensity: 0.1, opacityFrom: 0.85, opacityTo: 0.9, stops: [0, 90, 100] } },
    stroke: { width: 1.5, curve: "smooth" },
    xaxis: { categories: trendData?.chart_data?.map(d => d.date) || [], labels: { style: { colors: "#94a3b8", fontSize: "9px", fontWeight: 500 } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "9px", fontWeight: 500 } } },
    tooltip: { theme: "light", style: { fontSize: "10px", fontFamily: "Inter, sans-serif" }, y: { formatter: (val) => formatUKCurrency(val, 0) } },
    grid: { borderColor: "#f1f5f9", strokeDasharray: 3 },
    legend: { position: "top", horizontalAlign: "right", fontSize: "10px", fontFamily: "Inter, sans-serif", markers: { radius: 8, width: 8, height: 8 }, itemMargin: { horizontal: 8 } },
    dataLabels: { enabled: false }
  };

  const kpiMetrics = [
    { title: "Total Payments", value: (kpiData?.totalPayments || 0).toLocaleString(), change: "+8.2%", positive: true, sparklineField: 'count', footer: "this period", icon: Wallet, tooltip: "Total number of payment transactions" },
    { title: "Total Revenue", value: formatUKCurrency(kpiData?.totalAmount || 0, 0), change: "+12.4%", positive: true, sparklineField: 'total', footer: "total collected", icon: DollarSign, tooltip: "Sum of all payment amounts" },
    { title: "Average Payment", value: formatUKCurrency(kpiData?.avgPayment || 0, 0), change: "+3.8%", positive: true, sparklineField: 'total', footer: "per transaction", icon: TrendingUp, tooltip: "Average payment value" },
    { title: "Top Method", value: (kpiData?.topMethod || "N/A").charAt(0).toUpperCase() + (kpiData?.topMethod || "N/A").slice(1), change: null, positive: true, sparklineField: null, footer: "most used method", icon: CreditCard, tooltip: "Most frequently used payment method" },
    { title: "Cash Payments", value: (kpiData?.cashCount || 0).toLocaleString(), change: "-1.5%", positive: false, sparklineField: null, footer: "cash transactions", icon: Banknote, tooltip: "Number of cash payments" },
    { title: "Card Payments", value: (kpiData?.cardCount || 0).toLocaleString(), change: "+9.1%", positive: true, sparklineField: null, footer: "debit & credit", icon: PiggyBank, tooltip: "Number of debit and credit card payments" },
  ];

  return (
    <div className="bg-[#f4f6fb] font-sans antialiased min-h-screen">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-5 space-y-4 relative z-10">

      {/* ======= HEADER ======= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Wallet size={18} className="text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Payments</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100/60">
                <Wallet size={10} /> Revenue
              </span>
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <CalendarRange size={10} /> {dateLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={isRefreshing || cooldownSecs > 0} className="inline-flex items-center gap-1.5 px-3 h-[32px] bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:shadow-sm active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none">
            <RefreshCw size={11} className={`transition-transform duration-700 ease-out ${isRefreshing ? "rotate-180 text-blue-500" : "text-slate-400"}`} />
            {isRefreshing ? "Syncing..." : cooldownSecs > 0 ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, '0')} left` : "Refresh"}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200/60 rounded-lg p-0.5 w-fit shadow-sm sticky top-16 z-30">
        {filters.map((filter) => {
          const isSelected = activeFilter === filter;
          return (
            <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-2.5 h-7 text-[10px] font-semibold tracking-tight rounded-md transition-all duration-200 ${isSelected ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
              {filter}
            </button>
          );
        })}
        {activeFilter === "Custom" && (
          <div className="flex items-center gap-2 bg-transparent rounded-lg p-2">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-slate-600">From:</label>
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-2 py-1 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-slate-600">To:</label>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="px-2 py-1 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* KPI Metrics Strip */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 mb-2"><div className="w-6 h-6 rounded-lg bg-slate-200 animate-pulse" /><div className="h-2.5 w-14 bg-slate-200 rounded animate-pulse" /></div>
                <div className="h-7 w-16 bg-slate-200 rounded animate-pulse mb-1.5" /><div className="h-2.5 w-12 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : kpiData && (
        <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100">
            {kpiMetrics.map((m, index) => {
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
                      <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-[7px] font-bold text-slate-500 mr-1 shrink-0 self-center">{index + 55}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate">{m.title}</span>
                      <InfoIcon title={m.title} additionalInfo={m.tooltip} apiEndpoint={getDentallyEndpoint(m.title)} apiFields={getMetricApiFields(m.title)} databaseTables={getMetricTables(m.title)} calculations={getMetricCalculation(m.title)} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[1.25rem] font-bold tracking-tight text-slate-900 leading-none">{m.value}</span>
                    {m.change && (
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold shrink-0 ${m.positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>{m.change}</span>
                    )}
                  </div>
                  <div className="mt-2 h-6 w-full">
                    {(() => {
                      const rawVals = m.sparklineField ? trendData?.chart_data?.map(d => d[m.sparklineField]) : null;
                      const sp = m.sparklineField ? sparklinePath(rawVals, 80, 32) : null;
                      const spLine = sp?.line || (m.positive ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4" : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26");
                      const spFill = sp?.fill || (m.positive ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4 L 80 32 L 0 32 Z" : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26 L 80 32 L 0 32 Z");
                      return (
                        <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                          <defs><linearGradient id={`metricGrad-pay-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={m.positive ? "#10b981" : "#ef4444"} stopOpacity="0.1" /><stop offset="100%" stopColor={m.positive ? "#10b981" : "#ef4444"} stopOpacity="0" /></linearGradient></defs>
                          <line x1="0" y1="20" x2="80" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 3" />
                          <path d={spLine} fill="none" stroke={m.positive ? "#10b981" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d={spFill} fill={`url(#metricGrad-pay-${index})`} />
                        </svg>
                      );
                    })()}
                  </div>
                  <p className="text-[9px] font-medium text-slate-400 mt-1 truncate">{m.footer}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Trend Chart */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100"><div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse mb-2" /><div className="h-2.5 w-48 bg-slate-200 rounded animate-pulse" /></div>
          <div className="p-3"><div className="w-full h-[200px] bg-slate-100 rounded-lg animate-pulse" /></div>
        </div>
      ) : trendData && (
        <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">61</span>
                  <Activity size={12} className="text-slate-400" />
                  Payment Trend
                  <InfoIcon title="Payment Trend" apiEndpoint="https://api.dentally.co/v1/payments" apiFields={[{ field: 'amount', role: 'Summed per day/month' }, { field: 'dated_on', role: 'Grouped by date' }]} databaseTables={['dentally_payments']} calculations="Daily/monthly sum of payment amounts. Short periods group by day, longer periods by month." additionalInfo="Payment volume and value over time" />
                </h3>
                <p className="text-[9px] text-slate-400 font-medium">Track payment volume and value patterns</p>
              </div>
            </div>
          </div>
          <div className="p-3">
            <ReactApexChart options={trendChartOptions} series={trendChartOptions.series} type="area" height={200} />
          </div>
        </div>
      )}

      {/* Method & Site Charts */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100"><div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse mb-2" /><div className="h-2.5 w-48 bg-slate-200 rounded animate-pulse" /></div>
            <div className="p-3"><div className="w-full h-[280px] bg-slate-100 rounded-lg animate-pulse" /></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100"><div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse mb-2" /><div className="h-2.5 w-48 bg-slate-200 rounded animate-pulse" /></div>
            <div className="p-3 space-y-2">{[1, 2, 3, 4, 5].map((i) => (<div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />))}</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Payment Methods Donut */}
          {methodData && (
            <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">62</span>
                  <CreditCard size={12} className="text-slate-400" />
                  Payment Methods
                  <InfoIcon title="Payment Methods" apiEndpoint="https://api.dentally.co/v1/payments" apiFields={[{ field: 'method', role: 'Payment method type' }, { field: 'amount', role: 'Summed per method' }]} databaseTables={['dentally_payments']} calculations="Groups payments by method (debit card, credit card, stripe, cash, etc) and sums amounts." additionalInfo="Revenue distribution across payment methods" />
                </h3>
                <p className="text-[9px] text-slate-400 font-medium">Revenue by payment method</p>
              </div>
              <div className="p-4 flex flex-col items-center">
                <MethodDonutChart data={methodData} />
              </div>
            </div>
          )}

          {/* Payments by Site */}
          <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">63</span>
                    <Building2 size={12} className="text-slate-400" />
                    Payments by Site
                    <InfoIcon title="Payments by Site" apiEndpoint="https://api.dentally.co/v1/payments , https://api.dentally.co/v1/sites" apiFields={[{ field: 'site_id', role: 'Links to sites via dentally_id' }, { field: 'name', role: 'Site name from sites table' }, { field: 'amount', role: 'Summed per site' }]} databaseTables={['dentally_payments', 'dentally_sites']} calculations="Joins dentally_payments with dentally_sites on site_id = dentally_id, summing amounts grouped by site name." additionalInfo="Revenue collected per practice location" />
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium">Payments collected by practice</p>
                </div>
              </div>
            </div>
            <div className="p-3">
              <PaymentsBySiteChart data={siteData} />
            </div>
          </div>
        </div>
      )}

      {/* Payments by Practitioner */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100"><div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse mb-2" /><div className="h-2.5 w-48 bg-slate-200 rounded animate-pulse" /></div>
          <div className="p-3"><div className="w-full h-[280px] bg-slate-100 rounded-lg animate-pulse" /></div>
        </div>
      ) : practitionerData && (
        <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">64</span>
                  <ArrowDownUp size={12} className="text-slate-400" />
                  Payments by Practitioner
                  <InfoIcon title="Payments by Practitioner" apiEndpoint="https://api.dentally.co/v1/payments , https://api.dentally.co/v1/practitioners" apiFields={[{ field: 'practitioner_id', role: 'Links to practitioners' }, { field: 'amount', role: 'Summed per practitioner' }]} databaseTables={['dentally_payments', 'dentally_practitioners']} calculations="Groups payments by practitioner, summing amounts and counting transactions. Shows top 10 practitioners by revenue." additionalInfo="Revenue attributed per clinician" />
                </h3>
                <p className="text-[9px] text-slate-400 font-medium">Top practitioners by payment revenue</p>
              </div>
            </div>
          </div>
          <div className="p-3">
            <PaymentsByPractitionerChart data={practitionerData} />
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100"><div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse mb-2" /><div className="h-2.5 w-48 bg-slate-200 rounded animate-pulse" /></div>
          <div className="p-3"><div className="w-full h-[200px] bg-slate-100 rounded-lg animate-pulse" /></div>
        </div>
      ) : recentPayments && recentPayments.payments && recentPayments.payments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">65</span>
                  <Table size={12} className="text-slate-400" />
                  Recent Payments
                  <InfoIcon title="Recent Payments" apiEndpoint="https://api.dentally.co/v1/payments" apiFields={[{ field: 'amount', role: 'Payment amount' }, { field: 'method', role: 'Payment method' }, { field: 'dated_on', role: 'Payment date' }, { field: 'reference', role: 'Payment reference' }]} databaseTables={['dentally_payments']} calculations="Latest 20 payment transactions with patient and practitioner details." additionalInfo="Most recent payment transactions" />
                </h3>
                <p className="text-[9px] text-slate-400 font-medium">Latest payment transactions</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Patient</th>
                  <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Practitioner</th>
                  <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Site</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.payments.map((p, i) => (
                  <tr key={p.id || i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-[11px] text-slate-600 font-medium">{p.datedOn}</td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-800 font-semibold">{p.patientName}</td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-600">{p.practitionerName}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700">
                        {p.method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-bold text-slate-800">{formatUKCurrency(p.amount, 0)}</td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-500">{p.siteName}</td>
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