import { useState } from "react";
import { motion } from "framer-motion";
import { GripHorizontal, Copy, Trash2, Settings } from "lucide-react";

export default function WidgetFrame({ widget, children, onRemove, onDuplicate, isEditMode }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative h-full group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}

      {isEditMode && (
        <>
          <div
            className={`absolute inset-0 rounded-xl border-2 pointer-events-none transition-colors duration-150 ${
              hovered ? "border-indigo-400/60" : "border-transparent"
            }`}
          />

          <div
            className={`absolute top-1 left-1 z-20 w-6 h-6 rounded-md bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm
              flex items-center justify-center cursor-grab active:cursor-grabbing
              text-slate-400 hover:text-slate-600 hover:bg-white transition-all
              react-grid-drag-handle opacity-0 group-hover:opacity-100`}
            title="Drag to move"
          >
            <GripHorizontal size={11} />
          </div>

          <div
            className={`absolute top-1 right-1 z-20 flex items-center gap-0.5 transition-opacity duration-150 ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <button
              onClick={() => onDuplicate(widget.i)}
              className="w-6 h-6 rounded-md bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm
                flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white hover:border-indigo-200 transition-all"
              title="Duplicate"
            >
              <Copy size={10} />
            </button>
            <button
              className="w-6 h-6 rounded-md bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm
                flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-all cursor-pointer"
              title="Settings"
            >
              <Settings size={10} />
            </button>
            <button
              onClick={() => onRemove(widget.i)}
              className="w-6 h-6 rounded-md bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm
                flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white hover:border-rose-200 transition-all"
              title="Delete"
            >
              <Trash2 size={10} />
            </button>
          </div>

          <div className="absolute bottom-1 right-1 z-20 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[8px] font-mono text-slate-400 bg-white/80 px-1 rounded border border-slate-200">
              {widget.w}×{widget.h}
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}
