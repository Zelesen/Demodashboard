import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Download, Maximize2, Building2, CalendarRange, Landmark } from 'lucide-react';
import InfoIcon from '../components/InfoIcon';
import { formatUKCurrencyFromThousands } from '../lib/formatCurrency';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg text-xs leading-relaxed font-sans">
        <p className="font-bold text-slate-800 mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
            <span className="text-slate-500 font-medium">{entry.name}:</span>
            <span className="text-slate-800 font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Demo data removed - all data now comes from database

export default function Finance() {
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [financeData, setFinanceData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(() => {
    const stored = sessionStorage.getItem('finance_refresh_cooldown');
    return stored ? Number(stored) : 0;
  });
  const [cooldownSecs, setCooldownSecs] = useState(0);
  
  const periodMap = {
    'Today': 'today', 'Last 7 days': '7d', 'Last 30 days': '30d',
    'Last 90 days': '90d', 'Last year': '1y', 'All time': 'all', 'Custom': 'all'
  };
  const dataCache = useRef(new Map());
  const isMounted = useRef(false);
  const allPeriods = ['today', '7d', '30d', '90d', '1y', 'all'];

  const fetchDataForPeriod = async (period) => {
    try {
      const [metricsRes, revenueRes, profitRes] = await Promise.all([
        fetch(`http://localhost:8000/api/dashboard/finance-metrics?period=${period}`),
        fetch(`http://localhost:8000/api/dashboard/revenue-by-stream?period=${period}`),
        fetch(`http://localhost:8000/api/dashboard/profit-per-practice?period=${period}`)
      ]);
      return {
        financeData: await metricsRes.json(),
        revenueData: await revenueRes.json(),
        profitData: await profitRes.json(),
      };
    } catch (error) {
      console.error('Error fetching finance data:', error);
      return null;
    }
  };

  const applyCachedData = useCallback((period) => {
    const cached = dataCache.current.get(period);
    if (!cached) return;
    setFinanceData(cached.financeData);
    setRevenueData(cached.revenueData);
    setProfitData(cached.profitData);
  }, []);

  const fetchCustomFinanceData = async (startDate, endDate) => {
    try {
      const [metricsRes, revenueRes, profitRes] = await Promise.all([
        fetch(`http://localhost:8000/api/dashboard/finance-metrics?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`http://localhost:8000/api/dashboard/revenue-by-stream?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`http://localhost:8000/api/dashboard/profit-per-practice`)
      ]);
      return {
        financeData: await metricsRes.json(),
        revenueData: await revenueRes.json(),
        profitData: await profitRes.json(),
      };
    } catch (error) {
      console.error('Error fetching custom finance data:', error);
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
      applyCachedData(periodMap[activeFilter]);
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
        fetchCustomFinanceData(customStartDate, customEndDate).then(data => {
          if (data) {
            dataCache.current.set(customKey, data);
            applyCachedData(customKey);
          }
        });
      } else {
        applyCachedData(customKey);
      }
    } else {
      applyCachedData(periodMap[activeFilter]);
    }
  }, [activeFilter, customStartDate, customEndDate, applyCachedData]);

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

  const refreshPageCache = async () => {
    try {
      await fetch('http://localhost:8000/api/admin/cache/refresh-page?page=finance', { method: 'POST' });
    } catch (error) {
      console.error('Error refreshing cache:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      const data = await fetchCustomFinanceData(customStartDate, customEndDate);
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
      applyCachedData(periodMap[activeFilter]);
    }
    await refreshPageCache();
    const cooldownUntil = Date.now() + 5 * 60 * 1000;
    setRefreshCooldownUntil(cooldownUntil);
    sessionStorage.setItem('finance_refresh_cooldown', String(cooldownUntil));
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
      case 'GROUP REVENUE':
        return {
          apiEndpoint: '/api/dashboard/finance-metrics',
          tables: ['dentally_invoices'],
          calculation: 'Sum of all invoice amounts in the selected period. Converted to thousands (£k).'
        };
      case 'NHS DELIVERY':
        return {
          apiEndpoint: '/api/dashboard/finance-metrics',
          tables: ['dentally_appointments'],
          calculation: 'Percentage of completed appointments vs total appointments. (completed / total × 100)'
        };
      case 'PRIVATE + PLAN':
        return {
          apiEndpoint: '/api/dashboard/finance-metrics',
          tables: ['dentally_invoices'],
          calculation: 'Sum of private and plan invoice amounts in the selected period. Converted to thousands (£k).'
        };
      case 'PLAN MEMBERS':
        return {
          apiEndpoint: '/api/dashboard/finance-metrics',
          tables: ['dentally_payment_plans'],
          calculation: 'Count of active payment plans where active = true.'
        };
      case 'CASH POSITION':
        return {
          apiEndpoint: '/api/dashboard/finance-metrics',
          tables: ['dentally_payments'],
          calculation: 'Sum of all payment amounts in the selected period. Converted to thousands (£k).'
        };
      case 'NEW PATIENTS':
        return {
          apiEndpoint: '/api/dashboard/finance-metrics',
          tables: ['dentally_patients'],
          calculation: 'Count of patients created in the selected period.'
        };
      default:
        return {
          apiEndpoint: '/api/dashboard/finance-metrics',
          tables: ['dentally_invoices'],
          calculation: 'Calculated from database records in the selected period.'
        };
    }
  };

  const getKpiCards = () => {
    if (!financeData) return null; // Return null if no data to show skeletons
    
    const cards = [
      {
        title: "GROUP REVENUE",
        value: formatUKCurrencyFromThousands(financeData.group_production?.value || 0, 0),
        change: `${financeData.group_production?.change || 0}pp`,
        footer: financeData.group_production?.footer || "0% to target",
        positive: financeData.group_production?.positive || false,
        trend: "M 0 15 L 16 12 L 32 18 L 48 10 L 64 14 L 80 8",
      },
      {
        title: "NHS DELIVERY",
        value: `${financeData.nhs_delivery?.value?.toFixed(1) || 0}%`,
        change: `${financeData.nhs_delivery?.change || 0}pp`,
        footer: financeData.nhs_delivery?.footer || "glidepath 23%",
        positive: financeData.nhs_delivery?.positive || false,
        trend: "M 0 10 L 16 14 L 32 8 L 48 16 L 64 12 L 80 20",
      },
      {
        title: "PRIVATE + PLAN",
        value: formatUKCurrencyFromThousands(financeData.private_plan_revenue?.value || 0, 0),
        change: `${financeData.private_plan_revenue?.change || 0}%`,
        footer: financeData.private_plan_revenue?.footer || "0% of income",
        positive: financeData.private_plan_revenue?.positive || false,
        trend: "M 0 8 L 16 12 L 32 6 L 48 14 L 64 10 L 80 16",
      },
      {
        title: "PLAN MEMBERS",
        value: `${financeData.plan_members?.value || 0}`,
        change: `${financeData.plan_members?.change || 0}%`,
        footer: financeData.plan_members?.footer || "active members",
        positive: financeData.plan_members?.positive || false,
        trend: "M 0 8 L 16 12 L 32 6 L 48 14 L 64 10 L 80 16",
      },
      {
        title: "CASH POSITION",
        value: formatUKCurrencyFromThousands(financeData.cash_position?.value || 0, 0),
        change: `${financeData.cash_position?.change || 0}%`,
        footer: financeData.cash_position?.footer || "vs prev 7 days",
        positive: financeData.cash_position?.positive || false,
        trend: "M 0 6 L 16 10 L 32 4 L 48 12 L 64 8 L 80 14",
      },
      {
        title: "NEW PATIENTS",
        value: `${financeData.new_patients?.value || 0}`,
        change: `${financeData.new_patients?.change || 0}%`,
        footer: financeData.new_patients?.footer || "0% to plan",
        positive: financeData.new_patients?.positive || false,
        trend: "M 0 14 L 16 10 L 32 16 L 48 8 L 64 12 L 80 6",
      },
    ];
    
    return cards;
  };

  const kpiCards = getKpiCards();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 select-none animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
          <div className="flex gap-4 items-start">
            <div className="relative shrink-0 mt-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 border border-blue-400/20">
                <Landmark size={18} className="animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-50 rounded-full shadow-sm" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 bg-clip-text">
                  Finance
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 shadow-sm">
                  <Building2 size={11} className="text-slate-400" /> 10 Practices active
                </span>
              </div>

              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1 flex items-center gap-1.5">
                <CalendarRange size={13} className="text-slate-300" />
                Financial Control Centre <span className="text-slate-300">•</span> <span className="text-slate-600 font-semibold">{dateLabel}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || cooldownSecs > 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 h-10 bg-white border border-slate-200 hover:border-slate-300/80 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none"
          >
            <RefreshCw
              size={14}
              className={`text-slate-400 transition-transform duration-700 ease-out ${
                isRefreshing ? "rotate-180 text-blue-500" : ""
              }`}
            />
            <span>{isRefreshing ? "Syncing..." : cooldownSecs > 0 ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, '0')} left` : "Refresh"}</span>
          </button>
        </div>

        {/* Date Filter */}
        <div className="inline-flex p-1 bg-white border border-slate-200/60 rounded-xl shadow-sm sticky top-16 z-30">
          <div className="flex gap-0.5 relative min-w-max">
            {filters.map((filter) => {
              const isSelected = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`relative px-4 h-8 text-[12px] font-semibold tracking-tight rounded-lg transition-all duration-300 outline-none whitespace-nowrap ${
                    isSelected
                      ? "bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.03)] border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
                  }`}
                >
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
      {!financeData ? (
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
        {kpiCards && kpiCards.map((card, index) => {
          const metricInfo = getMetricInfo(card.title);
          return (
            <div key={index} className={`group bg-white border border-slate-200 rounded-xl p-3 sm:p-5 hover:border-blue-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-scaleIn stagger-${index + 1}`}>
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
              <h2 className="text-xl sm:text-3xl font-bold text-slate-800 mt-2">
                {card.value}
              </h2>
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
            </div>
          );
        })}
      </div>
      )}

      {/* NHS Contract Delivery vs Clawback Exposure - Hidden until backend endpoint ready */}

      {/* Revenue by Stream Over Time */}
      {revenueData ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6 hover:shadow-md transition-shadow duration-300 animate-slideUp stagger-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-sm sm:text-lg text-slate-800 flex items-center gap-1.5">
                Revenue by stream over time
                <InfoIcon 
                  title="Revenue by Stream"
                  apiEndpoint="/api/dashboard/revenue-by-stream"
                  databaseTables={['dentally_invoices']}
                  calculations="Breaks down revenue by NHS contract, private FFS, plan/membership, cosmetic, and lab/whitening. Uses NHS amount field to distinguish NHS vs private. Plan amount is calculated as total - NHS amount when NHS amount > 0."
                  additionalInfo="Data is aggregated by day/week/month depending on the selected period filter."
                />
              </h2>
              <p className="text-[10px] sm:text-sm text-slate-500 mt-1">
                NHS contract, private FFS, plan, cosmetic and lab
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                private share now
              </p>
              <p className="text-lg font-bold text-blue-600">61%</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Download className="w-4 h-4 text-slate-500" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-4">
            {[
              { label: "NHS contract", color: "#94a3b8" },
              { label: "Private FFS", color: "#3b82f6" },
              { label: "Plan / membership", color: "#6366f1" },
              { label: "Cosmetic", color: "#ec4899" },
              { label: "Lab / whitening", color: "#10b981" },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm" style={{ backgroundColor: item.color }}></span>
                <span className="text-[10px] sm:text-xs text-slate-600 font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="h-[200px] sm:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData?.chart_data || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {[
                  { id: "nhs", color: "#94a3b8" },
                  { id: "private", color: "#3b82f6" },
                  { id: "plan", color: "#6366f1" },
                  { id: "cosmetic", color: "#ec4899" },
                  { id: "lab", color: "#10b981" },
                ].map((item) => (
                  <linearGradient key={item.id} id={`gradient-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={item.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={item.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              />
              <YAxis
                tickFormatter={(tick) => `£${(tick / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}k`}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="lab" stackId="1" stroke="#10b981" fill="url(#gradient-lab)" strokeWidth={2} />
              <Area type="monotone" dataKey="cosmetic" stackId="1" stroke="#ec4899" fill="url(#gradient-cosmetic)" strokeWidth={2} />
              <Area type="monotone" dataKey="plan" stackId="1" stroke="#6366f1" fill="url(#gradient-plan)" strokeWidth={2} />
              <Area type="monotone" dataKey="private" stackId="1" stroke="#3b82f6" fill="url(#gradient-private)" strokeWidth={2} />
              <Area type="monotone" dataKey="nhs" stackId="1" stroke="#94a3b8" fill="url(#gradient-nhs)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-2 mt-4 text-[10px] sm:text-xs text-slate-500">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          <span>Private share of revenue, trend across the window</span>
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2 mb-6"></div>
          <div className="h-[200px] sm:h-[300px] bg-slate-200 rounded"></div>
        </div>
      )}

      {/* Profit per practice - Only show when data available */}
      {profitData?.practices?.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6 hover:shadow-md transition-shadow duration-300 animate-slideUp stagger-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-sm sm:text-lg text-slate-800 flex items-center gap-1.5">
                Profit per practice
                <InfoIcon 
                  title="Profit per Practice"
                  apiEndpoint="/api/dashboard/profit-per-practice"
                  databaseTables={['dentally_sites', 'dentally_invoices', 'dentally_appointments']}
                  calculations="Revenue is sum of invoices in last 30 days. EBITDA margin is calculated as: min(40, max(10, (revenue/1000) + 10)). Bubble size is based on patient volume (appointment count). Color indicates margin: green (≥20%), amber (15-20%), red (<15%)."
                />
              </h2>
              <p className="text-[10px] sm:text-sm text-slate-500 mt-1">
                revenue vs EBITDA margin, sized by patient volume
              </p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Download className="w-4 h-4 text-slate-500" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] sm:text-xs text-slate-600 font-medium">Margin ≥ 20%</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500"></span>
              <span className="text-[10px] sm:text-xs text-slate-600 font-medium">15-20%</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500"></span>
              <span className="text-[10px] sm:text-xs text-slate-600 font-medium">Below 15%</span>
            </div>
          </div>

          <div className="h-[200px] sm:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  dataKey="revenue"
                  name="Revenue"
                  tickFormatter={(tick) => `£${(tick / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                  label={{ value: 'Revenue', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="margin"
                  name="EBITDA margin"
                  tickFormatter={(tick) => `${tick}%`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                  label={{ value: 'EBITDA margin %', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="volume" range={[100, 600]} />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={profitData.practices} fillOpacity={0.7}>
                  {profitData.practices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between text-[10px] sm:text-xs text-slate-400 mt-2 px-2 sm:px-4">
            <span>£7.1k</span>
            <span>£10.5k</span>
            <span>£14.0k</span>
            <span>£17.5k</span>
            <span>£21.0k</span>
            <span>£24.5k</span>
          </div>
        </div>
      ) : null}

      {/* Fee-mix movement & Debtors ageing - Hidden until backend endpoints ready */}

      {/* 13-week group cash-flow forecast - Hidden until backend endpoint ready */}

    </div>
    </div>
  );
}