import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "dashboard-editor-state";

let widgetCounter = 0;

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
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
  return null;
}

export default function useDashboardState() {
  const [widgets, setWidgets] = useState([]);

  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) setWidgets(saved);
  }, []);

  useEffect(() => {
    if (widgets.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [widgets]);

  function getMinH(item) {
    if (item.chartType === "totalAppointments" || item.chartType === "completedAppointments" || item.chartType === "cancelledAppointments" || item.chartType === "dnaRate" || item.chartType === "avgDuration" || item.chartType === "dnaCount") return 1;
    if (item.type === "metric") return 1;
    return 2;
  }

  function getMinW(item) {
    return 1;
  }

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
      minH: getMinH(item),
      minW: getMinW(item),
      type: item.type,
      chartType: item.chartType,
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
    widgetCounter = 0;
    setWidgets([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const replaceWidgets = useCallback((newWidgets) => {
    const max = newWidgets.reduce((m, w) => Math.max(m, parseInt(w.i.replace("widget-", ""), 10) || 0), 0);
    widgetCounter = max;
    setWidgets(newWidgets);
    if (newWidgets.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    widgets,
    addWidget,
    removeWidget,
    duplicateWidget,
    updateLayout,
    resetDashboard,
    replaceWidgets,
  };
}
