import { useNavigate } from "react-router-dom";
import { Plus, Eye, ArrowUpRight, Sparkles, Image, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

const API = "http://localhost:8000";

const palettes = [
  { card: "from-indigo-500 to-blue-600", label: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  { card: "from-emerald-500 to-teal-500", label: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { card: "from-violet-500 to-purple-600", label: "bg-violet-50 text-violet-600 border-violet-100" },
  { card: "from-rose-500 to-pink-500", label: "bg-rose-50 text-rose-600 border-rose-100" },
  { card: "from-amber-400 to-orange-500", label: "bg-amber-50 text-amber-700 border-amber-100" },
  { card: "from-cyan-500 to-sky-600", label: "bg-cyan-50 text-cyan-600 border-cyan-100" },
];

const systemIcon = (name) => {
  const svgs = {
    Home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    Appointments: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    Invoices: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    Payments: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    Treatment: "M4 6h16M4 12h16M4 18h16",
  };
  return svgs[name] || "M4 6h16M4 12h16M4 18h16";
};

export default function DashboardsList() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);

  const currentUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const userId = currentUser?.id || null;

  const fetchDashboards = () => {
    setLoading(true);
    const url = userId ? `${API}/api/dashboards?user_id=${userId}` : `${API}/api/dashboards`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setDashboards(data.dashboards || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  const systemDashboards = dashboards.filter(d => d.user_id === null);
  const userDashboards = dashboards.filter(d => d.user_id !== null && d.user_id === userId);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const res = await fetch(`${API}/api/dashboards/${id}`, { method: "DELETE" });
    if (res.ok) setDashboards(prev => prev.filter(d => d.id !== id));
  };

  const handleImageUpload = async (id, file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API}/api/dashboards/${id}/upload-image`, { method: "POST", body: form });
    const data = await res.json();
    setDashboards(prev => prev.map(d => d.id === id ? { ...d, preview_image_url: data.preview_image_url } : d));
  };

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased min-h-screen">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100/40 via-blue-50/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/30 via-blue-50/20 to-transparent rounded-full blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.012]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#6366f1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto p-5 sm:p-8 relative z-10">
        {/* ---- Header ---- */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboards</h1>
            </div>
            <p className="text-[13px] text-slate-500">
              {loading ? "Loading..." : `${dashboards.length} dashboard${dashboards.length !== 1 ? "s" : ""} available`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/start-dashboard")}
              className="inline-flex items-center gap-2 px-5 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-slate-900/10 hover:shadow-lg hover:shadow-slate-900/20"
            >
              <Plus size={14} />
              New dashboard
            </button>
          </div>
        </div>

        {/* ---- Built-in / System Dashboards ---- */}
        {systemDashboards.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Built-in Pages</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
              <span className="text-[9px] font-medium text-slate-400">Always available</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemDashboards.map((d, i) => {
                const p = palettes[i % palettes.length];
                const isHovered = hoveredId === d.id;
                return (
                  <div
                    key={d.id}
                    onMouseEnter={() => setHoveredId(d.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => navigate(d.path || "/")}
                    className="group relative bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                    style={{ transform: isHovered ? 'translateY(-2px)' : 'translateY(0)' }}
                  >
                    {d.preview_image_url ? (
                      <div className="relative h-28 overflow-hidden bg-slate-100">
                        <img src={`${API}${d.preview_image_url}`} alt={d.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                    ) : (
                      <div className={`relative h-28 bg-gradient-to-br ${p.card} flex items-center justify-center overflow-hidden`}>
                        <div className="absolute inset-0 bg-white/10" />
                        <svg className="absolute w-20 h-20 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                          <path d={systemIcon(d.name)} />
                        </svg>
                        <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-white/25 backdrop-blur-sm border border-white/30 shadow-lg">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d={systemIcon(d.name)} />
                          </svg>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-bold text-slate-900">{d.name}</h3>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${p.label}`}>{d.type}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3 line-clamp-2">{d.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400">{d.path}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(d.path || "/"); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-lg text-[9px] font-semibold text-slate-500 hover:text-slate-800 transition-all active:scale-95"
                        >
                          <Eye size={10} />
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- User's Dashboards ---- */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Dashboards</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden animate-pulse">
                  <div className="h-[140px] bg-slate-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                    <div className="h-3 w-full bg-slate-200 rounded" />
                    <div className="h-3 w-16 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : userDashboards.length === 0 ? (
            <div className="flex items-center gap-3 py-3 px-4 bg-white/40 rounded-xl border border-slate-200/40">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center shadow-inner">
                <Plus size={14} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600">No custom dashboards yet</p>
                <p className="text-[10px] text-slate-400">Create your own to track what matters most.</p>
              </div>
              <button
                onClick={() => navigate("/start-dashboard")}
                className="inline-flex items-center gap-1.5 px-3 h-7 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[9px] font-bold transition-all active:scale-95 shadow-sm"
              >
                <Sparkles size={10} />
                Create
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userDashboards.map((d, i) => {
                const p = palettes[i % palettes.length];
                const isHovered = hoveredId === d.id;
                return (
                  <div
                    key={d.id}
                    onMouseEnter={() => setHoveredId(d.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="group relative bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                    style={{ transform: isHovered ? 'translateY(-3px)' : 'translateY(0)' }}
                    onClick={() => navigate(`/dashboard-view/${d.id}`)}
                  >
                    <div className={`relative h-[140px] overflow-hidden ${d.preview_image_url ? "bg-slate-100" : `bg-gradient-to-br ${p.card}`}`}>
                      {d.preview_image_url ? (
                        <img src={`${API}${d.preview_image_url}`} alt={d.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="absolute inset-0 bg-white/5" />
                      )}
                      <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all duration-300 cursor-pointer group/upload" onClick={e => e.stopPropagation()}>
                        <div className="opacity-0 group-hover/upload:opacity-100 transition-opacity duration-300 flex flex-col items-center gap-1">
                          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Image size={14} className="text-slate-700" />
                          </div>
                          <span className="text-[8px] font-bold text-white drop-shadow-lg">Set preview</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageUpload(d.id, e.target.files[0]); }} />
                      </label>
                      <span className={`absolute top-2 right-2 text-[7px] font-bold px-1.5 py-0.5 rounded-md border ${p.label} z-10`}>{d.type}</span>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-slate-900">{d.name}</h3>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard-view/${d.id}`); }}
                            className="p-1 hover:bg-slate-100 rounded-md transition-colors" title="View"
                          >
                            <Eye size={12} className="text-slate-400 hover:text-slate-700" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(d.id, e)}
                            className="p-1 hover:bg-rose-50 rounded-md transition-colors" title="Delete"
                          >
                            <Trash2 size={12} className="text-slate-400 hover:text-rose-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed mb-2 line-clamp-2">{d.description}</p>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${d.status === "Live" ? "bg-emerald-400" : "bg-amber-400"}`} />
                        <span className="text-[9px] font-medium text-slate-400">{d.status || "Draft"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- Bottom CTA ---- */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/40 backdrop-blur-sm border border-slate-200/40 rounded-2xl shadow-sm">
            <span className="text-[11px] text-slate-400">Want to build something new?</span>
            <button
              onClick={() => navigate("/start-dashboard")}
              className="inline-flex items-center gap-1.5 px-3.5 h-7 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95"
            >
              <Plus size={11} />
              Start from scratch
            </button>
            <span className="text-slate-300">or</span>
            <button
              onClick={() => navigate("/start-dashboard")}
              className="inline-flex items-center gap-1.5 px-3.5 h-7 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-semibold text-slate-600 hover:text-slate-800 transition-all active:scale-95"
            >
              <Sparkles size={11} />
              Chat with IDA
              <ArrowUpRight size={9} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}