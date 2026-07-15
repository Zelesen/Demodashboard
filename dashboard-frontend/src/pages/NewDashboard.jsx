import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Save, Sparkles, Layers, RotateCcw, 
  PanelRightOpen, PanelRightClose, LayoutDashboard, Edit3
} from "lucide-react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import DashboardWidget from "../components/DashboardWidget";
import useDashboardState from "../components/dashboard/useDashboardState";
import WidgetPanel from "../components/dashboard/WidgetPanel";
import WidgetFrame from "../components/dashboard/WidgetFrame";

const API = "http://localhost:8000";
const ROW_HEIGHT = 100;
const COLS = 12;

export default function NewDashboard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // If there is an ID in the route, we are editing. Otherwise, we are creating a new one.
  const isEditing = !!id;
  
  const [dashboardTitle, setDashboardTitle] = useState("Untitled Dashboard");
  const [dashboardDescription, setDashboardDescription] = useState("");
  const [showPanel, setShowPanel] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(isEditing);
  const [containerWidth, setContainerWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [validationErrors, setValidationErrors] = useState({});
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

  // Determine if it was initiated from AI Chat
  const queryParams = new URLSearchParams(location.search);
  const isFromAI = queryParams.get("source") === "ida";

  // Load existing dashboard if editing
  useEffect(() => {
    if (!id) {
      resetDashboard();
      // If we came from AI IDA, check if there are pre-generated widgets in localstorage or use a default set
      setLoadingDashboard(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/dashboards/${id}`);
        const data = await res.json();
        if (cancelled) return;
        const dash = data.dashboard;
        setDashboardTitle(dash.name || "Untitled Dashboard");
        setDashboardDescription(dash.description || "");
        if (dash.page_data?.widgets) {
          replaceWidgets(dash.page_data.widgets);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        if (!cancelled) setLoadingDashboard(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, replaceWidgets, resetDashboard]);

  // Resize observer for container width
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

  // Dynamic canvas height adjustments
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

  const handleSave = async () => {
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
        status: "Published",
        managed_by: "you",
        user_id: userId,
        page_data: { widgets },
      };

      const url = isEditing ? `${API}/api/dashboards/${id}` : `${API}/api/dashboards`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      // Clean local storage state
      resetDashboard();
      
      // Redirect to the dashboard view page
      navigate(`/dashboard-view/${data.dashboard.id}`);
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
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-50 via-indigo-50/50 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-50/60 via-blue-50/30 to-transparent rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-5 space-y-4 relative z-10">
        {/* Editor Actions Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200/60">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate(isEditing ? `/dashboard-view/${id}` : "/dashboards")}
              className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-all shadow-sm"
              title="Cancel editing"
            >
              <ArrowLeft size={15} />
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={dashboardTitle}
                  onChange={e => { setDashboardTitle(e.target.value); setValidationErrors(v => ({ ...v, title: null })); }}
                  placeholder="Enter Dashboard Title..."
                  className="text-lg font-bold text-slate-900 tracking-tight leading-none bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-2 focus:ring-indigo-400 rounded-lg px-2 py-1 outline-none w-full max-w-[320px] sm:max-w-[420px] transition-all"
                />
                {isFromAI && (
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 rounded-md border border-emerald-100/50 shrink-0">
                    <Sparkles size={8} /> AI Draft
                  </span>
                )}
              </div>
              {validationErrors.title && (
                <p className="text-[10px] font-semibold text-rose-500 mt-1 ml-2">{validationErrors.title}</p>
              )}
              <input
                type="text"
                value={dashboardDescription}
                onChange={e => { setDashboardDescription(e.target.value); setValidationErrors(v => ({ ...v, description: null })); }}
                placeholder="Add a description of this dashboard..."
                className="text-xs text-slate-500 bg-transparent hover:bg-slate-100/50 focus:bg-white focus:ring-2 focus:ring-indigo-400 rounded-lg px-2 py-0.5 outline-none w-full max-w-[320px] sm:max-w-[420px] mt-1 transition-all"
              />
              {validationErrors.description && (
                <p className="text-[10px] font-semibold text-rose-500 mt-1 ml-2">{validationErrors.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="inline-flex items-center gap-1.5 px-3 h-[34px] bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[11px] font-bold text-slate-600 transition-all shadow-sm"
            >
              {showPanel ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
              {showPanel ? "Hide Library" : "Show Library"}
            </button>
            <button
              onClick={resetDashboard}
              className="inline-flex items-center gap-1.5 px-3 h-[34px] bg-white border border-slate-200 text-slate-400 hover:text-rose-600 rounded-xl text-[11px] font-bold transition-all shadow-sm"
              title="Clear all widgets"
            >
              <RotateCcw size={12} />
              Clear
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 h-[34px] bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold shadow-md transition-all active:scale-[0.98]"
            >
              <Save size={13} />
              {saving ? "Saving..." : "Save Dashboard"}
            </button>
          </div>
        </div>

        {/* Builder Area */}
        {loadingDashboard ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 items-start">
            {/* Canvas grid board */}
            <div ref={containerRef} className="flex-1 min-w-0">
              <div
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                onDrop={e => {
                  e.preventDefault();
                  try {
                    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                    addWidget(data);
                  } catch {}
                }}
                className="relative rounded-2xl border border-slate-200 bg-white shadow-inner overflow-hidden"
                style={{ minHeight: `${canvasHeight}px` }}
              >
                {/* Visual grid guide lines */}
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
                      key={`bg-grid-cell-${idx}`} 
                      style={{ height: `${ROW_HEIGHT}px` }}
                      className="border border-slate-100/60 bg-slate-50/20 rounded-xl"
                    />
                  ))}
                </div>

                <div className="relative z-10 w-full h-full">
                  {widgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[500px]">
                      <div className="text-center max-w-xs p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-md">
                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-indigo-500">
                          <LayoutDashboard size={16} />
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 mb-1">Canvas is empty</h3>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Drag and drop widgets from the library on the right, or click them to append them to your dashboard canvas.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <GridLayout
                      className="layout relative"
                      layout={widgets.map(({ i, x, y, w, h, minH, minW }) => ({ i, x, y, w, h, minH: minH || 2, minW: minW || 1 }))}
                      cols={COLS}
                      rowHeight={ROW_HEIGHT}
                      width={containerWidth}
                      onLayoutChange={handleLayoutChange}
                      isDraggable={true}
                      isResizable={true}
                      compactType="vertical"
                      margin={[16, 16]}
                      containerPadding={[12, 12]}
                      draggableHandle=".react-grid-drag-handle"
                      useCSSTransforms={true}
                    >
                      {widgets.map(widget => (
                        <div 
                          key={widget.i} 
                          className="rounded-xl bg-white border border-slate-200 shadow-sm transition-all duration-200 overflow-hidden hover:border-indigo-400 hover:shadow-md hover:ring-4 hover:ring-indigo-500/5"
                        >
                          <WidgetFrame
                            widget={widget}
                            onRemove={removeWidget}
                            onDuplicate={duplicateWidget}
                            isEditMode={true}
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
            </div>

            {/* Collapsible Widget Library Side Panel */}
            <AnimatePresence>
              {showPanel && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="shrink-0 sticky top-4 h-[calc(100vh-10rem)] overflow-hidden"
                >
                  <div className="h-full bg-transparent rounded-2xl shadow-sm p-1">
                    <WidgetPanel onAddWidget={addWidget} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}