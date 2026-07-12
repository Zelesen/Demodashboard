import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Sparkles, Send, LayoutDashboard, PanelRightOpen, PanelRightClose, BarChart3 } from "lucide-react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import WidgetLibrary from "../components/WidgetLibrary";
import DashboardWidget from "../components/DashboardWidget";

const defaultPrompt = "I want a dashboard for my patients";

let widgetCounter = 0;

export default function NewDashboard() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [generated, setGenerated] = useState(false);
  const [layout, setLayout] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [showLibrary, setShowLibrary] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef(null);

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

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 1200));
    setGenerated(true);
    setIsGenerating(false);
  }, []);

  const addWidget = useCallback((widget) => {
    const id = `widget-${++widgetCounter}`;
    const cols = 12;
    const existingItems = layout.length;
    const itemsPerRow = Math.floor(cols / (widget.defaultW || 2));
    const row = Math.floor(existingItems / itemsPerRow);
    const col = (existingItems % itemsPerRow) * (widget.defaultW || 2);

    const newLayoutItem = {
      i: id,
      x: col,
      y: row,
      w: widget.defaultW || 2,
      h: widget.defaultH || 2,
      minW: 1,
      minH: 1,
    };

    const newWidget = {
      i: id,
      type: widget.type,
      title: widget.title || `${widget.type.charAt(0).toUpperCase() + widget.type.slice(1)} Chart`,
    };

    setLayout(prev => [...prev, newLayoutItem]);
    setWidgets(prev => [...prev, newWidget]);
  }, [layout]);

  const removeWidget = useCallback((id) => {
    setLayout(prev => prev.filter(l => l.i !== id));
    setWidgets(prev => prev.filter(w => w.i !== id));
  }, []);

  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout);
  }, []);

  const resetDashboard = useCallback(() => {
    setGenerated(false);
    setLayout([]);
    setWidgets([]);
    widgetCounter = 0;
  }, []);

  const getWidget = useCallback((id) => {
    return widgets.find(w => w.i === id);
  }, [widgets]);

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased min-h-screen">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-50 via-indigo-50/50 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-50/60 via-blue-50/30 to-transparent rounded-full blur-3xl opacity-50" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="max-w-full mx-auto p-3 sm:p-4 lg:p-5 space-y-3 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group/logo">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl blur-md opacity-30 group-hover/logo:opacity-50 transition-opacity" />
              <div className="relative w-10 h-10 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center shadow-sm">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <LayoutDashboard size={14} className="text-white" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-[2px] border-white rounded-full shadow-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[1.3rem] font-bold tracking-tight text-slate-900 leading-tight">Dashboards</h1>
                {generated && (
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 rounded-md border border-emerald-100/50">
                    <Sparkles size={8} /> AI Generated
                  </span>
                )}
              </div>
              <p className="text-[10px] font-medium text-slate-400">
                {generated ? `${widgets.length} widgets placed` : "Create a new dashboard with AI"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {generated && (
              <button
                onClick={() => setShowLibrary(!showLibrary)}
                className="inline-flex items-center gap-1.5 px-3 h-[32px] bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:shadow-sm active:scale-[0.97] transition-all duration-200"
              >
                {showLibrary ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
                {showLibrary ? "Hide Library" : "Show Library"}
              </button>
            )}
            <button
              onClick={resetDashboard}
              className="inline-flex items-center gap-1.5 px-4 h-[32px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-[0.97] transition-all duration-200"
            >
              <Plus size={12} />
              New Dashboard
            </button>
          </div>
        </div>

        {/* Prompt Section */}
        {!generated && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 min-w-[32px] rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Sparkles size={15} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Describe your dashboard</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tell us what you want to see, and we'll generate widgets automatically</p>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={2}
                  className="w-full resize-none text-[13px] p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder:text-slate-400"
                  placeholder="Describe the dashboard you want..."
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-300 text-white flex items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Send size={13} />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] font-medium text-slate-400">Try:</span>
                {["Show revenue trends", "Patient overview dashboard", "Practice performance"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setPrompt(suggestion)}
                    className="px-2 py-1 text-[10px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area: Canvas + Library */}
        <div className="flex gap-3">
          {/* Dashboard Canvas */}
          <div ref={containerRef} className={`transition-all duration-300 ${showLibrary ? "flex-1 min-w-0" : "w-full"}`}>
            {generated && widgets.length > 0 ? (
              <div className="bg-white/50 rounded-2xl border border-slate-200/40 shadow-sm p-2 min-h-[400px]">
                <div className="text-[10px] font-medium text-slate-400 px-2 py-1 flex items-center gap-2">
                  <LayoutDashboard size={11} />
                  Dashboard Canvas — Drag to rearrange, resize from bottom-right corner
                </div>
                <GridLayout
                  className="layout"
                  layout={layout}
                  cols={12}
                  rowHeight={120}
                  width={containerWidth}
                  onLayoutChange={handleLayoutChange}
                  isDraggable={true}
                  isResizable={true}
                  compactType="vertical"
                  margin={[8, 8]}
                  containerPadding={[4, 4]}
                  draggableHandle=".react-grid-drag-handle"
                >
                  {layout.map(item => {
                    const widget = getWidget(item.i);
                    if (!widget) return null;
                    return (
                      <div key={item.i} className="relative">
                        <DashboardWidget
                          widget={widget}
                          onRemove={removeWidget}
                        />
                      </div>
                    );
                  })}
                </GridLayout>
              </div>
            ) : generated && widgets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <BarChart3 size={24} className="text-slate-300" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 mb-1">Your dashboard is empty</h3>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-4">
                    Drag widgets from the library panel on the right to start building your dashboard
                  </p>
                  <button
                    onClick={() => {
                      const types = ["bar", "line", "pie", "area", "metric", "table"];
                      types.forEach(t => addWidget({ type: t, title: `${t.charAt(0).toUpperCase() + t.slice(1)} Chart`, defaultW: t === "metric" ? 1 : 2, defaultH: t === "metric" ? 1 : 2 }));
                    }}
                    className="inline-flex items-center gap-1.5 px-4 h-8 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-[11px] font-bold transition-colors"
                  >
                    <Plus size={12} />
                    Add sample widgets
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Widget Library Aside */}
          {showLibrary && generated && (
            <div className="w-[280px] shrink-0">
              <WidgetLibrary
                onAddWidget={addWidget}
                generated={true}
                onClose={() => setShowLibrary(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
