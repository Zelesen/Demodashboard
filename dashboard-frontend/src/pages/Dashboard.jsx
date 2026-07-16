import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, CalendarRange, Building2, Layers, ArrowUpRight, TrendingUp, Target, Shield, Zap, MapPin, Cpu, Brain } from "lucide-react"
import PracticeMap from '../components/PracticeMap';
import FloatingIdaWidget from '../components/FloatingIdaWidget';
import InfoIcon from '../components/InfoIcon';

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState('Last 7 days');
  const [leagueTab, setLeagueTab] = useState('Top 5');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const defaultPractices = [
    { name: "Kettering", revenue: "£20.2k", nhs: "111.2%", plan: "124 Plan", rating: "4.8", score: "111.2%", scoreVal: 111.2, status: "good" },
    { name: "Derby", revenue: "£9.8k", nhs: "107.8%", plan: "86 Plan", rating: "4.6", score: "107.8%", scoreVal: 107.8, status: "good" },
    { name: "Peterborough", revenue: "£14.6k", nhs: "105.2%", plan: "112 Plan", rating: "4.5", score: "105.2%", scoreVal: 105.2, status: "good" },
    { name: "Loughborough", revenue: "£21.2k", nhs: "99.7%", plan: "145 Plan", rating: "4.3", score: "99.7%", scoreVal: 99.7, status: "warn" },
    { name: "Northampton", revenue: "£11.2k", nhs: "91.2%", plan: "98 Plan", rating: "4.1", score: "91.2%", scoreVal: 91.2, status: "bad" },
    { name: "Rugby", revenue: "£22.1k", nhs: "78.4%", plan: "156 Plan", rating: "3.8", score: "78.4%", scoreVal: 78.4, status: "bad" },
    { name: "Lincoln", revenue: "£13.4k", nhs: "78.5%", plan: "102 Plan", rating: "3.7", score: "78.5%", scoreVal: 78.5, status: "bad" },
    { name: "Nottingham", revenue: "£22.8k", nhs: "80.4%", plan: "158 Plan", rating: "3.9", score: "80.4%", scoreVal: 80.4, status: "bad" },
    { name: "Leicester", revenue: "£20.1k", nhs: "85.4%", plan: "138 Plan", rating: "4.0", score: "85.4%", scoreVal: 85.4, status: "bad" },
    { name: "Corby", revenue: "£16.3k", nhs: "88.2%", plan: "110 Plan", rating: "4.2", score: "88.2%", scoreVal: 88.2, status: "warn" },
  ];
  const defaultSites = [
    { name: "Kettering", coords: [52.3963, -0.7263], status: "good" },
    { name: "Derby", coords: [52.9225, -1.4746], status: "good" },
    { name: "Peterborough", coords: [52.5695, -0.2405], status: "good" },
    { name: "Loughborough", coords: [52.7721, -1.2065], status: "warn" },
    { name: "Northampton", coords: [52.2405, -0.9027], status: "bad" },
    { name: "Rugby", coords: [52.3709, -1.2597], status: "bad" },
    { name: "Lincoln", coords: [53.2349, -0.5378], status: "bad" },
    { name: "Nottingham", coords: [52.9548, -1.1581], status: "bad" },
    { name: "Leicester", coords: [52.6369, -1.1398], status: "bad" },
    { name: "Corby", coords: [52.4926, -0.6851], status: "warn" },
  ];
  const [practices, setPractices] = useState(defaultPractices);
  const [sites, setSites] = useState(defaultSites);
  const [loading, setLoading] = useState(true);
  const [hoveredPillar, setHoveredPillar] = useState(null);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(() => {
    const stored = sessionStorage.getItem('dashboard_refresh_cooldown');
    return stored ? Number(stored) : 0;
  });
  const [cooldownSecs, setCooldownSecs] = useState(0);

  const sortedPractices = leagueTab === 'Top 5'
    ? [...practices].sort((a, b) => b.scoreVal - a.scoreVal)
    : [...practices].sort((a, b) => a.scoreVal - b.scoreVal);

  const periodMap = {
    'Today': 'today', 'Last 7 days': '7d', 'Last 30 days': '30d',
    'Last 90 days': '90d', 'Last year': '1y', 'All time': 'all', 'Custom': 'all'
  };

  const getMetricTables = (title) => {
    switch(title) {
      case 'Group Production':
        return ['dentally_invoices'];
      case 'NHS UDA Delivery':
        return ['dentally_appointments'];
      case 'Private + Plan Revenue':
        return ['dentally_invoices'];
      case 'Plan Members':
        return ['dentally_payment_plans'];
      case 'New Patients':
        return ['dentally_patients'];
      case 'Group Cash Position':
        return ['dentally_payments'];
      default:
        return ['dentally_invoices'];
    }
  };

  const getMetricCalculation = (title) => {
    switch(title) {
      case 'Group Production':
        return 'Sum of all invoice amounts in the selected period. Displayed in thousands (£k).';
      case 'NHS UDA Delivery':
        return 'Percentage of completed appointments vs total appointments. (completed / total × 100)';
      case 'Private + Plan Revenue':
        return 'Sum of all private and plan invoice amounts in the selected period.';
      case 'Plan Members':
        return 'Count of active payment plans where active = true.';
      case 'New Patients':
        return 'Count of patients created in the selected period.';
      case 'Group Cash Position':
        return 'Sum of all payment amounts in the selected period.';
      default:
        return 'Calculated from database records in the selected period.';
    }
  };

  const getDentallyEndpoint = (title) => {
    switch(title) {
      case 'Group Production':
        return 'https://api.dentally.co/v1/invoices';
      case 'NHS UDA Delivery':
        return 'https://api.dentally.co/v1/appointments';
      case 'Private + Plan Revenue':
        return 'https://api.dentally.co/v1/invoices';
      case 'Plan Members':
        return 'https://api.dentally.co/v1/payment_plans';
      case 'New Patients':
        return 'https://api.dentally.co/v1/patients';
      case 'Group Cash Position':
        return 'https://api.dentally.co/v1/payments';
      default:
        return 'https://api.dentally.co/v1/invoices';
    }
  };

  const getMetricApiFields = (title) => {
    switch(title) {
      case 'Group Production':
        return [
          { field: 'amount',      role: 'Summed to get total production value' },
          { field: 'created_at',  role: 'Scoped to the selected date period' },
        ];
      case 'NHS UDA Delivery':
        return [
          { field: 'state',        role: 'Counts rows where value = "Completed"' },
          { field: 'completed_at', role: 'Timestamp confirming appointment done' },
          { field: 'start_time',   role: 'Used to filter appointments by period' },
        ];
      case 'Private + Plan Revenue':
        return [
          { field: 'amount',       role: 'Summed for private + plan invoice total' },
          { field: 'created_at',   role: 'Scoped to the selected date period' },
        ];
      case 'Plan Members':
        return [
          { field: 'active',      role: 'Counted where value = true (active plans)' },
          { field: 'created_at',  role: 'Used to track plan sign-up over time' },
        ];
      case 'New Patients':
        return [
          { field: 'id',          role: 'Counted — each row = one new patient' },
          { field: 'created_at',  role: 'Filters patients created in the period' },
        ];
      case 'Group Cash Position':
        return [
          { field: 'amount',      role: 'Summed to get total cash received' },
          { field: 'created_at',  role: 'Scoped to the selected date period' },
        ];
      default:
        return [];
    }
  };

  const dataCache = useRef(new Map());
  const isMounted = useRef(false);

  const allPeriods = ['today', '7d', '30d', '90d', '1y', 'all'];

  const fetchDataForPeriod = async (period) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      const [metricsRes, insightsRes, healthRes, leagueRes, sitesRes] = await Promise.all([
        fetch(`http://localhost:8000/api/dashboard/metrics?period=${period}`, { signal: controller.signal }),
        fetch(`http://localhost:8000/api/dashboard/ai-insights?period=${period}`, { signal: controller.signal }),
        fetch(`http://localhost:8000/api/dashboard/health-score?period=${period}`, { signal: controller.signal }),
        fetch(`http://localhost:8000/api/dashboard/league?period=${period}`, { signal: controller.signal }),
        fetch('http://localhost:8000/api/dashboard/sites', { signal: controller.signal })
      ]);
      clearTimeout(timeoutId);

      return {
        metrics: await metricsRes.json(),
        insights: (await insightsRes.json()).insights || [],
        health: await healthRes.json(),
        practices: (await leagueRes.json()).practices || [],
        sites: (await sitesRes.json()).sites || [],
      };
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Error fetching dashboard data:', error);
      return null;
    }
  };

  const populateFromData = useCallback((data) => {
    if (!data) return;
    setMetrics(data.metrics);
    setAiInsights(data.insights);
    setHealthScore(data.health);
    if (data.practices?.length) setPractices(data.practices);
    if (data.sites?.length) setSites(data.sites);
  }, []);

  const applyCachedData = useCallback((period) => {
    const cached = dataCache.current.get(period);
    if (!cached) return;
    populateFromData(cached);
    sessionStorage.setItem('dash_data', JSON.stringify(cached));
  }, [populateFromData]);

  const fetchCustomData = async (startDate, endDate) => {
    try {
      const [metricsRes, insightsRes, healthRes, leagueRes, sitesRes] = await Promise.all([
        fetch(`http://localhost:8000/api/dashboard/metrics?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`http://localhost:8000/api/dashboard/ai-insights?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`http://localhost:8000/api/dashboard/health-score?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch(`http://localhost:8000/api/dashboard/league?period=all&start_date=${startDate}&end_date=${endDate}`),
        fetch('http://localhost:8000/api/dashboard/sites')
      ]);
      return {
        metrics: await metricsRes.json(),
        insights: (await insightsRes.json()).insights || [],
        health: await healthRes.json(),
        practices: (await leagueRes.json()).practices || [],
        sites: (await sitesRes.json()).sites || [],
      };
    } catch (error) {
      console.error('Error fetching custom date data:', error);
      return null;
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('dash_data');
    if (saved) {
      try {
        populateFromData(JSON.parse(saved));
        setLoading(false);
        isMounted.current = true;
        return;
      } catch (_) {}
    }
    const preFetchAll = async () => {
      const fetches = allPeriods.map(async (period) => {
        const data = await fetchDataForPeriod(period);
        if (data) dataCache.current.set(period, data);
      });
      await Promise.all(fetches);
      applyCachedData(periodMap[activeFilter]);
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
      if (remaining <= 0) sessionStorage.removeItem('dashboard_refresh_cooldown');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [refreshCooldownUntil]);

  const syncPageCache = async () => {
    try {
      await fetch('http://localhost:8000/api/sync/page?page=dashboard', { method: 'POST' });
    } catch (error) {
      console.error('Error refreshing page cache:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    sessionStorage.removeItem('dash_data');
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
      applyCachedData(periodMap[activeFilter]);
    }
    const cooldownUntil = Date.now() + 5 * 60 * 1000;
    setRefreshCooldownUntil(cooldownUntil);
    sessionStorage.setItem('dashboard_refresh_cooldown', String(cooldownUntil));
    setIsRefreshing(false);
  };

  const currentData = loading ? {
    metrics: [],
    aiInsights: [],
    healthScore: 0,
    healthPillars: [0, 0, 0, 0, 0],
    nhsExposure: "-£0k",
    nhsProjection: "projecting 0% of contract",
  } : {
    metrics: [
      {
        title: "Group Production",
        value: metrics?.group_production?.value || "£0k",
        change: metrics?.group_production?.change || "+0%",
        footer: metrics?.group_production?.footer || "0% to target",
        positive: metrics?.group_production?.positive || false,
        icon: TrendingUp,
      },
      {
        title: "NHS UDA Delivery",
        value: metrics?.nhs_uda_delivery?.value || "0%",
        change: metrics?.nhs_uda_delivery?.change || "+0%",
        footer: metrics?.nhs_uda_delivery?.footer || "glidepath 0%",
        positive: metrics?.nhs_uda_delivery?.positive || false,
        icon: Target,
      },
      {
        title: "Private + Plan Revenue",
        value: metrics?.private_plan_revenue?.value || "£0k",
        change: metrics?.private_plan_revenue?.change || "+0%",
        footer: metrics?.private_plan_revenue?.footer || "0% of income",
        positive: metrics?.private_plan_revenue?.positive || false,
        icon: Shield,
      },
      {
        title: "Plan Members",
        value: metrics?.plan_members?.value || "0",
        change: metrics?.plan_members?.change || "+0%",
        footer: metrics?.plan_members?.footer || "0 active",
        positive: metrics?.plan_members?.positive || false,
        icon: Layers,
      },
      {
        title: "New Patients",
        value: metrics?.new_patients?.value || "0",
        change: metrics?.new_patients?.change || "+0%",
        footer: metrics?.new_patients?.footer || "0% to plan",
        positive: metrics?.new_patients?.positive || false,
        icon: Zap,
      },
      {
        title: "Group Cash Position",
        value: metrics?.group_cash_position?.value || "£0k",
        change: metrics?.group_cash_position?.change || "+0%",
        footer: metrics?.group_cash_position?.footer || "vs prev 7 days",
        positive: metrics?.group_cash_position?.positive || false,
        icon: TrendingUp,
      },
    ],
    aiInsights: aiInsights.length > 0 ? aiInsights : [["ACT", "£0k at stake", "No insights available"]],
    healthScore: healthScore?.health_score || 0,
    healthPillars: healthScore?.health_pillars || [0, 0, 0, 0, 0],
    nhsExposure: "-£0k",
    nhsProjection: "projecting 0% of contract",
  };

  const filters = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Last year", "All time", "Custom"];

  const today = new Date();
  const formatDate = (d) => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  const formatMonthYear = (d) => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  const dateLabel = (() => {
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

  const score = currentData.healthScore;
  const label = score >= 70 ? "Strong" : score >= 50 ? "Average" : "Weak";
  const badgeBg = score >= 70 ? "bg-emerald-50" : score >= 50 ? "bg-amber-50" : "bg-rose-50";
  const badgeText = score >= 70 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-500";
  const dotBg = score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-rose-500";

  // Configuration for the 5 interactive pillars
  const pillars = [
    { name: "Production", value: currentData.healthPillars[0], color: "#10b981" }, // emerald-500
    { name: "NHS UDA", value: currentData.healthPillars[1], color: "#34d399" },    // emerald-400
    { name: "Private + Plan", value: currentData.healthPillars[2], color: "#fbbf24" }, // amber-400
    { name: "Recall Engine", value: currentData.healthPillars[3], color: "#f59e0b" },  // amber-500
    { name: "Reputation", value: currentData.healthPillars[4], color: "#f59e0b" },     // amber-500
  ];

  // SVG Gauge Math (Radius 90, Circumference ~565.4)
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const totalSegments = pillars.length;
  const gapAngle = 10; // Degrees of separation between border segments
  const totalGapDeg = gapAngle * totalSegments;
  const availableDeg = 360 - totalGapDeg;
  
  // Calculate SVG stroke dashes dynamically
  // Start at the top (12 o'clock)

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
              <div className="relative w-10 h-10 rounded-2xl bg-card border border-card-border/80 flex items-center justify-center shadow-sm">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Layers size={14} className="text-white" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-[2px] border-white rounded-full shadow-sm" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-[1.3rem] font-bold tracking-tight text-heading leading-tight">
                  Demo DSO
                </h1>
                <span className="inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 rounded-md border border-indigo-100/50">
                  <Cpu size={8} /> IDA
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100/60">
                  <Building2 size={10} /> {sites?.length || 10} Practices Active
                </span>
                <span className="text-[10px] font-medium text-muted flex items-center gap-1">
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
              className="inline-flex items-center gap-1.5 px-3 h-[32px] bg-card border border-card-border/80 hover:border-card-border rounded-xl text-[10px] font-semibold text-body hover:text-heading hover:shadow-sm active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              <RefreshCw 
                size={11} 
                className={`transition-transform duration-700 ease-out ${isRefreshing ? "rotate-180 text-blue-500" : "text-muted"}`} 
              />
              {isRefreshing ? "Syncing..." : cooldownSecs > 0 ? `${Math.floor(cooldownSecs / 60)}:${String(cooldownSecs % 60).padStart(2, '0')} left` : "Refresh"}
            </button>
          </div>
        </div>

        {/* ================= FILTER TABS ================= */}
        <div className="flex items-center gap-1 bg-card border border-card-border/60 rounded-lg p-0.5 w-fit shadow-sm sticky top-16 z-30">
          {filters.map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2.5 h-7 text-[10px] font-semibold tracking-tight rounded-md transition-all duration-200 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-muted hover:text-heading hover:bg-surface"
                }`}
              >
                {filter}
              </button>
            );
          })}

           {/* Custom Date Range Picker */}
        {activeFilter === "Custom" && (
          <div className="flex items-center gap-2 bg-transparent rounded-lg p-2 w-fit">
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
        </div>

       

         {/* ================= KPI METRICS STRIP ================= */}
        <div className="bg-card rounded-2xl border border-card-border/60 shadow-sm overflow-hidden">
          {loading ? (
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
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-card-border">
                {currentData.metrics.map((m, index) => {
                const isPositive = m.positive;
                const Icon = m.icon;
                const trendColor = isPositive ? "#10b981" : "#ef4444";
                const bgAccent = isPositive ? "bg-emerald-50" : "bg-rose-50";
                const textAccent = isPositive ? "text-emerald-600" : "text-rose-500";
                
                return (
                  <div key={index} className="group p-3.5 hover:bg-surface/30 transition-colors duration-200 flex flex-col justify-between min-h-0">
                    {/* Header: icon + title + info */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`w-6 h-6 rounded-md ${bgAccent} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon size={11} className={textAccent} />
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-surface-alt text-[7px] font-bold text-muted mr-1 shrink-0 self-center">{index + 1}</span>
                        <span className="text-[9px] font-bold text-muted uppercase tracking-wider leading-none truncate">
                          {m.title}
                        </span>
                        <InfoIcon 
                          title={m.title}
                          apiEndpoint={getDentallyEndpoint(m.title)}
                          apiFields={getMetricApiFields(m.title)}
                          databaseTables={getMetricTables(m.title)}
                          calculations={getMetricCalculation(m.title)}
                        />
                      </div>
                    </div>

                    {/* Value + badge */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[1.25rem] font-bold tracking-tight text-heading leading-none">
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
                    <p className="text-[9px] font-medium text-muted mt-1 truncate">
                      {m.footer}
                    </p>
                  </div>
              );
            })}
            </div>
          )}
        </div>

        {/* ================= CLINICAL HEALTH + EXPOSURE ROW ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Group Health - 4/12 width */}
          <div className="lg:col-span-4">
            {loading ? (
              /* Skeleton Loading State */
              <div className="bg-card rounded-2xl border border-card-border/60 shadow-sm p-4 overflow-hidden flex flex-col justify-between min-h-[280px]">
                {/* Skeleton Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-alt animate-pulse" />
                    <div>
                      <div className="h-4 w-32 bg-surface-alt rounded animate-pulse mb-2" />
                      <div className="h-3 w-40 bg-surface-alt rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-8 w-20 bg-surface-alt rounded-full animate-pulse" />
                </div>

                {/* Skeleton Circle Chart */}
                <div className="relative flex items-center justify-center my-8">
                  <div className="w-56 h-56 rounded-full border-8 border-card-border animate-pulse" />
                  <div className="absolute flex flex-col items-center justify-center">
                    <div className="h-16 w-20 bg-surface-alt rounded animate-pulse mb-2" />
                    <div className="h-3 w-16 bg-surface-alt rounded animate-pulse" />
                  </div>
                </div>

                {/* Skeleton Legend */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t border-card-border">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-surface-alt animate-pulse" />
                        <div className="h-3 w-16 bg-surface-alt rounded animate-pulse" />
                      </div>
                      <div className="h-3 w-8 bg-surface-alt rounded animate-pulse" />
                    </div>
                  ))}
                </div>

                {/* Skeleton Footer */}
                <div className="mt-4 pt-3 border-t border-card-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-surface-alt animate-pulse" />
                      <div className="h-3 w-40 bg-surface-alt rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-12 bg-surface-alt rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="group relative">
                {/* Static Decorative Background */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${score >= 70 ? 'from-emerald-500/10 via-teal-500/10 to-emerald-500/10' : score >= 50 ? 'from-amber-500/10 via-orange-500/10 to-amber-500/10' : 'from-rose-500/10 via-red-500/10 to-rose-500/10'} rounded-3xl blur-xl`} />
                
                <div className="relative bg-gradient-to-br from-white via-surface/30 to-white rounded-2xl border border-card-border/80 shadow-lg shadow-card-border/50 p-4 overflow-hidden flex flex-col justify-between min-h-[280px]">
                  {/* Animated Background Pattern */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'radial-gradient(circle at 2px 2px, #3b82f6 1px, transparent 0)',
                      backgroundSize: '24px 24px'
                    }} />
                  </div>

                  {/* Floating Decorative Orbs */}
                  <div className={`absolute top-10 right-10 w-24 h-24 bg-gradient-to-br ${score >= 70 ? 'from-emerald-400/10 to-teal-400/10' : score >= 50 ? 'from-amber-400/10 to-orange-400/10' : 'from-rose-400/10 to-red-400/10'} rounded-full blur-2xl animate-pulse`} />
                  <div className={`absolute bottom-20 left-10 w-32 h-32 bg-gradient-to-tr ${score >= 70 ? 'from-teal-400/10 to-emerald-400/10' : score >= 50 ? 'from-orange-400/10 to-amber-400/10' : 'from-red-400/10 to-rose-400/10'} rounded-full blur-2xl animate-pulse`} style={{ animationDelay: '1s' }} />
                  
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className={`absolute inset-0 ${score >= 70 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-rose-400'} rounded-xl blur-md opacity-40 animate-pulse`} />
                        <div className={`relative w-8 h-8 rounded-xl bg-gradient-to-br ${score >= 70 ? 'from-emerald-500 to-teal-600' : score >= 50 ? 'from-amber-500 to-orange-600' : 'from-rose-500 to-red-600'} flex items-center justify-center shadow-lg`}>
                          <Shield size={14} className="text-white" strokeWidth={2.5} />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-heading tracking-tight flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt text-[8px] font-bold text-muted">7</span>
                          Group Health
                          <InfoIcon 
                            title="Group Health Score"
                            apiEndpoint="https://api.dentally.co/v1/invoices, /v1/appointments, /v1/payment_plans, /v1/patients"
                            databaseTables={['dentally_invoices', 'dentally_appointments', 'dentally_payment_plans', 'dentally_recalls', 'dentally_patients']}
                            calculations="Overall score is the average of 5 pillars: Production (revenue/10000), NHS UDA (completion rate), Private+Plan (revenue/15000), Recall Engine (recall count/10), Reputation (new patients/5). Each pillar is capped at 100."
                            additionalInfo="Score ranges: 70-100 (Strong/Green), 50-69 (Average/Amber), 0-49 (Weak/Red)"
                          />
                        </h3>
                        <p className="text-[9px] text-muted font-semibold">Weighted across 5 target pillars</p>
                      </div>
                    </div>

                    {/* Enhanced Status Badge */}
                    <div className="relative">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${badgeBg} rounded-full text-[10px] font-bold ${badgeText} border ${score >= 70 ? 'border-emerald-200/60' : score >= 50 ? 'border-amber-200/60' : 'border-rose-200/60'} shadow-sm`}>
                        <span className={`relative flex h-1.5 w-1.5`}>
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotBg} opacity-75`}></span>
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotBg}`}></span>
                        </span>
                        {label}
                      </span>
                    </div>
                  </div>

                  {/* Main Circle Chart Area with Enhanced Visuals */}
                  <div className="relative flex items-center justify-center my-2">
                    {/* Outer Glow Ring */}
                    <div className={`absolute w-40 h-40 rounded-full ${score >= 70 ? 'bg-emerald-500/5' : score >= 50 ? 'bg-amber-500/5' : 'bg-rose-500/5'} blur-2xl`} />
                    
                    <svg className="w-40 h-40 transform -rotate-0 relative z-10" viewBox="0 0 200 200">
                      {/* Base Background Track Rings with Gradient */}
                      <defs>
                        <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f8fafc" />
                          <stop offset="100%" stopColor="#f1f5f9" />
                        </linearGradient>
                      </defs>
                      {pillars.map((_, index) => {
                        const segmentDeg = availableDeg / totalSegments;
                        const strokeDasharray = `${(segmentDeg / 360) * circumference} ${circumference}`;
                        const rotation = -90 + index * (segmentDeg + gapAngle);
                        return (
                          <circle
                            key={`bg-${index}`}
                            cx="100"
                            cy="100"
                            r={radius}
                            fill="transparent"
                            stroke="url(#trackGradient)"
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            transform={`rotate(${rotation} 100 100)`}
                            strokeLinecap="round"
                            className="drop-shadow-sm"
                          />
                        );
                      })}

                      {/* Dynamic Active Progress Segments with Glow */}
                      <defs>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      {pillars.map((pillar, index) => {
                        const segmentDeg = availableDeg / totalSegments;
                        const activeDeg = (segmentDeg * (pillar.value / 100));
                        const strokeDasharray = `${(activeDeg / 360) * circumference} ${circumference}`;
                        const rotation = -90 + index * (segmentDeg + gapAngle);
                        const isHovered = hoveredPillar === index;

                        return (
                          <circle
                            key={`active-${index}`}
                            cx="100"
                            cy="100"
                            r={radius}
                            fill="transparent"
                            stroke={pillar.color}
                            strokeWidth={isHovered ? "14" : "12"}
                            strokeDasharray={strokeDasharray}
                            transform={`rotate(${rotation} 100 100)`}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out cursor-pointer"
                            filter="url(#glow)"
                            style={{ filter: `drop-shadow(0 0 ${isHovered ? '10px' : '6px'} ${pillar.color}40)` }}
                            onMouseEnter={() => setHoveredPillar(index)}
                            onMouseLeave={() => setHoveredPillar(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* Hover Tooltip */}
                    {hoveredPillar !== null && (
                      <div 
                        className="absolute z-30 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl"
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                        }}
                      >
                        <div className="text-[11px] font-bold text-white mb-0.5">
                          {pillars[hoveredPillar]?.name || ''}
                        </div>
                        <div className="text-[10px] text-muted">
                          {pillars[hoveredPillar]?.value || 0}% performance
                        </div>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                      </div>
                    )}

                    {/* Enhanced Center Content with Score Animation */}
                    <div className="absolute flex flex-col items-center justify-center text-center z-20">
                      <div className="relative">
                        {/* Score Background Glow */}
                        <div className={`absolute inset-0 blur-xl ${score >= 70 ? 'bg-emerald-500/20' : score >= 50 ? 'bg-amber-500/20' : 'bg-rose-500/20'} scale-150`} />
                        
                        <div className="relative">
                          <span className="text-4xl font-black text-heading tracking-tighter leading-none bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text">
                            {score}
                          </span>
                          <div className={`mt-1 h-0.5 w-12 mx-auto rounded-full bg-gradient-to-r ${score >= 70 ? 'from-emerald-400 to-teal-500' : score >= 50 ? 'from-amber-400 to-orange-500' : 'from-rose-400 to-red-500'} shadow-sm`} />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-muted mt-1 tracking-wide">/ 100 Score</span>
                    </div>
                  </div>

                  {/* Enhanced Grid Legend Footer */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2 border-t border-card-border/60 relative z-10">
                    {pillars.map((pillar, i) => (
                      <div key={i} className="group/pillar flex items-center justify-between text-[10px] hover:bg-surface/50 px-1.5 py-1 rounded-lg transition-colors cursor-default">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="relative">
                            <span 
                              className="w-2 h-2 rounded-full shrink-0 block" 
                              style={{ backgroundColor: pillar.color, boxShadow: `0 0 8px ${pillar.color}40` }}
                            />
                          </div>
                          <span className="font-semibold text-body truncate">{pillar.name}</span>
                        </div>
                        <span className="font-bold text-heading ml-1 tabular-nums">{pillar.value}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Quick Insight Footer */}
                  <div className="mt-2 pt-2 border-t border-card-border relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`} />
                        <span className="text-[9px] font-semibold text-muted">
                          {score >= 70 ? 'All systems operational' : score >= 50 ? 'Some areas need attention' : 'Immediate action required'}
                        </span>
                      </div>
                      <button className="text-[9px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                        Details
                        <ArrowUpRight size={9} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* ================= LEAGUE TABLE + MAP - Merged Card ================= */}
          <div className="lg:col-span-8 h-full">
            {loading ? (
              /* Loading Skeleton - Side by Side */
              <div className="bg-card rounded-2xl border border-card-border/60 shadow-sm overflow-hidden h-full">
                <div className="flex flex-col lg:flex-row">
                  {/* League Table Skeleton - ~50% */}
                  <div className="lg:w-[50%]">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-card-border">
                      <div>
                        <div className="h-3.5 w-28 bg-surface-alt rounded animate-pulse mb-1" />
                        <div className="h-2 w-40 bg-surface-alt rounded animate-pulse" />
                      </div>
                      <div className="h-7 w-20 bg-surface-alt rounded-lg animate-pulse" />
                    </div>
                    <div className="px-2 py-1.5 space-y-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-6 h-6 rounded-lg bg-surface-alt animate-pulse shrink-0" />
                            <div className="w-7 h-7 rounded-full bg-surface-alt animate-pulse shrink-0" />
                            <div className="flex-1">
                              <div className="h-3 w-20 bg-surface-alt rounded animate-pulse mb-1" />
                              <div className="h-2 w-40 bg-surface-alt rounded animate-pulse" />
                            </div>
                          </div>
                          <div className="h-6 w-14 bg-surface-alt rounded-lg animate-pulse shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Map Skeleton - ~50% */}
                  <div className="lg:w-[50%] flex flex-col">
                    <div className="px-5 py-3 border-b border-card-border">
                      <div className="h-3.5 w-28 bg-surface-alt rounded animate-pulse mb-1" />
                      <div className="h-2 w-40 bg-surface-alt rounded animate-pulse" />
                    </div>
                    <div className="flex-1 px-2 pb-2">
                      <div className="h-full rounded-xl bg-surface-alt animate-pulse min-h-[200px]" />
                    </div>
                    <div className="flex items-center gap-2 px-5 py-2 border-t border-card-border bg-surface/30">
                      <div className="h-2 w-8 bg-surface-alt rounded animate-pulse" />
                      <div className="h-2 w-14 bg-surface-alt rounded animate-pulse" />
                      <div className="w-px h-2.5 bg-surface-alt" />
                      <div className="h-2 w-14 bg-surface-alt rounded animate-pulse" />
                      <div className="w-px h-2.5 bg-surface-alt" />
                      <div className="h-2 w-10 bg-surface-alt rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Actual Content - Premium Analytics Dashboard Unified Card */
              <div className="bg-card rounded-2xl border border-card-border/60 shadow-sm overflow-hidden h-full">
                <div className="flex flex-col lg:flex-row">
                  {/* League Table - ~50% width */}
                  <div className="lg:w-[50%] relative">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-card-border">
                      <div>
                        <h3 className="font-bold text-xs text-heading flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt text-[8px] font-bold text-muted">8</span>
                          <MapPin size={12} className="text-muted" />
                          Practice League
                          <InfoIcon 
                            title="Practice League Table"
                            apiEndpoint="https://api.dentally.co/v1/appointments, /v1/invoices"
                            databaseTables={['dentally_sites', 'dentally_appointments', 'dentally_invoices']}
                            calculations="Score = completion_rate + (revenue/1000), capped at 100. Status: good (≥80), warn (60-79), bad (<60). Revenue is sum of invoices in period."
                          />
                        </h3>
                        <p className="text-[9px] text-muted font-medium">Ranked by production performance vs target</p>
                      </div>
                      <div className="flex bg-surface-alt rounded-lg p-0.5">
                        {["Top 5", "Bottom 5"].map((tab) => {
                          const isActive = leagueTab === tab;
                          return (
                            <button
                              key={tab}
                              onClick={() => setLeagueTab(tab)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${
                                isActive ? "bg-card text-heading shadow-sm" : "text-muted hover:text-body"
                              }`}
                            >
                              {tab}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ranking Rows */}
                    <div className="px-2 py-1.5 space-y-0.5">
                      {sortedPractices.slice(0, 5).map((item, index) => {
                        const isTopTier = leagueTab === "Top 5";
                        const statusDot = item.status === "good" ? "bg-emerald-500" : item.status === "warn" ? "bg-amber-400" : "bg-rose-500";
                        const scoreColor = item.status === "good" ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
                          : item.status === "warn" ? "text-amber-600 bg-amber-50 border-amber-100" 
                          : "text-rose-500 bg-rose-50 border-rose-100";
                        const rankBg = isTopTier ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-500 border-rose-100";

                        return (
                          <div
                            key={item.name}
                            className="group flex items-center justify-between px-3 py-2 rounded-xl border border-transparent hover:border-card-border/70 hover:bg-card hover:shadow-sm hover:shadow-card-border/40 active:scale-[0.99] transition-all duration-200 cursor-default"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border shrink-0 transition-all duration-200 group-hover:scale-105 ${rankBg}`}>
                                {index + 1}
                              </span>
                              <div className="relative">
                                <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border-[1.5px] border-white shrink-0 ${statusDot}`} />
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-body bg-surface-alt border border-card-border/60`}>
                                  {item.name.charAt(0)}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-heading truncate group-hover:text-heading transition-colors">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-muted font-medium truncate">
                                  {item.revenue} · {item.nhs} · {item.plan} · ★{item.rating}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border shrink-0 ml-3 transition-all duration-200 group-hover:scale-105 ${scoreColor}`}>
                              {item.score}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Subtle Vertical Divider */}
                    <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-card-border to-transparent" />
                  </div>

                  {/* Practice Locations Map - ~50% width */}
                  <div className="lg:w-[50%] flex flex-col">
                    {/* Header */}
                    <div className="px-5 py-3 border-b border-card-border">
                      <h3 className="font-bold text-xs text-heading flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-alt text-[8px] font-bold text-muted">9</span>
                        Practice Locations
                        <InfoIcon 
                          title="Practice Locations Map"
                          apiEndpoint="/api/dashboard/sites"
                          databaseTables={['dentally_sites']}
                          calculations="Displays active practices (active=1) with their geographic coordinates. Status is determined by their league table score."
                          additionalInfo="Map shows practice locations across the UK with color-coded status indicators"
                        />
                      </h3>
                      <p className="text-[9px] text-muted font-medium">Geographic telemetry overview</p>
                    </div>

                    {/* Map Container */}
                    <div className="flex-1 px-2 pb-2">
                      <div className="h-full rounded-xl bg-gradient-to-b from-surface to-surface-alt/50 border border-card-border/50 overflow-hidden flex flex-col min-h-[200px]">
                        <div className="flex-1">
                          <PracticeMap sites={sites} />
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-2 px-5 py-2 border-t border-card-border bg-surface/30">
                      <span className="text-[8px] font-bold text-muted uppercase tracking-wider mr-0.5">Status</span>
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-muted">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/30" /> On Target
                      </span>
                      <span className="w-px h-2.5 bg-surface-alt" />
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-muted">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shadow-sm shadow-amber-400/30" /> Near Baseline
                      </span>
                      <span className="w-px h-2.5 bg-surface-alt" />
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-muted">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-sm shadow-rose-500/30" /> Behind
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

       

        {/* ============ IDA WATERMARK ============ */}
        <div className="text-center pb-2">
          <p className="text-[8px] font-semibold text-muted tracking-widest uppercase flex items-center justify-center gap-1.5">
            <span className="w-6 h-px bg-surface-alt" />
            Powered by Ida Intelligence
            <span className="w-6 h-px bg-surface-alt" />
          </p>
        </div>

        {/* ============ FLOATING IDA CO-PILOT WIDGET ============ */}
        <div className="relative">
          
          <FloatingIdaWidget aiInsights={currentData.aiInsights} />
        </div>

      </div>
    </div>
  );
}
