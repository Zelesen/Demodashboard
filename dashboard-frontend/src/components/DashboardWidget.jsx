import { useState } from "react";
import { BarChart3, LineChart, PieChart, AreaChart, Activity, Table2, Trash2, Maximize2, Minimize2, GripHorizontal } from "lucide-react";

const chartColors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

const sampleBarData = {
  series: [{ name: "Revenue", data: [45, 52, 38, 60, 42, 55, 48] }],
  categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
};

const sampleLineData = {
  series: [{ name: "Patients", data: [28, 35, 22, 40, 32, 45, 38] }],
  categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
};

const samplePieData = {
  series: [35, 25, 20, 20],
  labels: ["Adults", "Children", "Seniors", "Emergency"]
};

const sampleAreaData = {
  series: [{ name: "Cash Flow", data: [120, 145, 130, 160, 150, 170, 165] }],
  categories: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7"]
};

const sampleTableData = {
  headers: ["Patient", "Date", "Treatment", "Status"],
  rows: [
    ["John D.", "12 Jul", "Checkup", "Completed"],
    ["Sarah M.", "12 Jul", "Cleaning", "Completed"],
    ["Robert K.", "11 Jul", "Filling", "Scheduled"],
    ["Emily R.", "11 Jul", "Root Canal", "In Progress"],
    ["James W.", "10 Jul", "Consultation", "Completed"],
  ]
};

function BarChartWidget() {
  const maxVal = Math.max(...sampleBarData.series[0].data);
  return (
    <div className="h-full flex flex-col p-2">
      <div className="flex items-end justify-between gap-1 flex-1 pb-5">
        {sampleBarData.series[0].data.map((val, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar">
            <span className="text-[9px] font-semibold text-slate-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">{val}k</span>
            <div
              className="w-full rounded-md transition-all duration-300 hover:opacity-80 cursor-pointer"
              style={{
                height: `${(val / maxVal) * 100}%`,
                backgroundColor: chartColors[i % chartColors.length],
                minHeight: "8px"
              }}
            />
            <span className="text-[8px] text-slate-400 font-medium">{sampleBarData.categories[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChartWidget() {
  const maxVal = Math.max(...sampleLineData.series[0].data);
  const minVal = Math.min(...sampleLineData.series[0].data);
  const range = maxVal - minVal || 1;
  const points = sampleLineData.series[0].data.map((val, i) => {
    const x = (i / (sampleLineData.series[0].data.length - 1)) * 100;
    const y = 100 - ((val - minVal) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");
  const polyPoints = sampleLineData.series[0].data.map((val, i) => {
    const x = (i / (sampleLineData.series[0].data.length - 1)) * 100;
    const y = 100 - ((val - minVal) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="h-full flex flex-col p-2">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${polyPoints} 100,100`} fill="url(#lineGrad)" />
        <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {sampleLineData.series[0].data.map((val, i) => {
          const x = (i / (sampleLineData.series[0].data.length - 1)) * 100;
          const y = 100 - ((val - minVal) / range) * 80 - 10;
          return <circle key={i} cx={x} cy={y} r="1.5" fill="#6366f1" className="hover:r-3 transition-all" />;
        })}
      </svg>
    </div>
  );
}

function PieChartWidget() {
  const total = samplePieData.series.reduce((a, b) => a + b, 0);
  let cumulativePercent = 0;
  const slices = samplePieData.series.map((val, i) => {
    const percent = val / total;
    const startAngle = cumulativePercent * 360 - 90;
    cumulativePercent += percent;
    const endAngle = cumulativePercent * 360 - 90;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);
    const largeArc = percent > 0.5 ? 1 : 0;
    return { path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`, color: chartColors[i % chartColors.length], label: samplePieData.labels[i], percent };
  });

  return (
    <div className="h-full flex items-center gap-2 p-2">
      <svg viewBox="0 0 100 100" className="h-full aspect-square shrink-0">
        {slices.map((slice, i) => (
          <g key={i} className="group/pie cursor-pointer">
            <path d={slice.path} fill={slice.color} className="hover:opacity-80 transition-opacity" />
            <title>{`${slice.label}: ${(slice.percent * 100).toFixed(0)}%`}</title>
          </g>
        ))}
        <circle cx="50" cy="50" r="20" fill="white" className="drop-shadow-sm" />
        <text x="50" y="48" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#1e293b">{total}</text>
        <text x="50" y="58" textAnchor="middle" fontSize="5" fill="#94a3b8">Total</text>
      </svg>
      <div className="flex flex-col gap-1 text-[9px]">
        {samplePieData.labels.map((label, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
            <span className="text-slate-600 truncate">{label}</span>
            <span className="font-semibold text-slate-800 ml-auto">{samplePieData.series[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AreaChartWidget() {
  const maxVal = Math.max(...sampleAreaData.series[0].data);
  const minVal = Math.min(...sampleAreaData.series[0].data);
  const range = maxVal - minVal || 1;
  const points = sampleAreaData.series[0].data.map((val, i) => {
    const x = (i / (sampleAreaData.series[0].data.length - 1)) * 100;
    const y = 100 - ((val - minVal) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="h-full flex flex-col p-2">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill="url(#areaGrad)" />
        <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function MetricCardWidget({ title }) {
  const value = title === "Total Patients" ? "2,847" : title === "Avg Revenue/Patient" ? "£342" : title === "Group Production" ? "£124k" : "85%";
  const change = title === "Total Patients" ? "+12.5%" : title === "Avg Revenue/Patient" ? "+8.3%" : title === "Group Production" ? "+15.2%" : "+5.7%";
  const isPositive = !change.startsWith("-");

  return (
    <div className="h-full flex flex-col justify-center p-3">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-xl font-bold text-slate-900 tracking-tight">{value}</span>
        <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
          {change}
        </span>
      </div>
      <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full" style={{ width: `${Math.min(85, 100)}%` }} />
      </div>
    </div>
  );
}

function TableWidget() {
  return (
    <div className="h-full overflow-auto p-1">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-slate-200">
            {sampleTableData.headers.map((h, i) => (
              <th key={i} className="text-left font-semibold text-slate-500 py-1.5 px-2 first:pl-1 last:pr-1">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sampleTableData.rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={`py-1.5 px-2 first:pl-1 last:pr-1 ${j === 0 ? "font-medium text-slate-800" : "text-slate-500"}`}>
                  {j === row.length - 1 ? (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${
                      cell === "Completed" ? "bg-emerald-50 text-emerald-600" :
                      cell === "In Progress" ? "bg-amber-50 text-amber-600" :
                      "bg-blue-50 text-blue-600"
                    }`}>{cell}</span>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoChartWidget({ title }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <BarChart3 size={20} className="text-slate-300 mx-auto mb-1" />
        <p className="text-[11px] text-slate-400 font-medium">{title || "Chart Preview"}</p>
      </div>
    </div>
  );
}

export default function DashboardWidget({ widget, onRemove, onResize, showControls = true }) {
  const [isHovered, setIsHovered] = useState(false);

  const renderChart = () => {
    switch (widget.type) {
      case "bar": return <BarChartWidget />;
      case "line": return <LineChartWidget />;
      case "pie": return <PieChartWidget />;
      case "area": return <AreaChartWidget />;
      case "metric": return <MetricCardWidget title={widget.title} />;
      case "table": return <TableWidget />;
      default: return <NoChartWidget title={widget.title} />;
    }
  };

  const typeIcons = { bar: BarChart3, line: LineChart, pie: PieChart, area: AreaChart, metric: Activity, table: Table2 };
  const Icon = typeIcons[widget.type] || BarChart3;

  return (
    <div
      className="h-full w-full bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
            <Icon size={10} className="text-indigo-600" />
          </div>
          <span className="text-[10px] font-semibold text-slate-700 truncate">{widget.title}</span>
        </div>
        {showControls && (
          <div className={`flex items-center gap-1 transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}>
            <div className="w-4 h-4 rounded hover:bg-slate-200 flex items-center justify-center cursor-grab text-slate-400 hover:text-slate-600 react-grid-drag-handle">
              <GripHorizontal size={10} />
            </div>
            <button
              onClick={() => onRemove(widget.i)}
              className="w-4 h-4 rounded hover:bg-rose-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>
      <div className="h-[calc(100%-28px)]">
        {renderChart()}
      </div>
    </div>
  );
}
