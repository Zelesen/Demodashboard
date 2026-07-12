import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Share2, Eye, Edit3, LayoutDashboard, PanelRightOpen, PanelRightClose,
  RotateCcw, ArrowLeft
} from "lucide-react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import DashboardWidget from "../components/DashboardWidget";
import useDashboardState from "../components/dashboard/useDashboardState";
import WidgetPanel from "../components/dashboard/WidgetPanel";
import WidgetFrame from "../components/dashboard/WidgetFrame";

const ROW_HEIGHT = 100;
const COLS = 12;

// Framer motion variants for rich interactivity
const buttonHover = {
  hover: { scale: 1.02, translateY: -1, transition: { duration: 0.2 } },
  tap: { scale: 0.98, translateY: 0 }
};

export default function DashboardResult() {
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(true);
  const [showPanel, setShowPanel] = useState(true);
  const [containerWidth, setContainerWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const containerRef = useRef(null);

  const {
    widgets,
    addWidget,
    removeWidget,
    duplicateWidget,
    updateLayout,
    resetDashboard,
  } = useDashboardState();

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
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 2);
    setCanvasHeight(Math.max(600, maxY * ROW_HEIGHT + 120));
  }, [widgets]);

  const handleLayoutChange = useCallback((newLayout) => {
    updateLayout(newLayout);
  }, [updateLayout]);

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased min-h-screen relative overflow-x-hidden selection:bg-slate-200">
      {/* Dynamic Animated Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 30, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/50 via-indigo-50/40 to-transparent rounded-full blur-3xl opacity-70" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.15, 1],
            x: [0, -40, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/40 via-blue-50/30 to-transparent rounded-full blur-3xl opacity-60" 
        />
      </div>

      <div className="max-w-full mx-auto p-4 sm:p-6 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ x: -3 }}
              onClick={() => navigate("/start-dashboard")}
              className="group p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-colors shadow-sm"
            >
              <ArrowLeft size={16} />
            </motion.button>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                Reception — New Patients
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Track new patient growth, active patient book, and net patient movement.
              </p>
            </div>
          </div>

          {/* Action controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Sliding Pill Mode Selector */}
            <div className="relative flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner">
              <button
                onClick={() => setIsEditMode(true)}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold z-10 transition-colors duration-300 ${
                  isEditMode ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Edit3 size={13} /> Edit
                {isEditMode && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white border border-slate-200/50 rounded-lg shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold z-10 transition-colors duration-300 ${
                  !isEditMode ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Eye size={13} /> Preview
                {!isEditMode && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white border border-slate-200/50 rounded-lg shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-0.5 hidden sm:block" />

            <motion.button 
              variants={buttonHover} whileHover="hover" whileTap="tap"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 shadow-sm transition-colors"
            >
              <Save size={13} /> Save
            </motion.button>
            
            <motion.button 
              variants={buttonHover} whileHover="hover" whileTap="tap"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md shadow-slate-900/10 transition-all"
            >
              <Share2 size={13} /> Publish
            </motion.button>
          </div>
        </div>

        {/* Dynamic Context Editing Banner */}
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                    <LayoutDashboard size={14} className="text-indigo-500" />
                  </div>
                  <span>
                    <strong className="text-slate-800 font-semibold">{widgets.length}</strong> widgets active
                  </span>
                  <span className="text-slate-300 hidden sm:inline">·</span>
                  <span className="text-slate-400 hidden sm:inline">Drag header to reposition · Pull corners to scale</span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <motion.button
                    variants={buttonHover} whileHover="hover" whileTap="tap"
                    onClick={() => setShowPanel(!showPanel)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 shadow-sm transition-all"
                  >
                    {showPanel ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
                    {showPanel ? "Hide Panel" : "Show Components"}
                  </motion.button>
                  <motion.button
                    variants={buttonHover} whileHover="hover" whileTap="tap"
                    onClick={resetDashboard}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 shadow-sm transition-all"
                  >
                    <RotateCcw size={13} /> Reset
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Workspace */}
<div className="flex gap-4 items-start">
  <motion.div
    layout
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
    className={showPanel && isEditMode ? "flex-1 min-w-0" : "w-full"}
  >
    <div
      ref={containerRef}
      className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
        isEditMode 
          ? "bg-white border border-slate-200/60 shadow-md shadow-slate-100/50" 
          : "bg-white border border-slate-200/60 shadow-sm"
      }`}
      style={{ minHeight: `${canvasHeight || 600}px` }}
    >
      {/* 1. SEPARATED BACKGROUND SKELETON GRID (No touching lines, pure isolated boxes) */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-0 grid bg-white"
            style={{
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              gap: '16px',         // Matches react-grid-layout margin
              padding: '16px',       // Matches react-grid-layout containerPadding
            }}
          >
            {Array.from({ length: Math.ceil((canvasHeight || 600) / (ROW_HEIGHT + 16)) * COLS }).map((_, idx) => (
              <div 
                key={`bg-canvas-box-${idx}`} 
                style={{ height: `${ROW_HEIGHT}px` }}
                className="border border-slate-200/40 bg-white shadow-[0_1px_2px_rgba(0,0,0,0,02)] rounded-xl"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid content container */}
      <div className="relative z-10 w-full" style={{ minHeight: `${canvasHeight || 6000}px` }}>
        
        {/* 2. EMPTY STATE LAYER */}
        {widgets.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-20 flex flex-col items-center justify-center h-[600px]"
          >
            <div className="text-center max-w-sm px-8 py-8 rounded-2xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/50">
              <motion.div 
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-12 h-12 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm text-indigo-600"
              >
                <LayoutDashboard size={22} strokeWidth={1.5} />
              </motion.div>
              
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight mb-1.5">
                Your workspace canvas
              </h3>
              
              <p className="text-xs text-slate-500 leading-relaxed max-w-[240px] mx-auto">
                Drag items from the right-hand sidebar and drop them anywhere onto the grid system.
              </p>
            </div>
          </motion.div>
        ) : (
          /* 3. ACTUAL INTERACTIVE GRID LAYER */
          <GridLayout
            className="layout transitions-group relative z-20"
            layout={widgets.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))}
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            width={containerWidth}
            onLayoutChange={handleLayoutChange}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            compactType="vertical"
            margin={[16, 16]}
            containerPadding={[4, 4]}
            draggableHandle=".react-grid-drag-handle"
            resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 's', 'n']}
            useCSSTransforms={true}
          >
            {widgets.map(widget => (
              <div 
                key={widget.i} 
                className={`transition-all duration-300 rounded-xl bg-white border border-slate-200 shadow-sm ${
                  isEditMode 
                    ? "hover:shadow-xl hover:shadow-slate-100 hover:border-indigo-500/40 ring-2 ring-transparent hover:ring-indigo-500/10" 
                    : ""
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

  {/* Right Floating Components Dock */}
  <AnimatePresence>
    {isEditMode && showPanel && (
      <motion.div
        initial={{ width: 0, opacity: 0, x: 20 }}
        animate={{ width: 290, opacity: 1, x: 0 }}
        exit={{ width: 0, opacity: 0, x: 20 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="shrink-0 overflow-hidden sticky top-6"
      >
        <div className="w-[290px] pl-2 h-full">
          <WidgetPanel onAddWidget={addWidget} />
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
      </div>
    </div>
  );
}