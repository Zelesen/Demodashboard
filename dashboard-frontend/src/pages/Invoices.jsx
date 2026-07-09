import { useState, useEffect, useRef, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import { RefreshCw, TrendingUp, Activity, DollarSign, FileText, Clock, CheckCircle2, CreditCard, Building2, CalendarRange, Stethoscope, UserCheck } from 'lucide-react';
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

function RevenueBySiteChart({ data }) {
  if (!data) {
    return (
      <div className="space-y-2 p-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-slate-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const maxRevenue = Math.max(...data.sites?.map(s => s.revenue) || [1], 1);
  const totalRevenue = data.sites?.reduce((acc, s) => acc + s.revenue, 0) || 1;

  const getUtilisationColor = (pct) => {
    if (pct >= 75) return "#10b981";
    if (pct >= 40) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="space-y-0.5">
      {data.sites?.slice(0, 5).map((item, index) => {
        const pctOfMax = (item.revenue / maxRevenue) * 100;
        const statusDot = pctOfMax >= 75 ? "bg-emerald-500" : pctOfMax >= 40 ? "bg-amber-400" : "bg-rose-500";
        const scoreColor = pctOfMax >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
          : pctOfMax >= 40 ? "text-amber-600 bg-amber-50 border-amber-100" 
          : "text-rose-500 bg-rose-50 border-rose-100";
        
        const formattedRevenue = formatUKCurrency(item.revenue, 0);

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
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200/60">
                  {item.name.charAt(0)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-slate-800 truncate group-hover:text-slate-900 transition-colors">
                  {item.name}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  {item.invoices || 0} invoices · {((item.revenue / totalRevenue) * 100).toFixed(1)}% of total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pctOfMax}%`, backgroundColor: getUtilisationColor(pctOfMax) }}
                />
              </div>
              <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border shrink-0 transition-all duration-200 group-hover:scale-105 ${scoreColor}`}>
                {formattedRevenue}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== CHART COMPONENTS ====================

function RevenueByTreatmentChart({ data }) {
  if (!data || !data.treatments || data.treatments.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-xs">No treatment data available</div>;
  }

  const gradientColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];
  const treatments = data.treatments.slice(0, 5);
  const totalRev = data.treatments.reduce((s, t) => s + t.totalRevenue, 0);

  const treatmentChartOptions = {
    series: treatments.map(t => t.totalRevenue),
    chart: {
      type: "donut",
      height: 340,
      fontFamily: "Inter, sans-serif",
      animations: { enabled: true, easing: "easeinout", speed: 1000 }
    },
    colors: gradientColors,
    labels: treatments.map(t => t.name),
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            name: { show: true, fontSize: "11px", fontWeight: 600, color: "#64748b", offsetY: -4 },
            value: {
              show: true,
              fontSize: "18px",
              fontWeight: 700,
              color: "#1e293b",
              offsetY: 6,
              formatter: (val) => formatUKCurrency(parseFloat(val), 0)
            },
            total: {
              show: true,
              label: "Total Revenue",
              fontSize: "10px",
              fontWeight: 500,
              color: "#64748b",
              offsetY: 20,
              formatter: () => formatUKCurrency(totalRev, 0)
            }
          }
        }
      }
    },
    stroke: { width: 3, colors: ["#ffffff"] },
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "diagonal1",
        shadeIntensity: 0.2,
        opacityFrom: 0.95,
        opacityTo: 0.85
      }
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: "11px", fontWeight: 600, colors: ["#fff"] },
      dropShadow: { enabled: false },
      formatter: (val) => val.toFixed(1) + "%"
    },
    legend: {
      position: "bottom",
      horizontalAlign: "center",
      fontSize: "11px",
      fontFamily: "Inter, sans-serif",
      markers: { radius: 12, width: 10, height: 10 },
      itemMargin: { horizontal: 8, vertical: 4 },
      formatter: (seriesName, opts) => {
        const val = opts.w.globals.series[opts.seriesIndex];
        return `${seriesName}: ${formatUKCurrency(val, 0)}`;
      }
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px", fontFamily: "Inter, sans-serif" },
      y: {
        formatter: (val) => formatUKCurrency(val, 0)
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: { height: 300 },
        legend: { position: "bottom", fontSize: "10px" }
      }
    }]
  };

  return (
    <div className="space-y-2">
      <ReactApexChart options={treatmentChartOptions} series={treatmentChartOptions.series} type="donut" height={340} />
      <div className="flex items-center justify-center gap-3 pt-1">
        <div className="text-center">
          <p className="text-[10px] font-medium text-slate-400">Times Performed</p>
          <p className="text-xs font-bold text-slate-800">{treatments.reduce((s, t) => s + t.timesPerformed, 0)}</p>
        </div>
        <div className="w-px h-6 bg-slate-200" />
        <div className="text-center">
          <p className="text-[10px] font-medium text-slate-400">Avg Price</p>
          <p className="text-xs font-bold text-slate-800">£{Math.round(treatments.reduce((s, t) => s + t.avgPrice, 0) / treatments.length)}</p>
        </div>
        <div className="w-px h-6 bg-slate-200" />
        <div className="text-center">
          <p className="text-[10px] font-medium text-slate-400">Total Revenue</p>
          <p className="text-xs font-bold text-slate-800">{formatUKCurrency(totalRev, 0)}</p>
        </div>
      </div>
    </div>
  );
}

function TopPatientsByRevenueChart({ data }) {
  if (!data || !data.patients || data.patients.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-xs">No patient data available</div>;
  }

  const patientColors = ['#ec4899', '#f43f5e', '#e11d48', '#fb7185', '#f472b6'];
  const patients = data.patients;
  const totalPatientRev = patients.reduce((s, p) => s + p.totalRevenue, 0);

  const topPatientsOptions = {
    series: [{
      name: "Revenue",
      data: patients.map(p => p.totalRevenue)
    }],
    chart: {
      type: "bar",
      height: 340,
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      animations: { enabled: true, easing: "easeinout", speed: 800 }
    },
    colors: patientColors,
    plotOptions: {
      bar: {
        borderRadius: 6,
        borderRadiusApplication: "end",
        distributed: true,
        horizontal: true,
        barHeight: "65%",
        dataLabels: { position: "bottom" }
      }
    },
    xaxis: {
      categories: patients.map(p => p.patientName),
      labels: {
        style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 },
        formatter: (val) => formatUKCurrency(parseFloat(val), 0)
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: "#64748b", fontSize: "11px", fontWeight: 600 },
        maxWidth: 120
      }
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDasharray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } }
    },
    dataLabels: {
      enabled: true,
      textAnchor: "start",
      style: { fontSize: "11px", fontWeight: 700, colors: ["#1e293b"] },
      offsetX: 5,
      formatter: (val) => formatUKCurrency(val, 0)
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px", fontFamily: "Inter, sans-serif" },
      y: {
        formatter: (val) => formatUKCurrency(val, 0)
      }
    },
    legend: { show: false },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: { height: 300 }
      }
    }]
  };

  return (
    <div className="space-y-3">
      <ReactApexChart options={topPatientsOptions} series={topPatientsOptions.series} type="bar" height={340} />
      <div className="flex items-center justify-center gap-4 pt-1">
        <div className="text-center">
          <p className="text-[15px] font-bold text-pink-600">{formatUKCurrency(totalPatientRev, 0)}</p>
          <p className="text-[8px] font-medium text-slate-400">Combined Revenue</p>
        </div>
        <div className="w-px h-7 bg-slate-200" />
        <div className="text-center">
          <p className="text-[15px] font-bold text-pink-600">{patients.reduce((s, p) => s + p.invoiceCount, 0)}</p>
          <p className="text-[8px] font-medium text-slate-400">Total Invoices</p>
        </div>
        <div className="w-px h-7 bg-slate-200" />
        <div className="text-center">
          <p className="text-[15px] font-bold text-pink-600">£{Math.round(patients.reduce((s, p) => s + p.avgInvoiceValue, 0) / patients.length)}</p>
          <p className="text-[8px] font-medium text-slate-400">Avg Invoice</p>
        </div>
      </div>
    </div>
  );
}

export default function Invoices() {
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(() => {
    const stored = sessionStorage.getItem('invoices_refresh_cooldown');
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
  const [invoiceData, setInvoiceData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [treatmentRevenueData, setTreatmentRevenueData] = useState(null);
  const [topPatientsData, setTopPatientsData] = useState(null);
  const [revenueBySiteData, setRevenueBySiteData] = useState(null);
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
      const [kpiRes, trendRes, treatmentRevRes, topPatientsRes, revBySiteRes] = await Promise.all([
        fetch(`http://localhost:8000/api/dashboard/invoices-kpis?period=${period}`),
        fetch(`http://localhost:8000/api/dashboard/invoices-trend?period=${period}`),
        fetch(`http://localhost:8000/api/invoices/revenue-by-treatment?period=${period}`),
        fetch(`http://localhost:8000/api/invoices/top-patients-by-revenue?period=${period}`),
        fetch(`http://localhost:8000/api/dashboard/revenue-by-site?period=${period}`)
      ]);
      return {
        invoiceData: await kpiRes.json(),
        trendData: await trendRes.json(),
        treatmentRevenueData: await treatmentRevRes.json(),
        topPatientsData: await topPatientsRes.json(),
        revenueBySiteData: await revBySiteRes.json(),
      };
    } catch (error) {
      console.error('Error fetching invoice data:', error);
      return null;
    }
  };

  const applyCachedData = useCallback((period) => {
    const cached = dataCache.current.get(period);
    if (!cached) return;
    setInvoiceData(cached.invoiceData);
    setTrendData(cached.trendData);
    setTreatmentRevenueData(cached.treatmentRevenueData);
    setTopPatientsData(cached.topPatientsData);
    setRevenueBySiteData(cached.revenueBySiteData);
  }, []);

  const fetchCustomInvoiceData = async (startDate, endDate) => {
    try {
      const [kpiRes, trendRes, treatmentRevRes, topPatientsRes, revBySiteRes] = await Promise.all([
        fetch(`http://localhost:8000/api/dashboard/invoices-kpis?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`http://localhost:8000/api/dashboard/invoices-trend?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`http://localhost:8000/api/invoices/revenue-by-treatment?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`http://localhost:8000/api/invoices/top-patients-by-revenue?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`http://localhost:8000/api/dashboard/revenue-by-site?period=all&start_date=${startDate}&end_date=${endDate}`)
      ]);
      return {
        invoiceData: await kpiRes.json(),
        trendData: await trendRes.json(),
        treatmentRevenueData: await treatmentRevRes.json(),
        topPatientsData: await topPatientsRes.json(),
        revenueBySiteData: await revBySiteRes.json(),
      };
    } catch (error) {
      console.error('Error fetching custom invoice data:', error);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      const customKey = `custom_${customStartDate}_${customEndDate}`;
      if (!dataCache.current.has(customKey)) {
        fetchCustomInvoiceData(customStartDate, customEndDate).then(data => {
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

  const getDentallyEndpoint = (metric) => {
    switch(metric) {
      case "Total Invoices":
      case "Total Revenue":
      case "Outstanding":
      case "Paid Invoices":
      case "Collection Rate":
      case "Avg Invoice":
        return 'https://api.dentally.co/v1/invoices';
      default:
        return 'https://api.dentally.co/v1/invoices';
    }
  };

  const getMetricTables = (metric) => {
    switch(metric) {
      case "Total Invoices":
      case "Total Revenue":
      case "Outstanding":
      case "Paid Invoices":
      case "Collection Rate":
      case "Avg Invoice":
        return ['dentally_invoices'];
      default:
        return ['dentally_invoices'];
    }
  };

  const getMetricCalculation = (metric) => {
    switch(metric) {
      case "Total Invoices":
        return 'Count of all invoices created in the selected period.';
      case "Total Revenue":
        return 'Sum of all invoice amounts (amount field) in the selected period.';
      case "Outstanding":
        return 'Sum of amount_outstanding where amount_outstanding > 0.';
      case "Paid Invoices":
        return 'Count and sum of invoices where paid = true.';
      case "Collection Rate":
        return 'Collection Rate = (Total Revenue / (Total Revenue + Outstanding Amount)) × 100';
      case "Avg Invoice":
        return 'Total revenue / total invoice count.';
      default:
        return 'Calculated from invoice records in the selected period.';
    }
  };

  const getMetricApiFields = (metric) => {
    switch(metric) {
      case "Total Invoices":
        return [
          { field: 'id', role: 'Counted each row = one invoice' },
          { field: 'created_at', role: 'Scoped to the selected date period' },
          { field: 'paid', role: 'Boolean flag indicating payment status' }
        ];
      case "Total Revenue":
        return [
          { field: 'amount', role: 'Summed to get total invoice value' },
          { field: 'created_at', role: 'Scoped to the selected date period' }
        ];
      case "Amount Outstanding":
        return [
          { field: 'amount_outstanding', role: 'Remaining balance on unpaid invoices' },
          { field: 'paid', role: 'Filtered where paid = false' },
          { field: 'created_at', role: 'Scoped to the selected date period' }
        ];
      case "Paid Invoices":
        return [
          { field: 'paid', role: 'Filtered where value = true' },
          { field: 'paid_on', role: 'Timestamp confirming payment date' }
        ];
    
      default:
        return [];
    }
  };
  
  const filters = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last year", "All time", "Custom"];

  const refreshPageCache = async () => {
    try {
      await fetch('http://localhost:8000/api/admin/cache/refresh-page?page=invoices', { method: 'POST' });
    } catch (e) {
      console.error('Page cache refresh error:', e);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPageCache();
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      const data = await fetchCustomInvoiceData(customStartDate, customEndDate);
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
    sessionStorage.setItem('invoices_refresh_cooldown', String(cooldownUntil));
    setIsRefreshing(false);
    window.location.reload();
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
        return `${formatDate(start)} to ${formatDate(end)}`;
      }
      case "All time": {
        const start = new Date('2020-01-01');
        return `${formatDate(start)} to ${formatDate(end)}`;
      }
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

  const trendChartOptions = {
    series: [
      { name: "Total", data: trendData?.chart_data?.map(d => d.total) || [] },
      { name: "Paid", data: trendData?.chart_data?.map(d => d.paid) || [] },
      { name: "Outstanding", data: trendData?.chart_data?.map(d => d.outstanding) || [] }
    ],
    chart: {
      type: "area",
      height: 350,
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      animations: { enabled: true, easing: "easeinout", speed: 800 }
    },
    colors: ["#3b82f6", "#10b981", "#f59e0b"],
    fill: {
      type: "gradient",
      gradient: { shade: "light", type: "vertical", shadeIntensity: 0.15, opacityFrom: 0.9, opacityTo: 0.95, stops: [0, 90, 100] }
    },
    stroke: { width: 2, curve: "smooth" },
    xaxis: {
      categories: trendData?.chart_data?.map(d => d.date) || [],
      labels: { style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: "#64748b", fontSize: "11px", fontWeight: 500 },
        formatter: (val) => "£" + val.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      }
    },
    tooltip: {
      theme: "light",
      style: { fontSize: "12px", fontFamily: "Inter, sans-serif" },
      y: { formatter: (val) => "£" + val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") }
    },
    grid: { borderColor: "#f8fafc", strokeDasharray: 4, padding: { top: 10, right: 10, bottom: 0, left: 10 } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px", fontFamily: "Inter, sans-serif", markers: { radius: 12, width: 10, height: 10 } },
    dataLabels: { enabled: false }
  };

  const paymentStatusOptions = {
    series: [invoiceData?.paidAmount || 0, invoiceData?.outstanding || 0],
    chart: { 
      type: "donut", 
      height: 320, 
      fontFamily: "Inter, sans-serif", 
      animations: { enabled: true, easing: "easeinout", speed: 1000 },
      events: {
        dataPointSelection: (event, chartContext, config) => {
          console.log('Selected:', config.w.config.labels[config.dataPointIndex]);
        }
      },
    },
    colors: ["#10b981", "#f59e0b"],
    labels: ["Paid", "Outstanding"],
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            name: { show: true, fontSize: "12px", fontWeight: 500, color: "#64748b", offsetY: -5 },
            value: { 
              show: true, 
              fontSize: "16px", 
              fontWeight: 700, 
              color: "#1e293b", 
              offsetY: 10, 
              formatter: (val) => "£" + val.toFixed(1) + "k" 
            },
            total: {
              show: true, 
              label: "Collection Rate", 
              fontSize: "11px", 
              fontWeight: 500, 
              color: "#64748b",
              offsetY: 25,
              formatter: () => {
                const total = (invoiceData?.paidAmount || 0) + (invoiceData?.outstanding || 0);
                const rate = total > 0 ? ((invoiceData?.paidAmount || 0) / total * 100).toFixed(1) : 0;
                return rate + "%";
              }
            }
          }
        }
      }
    },
    stroke: { width: 4, colors: ["#ffffff"] },
    fill: { 
      type: "gradient", 
      gradient: { 
        shade: "light", 
        type: "diagonal1", 
        shadeIntensity: 0.2, 
        opacityFrom: 0.95, 
        opacityTo: 0.85 
      } 
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { 
      theme: "light", 
      style: { fontSize: "12px", fontFamily: "Inter, sans-serif" }, 
      y: { formatter: (val) => "£" + val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
      custom: ({ series, seriesIndex, w }) => {
        const total = series.reduce((a, b) => a + b, 0);
        const value = series[seriesIndex];
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        const label = w.config.labels[seriesIndex];
        const fmt = (v) => v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        return `
          <div style="
            background: white; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 10px 14px; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            font-family: Inter, sans-serif;
          ">
            <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 4px;">
              ${label}
            </div>
            <div style="font-size: 16px; color: #1e293b; font-weight: 700; margin-bottom: 2px;">
              £${fmt(value)}
            </div>
            <div style="font-size: 11px; color: #10b981; font-weight: 600;">
              ${percentage}% of total
            </div>
          </div>
        `;
      }
    }
  };

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-50 via-indigo-50/50 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-50/60 via-blue-50/30 to-transparent rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-5 space-y-3 relative z-10">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="relative group/logo">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl blur-md opacity-30 group-hover/logo:opacity-50 transition-opacity duration-500" />
              <div className="relative w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center shadow-sm">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <FileText size={14} className="text-white" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-[2px] border-white rounded-full shadow-sm" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-[1.3rem] font-bold tracking-tight text-slate-900 leading-tight">Invoices</h1>
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

        {/* Filter Tabs */}
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

          {/* Custom Date Range Picker */}
        {activeFilter === "Custom" && (
          <div className="flex items-center gap-2 bg-transparent  rounded-lg p-2 ">
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
        </div>

        

        {/* KPI Metrics Strip */}
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
        ) : invoiceData && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100">
              {[
                {
                  title: "Total Invoices",
                  value: (invoiceData.totalInvoices || 0).toLocaleString(),
                  change: "+12.5%",
                  positive: true,
                  sparklineField: 'count',
                  footer: "this period",
                  icon: FileText,
                  tooltip: "Total number of invoices raised"
                },
                {
                  title: "Total Revenue",
                  value: formatUKCurrency(invoiceData.totalRevenue || 0, 0),
                  change: "+8.3%",
                  positive: true,
                  sparklineField: 'total',
                  footer: "gross invoiced",
                  icon: DollarSign,
                  tooltip: "Total invoice value"
                },
                {
                  title: "Amount Outstanding",
                  value: formatUKCurrency(invoiceData.outstanding || 0, 0),
                  change: "-2.1%",
                  positive: true,
                  sparklineField: 'outstanding',
                  footer: "awaiting payment",
                  icon: Clock,
                  tooltip: "Amount outstanding across all invoices"
                },
                {
                  title: "Paid Invoices",
                  value: (invoiceData.paidInvoices || 0).toLocaleString(),
                  change: "+15.2%",
                  positive: true,
                  sparklineField: 'paid',
                  footer: "collected",
                  icon: CheckCircle2,
                  tooltip: "Number of paid invoices"
                },
                {
                  title: "Collection Rate",
                  value: (invoiceData.collectionRate || 0) + "%",
                  change: "+3.2pp",
                  positive: true,
                  footer: "target 95%",
                  icon: CreditCard,
                  tooltip: "Collection Rate = (Total Revenue / (Total Revenue + Outstanding Amount)) × 100"
                },
                {
                  title: "Avg Invoice",
                  value: formatUKCurrency(invoiceData.avgInvoiceValue || 0, 0),
                  change: "+5.7%",
                  positive: true,
                  footer: "per invoice",
                  icon: TrendingUp,
                  tooltip: "Average invoice value"
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
                        <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-[7px] font-bold text-slate-500 mr-1 shrink-0 self-center">{index + 11}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate">
                          {m.title}
                        </span>
                        <InfoIcon 
                          title={m.title} 
                          additionalInfo={m.tooltip}
                          apiEndpoint={getDentallyEndpoint(m.title)}
                          apiFields={getMetricApiFields(m.title)}
                          databaseTables={getMetricTables(m.title)}
                          calculations={getMetricCalculation(m.title)}
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
                              <linearGradient id={`metricGrad-inv-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={m.positive ? "#10b981" : "#ef4444"} stopOpacity="0.1" />
                                <stop offset="100%" stopColor={m.positive ? "#10b981" : "#ef4444"} stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <line x1="0" y1="20" x2="80" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 3" />
                            <path d={spLine} fill="none" stroke={m.positive ? "#10b981" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={spFill} fill={`url(#metricGrad-inv-${index})`} />
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

        {/* Invoice Trend Chart */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-2.5 w-48 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="p-5">
              <div className="w-full h-[350px] bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        ) : trendData && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">17</span>
                    <Activity size={12} className="text-slate-400" />
                    Invoice Trend
                    <InfoIcon 
                      title="Invoice Trend" 
                      apiEndpoint="https://api.dentally.co/v1/invoices"
                      databaseTables={['dentally_invoices']}
                      calculations="Total amount Metric and outstanding amount metric and for paid amount total Amount - Outstanding Amount. All values are grouped by day (or month for longer periods)."
                      additionalInfo="Invoice volume and value over time" 
                    />
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium">Track invoicing activity and payment patterns</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <ReactApexChart options={trendChartOptions} series={trendChartOptions.series} type="area" height={350} />
            </div>
          </div>
        )}

        {/* Payment Status & Revenue by Site Charts */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-2.5 w-48 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="p-5">
                <div className="w-full h-[280px] bg-slate-100 rounded-lg animate-pulse" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-2.5 w-48 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Payment Status Split */}
            {invoiceData && (
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">18</span>
                    <DollarSign size={12} className="text-slate-400" />
                    Payment Status
                    <InfoIcon 
                      title="Payment Status Breakdown" 
                      apiEndpoint="https://api.dentally.co/v1/invoices"
                      apiFields={[
                        { field: 'paid', role: 'Boolean flag indicating payment status' },
                        { field: 'amount', role: 'Total invoice value' },
                        { field: 'amount_outstanding', role: 'Remaining balance on unpaid invoices' }
                      ]}
                      databaseTables={['dentally_invoices']}
                      calculations="Sums invoice amounts by payment status: Paid (paid=true) vs Outstanding (amount_outstanding > 0)."
                      additionalInfo="Breakdown of paid vs outstanding revenue" 
                    />
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium">Revenue by payment status</p>
                </div>
                <div className="p-5 flex flex-col items-center">
                  <ReactApexChart options={paymentStatusOptions} series={paymentStatusOptions.series} type="donut" height={320} />
                  
                  {/* Custom Legend */}
                  {invoiceData && (
                    <div className="mt-4 w-full space-y-2.5" style={{justifyContent:"center", display:"flex",}}>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 hover:bg-emerald-50 transition-colors duration-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30"></div>
                          <div>
                            <p className="text-[11px] font-semibold text-slate-800">Paid</p>
                            <p className="text-[9px] text-slate-500 font-medium">
                              {invoiceData.paidInvoices || 0} invoices
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-bold text-emerald-700">
                            {formatUKCurrency(invoiceData.paidAmount || 0, 0)}
                          </p>
                          <p className="text-[9px] text-emerald-600 font-semibold">
                            {((invoiceData.paidAmount || 0) / ((invoiceData.paidAmount || 0) + (invoiceData.outstanding || 0)) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-100/60 hover:bg-amber-50 transition-colors duration-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/30"></div>
                          <div>
                            <p className="text-[11px] font-semibold text-slate-800">Outstanding</p>
                            <p className="text-[9px] text-slate-500 font-medium">
                              Awaiting payment
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-bold text-amber-700">
                            {formatUKCurrency(invoiceData.outstanding || 0, 0)}
                          </p>
                          <p className="text-[9px] text-amber-600 font-semibold">
                            {((invoiceData.outstanding || 0) / ((invoiceData.paidAmount || 0) + (invoiceData.outstanding || 0)) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Revenue by Site Chart */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">19</span>
                      <Building2 size={12} className="text-slate-400" />
                      Revenue by Site
                      <InfoIcon 
                        title="Revenue by Site" 
                        apiEndpoint="https://api.dentally.co/v1/invoices , https://api.dentally.co/v1/sites"
                        databaseTables={['dentally_invoices', 'dentally_sites']}
                        apiFields={[
                        { field: 'site_id', role: 'id of the site' },
                        { field: 'name', role: 'name of the site fron Sites api' },
                        { field: 'amount', role: 'Total invoice value from invoices Api' },
                      ]}
                        calculations="Joins dentally_sites with dentally_invoices on site_id, summing invoice amounts grouped by site name for the selected period."
                        additionalInfo="Revenue breakdown across all active practices"
                      />
                    </h3>
                    <p className="text-[9px] text-slate-400 font-medium">Invoice revenue by practice location</p>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <RevenueBySiteChart data={revenueBySiteData} />
              </div>
            </div>
          </div>
        )}

        {/* ==================== TREATMENT ANALYTICS & TOP PATIENTS SECTION ==================== */}
        {!loading && treatmentRevenueData && topPatientsData && (
          <div className="space-y-4 sm:gap-6">
            <div className="flex items-center gap-2 px-1">
              <Stethoscope size={16} className="text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Treatment Analytics</h2>
              <span className="text-[10px] font-medium text-slate-500">Powered by invoice_items</span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Revenue by Treatment */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">20</span>
                        <TrendingUp size={12} className="text-blue-500" />
                        Revenue by Treatment
                        <InfoIcon 
                          title="Revenue by Treatment" 
                          apiEndpoint="https://api.dentally.co/v1/invoices , https://api.dentally.co/v1/invoice_items"
                          apiFields={[
                        { field: 'invoice_items', role: 'Used invoices_items from invoices api' },
                        { field: 'name', role: 'name of the treatment from invoices_item' },
                        { field: 'amount', role: 'Total invoice value from invoices Api' },
                      ]}
                          databaseTables={['dentally_invoice_items', 'dentally_invoices']}
                          calculations="Joins invoice_items with invoices, summing total_price grouped by treatment name. Shows top 15 treatments by revenue."
                          additionalInfo="Identify highest-grossing treatments"
                        />
                      </h3>
                      <p className="text-[9px] text-slate-400 font-medium">Top treatments by revenue generated</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <RevenueByTreatmentChart data={treatmentRevenueData} />
                </div>
              </div>

              {/* Top 5 Patients by Revenue */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[8px] font-bold text-slate-500">21</span>
                        <UserCheck size={12} className="text-pink-500" />
                        Top 5 Patients by Revenue
                        <InfoIcon 
                          title="Top 5 Patients by Revenue" 
                          apiEndpoint="https://api.dentally.co/v1/invoices , https://api.dentally.co/v1/patients"
                          apiFields={[
                        { field: 'patient_id', role: 'Used patients from invoices api' },
                        { field: 'first_name', role: 'name of the patient from patients' },
                        { field: 'last_name', role: 'name of the patient from patients' },
                        { field: 'amount', role: 'Total invoice value from invoices Api' },
                      ]}
                          databaseTables={['dentally_patients', 'dentally_invoices']}
                          calculations="Joins patients with invoices, summing invoice amounts grouped by patient. Shows top 5 patients by total revenue in the selected period."
                          additionalInfo="Highest-value patients by revenue generated"
                        />
                      </h3>
                      <p className="text-[9px] text-slate-400 font-medium">Top-performing patients by revenue</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <TopPatientsByRevenueChart data={topPatientsData} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}