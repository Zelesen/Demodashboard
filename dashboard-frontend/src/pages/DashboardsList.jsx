import { useNavigate } from "react-router-dom";
import { Plus, LayoutDashboard, Eye, Edit3 } from "lucide-react";

export default function DashboardsList() {
  const navigate = useNavigate();

  const existingDashboards = [
    {
      id: 1,
      name: "Home",
      type: "System",
      description: "High-level clinic performance summary, maintained by Medfin.",
      status: "Existing access",
      managedBy: "Medfin",
      thumbnail: "home"
    },
    {
      id: 2,
      name: "Treatment growth",
      type: "Draft",
      description: "Treatment uptake, treatment mix, production, and patient acquisition.",
      status: "Continue editing before sharing",
      managedBy: "you",
      thumbnail: "treatment"
    }
  ];

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased min-h-screen">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-50 via-indigo-50/50 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-50/60 via-blue-50/30 to-transparent rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-5xl mx-auto p-6 sm:p-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboards</h1>
          <p className="text-sm text-slate-500">Open Home or manage dashboards for this clinic.</p>
        </div>

        {/* New Dashboard Button */}
        <button
          onClick={() => navigate("/start-dashboard")}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
        >
          <Plus size={16} />
          New dashboard
        </button>

        {/* Medfin Section */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Medfin</h2>
          
          {existingDashboards.filter(d => d.managedBy === "Medfin").map((dashboard) => (
            <div
              key={dashboard.id}
              className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  {/* Thumbnail */}
                  <div className="w-24 h-16 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                    <LayoutDashboard size={24} className="text-slate-300" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900">{dashboard.name}</h3>
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                        {dashboard.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{dashboard.description}</p>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-slate-600 font-medium">{dashboard.status}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">Managed by {dashboard.managedBy}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-all">
                    <Eye size={12} />
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dashboards Section */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dashboards</h2>
          <p className="text-xs text-slate-500 mb-4">Dashboards you can open for this clinic.</p>

          {existingDashboards.filter(d => d.managedBy === "you").map((dashboard) => (
            <div
              key={dashboard.id}
              className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  {/* Thumbnail */}
                  <div className="w-24 h-16 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                    <LayoutDashboard size={24} className="text-slate-300" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900">{dashboard.name}</h3>
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md">
                        {dashboard.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{dashboard.description}</p>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-slate-600 font-medium">{dashboard.status}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">Managed by {dashboard.managedBy}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-all">
                    <Eye size={12} />
                    View
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition-all">
                    <Edit3 size={12} />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}