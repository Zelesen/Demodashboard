import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "dashboard-editor-state";

const defaultWidgets = [
  { i: "widget-1", x: 0, y: 0, w: 3, h: 2, type: "metric", title: "Total Patients" },
  { i: "widget-2", x: 3, y: 0, w: 3, h: 2, type: "metric", title: "Avg Revenue/Patient" },
  { i: "widget-3", x: 6, y: 0, w: 3, h: 2, type: "metric", title: "Group Production" },
  { i: "widget-4", x: 9, y: 0, w: 3, h: 2, type: "metric", title: "Conversion Rate" },
  { i: "widget-5", x: 0, y: 2, w: 6, h: 3, type: "bar", title: "Revenue by Practice" },
  { i: "widget-6", x: 6, y: 2, w: 6, h: 3, type: "line", title: "Monthly Trends" },
];

let widgetCounter = 6;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const max = parsed.reduce((m, w) => Math.max(m, parseInt(w.i.replace("widget-", ""), 10) || 0), 0);
        widgetCounter = max;
        return parsed;
      }
    }
  } catch {}
  return null;
}

export default function useDashboardState() {
  const [widgets, setWidgets] = useState(() => {
    const saved = loadFromStorage();
    return saved || defaultWidgets;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch {}
  }, [widgets]);

  const addWidget = useCallback((item) => {
    const id = `widget-${++widgetCounter}`;
    const cols = 12;
    const count = widgets.length;
    const itemsPerRow = Math.max(Math.floor(cols / item.defaultW), 1);
    const row = Math.floor(count / itemsPerRow);
    const col = (count % itemsPerRow) * item.defaultW;

    setWidgets(prev => [...prev, {
      i: id,
      x: col,
      y: row,
      w: item.defaultW,
      h: item.defaultH,
      type: item.type,
      title: item.title,
    }]);
  }, [widgets]);

  const removeWidget = useCallback((id) => {
    setWidgets(prev => prev.filter(w => w.i !== id));
  }, []);

  const duplicateWidget = useCallback((id) => {
    const source = widgets.find(w => w.i === id);
    if (!source) return;
    const newId = `widget-${++widgetCounter}`;
    setWidgets(prev => [...prev, {
      ...source,
      i: newId,
      x: Math.min(source.x + 1, 10),
      y: source.y + 1,
      title: `${source.title} (copy)`,
    }]);
  }, [widgets]);

  const updateLayout = useCallback((newLayout) => {
    setWidgets(prev =>
      prev.map(w => {
        const found = newLayout.find(l => l.i === w.i);
        return found ? { ...w, x: found.x, y: found.y, w: found.w, h: found.h } : w;
      })
    );
  }, []);

  const resetDashboard = useCallback(() => {
    widgetCounter = 6;
    setWidgets(defaultWidgets);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    widgets,
    addWidget,
    removeWidget,
    duplicateWidget,
    updateLayout,
    resetDashboard,
  };
}
