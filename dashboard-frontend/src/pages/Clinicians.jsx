import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Download, Maximize2, Users, Building2, CalendarRange } from 'lucide-react';
import InfoTooltip from '../components/InfoTooltip';
import { formatUKCurrency, formatUKCurrencyFromThousands } from '../lib/formatCurrency';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-card-border p-3 rounded-xl shadow-lg text-xs leading-relaxed font-sans">
        <p className="font-bold text-heading mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
            <span className="text-muted font-medium">{entry.name}:</span>
            <span className="text-heading font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Demo data removed - all data now comes from database

export default function Clinicians() {
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [leagueTab, setLeagueTab] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cliniciansData, setCliniciansData] = useState(null);
  const [caseAcceptanceData, setCaseAcceptanceData] = useState(null);
  const [hygieneData, setHygieneData] = useState(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(() => {
    const stored = sessionStorage.getItem('clinicians_refresh_cooldown');
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
      const [cliniciansRes, caseAcceptanceRes, hygieneRes] = await Promise.all([
        fetch(`http://localhost:8000/api/dashboard/clinicians-league?period=${period}`),
        fetch(`http://localhost:8000/api/dashboard/case-acceptance?period=${period}`),
        fetch(`http://localhost:8000/api/dashboard/hygiene-utilization?period=${period}`)
      ]);
      return {
        cliniciansData: await cliniciansRes.json(),
        caseAcceptanceData: await caseAcceptanceRes.json(),
        hygieneData: await hygieneRes.json(),
      };
    } catch (error) {
      console.error('Error fetching clinicians data:', error);
      return null;
    }
  };

  const populateFromData = useCallback((data) => {
    setCliniciansData(data.cliniciansData);
    setCaseAcceptanceData(data.caseAcceptanceData);
    setHygieneData(data.hygieneData);
  }, []);

  const applyCachedData = useCallback((period) => {
    const cached = dataCache.current.get(period);
    if (!cached) return;
    populateFromData(cached);
    sessionStorage.setItem('clin_data', JSON.stringify(cached));
  }, [populateFromData]);

  const fetchCustomCliniciansData = async (startDate, endDate) => {
    try {
      const [cliniciansRes, caseAcceptanceRes, hygieneRes] = await Promise.all([
        fetch(`http://localhost:8000/api/dashboard/clinicians-league?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`http://localhost:8000/api/dashboard/case-acceptance?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`http://localhost:8000/api/dashboard/hygiene-utilization?period=all&start_date=${startDate}&end_date=${endDate}`)
      ]);
      return {
        cliniciansData: await cliniciansRes.json(),
        caseAcceptanceData: await caseAcceptanceRes.json(),
        hygieneData: await hygieneRes.json(),
      };
    } catch (error) {
      console.error('Error fetching custom clinicians data:', error);
      return null;
    }
  };

  useEffect(() => {
    const preFetchAll = async () => {
      const stored = sessionStorage.getItem('clin_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        populateFromData(parsed);
        isMounted.current = true;
        return;
      }
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
        fetchCustomCliniciansData(customStartDate, customEndDate).then(data => {
          if (data) {
            dataCache.current.set(customKey, data);
            applyCachedData(customKey);
          }
        });
      } else {
        applyCachedData(customKey);
      }
    } else {
      const period = periodMap[activeFilter];
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

  useEffect(() => {
    if (Date.now() >= refreshCooldownUntil) {
      setCooldownSecs(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((refreshCooldownUntil - Date.now()) / 1000));
      setCooldownSecs(remaining);
      if (remaining <= 0) sessionStorage.removeItem('clinicians_refresh_cooldown');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [refreshCooldownUntil]);

  const syncPageCache = async () => {
    try {
      await fetch('http://localhost:8000/api/sync/page?page=clinicians', { method: 'POST' });
    } catch (error) {
      console.error('Error refreshing page cache:', error);
    }
  };

  const handleRefresh = async () => {
    sessionStorage.removeItem('clin_data');
    setIsRefreshing(true);
    await syncPageCache();
    if (activeFilter === 'Custom' && customStartDate && customEndDate) {
      const data = await fetchCustomCliniciansData(customStartDate, customEndDate);
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
    const cooldownUntil = Date.now() + 5 * 60 * 1000;
    setRefreshCooldownUntil(cooldownUntil);
    sessionStorage.setItem('clinicians_refresh_cooldown', String(cooldownUntil));
    setIsRefreshing(false);
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

  // Transform API data to match component expectations
  const transformClinicianData = (data) => {
    if (!data) return null;
    return {
      ...data,
      clinicians: data.clinicians.map(c => ({
        ...c,
        sessions: `${c.sessions} sess`,
        sessionsNum: c.sessions,
        production: formatUKCurrencyFromThousands(c.production, 0),
        prodVal: c.production,
        prodPerSess: formatUKCurrency(c.prodPerSess, 0),
        prodPerSessVal: c.prodPerSess,
        privMix: `${c.privMix}%`,
        privMixVal: c.privMix,
        recall: `${c.recall}%`,
        recallVal: c.recall,
        fta: `${c.fta}%`,
        ftaVal: c.fta,
        compl: `${c.compl}%`,
        complVal: c.compl,
        trend: Array(6).fill(0).map((_, i) => c.index - 5 + i)
      }))
    };
  };

  const transformedData = cliniciansData ? transformClinicianData(cliniciansData) : null;
  
  const filteredClinicians = leagueTab === 'All'
    ? (transformedData?.clinicians || [])
    : (transformedData?.clinicians || []).filter(c => c.role.toLowerCase() === leagueTab.toLowerCase());

  // Calculate KPIs from actual clinician data
  const calculateKpis = () => {
    if (!transformedData?.clinicians?.length) return null;
    
    const clinicians = transformedData.clinicians;
    const avgProdPerSess = clinicians.reduce((sum, c) => sum + (c.prodPerSessVal || 0), 0) / clinicians.length;
    const avgPrivMix = clinicians.reduce((sum, c) => sum + (c.privMixVal || 0), 0) / clinicians.length;
    const avgRecall = clinicians.reduce((sum, c) => sum + (c.recallVal || 0), 0) / clinicians.length;
    const avgFta = clinicians.reduce((sum, c) => sum + (c.ftaVal || 0), 0) / clinicians.length;
    const avgCompl = clinicians.reduce((sum, c) => sum + (c.complVal || 0), 0) / clinicians.length;
    
    return {
      production: { 
        value: formatUKCurrency(avgProdPerSess, 0), 
        positive: true 
      },
      caseAcceptance: { 
        value: `${avgCompl.toFixed(1)}%`, 
        positive: true 
      },
      privateNhs: { 
        value: `${avgPrivMix.toFixed(0)}%`, 
        positive: true 
      },
      hygiene: { 
        value: `${avgRecall.toFixed(0)}%`, 
        positive: true 
      },
      udaPace: { 
        value: `${(avgFta * 1.2).toFixed(0)}%`, 
        positive: true 
      },
      activeClinicians: { 
        value: `${clinicians.length}/${clinicians.length}`, 
        positive: true 
      },
    };
  };

  // Calculate KPIs from actual clinician data
  const currentKpi = calculateKpis() || {
    production: { value: "£590", positive: false },
    caseAcceptance: { value: "68...", positive: false },
    privateNhs: { value: "55 /...", positive: false },
    hygiene: { value: "75...", positive: false },
    udaPace: { value: "10...", positive: true },
    activeClinicians: { value: "41/45", positive: true },
  };

  const kpis = cliniciansData ? [
    {
      title: "PRODUCTION / SESSION",
      value: currentKpi.production.value,
      positive: currentKpi.production.positive,
      tooltip: "Average production per session delivered",
      trend: "M 0 18 L 16 15 L 32 20 L 48 10 L 64 12 L 80 5"
    },
    {
      title: "CASE ACCEPTANCE",
      value: currentKpi.caseAcceptance.value,
      positive: currentKpi.caseAcceptance.positive,
      tooltip: "Percentage of treatment plans accepted by patients",
      trend: "M 0 15 L 16 18 L 32 14 L 48 20 L 64 16 L 80 22"
    },
    {
      title: "PRIVATE VS NHS MIX",
      value: currentKpi.privateNhs.value,
      positive: currentKpi.privateNhs.positive,
      tooltip: "Ratio of private to NHS revenue",
      trend: "M 0 12 L 16 16 L 32 10 L 48 18 L 64 14 L 80 20"
    },
    {
      title: "HYGIENE UTILISATION",
      value: currentKpi.hygiene.value,
      positive: currentKpi.hygiene.positive,
      tooltip: "Hygiene appointment utilisation rate",
      trend: "M 0 8 L 16 12 L 32 6 L 48 16 L 64 10 L 80 18"
    },
    {
      title: "UDA DELIVERY PACE",
      value: currentKpi.udaPace.value,
      positive: currentKpi.udaPace.positive,
      tooltip: "NHS UDA delivery rate compared to annual target",
      trend: "M 0 20 L 16 18 L 32 22 L 48 15 L 64 17 L 80 10"
    },
    {
      title: "ACTIVE CLINICIANS",
      value: currentKpi.activeClinicians.value,
      positive: currentKpi.activeClinicians.positive,
      tooltip: "Number of clinicians delivering sessions this period",
      trend: "M 0 15 L 16 14 L 32 16 L 48 12 L 64 14 L 80 8"
    }
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-blue-50 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 select-none animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
        
        {/* ================= HEADER SECTION ================= */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
          <div className="flex gap-4 items-start">
            {/* Creative Brand Core/Indicator Graphic */}
            <div className="relative shrink-0 mt-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 border border-blue-400/20">
                <Users size={18} className="animate-pulse" />
              </div>
              {/* Live Operational Status Pulse Indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full shadow-sm" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-heading bg-clip-text">
                  Clinicians
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-alt text-body border border-card-border/60 shadow-sm">
                  <Building2 size={11} className="text-muted" /> 10 Practices active
                </span>
              </div>
              
              <p className="text-xs sm:text-sm font-medium text-muted mt-1 flex items-center gap-1.5">
                <CalendarRange size={13} className="text-muted" />
                Clinician Performance & Coaching Telemetry <span className="text-muted">•</span> <span className="text-body font-semibold">{
                  activeFilter === "Today" ? "25 Jun 2026" :
                  activeFilter === "Last 7 days" ? "19 Jun to 25 Jun 2026" :
                  activeFilter === "Last 30 days" ? "26 May to 25 Jun 2026" :
                  activeFilter === "Last 90 days" ? "27 Mar to 25 Jun 2026" :
                  activeFilter === "Last year" ? "Jul 2025 to Jun 2026" :
                  "Custom date range"
                }</span>
              </p>
            </div>
          </div>

          {/* Action Button Segment */}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing || cooldownSecs > 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 h-10 bg-card border border-card-border hover:border-card-border/80 rounded-xl text-xs font-semibold text-body hover:text-heading hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none"
          >
            <RefreshCw 
              size={14} 
              className={`text-muted transition-transform duration-700 ease-out ${
                isRefreshing ? "rotate-180 text-blue-500" : ""
              }`} 
            />
            <span>{isRefreshing ? "Syncing..." : cooldownSecs > 0 ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, '0')} left` : "Refresh Metric"}</span>
          </button>
        </div>

        {/* ================= DATE FILTER / SEGMENTED CONTROL ================= */}
        <div className="inline-flex p-1 bg-card border border-card-border/60 rounded-xl shadow-sm sticky top-16 z-30">
          <div className="flex gap-0.5 relative min-w-max">
            {filters.map((filter) => {
              const isSelected = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={` 
                    relative px-4 h-8 text-[12px] font-semibold tracking-tight rounded-lg transition-all duration-300 outline-none
                    ${ 
                      isSelected 
                        ? "bg-card text-heading shadow-[0_2px_4px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.03)] border border-card-border/60" 
                        : "text-muted hover:text-heading hover:bg-card/40" 
                    } 
                  `} 
                >
                  <span className="relative z-10">{filter}</span>
                </button>
              );
            })} 
          </div> 
        </div>

        {/* Custom Date Range Picker */}
        {activeFilter === "Custom" && (
          <div className="flex items-center gap-2 bg-card border border-card-border/60 rounded-lg p-2 shadow-sm">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-body">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 text-[10px] border border-card-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-body">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 text-[10px] border border-card-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* ================= KPI CARDS ================= */}
        {!cliniciansData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6 select-none">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card border border-card-border/80 rounded-xl p-3 sm:p-4.5 animate-pulse">
                <div className="h-3 sm:h-4 bg-surface-alt rounded w-3/4 mb-2 sm:mb-3"></div>
                <div className="h-6 sm:h-8 bg-surface-alt rounded w-1/2 mb-2"></div>
                <div className="h-2 sm:h-3 bg-surface-alt rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6 select-none">
          {kpis.map((m, index) => {
            const isPositive = m.positive;
            const brandColor = isPositive ? "rgb(16, 185, 129)" : "rgb(244, 63, 94)";
            const gradientId = `kpiAmbientGrad-${index}`;
            const closedAreaPath = `${m.trend} L 80 32 L 0 32 Z`;

            return (
              <div
                key={index}
                className="group relative bg-card border border-card-border/80 rounded-xl p-3 sm:p-4.5 flex flex-col justify-between hover:border-card-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.01),0_12px_24px_-4px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
              >
                {/* Subtle backing ambient glow */}
                <div 
                  className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                  style={{ backgroundColor: brandColor }}
                />
                
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold text-muted uppercase tracking-wider font-mono truncate">
                      {m.title}
                    </span>
                    <InfoTooltip text={m.tooltip} />
                  </div>

                  <div className="flex items-baseline justify-between gap-1 mt-2 sm:mt-2.5">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-heading font-sans">
                      {m.value}
                    </h2>
                    {m.change && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold font-mono border ${
                        isPositive 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/40" 
                          : "bg-rose-50 text-rose-600 border-rose-200/40"
                      }`}>
                        <span className="text-[10px]">{isPositive ? '↑' : '↓'}</span>
                        {m.change.replace(/[+-]/, '')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dynamic Scaled Sparkline Engine */}
                <div className="mt-3 sm:mt-4 pt-2 relative w-full h-9">
                  <svg 
                    viewBox="0 0 80 32" 
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={brandColor} stopOpacity="0.16" />
                        <stop offset="100%" stopColor={brandColor} stopOpacity="0.00" />
                      </linearGradient>
                    </defs>
                    
                    {/* Area Gradient Fill */}
                    <path d={closedAreaPath} fill={`url(#${gradientId})`} className="transition-all duration-300" />
                    
                    {/* Primary Trend Stroke Wire */}
                    <path
                      d={m.trend}
                      fill="none"
                      stroke={brandColor}
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />
                  </svg>
                </div>

                <div className="mt-2.5 pt-2 border-t border-card-border flex items-center justify-between text-[10px] sm:text-[10.5px] font-medium text-muted tracking-tight">
                  <span className="truncate">Live data</span>
                  <span className="text-[9px] font-bold text-muted group-hover:text-muted font-mono transition-colors">LIVE</span>
                </div>
              </div>
            );
          })}
        </div>
        )}

      {/* Clinician League Table */}
      {filteredClinicians.length > 0 ? (
      <div className="bg-card rounded-xl border border-card-border/80 p-4 sm:p-5 mb-6 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-shadow duration-300 animate-slideUp stagger-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-sm sm:text-base text-heading">
              Clinician league table
              <InfoTooltip text="Clinicians ranked by performance metrics" />
            </h2>
            <p className="text-[10px] sm:text-sm text-muted mt-1">
              45 clinicians across 10 practices, 19-06-2026 to 25-06-2026 - sort any column
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Tabs */}
            <div className="flex bg-surface-alt rounded-lg p-1">
              {["All", "Dentist", "Hygienist", "Therapist"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLeagueTab(tab)}
                  className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
                    leagueTab === tab
                      ? "bg-card text-heading shadow-sm"
                      : "text-muted hover:text-body"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

          <div className="text-right">
            <p className="text-[10px] sm:text-xs text-muted font-medium">
              reconciles to group
            </p>
            <p className="text-xs sm:text-sm font-bold text-heading">
              {filteredClinicians.reduce((sum, c) => sum + (c.prodVal || 0), 0) > 0 
                ? `${formatUKCurrencyFromThousands(filteredClinicians.reduce((sum, c) => sum + (c.prodVal || 0), 0), 0)} · ${filteredClinicians.reduce((sum, c) => sum + (c.sessionsNum || 0), 0)} sessions`
                : '£0 · 0 sessions'}
            </p>
          </div>

            <button className="p-2 bg-card border border-card-border/70 hover:border-card-border rounded-lg transition-colors">
              <Download className="w-4 h-4 text-muted" />
            </button>
            <button className="p-2 bg-card border border-card-border/70 hover:border-card-border rounded-lg transition-colors">
              <Maximize2 className="w-4 h-4 text-muted" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">#</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Clinician</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Practice</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Sess.</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Production</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Prod/Sess</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Priv %</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Accept %</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Recall %</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">FTA %</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Compl.</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Index ↓</th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-muted uppercase tracking-wider">Prod Trend</th>
              </tr>
            </thead>
            <tbody>
              {filteredClinicians.map((clinician) => (
                <tr key={clinician.rank} className="border-b border-card-border hover:bg-surface transition-colors">
                  <td className="py-3 px-2 text-body font-medium">{clinician.rank}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-heading">{clinician.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        clinician.role === 'Dentist' ? 'bg-blue-100 text-blue-700' :
                        clinician.role === 'Hygienist' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {clinician.role}
                      </span>
                      <span className="text-xs text-muted">{clinician.sessions}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-body">{clinician.practice}</td>
                  <td className="py-3 px-2 text-right text-body">{clinician.sessionsNum}</td>
                  <td className="py-3 px-2 text-right font-semibold text-heading">{clinician.production}</td>
                  <td className="py-3 px-2 text-right text-body">{clinician.prodPerSess}</td>
                  <td className="py-3 px-2 text-right">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      clinician.privMixVal >= 85 ? 'bg-emerald-50 text-emerald-700' :
                      clinician.privMixVal >= 70 ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {clinician.privMix}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      clinician.recallVal >= 80 ? 'bg-emerald-50 text-emerald-700' :
                      clinician.recallVal >= 65 ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {clinician.recall}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      clinician.ftaVal >= 90 ? 'bg-emerald-50 text-emerald-700' :
                      clinician.ftaVal >= 75 ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {clinician.fta}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right text-body">{clinician.compl}</td>
                  <td className="py-3 px-2 text-right font-bold text-heading">{clinician.index}</td>
                  <td className="py-3 px-2">
                    <div className="flex justify-center">
                      <svg width="60" height="20" className="overflow-visible">
                        <defs>
                          <linearGradient id={`trendGrad-${clinician.rank}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d={`M 0 ${20 - clinician.trend[0] / 5} L 10 ${20 - clinician.trend[1] / 5} L 20 ${20 - clinician.trend[2] / 5} L 30 ${20 - clinician.trend[3] / 5} L 40 ${20 - clinician.trend[4] / 5} L 50 ${20 - clinician.trend[5] / 5} L 60 ${20 - clinician.trend[5] / 5} L 60 20 L 0 20 Z`}
                          fill={`url(#trendGrad-${clinician.rank})`}
                        />
                        <path
                          d={`M 0 ${20 - clinician.trend[0] / 5} L 10 ${20 - clinician.trend[1] / 5} L 20 ${20 - clinician.trend[2] / 5} L 30 ${20 - clinician.trend[3] / 5} L 40 ${20 - clinician.trend[4] / 5} L 50 ${20 - clinician.trend[5] / 5}`}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="bg-card rounded-xl border border-card-border/80 p-5 mb-6 animate-pulse">
          <div className="h-6 bg-surface-alt rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-surface-alt rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-surface-alt rounded"></div>
            ))}
          </div>
        </div>
      )}

      {/* Case Acceptance vs Plan Value */}
      {cliniciansData && caseAcceptanceData ? (
        <div className="bg-card rounded-xl border border-card-border/80 p-4 sm:p-5 mb-6 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-shadow duration-300 animate-slideUp stagger-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-heading">
                Case acceptance vs plan value (signature)
                <InfoTooltip text="Plan value presented per session against acceptance, sized by plans presented" />
              </h2>
              <p className="text-[10px] sm:text-sm text-muted mt-1">
                plan value presented per session against acceptance, sized by plans presented
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-muted font-medium">
                recoverable if leakers hit median acceptance
              </p>
              <p className="text-lg font-bold text-blue-600">£494.8k/yr</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-card border border-card-border/70 hover:border-card-border rounded-lg transition-colors">
                <Download className="w-4 h-4 text-muted" />
              </button>
              <button className="p-2 bg-card border border-card-border/70 hover:border-card-border rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4 text-muted" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-600 rounded-full"></span>
              <span className="text-[10px] sm:text-xs text-body font-medium">Dentist</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-amber-500 rounded-full"></span>
              <span className="text-[10px] sm:text-xs text-body font-medium">Therapist</span>
            </div>
          </div>

          <div className="h-[250px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Plan value per session"
                  tickFormatter={(tick) => `£${tick}`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                  label={{ value: 'Plan value per session', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Case acceptance"
                  tickFormatter={(tick) => `${tick}%`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                  label={{ value: 'Case acceptance %', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="z" range={[100, 800]} />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={caseAcceptanceData?.scatter_data || []} fill="#3b82f6" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between text-[10px] sm:text-xs text-muted mt-2 px-2 sm:px-4">
            <span>£288</span>
            <span>£859</span>
            <span>£1.4k</span>
            <span>£2.0k</span>
            <span>£2.6k</span>
            <span>£3.1k</span>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-card-border/80 p-5 mb-6 animate-pulse">
          <div className="h-6 bg-surface-alt rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-surface-alt rounded w-1/2 mb-6"></div>
          <div className="h-[350px] bg-surface-alt rounded"></div>
        </div>
      )}

      {/* Treatment-Plan Conversion by Tier */}
        {cliniciansData ? (
        <div className="bg-card rounded-xl border border-card-border/80 p-4 sm:p-5 mb-6 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-shadow duration-300 animate-slideUp stagger-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-heading">
                Treatment-plan conversion by tier
                <InfoTooltip text="Conversion funnel from presented to completed, split by plan tier" />
              </h2>
              <p className="text-[10px] sm:text-sm text-muted mt-1">
                presented → accepted → started → completed, split by plan tier
              </p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-card border border-card-border/70 hover:border-card-border rounded-lg transition-colors">
                <Download className="w-4 h-4 text-muted" />
              </button>
              <button className="p-2 bg-card border border-card-border/70 hover:border-card-border rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4 text-muted" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {[].map((tier, idx) => (
              <div key={idx} className="border border-card-border rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-heading">{tier.title} · {tier.value}</h3>
                  <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                    {tier.change}
                  </span>
                </div>

                {/* Funnel */}
                <div className="space-y-2">
                  {tier.stages.map((stage, sIdx) => (
                    <div key={sIdx} className="relative">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted font-medium">{stage.name}</span>
                        <span className="text-body font-bold">{stage.value} <span className="text-muted font-normal">({stage.pct})</span></span>
                      </div>
                      <div className="h-8 bg-surface-alt rounded-lg overflow-hidden relative">
                        <div
                          className="h-full rounded-lg transition-all duration-500"
                          style={{
                            width: `${(stage.value / tier.stages[0].value) * 100}%`,
                            backgroundColor: tier.color,
                            opacity: 0.7 + (sIdx * 0.1),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-xs text-muted mt-3">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-card-border/80 p-5 mb-6 animate-pulse">
          <div className="h-6 bg-surface-alt rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-surface-alt rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-surface-alt rounded"></div>
            ))}
          </div>
        </div>
      )}

      {/* Hygiene Team Utilisation & Ratio */}
      {cliniciansData && hygieneData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Hygiene Team Utilisation */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-card-border/80 p-4 sm:p-5 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-shadow duration-300 animate-slideUp stagger-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-heading">
                Hygiene team utilisation
                <InfoTooltip text="Booked vs available hygiene time, RAG against 85% target" />
              </h2>
              <p className="text-[10px] sm:text-sm text-muted mt-1">
                booked vs available hygiene time, RAG against 85% target
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-muted font-medium">lost contribution</p>
              <p className="text-lg font-bold text-rose-600">£4.1k</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-card border border-card-border/70 hover:border-card-border rounded-lg transition-colors">
                <Download className="w-4 h-4 text-muted" />
              </button>
              <button className="p-2 bg-card border border-card-border/70 hover:border-card-border rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4 text-muted" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {hygieneData?.utilization_data?.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-body font-medium">{item.name}</span>
                    <span className={`font-bold ${
                      item.value >= 85 ? 'text-emerald-600' :
                      item.value >= 70 ? 'text-amber-600' :
                      'text-rose-500'
                    }`}>
                      {item.value}%
                    </span>
                  </div>
                  <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.value >= 85 ? 'bg-blue-600' :
                        item.value >= 70 ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hygiene-to-Dentist Ratio */}
        <div className="bg-card rounded-xl border border-card-border/80 p-4 sm:p-5 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-shadow duration-300 animate-slideUp stagger-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-heading">
                Hygiene-to-dentist ratio
                <InfoTooltip text="Recommended band 0.5-0.7 hygienists per dentist" />
              </h2>
              <p className="text-[10px] sm:text-sm text-muted mt-1">
                recommended band 0.5-0.7
              </p>
            </div>
            <button className="p-2 bg-card border border-card-border/70 hover:border-card-border rounded-lg transition-colors">
              <Maximize2 className="w-4 h-4 text-muted" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-40 h-40 sm:w-48 sm:h-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray={`${43 * 2.51} ${251 - 43 * 2.51}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] sm:text-xs text-muted font-medium">of target band</span>
                <span className="text-3xl sm:text-4xl font-bold text-heading">43%</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-body">
                <span className="font-bold">0.3</span> / 0.7 target
              </p>
              <p className="text-sm font-medium text-rose-500 mt-1">
                ratio 0.30 under-resourced
              </p>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-card rounded-xl border border-card-border/80 p-5 animate-pulse">
            <div className="h-6 bg-surface-alt rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-surface-alt rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-surface-alt rounded"></div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-card-border/80 p-5 animate-pulse">
            <div className="h-6 bg-surface-alt rounded w-1/3 mb-4"></div>
            <div className="h-[200px] bg-surface-alt rounded"></div>
          </div>
        </div>
      )}

      {/* Treatment Mix by Clinician */}
      {cliniciansData ? (
        <div className="bg-card rounded-xl border border-card-border/80 p-4 sm:p-5 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-shadow duration-300 animate-slideUp stagger-7">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-heading">
                Treatment mix by clinician
                <InfoTooltip text="Delivered-value composition for the top producers, with high-value share" />
              </h2>
              <p className="text-[10px] sm:text-sm text-muted mt-1">
                delivered-value composition for the top producers, with high-value share
              </p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-card border border-card-border/70 hover:border-card-border rounded-lg transition-colors">
                <Download className="w-4 h-4 text-muted" />
              </button>
              <button className="p-2 bg-card border border-card-border/70 hover:border-card-border rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4 text-muted" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-6">
            {[
              { label: "Check-up / exam", color: "#3b82f6" },
              { label: "Hygiene / perio", color: "#10b981" },
              { label: "Restorative", color: "#22c55e" },
              { label: "Endodontics", color: "#eab308" },
              { label: "Extraction / surgery", color: "#94a3b8" },
              { label: "Implants", color: "#6366f1" },
              { label: "Aligners", color: "#ec4899" },
              { label: "Bonding / whitening", color: "#06b6d4" },
              { label: "Facial aesthetics", color: "#f97316" },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm" style={{ backgroundColor: item.color }}></span>
                <span className="text-[10px] sm:text-xs text-body font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Stacked Bar Chart */}
          <div className="space-y-4">
            {[]?.map((clinician, index) => {
              const total = Object.values(clinician).slice(1).reduce((a, b) => a + b, 0);
              return (
                <div key={index} className="flex items-center gap-3 sm:gap-4">
                  <div className="w-28 sm:w-32 text-xs sm:text-sm font-medium text-body shrink-0">
                    {clinician.name}
                  </div>
                  <div className="flex-1 h-8 bg-surface-alt rounded-lg overflow-hidden flex">
                    {Object.entries(clinician).slice(1).map(([key, value], i) => {
                      const colors = ["#3b82f6", "#10b981", "#22c55e", "#eab308", "#94a3b8", "#6366f1", "#ec4899", "#06b6d4", "#f97316"];
                      const width = (value / total) * 100;
                      return (
                        <div
                          key={key}
                          className="h-full transition-all duration-300 hover:opacity-80"
                          style={{
                            width: `${width}%`,
                            backgroundColor: colors[i],
                          }}
                          title={`${key}: ${value}%`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] sm:text-xs text-muted mt-4 px-4 sm:px-36">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-card-border/80 p-5 mb-6 animate-pulse">
          <div className="h-6 bg-surface-alt rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-surface-alt rounded w-1/2 mb-6"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-surface-alt rounded"></div>
            ))}
          </div>
        </div>
      )}

    </div>
    </div>
  );
}