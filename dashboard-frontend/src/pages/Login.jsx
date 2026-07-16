import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowRight, LayoutDashboard, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

function Login({ onLoginSuccess }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        setError(error.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      if (data.session && data.user) {
        sessionStorage.setItem("access_token", data.session.access_token);
        sessionStorage.setItem("user", JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || "User",
          role: data.user.user_metadata?.role || "user",
          initials: (data.user.user_metadata?.name || data.user.email?.split('@')[0] || "U").split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        }));

      if (onLoginSuccess) {
          onLoginSuccess(JSON.parse(sessionStorage.getItem("user")));
        }
      }
    } catch {
      setError("Unable to connect to server. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-surface via-surface to-blue-50/50 relative overflow-hidden font-sans antialiased selection:bg-blue-500 selection:text-white">
      
      {/* Decorative Grid Mesh & Ambient Orbs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a05_1px,transparent_1px),linear-gradient(to_bottom,#0f172a05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-[120px] animate-pulse duration-7000"></div>
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-indigo-300/20 to-purple-300/10 rounded-full blur-[120px] animate-pulse duration-10000" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Left side: Premium Branding & Dynamic Product Value Panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between px-24 py-12 relative z-10 border-r border-card-border/50 bg-card/20 backdrop-blur-[2px]">
        
        {/* Top Branding Section */}
        <div className="flex items-center gap-3.5 animate-slideDown">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-600/20 ring-4 ring-blue-50">
            <LayoutDashboard className="w-5.5 h-5.5 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent)]"></div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-heading">IntelliDent</h1>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Practice Intelligence Platform</p>
          </div>
        </div>

        {/* Hero Copy / Core Value Statement */}
        <div className="max-w-lg my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100/60 text-xs font-semibold text-blue-700 mb-6 tracking-wide shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            Now live: Version 3.4 Analytics Suite
          </div>
          <h2 className="text-5xl font-black text-heading leading-[1.15] tracking-tight mb-6">
            The intelligent layer for your modern
            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent filter drop-shadow-sm pb-1">dental enterprise.</span>
          </h2>
          <p className="text-muted/90 text-lg leading-relaxed mb-10 font-medium">
            Streamline operational metrics, track immediate practice diagnostics, and convert unstructured clinical performance data into high-growth decisions.
          </p>

          {/* Elegant Tech Stats Layout */}
          <div className="grid grid-cols-3 gap-5">
            {[
              { value: "12ms", label: "Query Speed", desc: "Realtime syncing" },
              { value: "99.99%", label: "Platform Uptime", desc: "Enterprise SLA" },
              { value: "SOC2", label: "Compliant Security", desc: "End-to-end encryption" },
            ].map((stat, idx) => (
              <div key={idx} className="group relative p-5 bg-card rounded-2xl border border-card-border/60 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-500/30 transition-all duration-300">
                <p className="text-xl font-black text-heading tracking-tight mb-0.5 group-hover:text-blue-600 transition-colors">{stat.value}</p>
                <p className="text-xs text-heading font-bold tracking-wide">{stat.label}</p>
                <p className="text-[10px] text-muted font-medium mt-1">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Platform Trust Badges */}
        <div className="flex items-center gap-6 text-xs text-muted font-medium tracking-wide">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> HIPAA Compliant Architecture
          </div>
          <span>&bull;</span>
          <div>Secure Cloud Syncing</div>
        </div>
      </div>

      {/* Right side: High-Fidelity Form Panel */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 relative z-10">
        
        {/* Subtle Top-Right Quick Link */}
        <div className="hidden lg:flex justify-end text-xs font-semibold text-muted items-center gap-1">
          Need tech assistance? <a href="#" className="text-blue-600 hover:underline font-bold ml-1">Contact Dev Support</a>
        </div>

        <div className="my-auto flex items-center justify-center w-full">
          <div className="w-full max-w-md">
            
            {/* Responsive Mobile Header Branding */}
            <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-heading tracking-tight">IntelliDent</h1>
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Practice Intelligence</p>
              </div>
            </div>

            {/* Main Form Glass Card */}
            <div className="relative bg-card/80 backdrop-blur-xl rounded-[2rem] border border-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.08)] p-8 sm:p-11 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-b from-blue-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
              
              <div className="relative">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-black text-heading tracking-tight">System Login</h2>
                  <p className="text-sm text-muted mt-2 font-medium">Access your global performance space</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100/70 rounded-2xl text-xs text-rose-700 font-semibold flex items-center gap-2.5 animate-fadeIn">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-sm animate-pulse"></span>
                      {error}
                    </div>
                  )}

                  {/* High Fidelity Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-body font-bold tracking-wide">Corporate Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="email"
                        placeholder="name@organization.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-surface/50 border border-card-border rounded-xl text-sm text-heading font-medium placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-card transition-all shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* High Fidelity Password Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-body font-bold tracking-wide">Security Phrase</label>
                      <a href="#" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all">
                        Reset password?
                      </a>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-3.5 bg-surface/50 border border-card-border rounded-xl text-sm text-heading font-medium placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-card transition-all shadow-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-body transition-colors cursor-pointer p-1 rounded"
                      >
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* System Persistence Options */}
                  <div className="flex items-center pt-0.5">
                    <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-card-border text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer accent-blue-600 transition-all shadow-sm" 
                      />
                      <span className="text-xs text-muted font-bold group-hover:text-body transition-colors">Keep my identity active for 30 days</span>
                    </label>
                  </div>

                  {/* Seamless Action Core Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-sm font-extrabold rounded-xl hover:opacity-[0.98] active:scale-[0.99] shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 mt-2"
                  >
                    <span className="relative z-10 tracking-wide font-sans">
                      {loading ? "Authenticating Session..." : "Secure Access Dashboard"}
                    </span>
                    {loading ? (
                      <Loader2 className="w-4 h-4 relative z-10 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </button>
                </form>

                <p className="text-center text-xs text-muted mt-8 font-medium">
                  New operator to IntelliDent?{" "}
                  <a href="#" className="font-extrabold text-blue-600 hover:text-blue-700 transition-colors hover:underline">
                    Initialize Setup Gateway
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cohesive Footer Stamp */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-card-border pt-6 text-[11px] text-muted font-semibold tracking-wide">
          <p>&copy; 2026 IntelliDent Platform, Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-body transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-body transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;