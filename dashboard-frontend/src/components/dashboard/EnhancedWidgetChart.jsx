import ReactECharts from "echarts-for-react";

const FONT = "Inter, system-ui, sans-serif";

const PALETTE = {
  blue: ["#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe"],
  indigo: ["#6366f1", "#818cf8", "#a5b4fc", "#e0e7ff"],
  violet: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ede9fe"],
  emerald: ["#10b981", "#34d399", "#6ee7b7", "#d1fae5"],
  amber: ["#f59e0b", "#fbbf24", "#fcd34d", "#fef3c7"],
  rose: ["#f43f5e", "#fb7185", "#fda4af", "#ffe4e6"],
  cyan: ["#06b6d4", "#22d3ee", "#67e8f9", "#cffafe"],
  sky: ["#0ea5e9", "#38bdf8", "#7dd3fc", "#e0f2fe"],
  slate: ["#64748b", "#94a3b8", "#cbd5e1", "#f1f5f9"],
};

function ttBg() {
  return {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    textStyle: { fontFamily: FONT, fontSize: 11, color: "#334155" },
    extraCssText: "box-shadow:0 8px 24px rgba(0,0,0,0.1);border-radius:12px;padding:10px 14px;backdrop-filter:blur(8px);",
  };
}

function gridOvr(overrides = {}) {
  return { left: 10, right: 10, top: 30, bottom: 40, containLabel: true, ...overrides };
}

export default function EnhancedWidgetChart({ chartType, data, height = 340 }) {
  const opt = buildOption(chartType, data);
  if (!opt) return <div className="h-full flex items-center justify-center text-muted text-xs">No data available</div>;
  return <ReactECharts option={opt} style={{ height }} opts={{ renderer: "canvas" }} notMerge={true} />;
}

function buildOption(chartType, data) {
  const map = {
    totalAppointments: () => metricSparkline("totalAppointments", data, PALETTE.blue, "Total Appointments"),
    completedAppointments: () => metricSparkline("completedAppointments", data, PALETTE.emerald, "Completed"),
    cancelledAppointments: () => metricSparkline("cancelledAppointments", data, PALETTE.amber, "Cancelled"),
    dnaRate: () => metricGauge("dnaRate", data, "%", PALETTE.rose, "DNA Rate"),
    avgDuration: () => metricGauge("avgDuration", data, " min", PALETTE.violet, "Avg Duration"),
    dnaCount: () => metricGauge("dnaCount", data, "", PALETTE.rose, "Did Not Attend"),
    outcomeBreakdown: () => outcomeDonut(data),
    appointmentsByPractice: () => byPractice(data),
    practitionerWorkload: () => workloadBars(data),
    dailyAppointmentVolume: () => dailyVolume(data),
    appointmentsByReason: () => byReasonNightingale(data),
    appointmentsByHour: () => byHourArea(data),
    appointmentsByDay: () => byDayPolar(data),
    practitionerCompletionRate: () => completionRadar(data),
    cancelledByDay: () => cancelledByDay(data),
    appointmentLifecycle: () => lifecycleRange(data),
    appointmentDuration: () => durationHistogram(data),
    weeklyActivityHeatmap: () => heatmapCalendar(data),
  };
  const fn = map[chartType];
  return fn ? fn() : null;
}

/* ─── 1. Metric KPI — sparkline mini-area with animated center number ─── */
function metricSparkline(key, data, palette, label) {
  const val = data?.[key] ?? 0;
  const trend = data?.chart_data || [];
  const vals = trend.map(d => d[key] ?? d.total ?? d.completed ?? 0);
  const dates = trend.map(d => {
    const p = d.date?.split("-");
    return p ? `${p[2]}/${p[1]}` : d.date;
  });

  return {
    animation: true,
    animationDuration: 1200,
    animationEasing: "cubicOut",
    tooltip: {
      ...ttBg(),
      trigger: "axis",
      formatter: (params) => {
        const p = params[0];
        return `<div style="font-weight:700;margin-bottom:2px">${p.name}</div><div style="color:${palette[0]};font-size:14px;font-weight:800">${key === "dnaRate" ? p.value + "%" : key === "avgDuration" ? p.value + " min" : Number(p.value).toLocaleString()}</div>`;
      },
    },
    grid: { left: 0, right: 0, top: 10, bottom: 0 },
    xAxis: { type: "category", data: dates.length ? dates : ["-"], show: false },
    yAxis: { type: "value", show: false },
    series: [
      {
        type: "line",
        smooth: 0.4,
        symbol: "none",
        data: vals.length ? vals : [val],
        lineStyle: { width: 2.5, color: palette[0], shadowColor: `${palette[0]}40`, shadowBlur: 8, shadowOffsetY: 4 },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${palette[0]}35` },
              { offset: 0.6, color: `${palette[0]}10` },
              { offset: 1, color: `${palette[0]}00` },
            ],
          },
        },
      },
    ],
    graphic: [
      {
        type: "group",
        left: "center",
        top: "center",
        children: [
          {
            type: "text",
            style: {
              text: key === "dnaRate" ? `${val}%` : key === "avgDuration" ? `${val} min` : Number(val).toLocaleString(),
              textAlign: "center",
              fill: "#0f172a",
              fontSize: 26,
              fontWeight: 800,
              fontFamily: FONT,
            },
          },
          {
            type: "text",
            top: 30,
            style: { text: label, textAlign: "center", fill: "#94a3b8", fontSize: 11, fontWeight: 600, fontFamily: FONT },
          },
        ],
      },
    ],
  };
}

/* ─── 2. Metric gauge ring — for rate/duration/count metrics ─── */
function metricGauge(key, data, suffix, palette, label) {
  const val = data?.[key] ?? 0;
  const max = key === "dnaRate" ? 100 : key === "avgDuration" ? 60 : Math.max(val * 1.5, 100);

  return {
    animation: true,
    animationDuration: 1500,
    animationEasing: "cubicOut",
    series: [
      {
        type: "gauge",
        center: ["50%", "55%"],
        radius: "80%",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [val / max, palette[0]],
              [1, "#f1f5f9"],
            ],
          },
          roundCap: true,
        },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        progress: { show: false },
        detail: {
          offsetCenter: [0, "-10%"],
          formatter: `{value}${suffix}`,
          fontSize: 28,
          fontWeight: 800,
          fontFamily: FONT,
          color: palette[0],
        },
        title: {
          offsetCenter: [0, "30%"],
          fontSize: 12,
          fontWeight: 600,
          fontFamily: FONT,
          color: "#94a3b8",
        },
        data: [{ value: val, name: label }],
      },
    ],
  };
}

/* ─── 3. Outcome donut — layered rings with animated center counter ─── */
function outcomeDonut(data) {
  const raw = data || {};
  const entries = Object.entries(raw).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const colorMap = {
    completed: "#10b981", cancelled: "#f59e0b", "did not attend": "#f43f5e",
    dna: "#f43f5e", pending: "#94a3b8", confirmed: "#3b82f6",
    "in surgery": "#8b5cf6", arrived: "#06b6d4", booked: "#6366f1",
  };
  const palette = ["#10b981", "#3b82f6", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#6366f1", "#ec4899"];

  return {
    tooltip: {
      ...ttBg(),
      trigger: "item",
      formatter: ({ name, value, percent }) => `<div style="font-weight:700;margin-bottom:4px">${name}</div><div style="font-size:18px;font-weight:800;color:${colorMap[name.toLowerCase()] || "#64748b"}">${value.toLocaleString()}</div><div style="color:#94a3b8;font-size:11px">${percent}%</div>`,
    },
    legend: {
      orient: "vertical",
      right: 8,
      top: "middle",
      textStyle: {
        fontSize: 10,
        color: "#475569",
        fontFamily: FONT,
        rich: {
          name: { fontSize: 11, fontWeight: 600, color: "#334155", fontFamily: FONT, lineHeight: 16 },
          pct: { fontSize: 9, color: "#94a3b8", fontFamily: FONT, lineHeight: 14 },
        },
      },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 10,
      icon: "roundRect",
      formatter: (name) => {
        const entry = entries.find(([k]) => k === name);
        const pct = entry ? ((entry[1] / total) * 100).toFixed(1) : 0;
        return `{name|${name}}\n{pct|${pct}%}`;
      },
    },
    series: [
      {
        type: "pie",
        radius: ["48%", "72%"],
        center: ["33%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 4 },
        label: { show: false },
        emphasis: {
          scaleSize: 10,
          label: { show: true, fontSize: 13, fontWeight: "bold", fontFamily: FONT, formatter: "{b}\n{d}%", lineHeight: 18 },
          itemStyle: { shadowBlur: 20, shadowColor: "rgba(0,0,0,0.15)" },
        },
        animationType: "scale",
        animationEasing: "elasticOut",
        data: entries.map(([name, value], i) => ({
          value,
          name,
          itemStyle: { color: colorMap[name.toLowerCase()] || palette[i % palette.length] },
        })),
      },
    ],
    graphic: [
      {
        type: "group",
        left: "29%",
        top: "48%",
        children: [
          {
            type: "text",
            top: -12,
            style: { text: total.toLocaleString(), textAlign: "center", fill: "#0f172a", fontSize: 24, fontWeight: 800, fontFamily: FONT }
          },
          {
            type: "text",
            top: 14,
            style: { text: "Total", textAlign: "center", fill: "#94a3b8", fontSize: 10, fontWeight: 600, fontFamily: FONT }
          },
        ],
      },
    ],
  };
}

/* ─── 4. By Practice — horizontal bars with rounded caps, gradient fills ─── */
function byPractice(data) {
  const sites = data?.sites?.slice(0, 10) || [];
  const names = sites.map(s => s.name?.length > 16 ? s.name.slice(0, 14) + "..." : s.name);
  const hasCompleted = sites.some(s => s.completed != null);

  return {
    animation: true,
    animationDuration: 800,
    animationEasing: "cubicOut",
    tooltip: {
      ...ttBg(),
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(59,130,246,0.04)" } },
      formatter: (params) => {
        let s = `<div style="font-weight:700;margin-bottom:4px">${params[0].name}</div>`;
        params.forEach(p => {
          s += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0"><span style="width:8px;height:8px;border-radius:2px;background:${p.color}"></span><span style="color:#64748b">${p.seriesName}</span><span style="font-weight:700;margin-left:auto">${p.value}</span></div>`;
        });
        return s;
      },
    },
    legend: hasCompleted ? {
      data: ["Appointments", "Completed"],
      top: 2,
      right: 4,
      textStyle: { fontSize: 10, color: "#64748b", fontFamily: FONT },
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 12,
      icon: "roundRect",
    } : undefined,
    grid: gridOvr({ top: hasCompleted ? 32 : 10 }),
    xAxis: { type: "value", axisLabel: { color: "#94a3b8", fontSize: 9, fontFamily: FONT }, splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } } },
    yAxis: {
      type: "category",
      data: names,
      axisLabel: { color: "#334155", fontSize: 11, fontWeight: 600, fontFamily: FONT },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Appointments",
        type: "bar",
        data: sites.map(s => ({
          value: s.appointments,
          itemStyle: {
            color: { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#60a5fa" }, { offset: 1, color: "#3b82f6" }] },
            borderRadius: [0, 8, 8, 0],
            shadowColor: "rgba(59,130,246,0.15)",
            shadowBlur: 6,
            shadowOffsetX: 2,
          },
        })),
        barWidth: hasCompleted ? "38%" : "55%",
        barGap: "20%",
        label: { show: true, position: "right", fontSize: 10, color: "#64748b", fontFamily: FONT, fontWeight: 600 },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: "rgba(59,130,246,0.25)" } },
      },
      ...(hasCompleted
        ? [{
            name: "Completed",
            type: "bar",
            data: sites.map(s => ({
              value: s.completed,
              itemStyle: {
                color: { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#34d399" }, { offset: 1, color: "#10b981" }] },
                borderRadius: [0, 8, 8, 0],
              },
            })),
            barWidth: "38%",
          }]
        : []),
    ],
  };
}

/* ─── 5. Practitioner Workload — horizontal grouped with gradient + label ─── */
function workloadBars(data) {
  const pracs = data?.practitioners?.slice(0, 10) || [];
  const names = pracs.map(p => p.name?.split(" ")[0] || p.name);

  return {
    animation: true,
    animationDuration: 800,
    tooltip: {
      ...ttBg(),
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(99,102,241,0.04)" } },
      formatter: (params) => {
        let s = `<div style="font-weight:700;margin-bottom:4px">${params[0].name}</div>`;
        params.forEach(p => {
          s += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0"><span style="width:8px;height:8px;border-radius:2px;background:${p.color}"></span><span style="color:#64748b">${p.seriesName}</span><span style="font-weight:700;margin-left:auto">${p.value}</span></div>`;
        });
        return s;
      },
    },
    legend: {
      data: ["Appointments", "Completed"],
      top: 2,
      right: 4,
      textStyle: { fontSize: 10, color: "#64748b", fontFamily: FONT },
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 12,
      icon: "roundRect",
    },
    grid: gridOvr({ top: 32 }),
    xAxis: { type: "value", axisLabel: { color: "#94a3b8", fontSize: 9 }, splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } } },
    yAxis: {
      type: "category",
      data: names,
      axisLabel: { color: "#334155", fontSize: 11, fontWeight: 600, fontFamily: FONT },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: "Appointments",
        type: "bar",
        data: pracs.map(p => ({
          value: p.appointments,
          itemStyle: {
            color: { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#a5b4fc" }, { offset: 1, color: "#6366f1" }] },
            borderRadius: [0, 8, 8, 0],
            shadowColor: "rgba(99,102,241,0.12)",
            shadowBlur: 6,
          },
        })),
        barWidth: "38%",
        barGap: "20%",
        label: { show: true, position: "right", fontSize: 9, color: "#94a3b8", fontFamily: FONT },
      },
      {
        name: "Completed",
        type: "bar",
        data: pracs.map(p => ({
          value: p.completed,
          itemStyle: {
            color: { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#6ee7b7" }, { offset: 1, color: "#10b981" }] },
            borderRadius: [0, 8, 8, 0],
          },
        })),
        barWidth: "38%",
      },
    ],
  };
}

/* ─── 6. Daily Volume — stacked area with rich tooltip and dataZoom ─── */
function dailyVolume(data) {
  const trend = data?.chart_data || [];
  const dates = trend.map(d => {
    const p = d.date?.split("-");
    return p ? `${p[2]}/${p[1]}` : d.date;
  });
  const seriesDef = [
    { name: "Total", key: "total", color: "#3b82f6", area: "rgba(59,130,246,0.15)" },
    { name: "Completed", key: "completed", color: "#10b981", area: "rgba(16,185,129,0.12)" },
    { name: "Cancelled", key: "cancelled", color: "#f59e0b", area: null },
    { name: "DNA", key: "fta", color: "#f43f5e", area: null },
  ];

  return {
    animation: true,
    animationDuration: 1000,
    tooltip: {
      ...ttBg(),
      trigger: "axis",
      axisPointer: { type: "cross", crossStyle: { color: "#cbd5e1" } },
      formatter: (params) => {
        let s = `<div style="font-weight:700;margin-bottom:4px">${params[0].axisValue}</div>`;
        params.forEach(p => {
          s += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0"><span style="width:8px;height:4px;border-radius:2px;background:${p.color}"></span><span style="color:#64748b">${p.seriesName}</span><span style="font-weight:700;margin-left:auto">${p.value ?? "-"}</span></div>`;
        });
        return s;
      },
    },
    legend: {
      data: seriesDef.map(s => s.name),
      top: 2,
      right: 4,
      textStyle: { fontSize: 10, color: "#64748b", fontFamily: FONT },
      itemWidth: 14,
      itemHeight: 6,
      itemGap: 12,
      icon: "roundRect",
    },
    grid: gridOvr({ bottom: 55 }),
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", height: 18, bottom: 4, borderColor: "#e2e8f0", fillerColor: "rgba(99,102,241,0.08)", handleStyle: { color: "#6366f1" }, textStyle: { fontSize: 9, color: "#94a3b8" }, borderRadius: 6 },
    ],
    xAxis: {
      type: "category",
      data: dates,
      axisLabel: { color: "#94a3b8", fontSize: 9, rotate: 30, fontFamily: FONT },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#94a3b8", fontSize: 9 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: seriesDef.map(s => ({
      name: s.name,
      type: "line",
      smooth: 0.3,
      symbol: "circle",
      symbolSize: 4,
      data: trend.map(d => d[s.key]),
      itemStyle: { color: s.color },
      lineStyle: { width: s.key === "total" ? 2.5 : 1.5, color: s.color, type: s.key === "total" ? "solid" : s.key === "cancelled" ? "dashed" : "solid" },
      areaStyle: s.area ? {
        color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: s.area }, { offset: 1, color: s.area.replace(/[\d.]+\)$/, "0)") }] },
      } : undefined,
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: `${s.color}40` } },
      ...(s.key === "total" ? { markLine: { data: [{ type: "average", label: { formatter: "Avg: {c}", fontSize: 9, color: "#94a3b8", fontFamily: FONT }, lineStyle: { color: "#cbd5e1", type: "dashed" } }], silent: true } } : {}),
    })),
  };
}

/* ─── 7. By Reason — nightingale rose with better labels ─── */
function byReasonNightingale(data) {
  const reasons = data?.reasons?.slice(0, 8) || [];
  const total = reasons.reduce((s, r) => s + r.count, 0);
  const palette = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6", "#f97316"];

  return {
    animation: true,
    animationDuration: 1200,
    animationEasing: "elasticOut",
    tooltip: {
      ...ttBg(),
      trigger: "item",
      formatter: ({ name, value, percent }) => `<div style="font-weight:700;margin-bottom:4px">${name}</div><div style="font-size:18px;font-weight:800">${value.toLocaleString()}</div><div style="color:#94a3b8;font-size:11px">${percent}%</div>`,
    },
    legend: {
      orient: "vertical",
      right: 8,
      top: "middle",
      textStyle: { fontSize: 10, color: "#475569", fontFamily: FONT },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 8,
      icon: "roundRect",
    },
    series: [
      {
        type: "pie",
        radius: ["20%", "70%"],
        center: ["33%", "50%"],
        roseType: "area",
        itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 3 },
        label: { show: false },
        emphasis: {
          scaleSize: 8,
          label: { show: true, fontSize: 12, fontWeight: "bold", fontFamily: FONT, formatter: "{b}\n{d}%" },
          itemStyle: { shadowBlur: 16, shadowColor: "rgba(0,0,0,0.12)" },
        },
        animationType: "scale",
        animationEasing: "elasticOut",
        data: reasons.map((r, i) => ({
          value: r.count,
          name: r.reason,
          itemStyle: { color: palette[i % palette.length] },
        })),
      },
    ],
    graphic: [
      { type: "text", left: "27%", top: "42%", style: { text: total.toLocaleString(), textAlign: "center", fill: "#0f172a", fontSize: 22, fontWeight: 800, fontFamily: FONT } },
      { type: "text", left: "27%", top: "54%", style: { text: "Total", textAlign: "center", fill: "#94a3b8", fontSize: 10, fontWeight: 600, fontFamily: FONT } },
    ],
  };
}

/* ─── 8. By Hour — area-bar hybrid with peak glow ─── */
function byHourArea(data) {
  const hours = data?.hours || [];
  const counts = hours.map(h => h.count);
  const maxVal = Math.max(...counts, 1);

  return {
    animation: true,
    animationDuration: 800,
    tooltip: {
      ...ttBg(),
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(139,92,246,0.04)" } },
      formatter: (params) => {
        const p = params[0];
        return `<div style="font-weight:700;margin-bottom:2px">${p.name}</div><div style="font-size:16px;font-weight:800;color:#8b5cf6">${p.value}</div>`;
      },
    },
    grid: gridOvr({ bottom: 45 }),
    xAxis: {
      type: "category",
      data: hours.map(h => `${h.hour}:00`),
      axisLabel: { color: "#64748b", fontSize: 10, fontWeight: 500, fontFamily: FONT },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#94a3b8", fontSize: 9 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: [
      {
        type: "bar",
        data: counts.map(c => ({
          value: c,
          itemStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: c === maxVal
                ? [{ offset: 0, color: "#7c3aed" }, { offset: 0.5, color: "#8b5cf6" }, { offset: 1, color: "#a78bfa" }]
                : [{ offset: 0, color: "#c4b5fd" }, { offset: 1, color: "#ede9fe" }],
            },
            borderRadius: [8, 8, 0, 0],
            shadowColor: c === maxVal ? "rgba(139,92,246,0.3)" : "transparent",
            shadowBlur: c === maxVal ? 12 : 0,
          },
        })),
        barWidth: "55%",
        label: {
          show: true,
          position: "top",
          fontSize: 9,
          color: "#64748b",
          fontFamily: FONT,
        },
        markLine: {
          data: [{ type: "average", label: { formatter: "Avg: {c}", fontSize: 9, color: "#94a3b8", fontFamily: FONT }, lineStyle: { color: "#cbd5e1", type: "dashed" } }],
          silent: true,
        },
        markPoint: {
          data: [{ type: "max", name: "Peak" }],
          symbolSize: 36,
          label: { fontSize: 9, fontFamily: FONT, fontWeight: 700 },
          itemStyle: { color: "#7c3aed", shadowColor: "rgba(139,92,246,0.3)", shadowBlur: 10 },
        },
      },
    ],
  };
}

/* ─── 9. By Day — rainbow bars with rounded tops ─── */
function byDayPolar(data) {
  const days = data?.days || [];
  const counts = days.map(d => d.count);
  const maxVal = Math.max(...counts, 1);
  const rainbow = ["#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#f97316", "#ef4444"];

  return {
    animation: true,
    animationDuration: 800,
    tooltip: {
      ...ttBg(),
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(99,102,241,0.04)" } },
      formatter: (params) => {
        const p = params[0];
        const pct = maxVal ? ((p.value / maxVal) * 100).toFixed(0) : 0;
        return `<div style="font-weight:700;margin-bottom:2px">${p.name}</div><div style="font-size:16px;font-weight:800">${p.value}</div><div style="color:#94a3b8;font-size:10px">${pct}% of peak</div>`;
      },
    },
    grid: gridOvr({ bottom: 35 }),
    xAxis: {
      type: "category",
      data: days.map(d => d.day?.slice(0, 3)),
      axisLabel: { color: "#334155", fontSize: 11, fontWeight: 700, fontFamily: FONT },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#94a3b8", fontSize: 9 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: [
      {
        type: "bar",
        data: days.map((d, i) => ({
          value: d.count,
          itemStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: rainbow[i % rainbow.length] }, { offset: 1, color: `${rainbow[i % rainbow.length]}60` }],
            },
            borderRadius: [8, 8, 0, 0],
            shadowColor: `${rainbow[i % rainbow.length]}25`,
            shadowBlur: d.count === maxVal ? 12 : 4,
          },
        })),
        barWidth: "60%",
        label: {
          show: true,
          position: "top",
          fontSize: 11,
          fontWeight: 700,
          color: "#334155",
          fontFamily: FONT,
        },
        markLine: {
          data: [{ type: "average", label: { formatter: "Avg: {c}", fontSize: 9, color: "#94a3b8", fontFamily: FONT }, lineStyle: { color: "#cbd5e1", type: "dashed" } }],
          silent: true,
        },
      },
    ],
  };
}

/* ─── 10. Completion Rate — horizontal progress bars with gradient ─── */
function completionRadar(data) {
  const pracs = data?.practitioners?.slice(0, 8) || [];
  const names = pracs.map(p => p.name?.split(" ")[0] || p.name);
  const rates = pracs.map(p => p.completionRate);

  return {
    animation: true,
    animationDuration: 1000,
    tooltip: {
      ...ttBg(),
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(16,185,129,0.04)" } },
      formatter: (params) => {
        const p = params[0];
        return `<div style="font-weight:700;margin-bottom:2px">${p.name}</div><div style="font-size:18px;font-weight:800;color:#10b981">${p.value.toFixed(1)}%</div>`;
      },
    },
    grid: gridOvr({ right: 45 }),
    xAxis: {
      type: "value",
      max: 100,
      axisLabel: { color: "#94a3b8", fontSize: 9, formatter: "{value}%", fontFamily: FONT },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    yAxis: {
      type: "category",
      data: names,
      axisLabel: { color: "#334155", fontSize: 11, fontWeight: 600, fontFamily: FONT },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: rates.map(r => ({
          value: r,
          itemStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 1, y2: 0,
              colorStops: r >= 80
                ? [{ offset: 0, color: "#34d399" }, { offset: 1, color: "#10b981" }]
                : r >= 60
                  ? [{ offset: 0, color: "#fbbf24" }, { offset: 1, color: "#f59e0b" }]
                  : [{ offset: 0, color: "#fb7185" }, { offset: 1, color: "#f43f5e" }],
            },
            borderRadius: [0, 8, 8, 0],
            shadowColor: r >= 80 ? "rgba(16,185,129,0.2)" : "transparent",
            shadowBlur: r >= 80 ? 8 : 0,
          },
        })),
        barWidth: "55%",
        label: {
          show: true,
          position: "right",
          fontSize: 10,
          color: "#334155",
          fontFamily: FONT,
          fontWeight: 700,
          formatter: "{c}%",
        },
        markLine: {
          data: [{ type: "average", label: { formatter: "Avg: {c}%", fontSize: 9, color: "#94a3b8", fontFamily: FONT }, lineStyle: { color: "#cbd5e1", type: "dashed" } }],
          silent: true,
        },
      },
    ],
  };
}

/* ─── 11. Cancelled by Day — dual-axis with dramatic bars + dashed line ─── */
function cancelledByDay(data) {
  const days = data?.days || [];

  return {
    animation: true,
    animationDuration: 800,
    tooltip: {
      ...ttBg(),
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(244,63,94,0.04)" } },
      formatter: (params) => {
        const d = days[params[0]?.dataIndex];
        if (!d) return "";
        return `<div style="font-weight:700;margin-bottom:4px">${d.day}</div><div style="margin:2px 0;color:#64748b">Cancelled: <span style="font-weight:700;color:#f43f5e">${d.cancelled}</span></div><div style="margin:2px 0;color:#64748b">Total: <span style="font-weight:700">${d.total}</span></div><div style="margin:2px 0;color:#64748b">Rate: <span style="font-weight:700;color:#f97316">${d.rate}%</span></div>`;
      },
    },
    legend: {
      data: ["Cancelled", "Cancellation Rate"],
      top: 2,
      right: 4,
      textStyle: { fontSize: 10, color: "#64748b", fontFamily: FONT },
      itemWidth: 14,
      itemHeight: 6,
      itemGap: 12,
      icon: "roundRect",
    },
    grid: gridOvr({ right: 45 }),
    xAxis: {
      type: "category",
      data: days.map(d => d.day?.slice(0, 3)),
      axisLabel: { color: "#334155", fontSize: 11, fontWeight: 700, fontFamily: FONT },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: [
      { type: "value", axisLabel: { color: "#94a3b8", fontSize: 9 }, splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } } },
      { type: "value", max: 100, axisLabel: { color: "#94a3b8", fontSize: 9, formatter: "{value}%", fontFamily: FONT }, splitLine: { show: false } },
    ],
    series: [
      {
        name: "Cancelled",
        type: "bar",
        data: days.map(d => ({
          value: d.cancelled,
          itemStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: "#f43f5e" }, { offset: 1, color: "#fda4af" }],
            },
            borderRadius: [8, 8, 0, 0],
            shadowColor: "rgba(244,63,94,0.15)",
            shadowBlur: 6,
          },
        })),
        barWidth: "50%",
        label: { show: true, position: "top", fontSize: 10, color: "#f43f5e", fontFamily: FONT, fontWeight: 700 },
      },
      {
        name: "Cancellation Rate",
        type: "line",
        yAxisIndex: 1,
        data: days.map(d => d.rate),
        smooth: 0.3,
        symbol: "circle",
        symbolSize: 7,
        itemStyle: { color: "#f97316", borderColor: "#fff", borderWidth: 2 },
        lineStyle: { width: 2, type: "dashed", color: "#f97316" },
      },
    ],
  };
}

/* ─── 12. Lifecycle — range area (min–max) with avg line ─── */
function lifecycleRange(data) {
  const hours = data?.hours || [];

  return {
    animation: true,
    animationDuration: 800,
    tooltip: {
      ...ttBg(),
      trigger: "axis",
      formatter: (params) => {
        const h = hours[params[0]?.dataIndex];
        if (!h) return "";
        return `<div style="font-weight:700;margin-bottom:4px">${h.hour}:00</div><div style="margin:2px 0;color:#64748b">Min: <span style="font-weight:700;color:#a78bfa">${h.min} min</span></div><div style="margin:2px 0;color:#64748b">Avg: <span style="font-weight:700;color:#8b5cf6">${h.avg} min</span></div><div style="margin:2px 0;color:#64748b">Max: <span style="font-weight:700;color:#6366f1">${h.max} min</span></div>`;
      },
    },
    legend: {
      data: ["Avg Duration", "Min–Max Range"],
      top: 2,
      right: 4,
      textStyle: { fontSize: 10, color: "#64748b", fontFamily: FONT },
      itemWidth: 14,
      itemHeight: 6,
      itemGap: 12,
      icon: "roundRect",
    },
    grid: gridOvr(),
    xAxis: {
      type: "category",
      data: hours.map(h => `${h.hour}:00`),
      axisLabel: { color: "#334155", fontSize: 10, fontWeight: 600, fontFamily: FONT },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: "minutes",
      nameTextStyle: { fontSize: 9, color: "#94a3b8", fontFamily: FONT },
      axisLabel: { color: "#94a3b8", fontSize: 9 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: [
      {
        name: "Min–Max Range",
        type: "line",
        data: hours.map(h => [h.min, h.max]),
        smooth: 0.3,
        symbol: "none",
        lineStyle: { width: 0 },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "rgba(139,92,246,0.2)" }, { offset: 1, color: "rgba(139,92,246,0.03)" }],
          },
        },
        stack: "range",
      },
      {
        name: "Avg Duration",
        type: "bar",
        data: hours.map(h => ({
          value: h.avg,
          itemStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: "#8b5cf6" }, { offset: 1, color: "#c4b5fd" }],
            },
            borderRadius: [6, 6, 0, 0],
          },
        })),
        barWidth: "45%",
        label: { show: true, position: "top", fontSize: 9, color: "#8b5cf6", fontFamily: FONT, fontWeight: 600, formatter: "{c}" },
      },
    ],
  };
}

/* ─── 13. Duration histogram — bell-curve overlay on bars ─── */
function durationHistogram(data) {
  const buckets = data?.buckets || [];
  const total = buckets.reduce((s, b) => s + b.count, 0);

  return {
    animation: true,
    animationDuration: 800,
    tooltip: {
      ...ttBg(),
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(6,182,212,0.04)" } },
      formatter: (params) => {
        const p = params[0];
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : 0;
        return `<div style="font-weight:700;margin-bottom:2px">${p.name}</div><div style="font-size:16px;font-weight:800;color:#0ea5e9">${p.value.toLocaleString()}</div><div style="color:#94a3b8;font-size:11px">${pct}% of total</div>`;
      },
    },
    grid: gridOvr({ bottom: 40 }),
    xAxis: {
      type: "category",
      data: buckets.map(b => b.bucket),
      axisLabel: { color: "#475569", fontSize: 10, fontWeight: 600, fontFamily: FONT },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#94a3b8", fontSize: 9 },
      splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
    },
    series: [
      {
        type: "bar",
        data: buckets.map(b => ({
          value: b.count,
          itemStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: "#38bdf8" }, { offset: 0.5, color: "#0ea5e9" }, { offset: 1, color: "#0284c7" }],
            },
            borderRadius: [8, 8, 0, 0],
            shadowColor: "rgba(14,165,233,0.15)",
            shadowBlur: 6,
          },
        })),
        barWidth: "55%",
        label: {
          show: true,
          position: "top",
          fontSize: 10,
          color: "#334155",
          fontFamily: FONT,
          fontWeight: 700,
        },
      },
      {
        type: "line",
        smooth: 0.4,
        symbol: "circle",
        symbolSize: 6,
        data: buckets.map(b => b.count),
        itemStyle: { color: "#f43f5e" },
        lineStyle: { width: 2, type: "dashed", color: "#f43f5e" },
        z: 10,
      },
    ],
  };
}

/* ─── 14. Heatmap — enhanced colors and styling ─── */
function heatmapCalendar(data) {
  const heatmapData = data?.heatmap || [];
  const firstHour = heatmapData[0]?.data?.[0]?.hour ?? 8;
  const lastHour = heatmapData[0]?.data?.[heatmapData[0]?.data?.length - 1]?.hour ?? 17;
  const hours = [];
  for (let h = firstHour; h <= lastHour; h++) hours.push(`${h}:00`);
  const days = heatmapData.map(d => d.day?.slice(0, 3));
  const values = heatmapData.flatMap((d, di) =>
    hours.map((_, hi) => {
      const match = d.data?.find(dd => dd.hour === firstHour + hi);
      return [di, hi, match?.count || 0];
    }),
  );
  const maxVal = Math.max(...values.map(v => v[2]), 1);

  return {
    animation: true,
    tooltip: {
      ...ttBg(),
      formatter: ({ value: [dayIdx, hourIdx, count] }) => `<div style="font-weight:700;margin-bottom:2px">${days[dayIdx] || ""} ${hours[hourIdx] || ""}</div><div style="font-size:14px;font-weight:800;color:#0284c7">${count} appointments</div>`,
    },
    grid: gridOvr({ bottom: 55, top: 10 }),
    xAxis: {
      type: "category",
      data: hours,
      splitArea: { show: true, areaStyle: { color: ["rgba(248,250,252,0.8)", "rgba(255,255,255,0.8)"] } },
      axisLabel: { color: "#475569", fontSize: 9, fontWeight: 600, rotate: 30, fontFamily: FONT },
      axisLine: { show: false },
    },
    yAxis: {
      type: "category",
      data: days,
      splitArea: { show: true, areaStyle: { color: ["rgba(248,250,252,0.8)", "rgba(255,255,255,0.8)"] } },
      axisLabel: { color: "#334155", fontSize: 10, fontWeight: 700, fontFamily: FONT },
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
        color: ["#f0f9ff", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1", "#075985"],
      },
      textStyle: { fontSize: 9, color: "#64748b", fontFamily: FONT },
      itemWidth: 14,
      itemHeight: 120,
    },
    series: [
      {
        type: "heatmap",
        data: values,
        label: {
          show: true,
          color: "#0f172a",
          fontSize: 10,
          fontWeight: 600,
          fontFamily: FONT,
          formatter: ({ value: [, , c] }) => c || "",
        },
        emphasis: {
          itemStyle: { shadowBlur: 12, shadowColor: "rgba(0,0,0,0.2)" },
        },
        itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 4 },
      },
    ],
  };
}
