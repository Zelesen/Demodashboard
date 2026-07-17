import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

const ENDPOINT_MAP = {
  totalAppointments: "/api/dashboard/appointments-kpis",
  completedAppointments: "/api/dashboard/appointments-kpis",
  cancelledAppointments: "/api/dashboard/appointments-kpis",
  dnaRate: "/api/dashboard/appointments-kpis",
  avgDuration: "/api/dashboard/appointments-kpis",
  dnaCount: "/api/dashboard/appointments-kpis",
  outcomeBreakdown: "/api/dashboard/appointments-kpis",
  appointmentsByPractice: "/api/dashboard/appointments-by-site",
  practitionerWorkload: "/api/dashboard/appointments-by-practitioner",
  dailyAppointmentVolume: "/api/dashboard/appointments-trend",
  appointmentsByReason: "/api/dashboard/appointments-by-reason",
  appointmentsByHour: "/api/dashboard/appointments-by-hour",
  appointmentsByDay: "/api/dashboard/appointments-by-day",
  practitionerCompletionRate: "/api/dashboard/appointments-by-practitioner",
  cancelledByDay: "/api/dashboard/appointments-cancellation-by-day",
  appointmentLifecycle: "/api/dashboard/appointments-lifecycle",
  appointmentDuration: "/api/dashboard/appointments-duration",
  weeklyActivityHeatmap: "/api/dashboard/appointments-heatmap",
};

function buildQuery(period, startDate, endDate, filters = {}) {
  const params = new URLSearchParams();
  if (startDate && endDate) {
    params.set("start_date", startDate);
    params.set("end_date", endDate);
  } else {
    params.set("period", period);
  }
  if (filters.site_id) params.set("site_id", filters.site_id);
  if (filters.practitioner_id) params.set("practitioner_id", filters.practitioner_id);
  return params.toString();
}

function getWidgetKey(widgets) {
  return widgets.map(w => `${w.i}:${w.chartType}`).join("|");
}

export default function useDashboardData(widgets, period = "7d", startDate = null, endDate = null, filters = {}) {
  const [dataMap, setDataMap] = useState({});
  const [loading, setLoading] = useState(false);
  const cache = useRef({});
  const widgetKeyRef = useRef("");

  const widgetKey = getWidgetKey(widgets);
  const filterKey = `${filters.site_id || ""}_${filters.practitioner_id || ""}`;
  const fetchKey = `${widgetKey}__${period}__${startDate || ""}__${endDate || ""}__${filterKey}`;

  useEffect(() => {
    if (!widgets.length) {
      setDataMap({});
      setLoading(false);
      return;
    }

    if (fetchKey === widgetKeyRef.current) {
      return;
    }
    widgetKeyRef.current = fetchKey;

    const chartTypes = widgets.map(w => w.chartType).filter(Boolean);
    const uniqueEndpoints = [...new Set(chartTypes.map(ct => ENDPOINT_MAP[ct]).filter(Boolean))];

    if (!uniqueEndpoints.length) {
      setDataMap({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const query = buildQuery(period, startDate, endDate, filters);

    const fetchPromises = uniqueEndpoints.map(async (endpoint) => {
      const url = `${API}${endpoint}?${query}`;
      const cached = cache.current[url];
      if (cached && Date.now() - cached.timestamp < 30000) {
        return { endpoint, data: cached.data };
      }
      const res = await fetch(url);
      const data = await res.json();
      cache.current[url] = { data, timestamp: Date.now() };
      return { endpoint, data };
    });

    Promise.all(fetchPromises).then(results => {
      const endpointData = {};
      results.forEach(({ endpoint, data }) => {
        endpointData[endpoint] = data;
      });

      const newDataMap = {};
      widgets.forEach(w => {
        const endpoint = ENDPOINT_MAP[w.chartType];
        if (endpoint && endpointData[endpoint]) {
          newDataMap[w.i] = endpointData[endpoint];
        }
      });

      setDataMap(newDataMap);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [widgetKey, period, startDate, endDate, filters.site_id, filters.practitioner_id]);

  return { dataMap, loading };
}
