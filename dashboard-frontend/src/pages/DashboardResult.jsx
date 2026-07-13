import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Share2, Eye, Edit3, LayoutDashboard, PanelRightOpen, PanelRightClose,
  RotateCcw, ArrowLeft, Layers, Calendar, RefreshCw
} from "lucide-react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import DashboardWidget from "../components/DashboardWidget";
import useDashboardState from "../components/dashboard/useDashboardState";
import WidgetPanel from "../components/dashboard/WidgetPanel";
import WidgetFrame from "../components/dashboard/WidgetFrame";
import useDashboardData from "../hooks/useDashboardData";

const API = "http://localhost:8000";
const ROW_HEIGHT = 100;
const COLS = 12;

const buttonHover = {
  hover: { scale: 1.015, y: -0.5, transition: { duration: 0.15 } },
  tap: { scale: 0.98, y: 0 }
};

const FILTER_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "This year", value: "1y" },
  { label: "All time", value: "all" },
];

export default function DashboardResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditRoute = location.pathname.endsWith("/edit");
  const [isEditMode, setIsEditMode] = useState(!id || isEditRoute);
  const [showPanel, setShowPanel] = useState(true);
  const [dashboardTitle, setDashboardTitle] = useState("Untitled Dashboard");
  const [dashboardDescription, setDashboardDescription] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [containerWidth, setContainerWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [saving, setSaving] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(!!id);
  const [dashboardId, setDashboardId] = useState(id ? Number(id) : null);
  const [activeFilter, setActiveFilter] = useState("7d");
  const isViewMode = id && !isEditRoute;
  // Whether to show *real* widget data: true whenever we're not actively editing —
  // this covers both the in-builder "Preview" toggle (no id yet) and the saved View route (has id).
  const showData = !isEditMode;
  const containerRef = useRef(null);

  const {
    widgets,
    addWidget,
    removeWidget,
    duplicateWidget,
    updateLayout,
    resetDashboard,
    replaceWidgets,
  } = useDashboardState();

  const { dataMap, loading: dataLoading } = useDashboardData(showData ? widgets : [], activeFilter);
  const widgetsWithData = showData
    ? widgets.map(w => ({ ...w, data: dataMap[w.i] || w.data }))
    : widgets;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/dashboards/${id}`);
        const data = await res.json();
        if (cancelled) return;
        const dash = data.dashboard;
        setDashboardTitle(dash.name || "Untitled Dashboard");
        setDashboardDescription(dash.description || "");
        setDashboardId(dash.id);
        if (dash.page_data?.widgets) {
          replaceWidgets(dash.page_data.widgets);
        }
        if (!isEditRoute) setIsEditMode(false);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        if (!cancelled) setLoadingDashboard(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, isEditRoute]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadingDashboard]);

  useEffect(() => {
    if (!widgets.length) {
      setCanvasHeight(600);
      return;
    }
    const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 2);
    setCanvasHeight(Math.max(600, maxY * ROW_HEIGHT + 48));
  }, [widgets]);

  const handleLayoutChange = useCallback((newLayout) => {
    updateLayout(newLayout);
  }, [updateLayout]);

  const saveDashboard = async (status) => {
    if (saving) return;
    const errors = {};
    if (!dashboardTitle.trim()) errors.title = "Title is required";
    if (!dashboardDescription.trim()) errors.description = "Description is required";
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
      const userId = currentUser?.id || null;
      const payload = {
        name: dashboardTitle,
        type: "Custom",
        description: dashboardDescription,
        status,
        managed_by: "you",
        user_id: userId,
        page_data: { widgets },
      };
      if (dashboardId) {
        const res = await fetch(`${API}/api/dashboards/${dashboardId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        navigate(status === "Published" ? `/dashboard-view/${data.dashboard.id}` : `/dashboard/${data.dashboard.id}`);
      } else {
        const res = await fetch(`${API}/api/dashboards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        navigate(status === "Published" ? `/dashboard-view/${data.dashboard.id}` : `/dashboard/${data.dashboard.id}`);
      }
    } catch (err) {
      console.error("Failed to save dashboard:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased min-h-screen">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/20 via-blue-100/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/15 via-slate-100/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl ml-6 lg:ml-10 mr-auto p-3 sm:p-4 lg:p-5 space-y-4 relative z-10">
        {/* Navigation / Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/60">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate(isViewMode ? "/dashboards" : dashboardId ? `/dashboard-view/${dashboardId}` : "/start-dashboard")}
              className="group p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-all shadow-sm hover:shadow"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  autoFocus
                  value={dashboardTitle}
                  onChange={e => { setDashboardTitle(e.target.value); setValidationErrors(v => ({ ...v, title: undefined })); }}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={e => { if (e.key === "Enter") setEditingTitle(false); }}
                  className="text-lg font-bold text-slate-900 tracking-tight leading-none bg-transparent border-b-2 border-indigo-400 outline-none w-full max-w-[420px] py-0.5"
                />
              ) : (
                <h1
                  onClick={() => isEditMode && setEditingTitle(true)}
                  className="text-lg font-bold text-slate-900 tracking-tight leading-none flex items-center gap-2 cursor-pointer group"
                >
                  <span>{dashboardTitle}</span>
                  {isEditMode && <Edit3 size={13} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />}
                </h1>
              )}
              {validationErrors.title && (
                <p className="text-[10px] font-semibold text-rose-500 mt-1">{validationErrors.title}</p>
              )}
              {editingDescription ? (
                <input
                  autoFocus
                  value={dashboardDescription}
                  onChange={e => { setDashboardDescription(e.target.value); setValidationErrors(v => ({ ...v, description: undefined })); }}
                  onBlur={() => setEditingDescription(false)}
                  onKeyDown={e => { if (e.key === "Enter") setEditingDescription(false); }}
                  placeholder="Enter a description..."
                  className="text-xs text-slate-600 bg-transparent border-b-2 border-indigo-400 outline-none w-full max-w-[420px] py-0.5 mt-1 placeholder:text-slate-400"
                />
              ) : (
                <p
                  onClick={() => isEditMode && setEditingDescription(true)}
                  className={`text-xs mt-1 font-medium truncate cursor-pointer group ${
                    dashboardDescription ? "text-slate-500" : "text-slate-400 italic"
                  }`}
                >
                  {dashboardDescription || "Add a description..."}
                  {isEditMode && <Edit3 size={10} className="inline ml-1 text-slate-300 group-hover:text-indigo-500 transition-colors" />}
                </p>
              )}
              {validationErrors.description && (
                <p className="text-[10px] font-semibold text-rose-500 mt-0.5">{validationErrors.description}</p>
              )}
            </div>
          </div>

          {/* Controls Hub */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            {isViewMode ? (
              <motion.button
                variants={buttonHover} whileHover="hover" whileTap="tap"
                onClick={() => navigate(`/dashboard/${id}/edit`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Edit3 size={13} /> Edit Dashboard
              </motion.button>
            ) : (
              <>
                {/* Mode Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-inner">
                  <button
                    onClick={() => setIsEditMode(true)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                      isEditMode ? "text-slate-900 bg-white shadow-sm border border-slate-200/40" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Edit3 size={12} /> Design
                  </button>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                      !isEditMode ? "text-slate-900 bg-white shadow-sm border border-slate-200/40" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Eye size={12} /> Preview
                  </button>
                </div>

                <div className="w-px h-5 bg-slate-200 mx-0.5 hidden sm:block" />

                <motion.button
                  variants={buttonHover} whileHover="hover" whileTap="tap"
                  onClick={() => saveDashboard("Draft")}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 shadow-sm transition-colors disabled:opacity-50"
                >
                  <Save size={13} /> {saving ? "Saving..." : "Save Draft"}
                </motion.button>
                
                <motion.button 
                  variants={buttonHover} whileHover="hover" whileTap="tap"
                  onClick={() => saveDashboard("Published")}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  <Share2 size={13} /> {saving ? "Saving..." : "Publish Layout"}
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Canvas Tips Notification */}
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between px-4 py-2.5 bg-indigo-50/50 border border-indigo-100/60 rounded-xl">
                <div className="flex items-center gap-2.5 text-xs text-indigo-950 font-medium">
                  <Layers size={13} className="text-indigo-600" />
                  <span>
                    Workspace Active: <strong className="font-bold text-indigo-700">{widgets.length}</strong> modules loaded. Drag card headers to position or scale borders freely.
                  </span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setShowPanel(!showPanel)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 transition-all"
                  >
                    {showPanel ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
                    {showPanel ? "Collapse Dock" : "Expand Components"}
                  </button>
                  <button
                    onClick={resetDashboard}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-all"
                  >
                    <RotateCcw size={11} /> Clear Layout
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Mode: Date Filter Bar */}
        {isViewMode && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-white border border-slate-200/80 rounded-xl p-0.5 shadow-sm">
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    activeFilter === f.value
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200/80 rounded-xl text-[11px] font-medium text-slate-500 shadow-sm">
              <Calendar size={12} />
              <span>Custom range</span>
            </div>
            {dataLoading && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-indigo-600">
                <RefreshCw size={12} className="animate-spin" />
                Refreshing...
              </div>
            )}
          </div>
        )}

        {/* Workspace Canvas / Drag Area */}
        {loadingDashboard ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <div>
            <motion.div layout transition={{ type: "spring", stiffness: 350, damping: 32 }}>
              <div
                ref={containerRef}
                onDragOver={e => { if (isEditMode) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }}
                onDrop={e => {
                  if (!isEditMode) return;
                  e.preventDefault();
                  try {
                    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                    addWidget(data);
                  } catch {}
                }}
                className={`relative rounded-2xl border transition-all duration-300 overflow-hidden bg-white ${
                  isEditMode 
                    ? "border-slate-200 shadow-inner" 
                    : "border-slate-200/60 shadow-sm"
                }`}
                style={{ minHeight: `${canvasHeight}px` }}
              >
                {/* Layout Blueprint Guide Map */}
                {isEditMode && (
                  <div 
                    className="absolute inset-0 pointer-events-none z-0 grid"
                    style={{
                      gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                      gap: '16px',
                      padding: '16px',
                    }}
                  >
                    {Array.from({ length: Math.ceil(canvasHeight / (ROW_HEIGHT + 16)) * COLS }).map((_, idx) => (
                      <div 
                        key={`bg-canvas-box-${idx}`} 
                        style={{ height: `${ROW_HEIGHT}px` }}
                        className="border border-slate-100/70 bg-slate-50/30 rounded-xl transition-all"
                      />
                    ))}
                  </div>
                )}

                {/* Functional Dashboard Content Area */}
                <div className="relative z-10 w-full h-full">
                  {widgetsWithData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[500px]">
                      <div className="text-center max-w-sm p-6 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-100/60">
                        <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                          <LayoutDashboard size={18} strokeWidth={2} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
                          {isViewMode ? "Empty Dashboard" : "Empty Canvas Workspace"}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed px-2">
                          {isViewMode ? "This dashboard has no widgets yet." : "Drag metrics and analytical elements from the component library and slide them onto this grid board."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <GridLayout
                      className="layout transitions-group relative"
                      layout={widgetsWithData.map(({ i, x, y, w, h, minH, minW }) => ({ i, x, y, w, h, minH: minH || 2, minW: minW || 1 }))}
                      cols={COLS}
                      rowHeight={ROW_HEIGHT}
                      width={containerWidth}
                      onLayoutChange={isEditMode ? handleLayoutChange : undefined}
                      isDraggable={isEditMode}
                      isResizable={isEditMode}
                      compactType="vertical"
                      margin={[16, 16]}
                      containerPadding={[12, 12]}
                      draggableHandle=".react-grid-drag-handle"
                      resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 's', 'n']}
                      useCSSTransforms={true}
                    >
                      {widgetsWithData.map(widget => (
                        <div 
                          key={widget.i} 
                          className={`rounded-xl bg-white transition-all duration-200 overflow-hidden ${
                            isEditMode 
                              ? "border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md hover:ring-4 hover:ring-indigo-500/5" 
                              : "border border-transparent"
                          }`}
                        >
                          <WidgetFrame
                            widget={widget}
                            onRemove={removeWidget}
                            onDuplicate={duplicateWidget}
                            isEditMode={isEditMode}
                          >
                            <DashboardWidget
                              widget={widget}
                              onRemove={removeWidget}
                              showControls={false}
                            />
                          </WidgetFrame>
                        </div>
                      ))}
                    </GridLayout>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Blueprint Library Panel - fixed right side outside max-w-7xl */}
      <AnimatePresence>
        {isEditMode && showPanel && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed right-0 top-32 z-50 pointer-events-none"
          >
            <div className="h-[calc(100vh-12rem)] w-[300px] mr-6 pointer-events-auto">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-1 shadow-sm backdrop-blur-md h-full overflow-hidden">
                <WidgetPanel onAddWidget={addWidget} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}