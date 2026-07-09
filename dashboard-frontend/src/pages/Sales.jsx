import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Download, Maximize2, Building2, CalendarRange, TrendingUp } from 'lucide-react';
import InfoIcon from '../components/InfoIcon';
import { formatUKCurrency, formatUKCurrencyFromThousands } from '../lib/formatCurrency';

export default function Sales() {
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [sources, setSources] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [cosmetic, setCosmetic] = useState(null);
  const [planGrowth, setPlanGrowth] = useState(null);
  const [recall, setRecall] = useState(null);
  const [reputation, setReputation] = useState(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(() => {
    const stored = sessionStorage.getItem('sales_refresh_cooldown');
    return stored ? Number(stored) : 0;
  });
  const [cooldownSecs, setCooldownSecs] = useState(0);

  const periodMap = {
    'Today': 'today', 'Last 7 days': '7d', 'Last 30 days': '30d',
    'Last 90 days': '90d', 'Last year': '1y', 'All time': 'all', 'Custom': 'all'
  };
  const metricsCache = useRef(new Map());
  const isMounted = useRef(false);
  const allPeriods = ['today', '7d', '30d', '90d', '1y', 'all'];

  const fetchStaticData = async () => {
    try {
      const [sourcesRes, funnelRes, cosmeticRes, planRes, recallRes, repRes] = await Promise.all([
        fetch(`https://demodashboard-production.up.railway.app/api/sales/acquisition-sources`),
        fetch(`https://demodashboard-production.up.railway.app/api/sales/funnel`),
        fetch(`https://demodashboard-production.up.railway.app/api/sales/cosmetic-pipeline`),
        fetch(`https://demodashboard-production.up.railway.app/api/sales/plan-growth`),
        fetch(`https://demodashboard-production.up.railway.app/api/sales/recall-reactivation`),
        fetch(`https://demodashboard-production.up.railway.app/api/sales/reputation`)
      ]);
      setSources(await sourcesRes.json());
      setFunnel(await funnelRes.json());
      setCosmetic(await cosmeticRes.json());
      setPlanGrowth(await planRes.json());
      setRecall(await recallRes.json());
      setReputation(await repRes.json());
    } catch (error) {
      console.error('Error fetching static sales data:', error);
    }
  };

  const fetchMetricsForPeriod = async (period) => {
    try {
      const res = await fetch(`https://demodashboard-production.up.railway.app/api/sales/metrics?period=${period}`);
      return await res.json();
    } catch (error) {
      console.error('Error fetching sales metrics:', error);
      return null;
    }
  };

  const fetchCustomSalesMetrics = async (startDate, endDate) => {
    try {
      const res = await fetch(`https://demodashboard-production.up.railway.app/api/sales/metrics?period=all&start_date=${startDate}&end_date=${endDate}`);
      return await res.json();
    } catch (error) {
      console.error('Error fetching custom sales metrics:', error);
      return null;
    }
  };

  useEffect(() => {
    const preFetchAll = async () => {
      await syncPageCache();
      const fetches = allPeriods.map(async (period) => {
        const data = await fetchMetricsForPeriod(period);
        if (data) metricsCache.current.set(period, data);
      });
      await Promise.all(fetches);
      await fetchStaticData();
      const period = periodMap[activeFilter] || '7d';
      const cached = metricsCache.current.get(period);
      if (cached) setMetrics(cached);
      isMounted.current = true;
    };
    preFetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      const customKey = `custom_${customStartDate}_${customEndDate}`;
      if (!metricsCache.current.has(customKey)) {
        fetchCustomSalesMetrics(customStartDate, customEndDate).then(data => {
          if (data) {
            metricsCache.current.set(customKey, data);
            setMetrics(data);
          }
        });
      } else {
        setMetrics(metricsCache.current.get(customKey));
      }
    } else {
      const period = periodMap[activeFilter] || '7d';
      const cached = metricsCache.current.get(period);
      if (cached) setMetrics(cached);
    }
  }, [activeFilter, customStartDate, customEndDate]);

  useEffect(() => {
    const updateCooldown = () => {
      if (refreshCooldownUntil > Date.now()) {
        setCooldownSecs(Math.floor((refreshCooldownUntil - Date.now()) / 1000));
      } else {
        setCooldownSecs(0);
      }
    };
    updateCooldown();
    const id = setInterval(updateCooldown, 1000);
    return () => clearInterval(id);
  }, [refreshCooldownUntil]);

  const syncPageCache = async () => {
    try {
      await fetch('https://demodashboard-production.up.railway.app/api/sync/page?page=sales', { method: 'POST' });
    } catch (error) {
      console.error('Error refreshing cache:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      const data = await fetchCustomSalesMetrics(customStartDate, customEndDate);
      if (data) {
        const customKey = `custom_${customStartDate}_${customEndDate}`;
        metricsCache.current.set(customKey, data);
        setMetrics(data);
      }
    } else {
      const fetches = allPeriods.map(async (period) => {
        const data = await fetchMetricsForPeriod(period);
        if (data) metricsCache.current.set(period, data);
      });
      await Promise.all(fetches);
      const period = periodMap[activeFilter] || '7d';
      const cached = metricsCache.current.get(period);
      if (cached) setMetrics(cached);
    }
    await fetchStaticData();
    await syncPageCache();
    const cooldownUntil = Date.now() + 5 * 60 * 1000;
    setRefreshCooldownUntil(cooldownUntil);
    sessionStorage.setItem('sales_refresh_cooldown', String(cooldownUntil));
    setIsRefreshing(false);
    window.location.reload();
  };

  const filters = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last year", "All time", "Custom"];
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

  const getMetricInfo = (title) => {
    switch(title) {
      case 'NEW PATIENTS':
        return {
          apiEndpoint: '/api/sales/metrics',
          tables: ['dentally_patients'],
          calculation: 'Count of new patients registered in the selected period. Split by private vs NHS based on patient source or payment type.'
        };
      case 'COST PER PATIENT':
        return {
          apiEndpoint: '/api/sales/metrics',
          tables: ['dentally_patients', 'marketing_spend'],
          calculation: 'Total marketing spend divided by new patients acquired. (spend / new_patients). Target is £70.'
        };
      case 'TREATMENT CONVERSION':
        return {
          apiEndpoint: '/api/sales/metrics',
          tables: ['dentally_treatment_plans', 'dentally_invoices'],
          calculation: 'Percentage of presented treatment plans that are accepted. (accepted / presented × 100). Target is 65%.'
        };
      case 'COSMETIC PIPELINE':
        return {
          apiEndpoint: '/api/sales/cosmetic-pipeline',
          tables: ['dentally_invoices', 'dentally_treatment_plans'],
          calculation: 'Sum of open + started + completed cosmetic treatment values. Based on treatment plan categories.'
        };
      case 'NET PLAN GROWTH':
        return {
          apiEndpoint: '/api/sales/plan-growth',
          tables: ['dentally_payment_plans'],
          calculation: 'Net plan growth = opens (new joins) - lapses. Shows membership book dynamics.'
        };
      case 'RECALL REVENUE':
        return {
          apiEndpoint: '/api/sales/recall-reactivation',
          tables: ['dentally_recalls', 'dentally_appointments', 'dentally_invoices'],
          calculation: 'Revenue recovered from overdue recall patients who were contacted, rebooked, attended and accepted treatment.'
        };
      default:
        return {
          apiEndpoint: '/api/sales/metrics',
          tables: ['dentally_patients'],
          calculation: 'Calculated from database records in the selected period.'
        };
    }
  };

  const kpiCards = metrics ? [
    { title: "NEW PATIENTS", value: metrics.new_patients.value, change: metrics.new_patients.change, detail: metrics.new_patients.detail, positive: metrics.new_patients.positive, trend: "M 0 15 L 16 12 L 32 18 L 48 10 L 64 14 L 80 8" },
    { title: "COST PER PATIENT", value: metrics.cost_per_patient.value, change: metrics.cost_per_patient.change, detail: metrics.cost_per_patient.detail, positive: metrics.cost_per_patient.positive, trend: "M 0 10 L 16 14 L 32 8 L 48 16 L 64 12 L 80 20" },
    { title: "TREATMENT CONVERSION", value: metrics.treatment_conversion.value, change: metrics.treatment_conversion.change, detail: metrics.treatment_conversion.detail, positive: metrics.treatment_conversion.positive, trend: "M 0 8 L 16 12 L 32 6 L 48 14 L 64 10 L 80 16" },
    { title: "COSMETIC PIPELINE", value: metrics.cosmetic_pipeline.value, change: metrics.cosmetic_pipeline.change, detail: metrics.cosmetic_pipeline.detail, positive: metrics.cosmetic_pipeline.positive, trend: "M 0 6 L 16 10 L 32 4 L 48 12 L 64 8 L 80 14" },
    { title: "NET PLAN GROWTH", value: metrics.net_plan_growth.value, change: metrics.net_plan_growth.change, detail: metrics.net_plan_growth.detail, positive: metrics.net_plan_growth.positive, trend: "M 0 14 L 16 10 L 32 16 L 48 8 L 64 12 L 80 6" },
    { title: "RECALL REVENUE", value: metrics.recall_revenue.value, change: metrics.recall_revenue.change, detail: metrics.recall_revenue.detail, positive: metrics.recall_revenue.positive, trend: "M 0 18 L 16 15 L 32 20 L 48 10 L 64 14 L 80 8" },
  ] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 select-none animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
          <div className="flex gap-4 items-start">
            <div className="relative shrink-0 mt-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/20">
                <TrendingUp size={18} className="animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-50 rounded-full shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 bg-clip-text">Sales & Marketing</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 shadow-sm">
                  <Building2 size={11} className="text-slate-400" /> 10 Practices active
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1 flex items-center gap-1.5">
                <CalendarRange size={13} className="text-slate-300" />
                Where new patients and private revenue come from <span className="text-slate-300">•</span> <span className="text-slate-600 font-semibold">{dateLabel}</span>
              </p>
            </div>
          </div>
          <button onClick={handleRefresh} disabled={isRefreshing || cooldownSecs > 0} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 h-10 bg-white border border-slate-200 hover:border-slate-300/80 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none">
            <RefreshCw size={14} className={`text-slate-400 transition-transform duration-700 ease-out ${isRefreshing ? "rotate-180 text-blue-500" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : cooldownSecs > 0 ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, '0')} left` : "Refresh"}</span>
          </button>
        </div>

        {/* Date Filter */}
        <div className="inline-flex p-1 bg-white border border-slate-200/60 rounded-xl shadow-sm sticky top-16 z-30">
          <div className="flex gap-0.5 relative min-w-max">
            {filters.map((filter) => {
              const isSelected = activeFilter === filter;
              return (
                <button key={filter} onClick={() => setActiveFilter(filter)}
                  className={`relative px-4 h-8 text-[12px] font-semibold tracking-tight rounded-lg transition-all duration-300 outline-none whitespace-nowrap ${isSelected ? "bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.03)] border border-slate-200/60" : "text-slate-500 hover:text-slate-900 hover:bg-white/40"}`}>
                  <span className="relative z-10">{filter}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {activeFilter === "Custom" && (
          <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-lg p-2 shadow-sm">
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

        {/* KPI Cards */}
        {!metrics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-5 animate-pulse">
                <div className="h-3 sm:h-4 bg-slate-200 rounded w-3/4 mb-2 sm:mb-3"></div>
                <div className="h-6 sm:h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 sm:h-3 bg-slate-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
            {kpiCards.map((card, index) => {
              const metricInfo = getMetricInfo(card.title);
              return (
                <div key={index} className="group bg-white border border-slate-200 rounded-xl p-3 sm:p-5 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-scaleIn">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      {card.title}
                      <InfoIcon 
                        title={card.title}
                        apiEndpoint={metricInfo.apiEndpoint}
                        databaseTables={metricInfo.tables}
                        calculations={metricInfo.calculation}
                      />
                    </p>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-bold text-slate-800 mt-2">{card.value}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <svg width="80" height="30" className="overflow-visible">
                      <defs>
                        <linearGradient id={`grad${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={card.positive ? "#10b981" : "#ef4444"} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={card.positive ? "#10b981" : "#ef4444"} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={card.trend + " L 80 30 L 0 30 Z"} fill={`url(#grad${index})`} />
                      <path d={card.trend} fill="none" stroke={card.positive ? "#10b981" : "#ef4444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className={`text-xs sm:text-sm font-semibold mt-2 flex items-center gap-1 ${card.positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                    <span className="text-base">{card.positive ? '↑' : '↓'}</span>
                    {card.change}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1">{card.detail}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Acquisition Source Mix */}
        {sources && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-sm sm:text-lg text-slate-800 flex items-center gap-1.5">
                  Acquisition source mix & cost
                  <InfoIcon 
                    title="Acquisition Source Mix"
                    apiEndpoint="/api/sales/acquisition-sources"
                    databaseTables={['dentally_patients', 'marketing_spend']}
                    calculations="Shows all new-patient acquisition sources with volume, private patient percentage, marketing spend, cost per new patient (CPNP), and return on ad spend (ROAS). Owned sources have no spend."
                  />
                </h2>
                <p className="text-[10px] sm:text-sm text-slate-500 mt-1">where new patients come from, the private lean and what each source costs</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Download className="w-4 h-4 text-slate-500" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Maximize2 className="w-4 h-4 text-slate-500" /></button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] sm:text-xs text-slate-600 font-medium">Owned (free)</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500"></div>
                <span className="text-[10px] sm:text-xs text-slate-600 font-medium">Paid</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">New patients</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Private %</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Spend</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">CPNP</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.sources.map((src, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${src.owned ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                          <span className="font-semibold text-slate-800">{src.name}</span>
                          {src.owned && <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">owned</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-medium">{src.new_patients}</td>
                      <td className="py-3 px-2 text-right">{src.private_pct}%</td>
                      <td className="py-3 px-2 text-right">{src.spend > 0 ? formatUKCurrencyFromThousands(src.spend, 0) : '-'}</td>
                      <td className="py-3 px-2 text-right">
                        {src.cpnp > 0 ? (
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${src.cpnp <= 70 ? 'bg-emerald-50 text-emerald-700' : src.cpnp <= 80 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                            {formatUKCurrency(src.cpnp, 0)}
                          </span>
                        ) : <span className="text-emerald-600 font-medium">free</span>}
                      </td>
                      <td className="py-3 px-2 text-right font-medium">{src.roas ? `${src.roas}x` : '∞'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Treatment-Plan Conversion Funnel & Cosmetic Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Funnel */}
          {funnel && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
              <div className="mb-4">
                <h2 className="font-bold text-sm sm:text-lg text-slate-800 flex items-center gap-1.5">
                  Treatment-plan conversion funnel
                  <InfoIcon 
                    title="Treatment Plan Conversion Funnel"
                    apiEndpoint="/api/sales/funnel"
                    databaseTables={['dentally_treatment_plans']}
                    calculations="Shows the case acceptance funnel: Presented → Accepted → Scheduled → Started → Completed. Each stage shows conversion rate and change. Also shows conversion by treatment type (implants, orthodontics, periodontics, restorative, cosmetic)."
                  />
                </h2>
                <p className="text-[10px] sm:text-sm text-slate-500 mt-1">presented to accepted to scheduled to started to completed</p>
              </div>

              <div className="space-y-3">
                {funnel.funnel.map((item, idx) => {
                  const maxValue = funnel.funnel[0].value;
                  const width = (item.value / maxValue) * 100;
                  return (
                    <div key={idx} className="relative">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium">{item.stage}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800 font-bold">{item.value}</span>
                          <span className="text-slate-400">({item.pct}%)</span>
                          <span className="text-emerald-600 text-[10px]">{item.change}</span>
                        </div>
                      </div>
                      <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg transition-all duration-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium mb-2">Conversion by treatment type (present to start)</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {funnel.by_type.map((item, idx) => (
                    <div key={idx} className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-slate-500">{item.name}</p>
                      <p className="text-sm font-bold text-slate-800">{item.pct}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cosmetic Pipeline */}
          {cosmetic && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
              <div className="mb-4">
                <h2 className="font-bold text-sm sm:text-lg text-slate-800 flex items-center gap-1.5">
                  Cosmetic pipeline by line
                  <InfoIcon 
                    title="Cosmetic Pipeline"
                    apiEndpoint="/api/sales/cosmetic-pipeline"
                    databaseTables={['dentally_treatment_plans', 'dentally_invoices']}
                    calculations="Shows the cosmetic treatment pipeline broken down by line (Invisalign, smile makeovers, implants, composite bonding, whitening, facial aesthetics). Displays open, started, and completed values with conversion rates and average treatment values."
                  />
                </h2>
                <p className="text-[10px] sm:text-sm text-slate-500 mt-1">open, started and completed value per cosmetic line</p>
              </div>
              <div className="text-right mb-4">
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">total pipeline</p>
                <p className="text-lg font-bold text-emerald-600">{formatUKCurrencyFromThousands(cosmetic.total, 0)}</p>
              </div>

              <div className="space-y-4">
                {cosmetic.lines.map((line, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">{line.name}</span>
                      <span className="text-slate-500">{line.conversion}% conv · {formatUKCurrency(line.avg_value, 0)} avg</span>
                    </div>
                    <div className="h-5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-500 rounded-l-full transition-all" style={{ width: `${(line.open / cosmetic.total) * 100}%` }} title={`Open: ${formatUKCurrencyFromThousands(line.open, 0)}`} />
                      <div className="h-full bg-blue-400 transition-all" style={{ width: `${(line.started / cosmetic.total) * 100}%` }} title={`Started: ${formatUKCurrencyFromThousands(line.started, 0)}`} />
                      <div className="h-full bg-emerald-400 rounded-r-full transition-all" style={{ width: `${(line.completed / cosmetic.total) * 100}%` }} title={`Completed: ${formatUKCurrencyFromThousands(line.completed, 0)}`} />
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-slate-400">
                      <span>Open: {formatUKCurrencyFromThousands(line.open, 0)}</span>
                      <span>Started: {formatUKCurrencyFromThousands(line.started, 0)}</span>
                      <span>Done: {formatUKCurrencyFromThousands(line.completed, 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Plan Growth & Recall Reactivation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Plan Growth */}
          {planGrowth && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
              <div className="mb-4">
                <h2 className="font-bold text-sm sm:text-lg text-slate-800 flex items-center gap-1.5">
                  Plan / membership growth & retention
                  <InfoIcon 
                    title="Plan Growth & Retention"
                    apiEndpoint="/api/sales/plan-growth"
                    databaseTables={['dentally_payment_plans']}
                    calculations="Shows membership book dynamics: gross joins (opens), lapses, net movement, average plan value, and closing base. Target progress is calculated as (current / target_max) × 100."
                  />
                </h2>
                <p className="text-[10px] sm:text-sm text-slate-500 mt-1">opening + joins - lapses = closing, with the lapse rate</p>
              </div>

              <div className="flex items-center justify-center mb-6">
                <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="12"
                      strokeDasharray={`${(planGrowth.target / planGrowth.target_max) * 251} ${251 - (planGrowth.target / planGrowth.target_max) * 251}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] sm:text-xs text-slate-500 font-medium">of target</span>
                    <span className="text-2xl sm:text-3xl font-bold text-slate-800">{Math.round((planGrowth.target / planGrowth.target_max) * 100)}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <p className="text-[10px] sm:text-xs text-slate-500">Joins</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600">+{planGrowth.opens}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl text-center">
                  <p className="text-[10px] sm:text-xs text-slate-500">Lapses</p>
                  <p className="text-xl sm:text-2xl font-bold text-rose-500">-{planGrowth.lapses}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <p className="text-[10px] sm:text-xs text-slate-500">Avg plan value</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">£{planGrowth.avg_value}/mo</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-xl text-center">
                  <p className="text-[10px] sm:text-xs text-slate-500">Closing base</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{planGrowth.closing_base.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Recall Reactivation */}
          {recall && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow duration-300">
              <div className="mb-4">
                <h2 className="font-bold text-sm sm:text-lg text-slate-800 flex items-center gap-1.5">
                  Recall reactivation as a growth lever
                  <InfoIcon 
                    title="Recall Reactivation"
                    apiEndpoint="/api/sales/recall-reactivation"
                    databaseTables={['dentally_recalls', 'dentally_appointments', 'dentally_invoices']}
                    calculations="Shows the recall reactivation funnel: Overdue → Contacted → Rebooked → Attended → Accepted. Displays recovered revenue and still recoverable amount from overdue recall patients."
                  />
                </h2>
                <p className="text-[10px] sm:text-sm text-slate-500 mt-1">overdue to contacted to rebooked to attended to accepted</p>
              </div>

              <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-slate-500">Recovered</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600">{formatUKCurrencyFromThousands(recall.recovered, 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-slate-500">Still recoverable</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-600">{formatUKCurrencyFromThousands(recall.still_recoverable, 0)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {recall.funnel.map((item, idx) => {
                  const maxValue = recall.funnel[0].value;
                  const width = (item.value / maxValue) * 100;
                  return (
                    <div key={idx} className="flex items-center gap-2 sm:gap-3">
                      <div className="w-20 sm:w-24 text-[10px] sm:text-xs text-slate-600 font-medium text-right">{item.stage}</div>
                      <div className="flex-1 h-5 sm:h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all" style={{ width: `${width}%` }} />
                      </div>
                      <div className="w-14 sm:w-16 text-[10px] sm:text-xs text-right">
                        <span className="font-bold text-slate-800">{item.value}</span>
                        <span className="text-slate-400 ml-1">({item.pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-3">27.4% of the overdue pool reactivated, recovering {formatUKCurrencyFromThousands(recall.recovered, 0)} this period.</p>
            </div>
          )}
        </div>

        {/* Reputation by Location */}
        {reputation && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6 hover:shadow-md transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-sm sm:text-lg text-slate-800 flex items-center gap-1.5">
                  Reputation by location
                  <InfoIcon 
                    title="Reputation by Location"
                    apiEndpoint="/api/sales/reputation"
                    databaseTables={['dentally_sites', 'dentally_reviews']}
                    calculations="Shows rating, review volume, new patients, and velocity per practice. Group weighted average is calculated by weighting each practice rating by its review count."
                  />
                </h2>
                <p className="text-[10px] sm:text-sm text-slate-500 mt-1">rating, review volume and velocity per practice, and how rating tracks new patients</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">group weighted avg</p>
                <p className="text-lg font-bold text-amber-500">{reputation.practices.reduce((s, p) => s + p.rating * p.reviews, 0) / reputation.practices.reduce((s, p) => s + p.reviews, 0)}★</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Download className="w-4 h-4 text-slate-500" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Maximize2 className="w-4 h-4 text-slate-500" /></button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Practice</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Region</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rating</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reviews</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">New</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Velocity</th>
                  </tr>
                </thead>
                <tbody>
                  {reputation.practices.map((p, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-3 px-2 text-slate-500 text-xs">{p.region}</td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className={`font-bold ${p.rating >= 4.5 ? 'text-emerald-600' : p.rating >= 4.0 ? 'text-amber-600' : 'text-rose-500'}`}>{p.rating}</span>
                          <span className="text-amber-400 text-xs">★</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600">{p.reviews}</td>
                      <td className="py-3 px-2 text-right">
                        <span className={`font-medium ${p.new_patients >= 4 ? 'text-emerald-600' : p.new_patients >= 2 ? 'text-amber-600' : 'text-slate-600'}`}>+{p.new_patients}</span>
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-emerald-600">{p.velocity}</td>
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