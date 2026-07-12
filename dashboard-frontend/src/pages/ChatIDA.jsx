import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, Loader2 } from "lucide-react";

export default function ChatIDA() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello, Aman"
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
      content: "I'll create a dashboard based on your request. Let me generate the widgets and layout for you."
    }]);
    setIsLoading(false);

    // Navigate to dashboard results after a short delay
    setTimeout(() => {
      navigate("/dashboard-result");
    }, 1000);
  };

  const handleSuggestionClick = (suggestion) => {
    setPrompt(suggestion);
    textareaRef.current?.focus();
  };

  return (
    <div className="bg-[#f7f9fd] font-sans antialiased min-h-screen">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-50 via-indigo-50/50 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-50/60 via-blue-50/30 to-transparent rounded-full blur-3xl opacity-50" />
      </div>

      <div className="max-w-4xl mx-auto p-6 sm:p-8 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate("/start-dashboard")}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to dashboards
        </button>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-8 sm:p-12">
          {/* Messages */}
          <div className="space-y-6 mb-8">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl p-4 ${
                    message.role === "user"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-900"
                  }`}
                >
                  {message.role === "assistant" && index === 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Sparkles size={12} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-slate-600">IDA</span>
                    </div>
                  )}
                  <p className="text-sm font-medium">{message.content}</p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="text-indigo-600 animate-spin" />
                    <span className="text-sm text-slate-600">IDA is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {!isLoading && messages.length === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-2">What should this dashboard help with?</h2>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <Sparkles size={14} className="text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Help me create a dashboard"
              rows={3}
              className="w-full resize-none text-sm p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white flex items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}