import { TrendingUp, TrendingDown } from "lucide-react";
import InfoTooltip from "./InfoTooltip";

const colorMap = {
  blue: {
    bg: "from-blue-500/10 to-blue-600/5",
    icon: "from-blue-500 to-blue-600",
    text: "text-blue-600",
    shadow: "shadow-blue-200",
  },
  emerald: {
    bg: "from-emerald-500/10 to-emerald-600/5",
    icon: "from-emerald-500 to-emerald-600",
    text: "text-emerald-600",
    shadow: "shadow-emerald-200",
  },
  amber: {
    bg: "from-amber-500/10 to-amber-600/5",
    icon: "from-amber-500 to-amber-600",
    text: "text-amber-600",
    shadow: "shadow-amber-200",
  },
  rose: {
    bg: "from-rose-500/10 to-rose-600/5",
    icon: "from-rose-500 to-rose-600",
    text: "text-rose-600",
    shadow: "shadow-rose-200",
  },
};

function Card({ title, value, icon: Icon, color = "blue", trend, trendValue, subtitle, description }) {
  const c = colorMap[color] || colorMap.blue;
  const isUp = trend === "up";

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-0.5">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-transparent to-slate-50/50 pointer-events-none" />

      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${c.bg} ${c.shadow}`}>
          {Icon && <Icon className={`w-5 h-5 ${c.text}`} />}
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
              isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
            }`}
          >
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trendValue}
          </span>
        )}
      </div>

      <div>
        <p className="text-sm text-slate-400 font-medium mb-1">
          {title}
          {description && <InfoTooltip text={description} />}
        </p>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}

export default Card;
