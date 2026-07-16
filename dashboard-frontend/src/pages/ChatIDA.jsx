import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, Loader2, CornerDownLeft } from "lucide-react";

export default function ChatIDA() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello Aman! Describe what you're tracking or what goals you have in mind, and I will generate a tailored dashboard workspace for you."
    }
  ]);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const suggestions = [
    "Show where revenue is slipping",
    "Track plan performance by clinic",
    "Find gaps in chair utilisation",
    "Compare NHS and private work"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage = prompt.trim();
    setPrompt("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));

    setMessages(prev => [...prev, {
      role: "assistant",
      content: "Perfect. I'm structuralizing your layouts, optimizing specific widget types, and building your data visualization map now."
    }]);
    setIsLoading(false);

    // Navigate to dashboard results after a short delay
    setTimeout(() => {
      navigate("/dashboard-result?source=ida");
    }, 1200);
  };

  const handleSuggestionClick = (suggestion) => {
    setPrompt(suggestion);
    textareaRef.current?.focus();
  };

  return (
    <div className="bg-[#f8fafc] font-sans antialiased min-h-screen relative selection:bg-indigo-100 selection:text-indigo-900">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/20 via-blue-100/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-100/10 via-blue-50/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 relative z-10 flex flex-col min-h-screen">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/start-dashboard")}
            className="group inline-flex items-center gap-2.5 text-xs font-semibold text-muted hover:text-heading transition-colors duration-200"
          >
            <div className="p-1.5 rounded-xl bg-card border border-card-border shadow-sm group-hover:border-card-border group-hover:shadow transition-all duration-200 group-hover:-translate-x-0.5">
              <ArrowLeft size={13} className="text-body" />
            </div>
            Back to dashboard methods
          </button>
        </div>

        {/* Main Chat Interface Window */}
        <div className="bg-card rounded-2xl border border-card-border shadow-sm flex flex-col flex-1 min-h-[500px] overflow-hidden">
          
          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={index}
                  className={`flex gap-3 w-full max-w-2xl ${isUser ? "ml-auto justify-end" : "justify-start"}`}
                >
                  {/* AI Status Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-sm shrink-0 self-start mt-0.5">
                      <Sparkles size={14} className="fill-white/20" />
                    </div>
                  )}

                  <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    {!isUser && index === 0 && (
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1 ml-1">IDA AI Assistant</span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed shadow-sm ${
                        isUser
                          ? "bg-slate-900 text-white rounded-tr-none"
                          : "bg-surface text-heading border border-card-border rounded-tl-none"
                      }`}
                    >
                      <p>{message.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Thinking Loader */}
            {isLoading && (
              <div className="flex gap-3 items-center justify-start max-w-2xl">
                <div className="w-8 h-8 rounded-xl bg-surface-alt flex items-center justify-center text-muted shrink-0">
                  <Loader2 size={14} className="animate-spin text-indigo-600" />
                </div>
                <div className="bg-surface border border-card-border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <span className="text-sm text-muted font-medium tracking-wide">Assembling dashboard modules...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Core Dynamic Content / Suggestions Area */}
          {!isLoading && messages.length === 1 && (
            <div className="px-5 sm:px-8 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-t border-card-border my-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                Suggested Targets for Your Dashboard
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="group flex items-center gap-3 p-3 bg-card hover:bg-surface border border-card-border rounded-xl text-left transition-all duration-200 hover:border-card-border hover:shadow-sm"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100/50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100/70 transition-colors">
                      <Sparkles size={12} className="text-indigo-500" />
                    </div>
                    <span className="text-xs font-semibold text-body group-hover:text-heading transition-colors">
                      {suggestion}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Chat Input Form Container */}
          <div className="p-4 sm:p-6 bg-surface border-t border-card-border">
            <form onSubmit={handleSubmit} className="relative bg-card border border-card-border rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all overflow-hidden">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your analytics goal (e.g., 'Track active growth vs drop-off metrics this month')..."
                rows={2}
                className="w-full resize-none text-sm p-4 pb-12 bg-transparent text-heading placeholder:text-muted focus:outline-none font-medium leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              
              {/* Controls bar inside input block */}
              <div className="absolute bottom-2 left-4 right-2 flex items-center justify-between pointer-events-none">
                <span className="text-[10px] text-muted font-medium hidden sm:inline-flex items-center gap-1">
                  Press <kbd className="px-1 py-0.5 bg-surface-alt border border-card-border rounded text-muted font-sans text-[9px] flex items-center gap-0.5">Enter <CornerDownLeft size={8} /></kbd> to send
                </span>
                
                <button
                  type="submit"
                  disabled={!prompt.trim() || isLoading}
                  className="pointer-events-auto ml-auto w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-surface-alt text-white disabled:text-muted flex items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed shadow-sm"
                >
                  <Send size={13} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}