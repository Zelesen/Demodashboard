import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, LayoutTemplate, Plus } from "lucide-react";

export default function StartDashboard() {
  const navigate = useNavigate();

  const options = [
    {
      id: "IDA",
      title: "Chat to IDA",
      badge: "Recommended",
      description: "Describe the outcome you want and IDA will help build the dashboard.",
      icon: Sparkles,
      buttonText: "Start with IDA",
      buttonStyle: "bg-slate-900 hover:bg-slate-800 text-white",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      action: () => navigate("/chat-IDA")
    },
    {
      id: "template",
      title: "Start from template",
      description: "Start with a proven layout and customise it in the editor.",
      icon: LayoutTemplate,
      buttonText: "Browse",
      buttonStyle: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      action: () => navigate("/new-dashboard")
    },
    {
      id: "scratch",
      title: "Create from scratch",
      description: "Start empty and design the layout yourself.",
      icon: Plus,
      buttonText: "Create",
      buttonStyle: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      action: () => navigate("/new-dashboard")
    }
  ];

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased min-h-screen">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-50 via-indigo-50/50 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-50/60 via-blue-50/30 to-transparent rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-3xl mx-auto p-6 sm:p-8 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboards")}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to dashboards
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Start a dashboard</h1>
          <p className="text-sm text-slate-500">Choose how much help you want before the editor opens.</p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <div
                key={option.id}
                className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl ${option.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon size={24} className={option.iconColor} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-900">{option.title}</h3>
                      {option.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mb-4">{option.description}</p>

                    <button
                      onClick={option.action}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] ${option.buttonStyle}`}
                    >
                      {option.buttonText}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}