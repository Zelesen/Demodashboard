import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, LayoutTemplate, Plus, MessageSquareText, Cpu, ArrowRight } from "lucide-react";

export default function StartDashboard() {
  const navigate = useNavigate();

  const options = [
    {
      id: "IDA",
      title: "Chat to IDA",
      badge: "Recommended",
      description: "Describe the outcome you want and IDA will help build the dashboard from scratch.",
      icon: MessageSquareText,
      action: () => navigate("/chat-IDA"),
      accent: "from-indigo-500 to-blue-600",
      glow: "shadow-indigo-500/20 group-hover:shadow-indigo-500/40",
      label: "bg-indigo-50 text-indigo-600 border-indigo-100",
      buttonText: "Start with IDA"
    },
    {
      id: "template",
      title: "Start from template",
      description: "Browse pre-built layouts and customise them in the editor to fit your needs.",
      icon: LayoutTemplate,
      action: () => navigate("/new-dashboard"),
      accent: "from-emerald-500 to-teal-500",
      glow: "shadow-emerald-500/20 group-hover:shadow-emerald-500/40",
      label: "bg-emerald-50 text-emerald-600 border-emerald-100",
      buttonText: "Browse templates"
    },
    {
      id: "scratch",
      title: "Create from scratch",
      description: "Start with a blank canvas and design every widget exactly how you want it.",
      icon: Plus,
      action: () => navigate("/new-dashboard"),
      accent: "from-violet-500 to-purple-600",
      glow: "shadow-violet-500/20 group-hover:shadow-violet-500/40",
      label: "bg-violet-50 text-violet-600 border-violet-100",
      buttonText: "Blank canvas"
    }
  ];

  return (
    <div className="bg-[#f8fafc] font-sans antialiased min-h-screen relative overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Ambient Background Graphics */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/30 via-blue-100/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-purple-100/20 via-transparent to-emerald-100/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/20 via-blue-50/10 to-transparent rounded-full blur-3xl" />
        
        {/* Refined Dot Grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.015]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#4f46e5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12 relative z-10 flex flex-col min-h-screen justify-center">
        {/* Back Button */}
        <div className="mb-6 self-start">
          <button
            onClick={() => navigate("/dashboards")}
            className="group inline-flex items-center gap-2.5 text-xs font-semibold text-muted hover:text-heading transition-colors duration-200"
          >
            <div className="p-1.5 rounded-xl bg-card border border-card-border shadow-sm group-hover:border-card-border group-hover:shadow transition-all duration-200 group-hover:-translate-x-0.5">
              <ArrowLeft size={13} className="text-body" />
            </div>
            Back to dashboards
          </button>
        </div>

        {/* Header */}
        <div className="mb-8 backdrop-blur-[2px] py-2">
          <div className="flex items-center gap-2.5 mb-2">
            <h1 className="text-3xl font-extrabold text-heading tracking-tight sm:text-4xl">
              Start a dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 text-indigo-600 rounded-full border border-indigo-500/20 shadow-sm shadow-indigo-500/5">
              <Cpu size={10} className="animate-pulse" /> IDA
            </span>
          </div>
          <p className="text-sm text-muted font-medium max-w-md leading-relaxed">
            Choose how much help you want before your creation workspace setup opens.
          </p>
        </div>

        {/* Interactive Options Grid */}
        <div className="space-y-4">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={option.action}
                className="group relative w-full text-left block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-2xl"
              >
                {/* Dynamic Outer Hover Border Glow */}
                <div className={`absolute -inset-[1px] bg-gradient-to-r ${option.accent} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0`} />

                {/* Main Card Body */}
                <div className="relative bg-card rounded-[15px] border border-card-border p-5 sm:p-6 shadow-sm group-hover:shadow-xl group-hover:shadow-card-border/40 transition-all duration-300 z-10 flex gap-4 sm:gap-5 items-start">
                  
                  {/* Icon Box */}
                  <div className={`relative w-12 h-12 min-w-[48px] rounded-xl bg-gradient-to-br ${option.accent} flex items-center justify-center text-white shadow-md transition-all duration-300 ${option.glow} group-hover:scale-105`}>
                    <Icon size={20} strokeWidth={2.2} />
                    {option.id === "IDA" && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                        <Sparkles size={8} className="text-white fill-white" />
                      </span>
                    )}
                  </div>

                  {/* Text Contents */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-heading group-hover:text-indigo-950 transition-colors">
                        {option.title}
                      </h3>
                      {option.badge && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${option.label} inline-flex items-center gap-1.5`}>
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500" />
                          </span>
                          {option.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-[13px] text-muted leading-relaxed font-medium">
                      {option.description}
                    </p>
                  </div>

                  {/* Interactive Action Indicator */}
                  <div className="self-center ml-auto pl-2">
                    <div className="w-8 h-8 rounded-full border border-card-border bg-surface flex items-center justify-center text-muted group-hover:text-heading group-hover:bg-slate-900 group-hover:border-slate-900 transition-all duration-300 group-hover:translate-x-0.5">
                      <ArrowRight size={14} strokeWidth={2.5} className="group-hover:text-white transition-colors" />
                    </div>
                  </div>

                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info hint */}
        <div className="mt-8 text-center max-w-sm mx-auto">
          <p className="text-[11px] text-muted font-medium leading-relaxed">
            💡 You can always add, remove, or rearrange widgets freely inside the editor after initialization.
          </p>
        </div>
      </div>
    </div>
  );
}