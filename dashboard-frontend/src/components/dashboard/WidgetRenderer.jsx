import { useState, useRef, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import {
  BarChart3, Activity,
  GripVertical, Search, X, Calendar, Clock, Users,
  CheckCircle2, XCircle, AlertTriangle, AlertCircle, UserCheck,
  Building2, TrendingUp, CalendarRange, List, Grid3x3
} from "lucide-react";

// ===================== SAMPLE DATA =====================
const samplePracData = {
  practitioners: [
    { name: "Dr Smith", appointments: 45, completed: 38, completionRate: 84.4 },
    { name: "Dr Jones", appointments: 52, completed: 42, completionRate: 80.8 },
    { name: "Dr Patel", appointments: 38, completed: 32, completionRate: 84.2 },
    { name: "Dr Lee", appointments: 60, completed: 48, completionRate: 80.0 },
    { name: "Dr Brown", appointments: 42, completed: 36, completionRate: 85.7 },
    { name: "Dr Wilson", appointments: 55, completed: 44, completionRate: 80.0 },
  ]
};

const sampleSiteData = {
  sites: [
    { name: "Practice Central", appointments: 120 },
    { name: "Practice North", appointments: 95 },
    { name: "Practice East", appointments: 78 },
    { name: "Practice West", appointments: 65 },
    { name: "Practice South", appointments: 52 },
    { name: "Practice Downtown", appointments: 48 },
    { name: "Practice Uptown", appointments: 35 },
    { name: "Practice Midtown", appointments: 28 },
  ]
};

const sampleTrendData = {
  chart_data: [
    { date: "2024-01-01", total: 28, completed: 22 },
    { date: "2024-01-02", total: 35, completed: 28 },
    { date: "2024-01-03", total: 42, completed: 33 },
    { date: "2024-01-04", total: 30, completed: 24 },
    { date: "2024-01-05", total: 48, completed: 38 },
    { date: "2024-01-06", total: 22, completed: 18 },
    { date: "2024-01-07", total: 38, completed: 30 },
  ]
};

const sampleReasonData = {
  reasons: [
    { reason: "Checkup", count: 85 },
    { reason: "Cleaning", count: 62 },
    { reason: "Filling", count: 45 },
    { reason: "Root Canal", count: 28 },
    { reason: "Extraction", count: 22 },
    { reason: "Consultation", count: 35 },
    { reason: "Crown", count: 18 },
    { reason: "Bridge", count: 12 },
  ]
};

const sampleHourData = {
  hours: [
    { hour: 8, count: 12 },
    { hour: 9, count: 28 },
    { hour: 10, count: 35 },
    { hour: 11, count: 30 },
    { hour: 12, count: 18 },
    { hour: 13, count: 15 },
    { hour: 14, count: 32 },
    { hour: 15, count: 38 },
    { hour: 16, count: 25 },
    { hour: 17, count: 10 },
  ]
};

const sampleDayData = {
  days: [
    { day: "Monday", count: 95 },
    { day: "Tuesday", count: 110 },
    { day: "Wednesday", count: 105 },
    { day: "Thursday", count: 98 },
    { day: "Friday", count: 85 },
    { day: "Saturday", count: 45 },
    { day: "Sunday", count: 12 },
  ]
};

const sampleCancelData = {
  days: [
    { day: "Monday", cancelled: 8, total: 95, rate: 8.4 },
    { day: "Tuesday", cancelled: 12, total: 110, rate: 10.9 },
    { day: "Wednesday", cancelled: 6, total: 105, rate: 5.7 },
    { day: "Thursday", cancelled: 10, total: 98, rate: 10.2 },
    { day: "Friday", cancelled: 15, total: 85, rate: 17.6 },
    { day: "Saturday", cancelled: 5, total: 45, rate: 11.1 },
    { day: "Sunday", cancelled: 2, total: 12, rate: 16.7 },
  ]
};

const sampleLifecycleData = {
  hours: [
    { hour: 8, min: 15, avg: 28, max: 55 },
    { hour: 9, min: 10, avg: 32, max: 60 },
    { hour: 10, min: 12, avg: 30, max: 58 },
    { hour: 11, min: 8, avg: 25, max: 50 },
    { hour: 12, min: 5, avg: 22, max: 45 },
    { hour: 13, min: 10, avg: 26, max: 52 },
    { hour: 14, min: 15, avg: 35, max: 65 },
    { hour: 15, min: 10, avg: 30, max: 55 },
    { hour: 16, min: 8, text: "Dr A", avg: 24, max: 48 },
    { hour: 17, min: 12, avg: 28, max: 50 },
  ]
};

const sampleDurationData = {
  buckets: [
    { bucket: "0-15m", count: 45 },
    { bucket: "15-30m", count: 120 },
    { bucket: "30-45m", count: 85 },
    { bucket: "45-60m", count: 55 },
    { bucket: "60-90m", count: 30 },
    { bucket: "90-120m", count: 15 },
  ]
};

const sampleHeatmapData = {
  heatmap: [
    { day: "Monday", data: [
      { hour: 8, count: 4 }, { hour: 9, count: 8 }, { hour: 10, count: 12 },
      { hour: 11, count: 10 }, { hour: 12, count: 5 }, { hour: 13, count: 3 },
      { hour: 14, count: 9 }, { hour: 15, count: 11 }, { hour: 16, count: 7 }, { hour: 17, count: 2 }
    ]},
    { day: "Tuesday", data: [
      { hour: 8, count: 5 }, { hour: 9, count: 10 }, { hour: 10, count: 14 },
      { hour: 11, count: 12 }, { hour: 12, count: 6 }, { hour: 13, count: 4 },
      { hour: 14, count: 11 }, { hour: 15, count: 13 }, { hour: 16, count: 8 }, { hour: 17, count: 3 }
    ]},
    { day: "Wednesday", data: [
      { hour: 8, count: 3 }, { hour: 9, count: 9 }, { hour: 10, count: 13 },
      { hour: 11, count: 11 }, { hour: 12, count: 5 }, { hour: 13, count: 4 },
      { hour: 14, count: 10 }, { hour: 15, count: 12 }, { hour: 16, count: 6 }, { hour: 17, count: 2 }
    ]},
    { day: "Thursday", data: [
      { hour: 8, count: 4 }, { hour: 9, count: 7 }, { hour: 10, count: 11 },
      { hour: 11, count: 10 }, { hour: 12, count: 4 }, { hour: 13, count: 3 },
      { hour: 14, count: 8 }, { hour: 15, count: 10 }, { hour: 16, count: 6 }, { hour: 17, count: 1 }
    ]},
    { day: "Friday", data: [
      { hour: 8, count: 2 }, { hour: 9, count: 6 }, { hour: 10, count: 9 },
      { hour: 11, count: 8 }, { hour: 12, count: 3 }, { hour: 13, count: 2 },
      { hour: 14, count: 7 }, { hour: 15, count: 8 }, { hour: 16, count: 5 }, { hour: 17, count: 1 }
    ]},
    { day: "Saturday", data: [
      { hour: 8, count: 1 }, { hour: 9, count: 3 }, { hour: 10, count: 5 },
      { hour: 11, count: 4 }, { hour: 12, count: 2 }, { hour: 13, count: 1 },
      { hour: 14, count: 3 }, { hour: 15, count: 4 }, { hour: 16, count: 2 }, { hour: 17, count: 0 }
    ]},
  ]
};

const sampleStatusBreakdown = {
  completed: 185,
  cancelled: 58,
  "did not attend": 22,
  pending: 15,
  confirmed: 32,
  "in surgery": 8,
  arrived: 12,
};

// ===================== HELPER: gradient color for donut slices =====================
function donutGradient(color) {
  return {
    type: "radial",
    x: 0.5, y: 0.5, r: 0.5,
    colorStops: [
      { offset: 0, color: lighten(color, 40) },
      { offset: 0.6, color: color },
      { offset: 1, color: darken(color, 10) },
    ],
    global: false,
  };
}

function lighten(hex, amt) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

function darken(hex, amt) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `rgb(${r},${g},${b})`;
}

// ===================== SVG SPARKLINE =====================
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

// ===================== CHART COMPONENTS =====================

export function AppointmentMetricCard({ title, value, change, positive = true, footer, icon: Icon, sparklineValues }) {
  const bgAccent = positive ? "bg-emerald-50" : "bg-rose-50";
  const textAccent = positive ? "text-emerald-600" : "text-rose-500";
  const sp = sparklineValues ? sparklinePath(sparklineValues) : null;
  const spLine = sp?.line || (positive
    ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4"
    : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26");
  const spFill = sp?.fill || (positive
    ? "M 0 24 Q 16 14, 32 20 T 64 10 T 80 4 L 80 32 L 0 32 Z"
    : "M 0 4 Q 16 12, 32 6 T 64 22 T 80 26 L 80 32 L 0 32 Z");
  const accentColor = positive ? "#10b981" : "#ef4444";

  return (
    <div className="h-full flex flex-col justify-between p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`w-6 h-6 rounded-md ${bgAccent} flex items-center justify-center shrink-0`}>
          <Icon size={11} className={textAccent} />
        </div>
        <span className="text-[9px] font-bold text-muted uppercase tracking-wider truncate">{title}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[1.25rem] font-bold tracking-tight text-heading leading-none">{value}</span>
        {change && (
          <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold shrink-0 ${bgAccent} ${textAccent}`}>
            {change}
          </span>
        )}
      </div>
      <div className="mt-2 h-6 w-full">
        <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`metricGrad-${title?.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.1" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="20" x2="80" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 3" />
          <path d={spLine} fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={spFill} fill={`url(#metricGrad-${title?.replace(/\s/g, "")})`} />
        </svg>
      </div>
      {footer && <p className="text-[9px] font-medium text-muted mt-1 truncate">{footer}</p>}
    </div>
  );
}

export function OutcomeBreakdownChart({ data = sampleStatusBreakdown, height, onChartReady }) {
  const chartHeight = height || 260;
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const colorMap = {
    completed: "#10b981", cancelled: "#f59e0b", "did not attend": "#f97316",
    pending: "#94a3b8", confirmed: "#60a5fa", "in surgery": "#a78bfa",
    arrived: "#2dd4bf", booked: "#818cf8"
  };
  const option = {
    tooltip: {
      trigger: "item",
      formatter: ({ name, value, percent }) =>
        `<div style="font-family:Inter,sans-serif;font-size:11px">${name}: <b>${value.toLocaleString()}</b> (${percent}%)</div>`
    },
    series: [{
      type: "pie",
      radius: ["45%", "68%"],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: "#fff",
        borderWidth: 3,
      },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 12, fontWeight: "bold" },
        itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.15)" }
      },
      data: entries.map(([label, value]) => ({
        value,
        name: label,
        itemStyle: { color: donutGradient(colorMap[label.toLowerCase()] || "#94a3b8") }
      })),
    }],
    graphic: [{
      type: "text",
      left: "center",
      top: "44%",
      style: {
        text: total.toLocaleString(),
        textAlign: "center",
        fill: "#1e293b",
        fontSize: 20,
        fontWeight: 700,
        fontFamily: "Inter, sans-serif",
      }
    }, {
      type: "text",
      left: "center",
      top: "56%",
      style: {
        text: "Total",
        textAlign: "center",
        fill: "#64748b",
        fontSize: 10,
        fontWeight: 500,
        fontFamily: "Inter, sans-serif",
      }
    }]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} onChartReady={onChartReady} />;
}

export function AppointmentsByPracticeChart({ data = sampleSiteData, height, onChartReady }) {
  const chartHeight = height || 220;
  const sites = data.sites?.slice(0, 8) || [];
  const categoryNames = sites.map(s => s.name?.split(" ").slice(-1)[0] || s.name);
  const option = {
    tooltip: {
      trigger: "axis",
      formatter: ({ 0: { value, name } }) =>
        `<div style="font-family:Inter,sans-serif;font-size:11px">${name}: <b>${value}</b> appointments</div>`
    },
    grid: { left: 10, right: 10, top: 10, bottom: 30, containLabel: true },
    xAxis: {
      type: "category",
      data: categoryNames,
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 500 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 500 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: [{
      type: "bar",
      data: sites.map(s => ({
        value: s.appointments,
        itemStyle: { color: "#3b82f6", borderRadius: [4, 4, 0, 0] }
      })),
      barWidth: "55%",
    }]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} onChartReady={onChartReady} />;
}

export function PractitionerWorkloadChart({ data = samplePracData, height, onChartReady }) {
  const chartHeight = height || 280;
  const pracs = data.practitioners?.slice(0, 10) || [];
  const names = pracs.map(p => p.name?.split(" ")[0] || p.name);
  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const name = params[0].axisValue;
        let html = `<div style="font-family:Inter,sans-serif;font-size:11px"><b>${name}</b><br/>`;
        params.forEach(p => { html += `${p.marker} ${p.seriesName}: ${p.value}<br/>`; });
        html += "</div>";
        return html;
      }
    },
    legend: {
      data: ["Appointments", "Completed"],
      top: 0,
      right: 0,
      textStyle: { fontSize: 10, color: "#64748b", fontFamily: "Inter,sans-serif" },
      itemWidth: 8, itemHeight: 8,
    },
    grid: { left: 10, right: 10, top: 30, bottom: 10, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: "#64748b", fontSize: 10 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    yAxis: {
      type: "category",
      data: names,
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 600 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Appointments",
        type: "bar",
        data: pracs.map(p => p.appointments),
        itemStyle: { color: "#6366f1", borderRadius: [0, 4, 4, 0] },
        barWidth: "40%",
        barGap: "20%",
      },
      {
        name: "Completed",
        type: "bar",
        data: pracs.map(p => p.completed),
        itemStyle: { color: "#10b981", borderRadius: [0, 4, 4, 0] },
        barWidth: "40%",
      }
    ]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} onChartReady={onChartReady} />;
}

export function DailyAppointmentVolumeChart({ data = sampleTrendData, height, onChartReady }) {
  const chartHeight = height || 200;
  const chartData = data.chart_data || [];
  const dates = chartData.map(d => {
    const p = d.date?.split("-");
    return p ? `${parseInt(p[2])}/${parseInt(p[1])}` : d.date;
  });
  const option = {
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        let html = `<div style="font-family:Inter,sans-serif;font-size:10px"><b>${params[0].axisValue}</b><br/>`;
        params.forEach(p => { html += `${p.marker} ${p.seriesName}: ${p.value} apps<br/>`; });
        html += "</div>";
        return html;
      }
    },
    legend: {
      data: ["Total", "Completed"],
      top: 0,
      right: 0,
      textStyle: { fontSize: 10, color: "#64748b", fontFamily: "Inter,sans-serif" },
      itemWidth: 8, itemHeight: 8,
    },
    grid: { left: 10, right: 10, top: 30, bottom: 10, containLabel: true },
    xAxis: {
      type: "category",
      data: dates,
      axisLabel: { color: "#94a3b8", fontSize: 9, fontWeight: 500, rotate: 30 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#94a3b8", fontSize: 9, fontWeight: 500 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: [
      {
        name: "Total",
        type: "line",
        smooth: true,
        data: chartData.map(d => d.total),
        itemStyle: { color: "#3b82f6" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(59,130,246,0.25)" },
              { offset: 1, color: "rgba(59,130,246,0.02)" },
            ]
          }
        },
        lineStyle: { width: 1.5 },
        symbol: "none",
      },
      {
        name: "Completed",
        type: "line",
        smooth: true,
        data: chartData.map(d => d.completed),
        itemStyle: { color: "#10b981" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(16,185,129,0.25)" },
              { offset: 1, color: "rgba(16,185,129,0.02)" },
            ]
          }
        },
        lineStyle: { width: 1.5 },
        symbol: "none",
      }
    ]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} onChartReady={onChartReady} />;
}

export function AppointmentsByReasonChart({ data = sampleReasonData, height, onChartReady }) {
  const chartHeight = height || 260;
  const reasons = data.reasons?.slice(0, 8) || [];
  const total = reasons.reduce((s, r) => s + r.count, 0);
  const colors = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6", "#f97316"];
  const option = {
    tooltip: {
      trigger: "item",
      formatter: ({ name, value, percent }) =>
        `<div style="font-family:Inter,sans-serif;font-size:11px">${name}: <b>${value.toLocaleString()}</b> (${percent}%)</div>`
    },
    series: [{
      type: "pie",
      radius: ["45%", "68%"],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: "#fff",
        borderWidth: 3,
      },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 12, fontWeight: "bold" },
        itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.15)" }
      },
      data: reasons.map((r, i) => ({
        value: r.count,
        name: r.reason,
        itemStyle: { color: donutGradient(colors[i % colors.length]) }
      })),
    }],
    graphic: [{
      type: "text",
      left: "center",
      top: "44%",
      style: {
        text: total.toLocaleString(),
        textAlign: "center",
        fill: "#1e293b",
        fontSize: 18,
        fontWeight: 700,
        fontFamily: "Inter, sans-serif",
      }
    }, {
      type: "text",
      left: "center",
      top: "56%",
      style: {
        text: "Total",
        textAlign: "center",
        fill: "#64748b",
        fontSize: 10,
        fontWeight: 500,
        fontFamily: "Inter, sans-serif",
      }
    }]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} onChartReady={onChartReady} />;
}

export function AppointmentsByHourChart({ data = sampleHourData, height, onChartReady }) {
  const chartHeight = height || 220;
  const hours = data.hours || [];
  const option = {
    tooltip: {
      trigger: "axis",
      formatter: ({ 0: { value, name } }) =>
        `<div style="font-family:Inter,sans-serif;font-size:11px">${name}: <b>${value}</b> appointments</div>`
    },
    grid: { left: 10, right: 10, top: 10, bottom: 20, containLabel: true },
    xAxis: {
      type: "category",
      data: hours.map(h => `${h.hour}:00`),
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 500 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 500 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: [{
      type: "bar",
      data: hours.map(h => ({
        value: h.count,
        itemStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "#a78bfa" },
              { offset: 1, color: "#8b5cf6" },
            ]
          },
          borderRadius: [4, 4, 0, 0],
        }
      })),
      barWidth: "60%",
    }]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} onChartReady={onChartReady} />;
}

export function AppointmentsByDayChart({ data = sampleDayData, height, onChartReady }) {
  const chartHeight = height || 220;
  const days = data.days || [];
  const dayColors = ["#6366f1", "#818cf8", "#a5b4fc", "#2dd4bf", "#34d399", "#f59e0b", "#f97316"];
  const option = {
    tooltip: {
      trigger: "axis",
      formatter: ({ 0: { value, name } }) =>
        `<div style="font-family:Inter,sans-serif;font-size:11px">${name}: <b>${value}</b> appointments</div>`
    },
    grid: { left: 10, right: 10, top: 10, bottom: 20, containLabel: true },
    xAxis: {
      type: "category",
      data: days.map(d => d.day?.slice(0, 3)),
      axisLabel: { color: "#64748b", fontSize: 11, fontWeight: 600 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 500 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: [{
      type: "bar",
      data: days.map((d, i) => ({
        value: d.count,
        itemStyle: {
          color: dayColors[i % dayColors.length],
          borderRadius: [4, 4, 0, 0],
        }
      })),
      barWidth: "65%",
    }]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} onChartReady={onChartReady} />;
}

export function PractitionerCompletionRateChart({ data = samplePracData, height, onChartReady }) {
  const chartHeight = height || 260;
  const pracs = data.practitioners?.slice(0, 10) || [];
  const names = pracs.map(p => p.name?.split(" ")[0] || p.name);
  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: ({ 0: { value, name } }) =>
        `<div style="font-family:Inter,sans-serif;font-size:11px">${name}: <b>${value.toFixed(1)}%</b></div>`
    },
    grid: { left: 10, right: 40, top: 10, bottom: 10, containLabel: true },
    xAxis: {
      type: "value",
      max: 100,
      axisLabel: { color: "#64748b", fontSize: 10, formatter: "{value}%" },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    yAxis: {
      type: "category",
      data: names,
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 600 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: "bar",
      data: pracs.map(p => ({
        value: p.completionRate,
        itemStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: "#34d399" },
              { offset: 1, color: "#10b981" },
            ]
          },
          borderRadius: [0, 4, 4, 0],
        }
      })),
      barWidth: "55%",
    }]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} onChartReady={onChartReady} />;
}

export function CancelledByDayChart({ data = sampleCancelData, height }) {
  const chartHeight = height || 260;
  const days = data.days || [];
  const option = {
    tooltip: {
      trigger: "axis",
      formatter: ({ 0: { value, name, dataIndex } }) => {
        const d = days[dataIndex];
        return `<div style="font-family:Inter,sans-serif;font-size:11px">${name}: <b>${value}</b> / ${d.total} total (${d.rate}%)</div>`;
      }
    },
    grid: { left: 10, right: 10, top: 10, bottom: 20, containLabel: true },
    xAxis: {
      type: "category",
      data: days.map(d => d.day?.slice(0, 3)),
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 600 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b", fontSize: 9, fontWeight: 500 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: [{
      type: "bar",
      data: days.map(d => ({
        value: d.cancelled,
        itemStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "#f43f5e" },
              { offset: 1, color: "#fb7185" },
            ]
          },
          borderRadius: [4, 4, 0, 0],
        }
      })),
      barWidth: "60%",
    }]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} />;
}

export function AppointmentLifecycleChart({ data = sampleLifecycleData, height }) {
  const chartHeight = height || 260;
  const hours = data.hours || [];
  const option = {
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        let html = `<div style="font-family:Inter,sans-serif;font-size:11px"><b>${params[0].axisValue}</b><br/>`;
        params.forEach(p => { html += `${p.marker} ${p.seriesName}: ${p.value.toFixed(1)} min<br/>`; });
        html += "</div>";
        return html;
      }
    },
    legend: {
      data: ["Avg Duration", "Min Duration", "Max Duration"],
      top: 0,
      right: 0,
      textStyle: { fontSize: 9, color: "#64748b", fontFamily: "Inter,sans-serif" },
      itemWidth: 8, itemHeight: 8,
    },
    grid: { left: 10, right: 10, top: 30, bottom: 10, containLabel: true },
    xAxis: {
      type: "category",
      data: hours.map(h => `${h.hour}:00`),
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 600 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: "minutes",
      nameTextStyle: { fontSize: 9, color: "#94a3b8", fontFamily: "Inter,sans-serif" },
      axisLabel: { color: "#64748b", fontSize: 9, fontWeight: 500 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: [
      {
        name: "Avg Duration",
        type: "bar",
        data: hours.map(h => h.avg),
        itemStyle: { color: "#8b5cf6", borderRadius: [4, 4, 0, 0] },
        barWidth: "28%",
        barGap: "15%",
      },
      {
        name: "Min Duration",
        type: "bar",
        data: hours.map(h => h.min),
        itemStyle: { color: "#a78bfa", borderRadius: [4, 4, 0, 0] },
        barWidth: "28%",
      },
      {
        name: "Max Duration",
        type: "bar",
        data: hours.map(h => h.max),
        itemStyle: { color: "#c4b5fd", borderRadius: [4, 4, 0, 0] },
        barWidth: "28%",
      }
    ]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} />;
}

export function AppointmentDurationChart({ data = sampleDurationData, height }) {
  const chartHeight = height || 200;
  const buckets = data.buckets || [];
  const total = buckets.reduce((s, b) => s + b.count, 0);
  const option = {
    tooltip: {
      trigger: "axis",
      formatter: ({ 0: { value, name } }) => {
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
        return `<div style="font-family:Inter,sans-serif;font-size:11px">${name}: <b>${value.toLocaleString()}</b> (${pct}%)</div>`;
      }
    },
    grid: { left: 10, right: 10, top: 10, bottom: 20, containLabel: true },
    xAxis: {
      type: "category",
      data: buckets.map(b => b.bucket),
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 500 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 500 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: [{
      type: "bar",
      data: buckets.map(b => ({
        value: b.count,
        itemStyle: { color: "#0ea5e9", borderRadius: [4, 4, 0, 0] }
      })),
      barWidth: "55%",
    }]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} />;
}

export function WeeklyActivityHeatmapChart({ data = sampleHeatmapData, height }) {
  const chartHeight = height || 280;
  const heatmapData = data.heatmap || [];
  const hours = Array.from({ length: 10 }, (_, i) => `${i + 8}:00`);
  const days = heatmapData.map(d => d.day?.slice(0, 3));
  const values = heatmapData.flatMap(d =>
    hours.map((h, i) => [days.indexOf(d.day?.slice(0, 3)), i, d.data[i]?.count || 0])
  );
  const maxVal = Math.max(...values.map(v => v[2]), 1);
  const option = {
    tooltip: {
      formatter: ({ value: [dayIdx, hourIdx, count] }) =>
        `<div style="font-family:Inter,sans-serif;font-size:11px">${days[dayIdx]} ${hours[hourIdx]}: <b>${count}</b> appointments</div>`
    },
    grid: { left: 10, right: 10, top: 10, bottom: 50, containLabel: true },
    xAxis: {
      type: "category",
      data: hours,
      splitArea: { show: true },
      axisLabel: { color: "#64748b", fontSize: 9, fontWeight: 500, rotate: 30 },
      axisLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: days,
      splitArea: { show: true },
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 600 },
      axisLine: { show: false },
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: {
        color: ["#f0f9ff", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1"]
      },
      textStyle: { fontSize: 9, color: "#64748b", fontFamily: "Inter,sans-serif" },
    },
    series: [{
      type: "heatmap",
      data: values,
      label: {
        show: true,
        color: "#1e293b",
        fontSize: 9,
        fontWeight: 600,
        formatter: ({ value: [, , count] }) => count || "",
      },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.15)" }
      }
    }]
  };
  return <ReactECharts option={option} style={{ height: chartHeight }} />;
}

// ===================== RENDER ROUTER =====================
export function renderAppointmentWidget(widget) {
  const trendVals = widget.data?.chartData?.map(d => d.total) || null;
  
  switch (widget.chartType) {
    case "totalAppointments":
      return <AppointmentMetricCard title="Total Appointments" value={(widget.data?.totalAppointments || 0).toLocaleString()} change="+8.2%" icon={Calendar} footer="this period" sparklineValues={trendVals} />;
    case "completedAppointments":
      return <AppointmentMetricCard title="Completed" value={(widget.data?.completedAppointments || 0).toLocaleString()} change="+5.3%" icon={CheckCircle2} footer="successful visits" sparklineValues={trendVals} />;
    case "cancelledAppointments":
      return <AppointmentMetricCard title="Cancelled" value={(widget.data?.cancelledAppointments || 0).toLocaleString()} change="-1.2%" positive={false} icon={XCircle} footer="cancelled visits" sparklineValues={trendVals} />;
    case "dnaRate":
      return <AppointmentMetricCard title="DNA Rate" value={(widget.data?.dnaRate || 0) + "%"} change="-0.3pp" icon={AlertTriangle} footer="target < 5%" />;
    case "avgDuration":
      return <AppointmentMetricCard title="Avg Duration" value={(widget.data?.avgDuration || 0) + " min"} change="+2.1%" icon={Clock} footer="per appointment" />;
    case "dnaCount":
      return <AppointmentMetricCard title="Did Not Attend" value={(widget.data?.dnaCount || 0).toLocaleString()} change="-0.8%" icon={AlertCircle} footer="did not attend" sparklineValues={trendVals} />;
    case "outcomeBreakdown":
      return <OutcomeBreakdownChart data={widget.data?.statusBreakdown || sampleStatusBreakdown} />;
    case "appointmentsByPractice":
      return <AppointmentsByPracticeChart data={widget.data || sampleSiteData} />;
    case "practitionerWorkload":
      return <PractitionerWorkloadChart data={widget.data || samplePracData} />;
    case "dailyAppointmentVolume":
      return <DailyAppointmentVolumeChart data={widget.data || sampleTrendData} />;
    case "appointmentsByReason":
      return <AppointmentsByReasonChart data={widget.data || sampleReasonData} />;
    case "appointmentsByHour":
      return <AppointmentsByHourChart data={widget.data || sampleHourData} />;
    case "appointmentsByDay":
      return <AppointmentsByDayChart data={widget.data || sampleDayData} />;
    case "practitionerCompletionRate":
      return <PractitionerCompletionRateChart data={widget.data || samplePracData} />;
    case "cancelledByDay":
      return <CancelledByDayChart data={widget.data || sampleCancelData} />;
    case "appointmentLifecycle":
      return <AppointmentLifecycleChart data={widget.data || sampleLifecycleData} />;
    case "appointmentDuration":
      return <AppointmentDurationChart data={widget.data || sampleDurationData} />;
    case "weeklyActivityHeatmap":
      return <WeeklyActivityHeatmapChart data={widget.data || sampleHeatmapData} />;
    default:
      return <div className="h-full flex items-center justify-center text-muted text-xs">Unknown widget</div>;
  }
}
