import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  LayoutDashboard,
  Search,
  X,
  ChevronRight,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
} from "lucide-react";

const API = "http://localhost:8000";

const statusColors = {
  Draft: "bg-amber-50 text-amber-700 border-amber-200",
  Live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Archived: "bg-surface-alt text-muted border-card-border",
};

const typeColors = {
  Custom: "bg-indigo-50 text-indigo-600 border-indigo-200",
  System: "bg-surface-alt text-body border-card-border",
  AI: "bg-violet-50 text-violet-600 border-violet-200",
};

const emptyForm = { name: "", type: "Custom", description: "", status: "Draft", managed_by: "you" };

export default function DashboardCreator() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const currentUser = (() => {
    try { return JSON.parse(sessionStorage.getItem("user") || "{}"); }
    catch { return {}; }
  })();
  const userId = currentUser?.id || null;

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchDashboards = useCallback(async () => {
    setLoading(true);
    try {
      const url = userId ? `${API}/api/dashboards?user_id=${userId}` : `${API}/api/dashboards`;
      const res = await fetch(url);
      const data = await res.json();
      setDashboards(data.dashboards || []);
    } catch {
      showToast("Failed to load dashboards", "error");
    } finally {
      setLoading(false);
    }
  }, [userId, showToast]);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  const userDashboards = dashboards.filter(
    (d) => d.user_id !== null && d.user_id === userId
  );

  const filteredDashboards = userDashboards.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingDashboard(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (d, e) => {
    e.stopPropagation();
    setEditingDashboard(d);
    setForm({
      name: d.name || "",
      type: d.type || "Custom",
      description: d.description || "",
      status: d.status || "Draft",
      managed_by: d.managed_by || "you",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast("Dashboard name is required", "error");
      return;
    }
    setSaving(true);
    try {
      if (editingDashboard) {
        const res = await fetch(`${API}/api/dashboards/${editingDashboard.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Update failed");
        showToast("Dashboard updated successfully");
      } else {
        const res = await fetch(`${API}/api/dashboards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, user_id: userId }),
        });
        if (!res.ok) throw new Error("Create failed");
        showToast("Dashboard created successfully");
      }
      setShowModal(false);
      fetchDashboards();
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/api/dashboards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDashboards((prev) => prev.filter((d) => d.id !== id));
      setDeleteConfirm(null);
      showToast("Dashboard deleted");
    } catch {
      showToast("Failed to delete dashboard", "error");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased min-h-screen">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100/40 via-blue-50/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/30 via-blue-50/20 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto p-5 sm:p-8 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200">
                <LayoutDashboard size={17} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-heading tracking-tight">Dashboard Creator</h1>
            </div>
            <p className="text-[13px] text-muted ml-[46px]">
              {loading ? "Loading..." : `${userDashboards.length} dashboard${userDashboards.length !== 1 ? "s" : ""} you've created`}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] shadow-md shadow-heading/10 hover:shadow-lg hover:shadow-heading/20"
          >
            <Plus size={14} />
            New Dashboard
          </button>
        </div>

        {/* Search bar */}
        {!loading && userDashboards.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search dashboards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-card border border-card-border/60 text-[13px] text-body placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-body"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-card-border/60 shadow-sm overflow-hidden animate-pulse">
                <div className="h-3 bg-surface-alt" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-32 bg-surface-alt rounded" />
                    <div className="h-4 w-14 bg-surface-alt rounded-full" />
                  </div>
                  <div className="h-3 w-full bg-surface-alt rounded" />
                  <div className="h-3 w-2/3 bg-surface-alt rounded" />
                  <div className="flex justify-between pt-1">
                    <div className="h-3 w-20 bg-surface-alt rounded" />
                    <div className="h-3 w-16 bg-surface-alt rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : userDashboards.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-50 flex items-center justify-center mb-4 shadow-inner">
              <LayoutDashboard size={28} className="text-violet-400" />
            </div>
            <h3 className="text-base font-bold text-body mb-1">No dashboards yet</h3>
            <p className="text-[13px] text-muted mb-5 text-center max-w-xs">
              Create your first custom dashboard to start tracking what matters most to your practice.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97] shadow-md"
            >
              <Plus size={14} />
              Create your first dashboard
            </button>
          </div>
        ) : filteredDashboards.length === 0 ? (
          /* No search results */
          <div className="flex flex-col items-center justify-center py-16">
            <Search size={24} className="text-muted mb-3" />
            <p className="text-sm font-medium text-muted">No dashboards match "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          /* Dashboard grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDashboards.map((d) => (
              <div
                key={d.id}
                className="group relative bg-card rounded-2xl border border-card-border/60 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => navigate(`/dashboard-view/${d.id}`)}
              >
                {/* Status bar */}
                <div className={`h-1 ${
                  d.status === "Live"
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                    : d.status === "Archived"
                    ? "bg-gradient-to-r from-muted to-muted"
                    : "bg-gradient-to-r from-amber-400 to-amber-500"
                }`} />

                <div className="p-4">
                  {/* Top row: name + status */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-[13px] font-bold text-heading group-hover:text-violet-600 transition-colors line-clamp-1">
                      {d.name}
                    </h3>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ml-2 ${statusColors[d.status] || statusColors.Draft}`}>
                      {d.status || "Draft"}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-muted leading-relaxed mb-3 line-clamp-2 min-h-[28px]">
                    {d.description || "No description"}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${typeColors[d.type] || typeColors.Custom}`}>
                      {d.type || "Custom"}
                    </span>
                    <div className="flex items-center gap-1 text-muted">
                      <Calendar size={10} />
                      <span className="text-[9px] font-medium">{formatDate(d.created_at)}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-card-border">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/dashboard-view/${d.id}`); }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 bg-surface hover:bg-violet-50 border border-card-border/60 hover:border-violet-200 rounded-lg text-[10px] font-semibold text-muted hover:text-violet-600 transition-all"
                    >
                      <Eye size={10} />
                      View
                    </button>
                    <button
                      onClick={(e) => openEditModal(d, e)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 bg-surface hover:bg-blue-50 border border-card-border/60 hover:border-blue-200 rounded-lg text-[10px] font-semibold text-muted hover:text-blue-600 transition-all"
                    >
                      <Pencil size={10} />
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/${d.id}/edit`); }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 bg-surface hover:bg-amber-50 border border-card-border/60 hover:border-amber-200 rounded-lg text-[10px] font-semibold text-muted hover:text-amber-600 transition-all"
                    >
                      <FileText size={10} />
                      Builder
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(d.id); }}
                      className="px-2 py-1.5 bg-surface hover:bg-rose-50 border border-card-border/60 hover:border-rose-200 rounded-lg text-muted hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl border border-card-border/60 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  {editingDashboard ? <Pencil size={14} className="text-white" /> : <Plus size={14} className="text-white" />}
                </div>
                <h2 className="text-sm font-bold text-heading">
                  {editingDashboard ? "Edit Dashboard" : "Create Dashboard"}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-surface-alt flex items-center justify-center text-muted hover:text-body transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                  Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Monthly Revenue Overview"
                  className="w-full h-9 px-3 rounded-xl bg-surface border border-card-border text-[13px] text-body placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full h-9 px-3 rounded-xl bg-surface border border-card-border text-[13px] text-body focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all appearance-none"
                  >
                    <option value="Custom">Custom</option>
                    <option value="AI">AI Generated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full h-9 px-3 rounded-xl bg-surface border border-card-border text-[13px] text-body focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all appearance-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Live">Live</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What is this dashboard for?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-card-border text-[13px] text-body placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-card-border bg-surface/50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 h-8 rounded-xl text-[12px] font-semibold text-muted hover:bg-surface-alt transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 h-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[12px] font-bold transition-all active:scale-[0.97] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                {editingDashboard ? "Save Changes" : "Create Dashboard"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-card rounded-2xl shadow-2xl border border-card-border/60 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={22} className="text-rose-500" />
              </div>
              <h3 className="text-sm font-bold text-heading mb-1">Delete Dashboard?</h3>
              <p className="text-[12px] text-muted">
                This action cannot be undone. The dashboard and all its configuration will be permanently removed.
              </p>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 border-t border-card-border bg-surface/50">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-8 rounded-xl text-[12px] font-semibold text-body bg-card border border-card-border hover:bg-surface transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 h-8 rounded-xl text-[12px] font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all active:scale-[0.97] shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-[12px] font-semibold ${
            toast.type === "error"
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            {toast.type === "error" ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
