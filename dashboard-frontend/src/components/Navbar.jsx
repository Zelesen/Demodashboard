import { Search, Bell, Building2, ChevronDown, Menu, LogOut, User as UserIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const locations = ["All Locations", "Bright Smiles Clinic", "DentalCare HQ", "SmileStudio"];

function Navbar({ onMenuClick, isMobile, user, onLogout }) {
  const [location, setLocation] = useState("All Locations");
  const [showLocations, setShowLocations] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="h-16 flex items-center justify-between px-6 xl:px-8 sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200/80 shadow-sm"
    >
      <div className="relative">
          <button
            onClick={() => setShowLocations(!showLocations)}
            className="group flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer focus-ring border border-transparent hover:border-blue-200 hover:bg-blue-50/50"
            style={{ color: "var(--c-heading)" }}
          >
            <div className="relative">
              <Building2 className="w-4.5 h-4.5" style={{ color: "var(--c-brand)" }} />
              <div className="absolute inset-0 bg-blue-400/20 rounded-md blur-md -z-10"></div>
            </div>
            <span className="font-semibold">{location}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showLocations ? "rotate-180" : ""}`} style={{ color: "var(--c-muted)" }} />
          </button>
          {showLocations && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowLocations(false)} />
              <div
                className="absolute top-full left-0 mt-2 w-64 rounded-xl shadow-xl border z-20 py-2 animate-slideDown"
                style={{ backgroundColor: "var(--c-card)", borderColor: "var(--c-card-border)" }}
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Location</p>
                </div>
                {locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => { setLocation(loc); setShowLocations(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                      location === loc ? "font-semibold" : ""
                    }`}
                    style={{
                      color: location === loc ? "var(--c-brand)" : "var(--c-body)",
                      backgroundColor: location === loc ? "var(--c-brand-tint)" : "transparent",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {location === loc && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      )}
                      {loc}
                    </span>
                    {location === loc && (
                      <span className="text-xs font-bold text-blue-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer border border-slate-200/80 lg:hidden"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="relative hidden md:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 group-focus-within:text-blue-500" style={{ color: "var(--c-muted)" }} />
          <input
            type="text"
            placeholder="Search..."
            className="w-64 pl-10 pr-4 py-2 rounded-xl text-sm outline-none transition-all duration-200 border border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            style={{
              backgroundColor: "var(--c-inner)",
              color: "var(--c-heading)",
            }}
          />
        </div>

        <button
          className="group relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-rose-50 transition-all duration-200 cursor-pointer focus-ring border border-transparent hover:border-rose-200"
          style={{ color: "var(--c-muted)" }}
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-500/0 to-rose-600/0 opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
          <Bell className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 relative z-10" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center shadow-lg animate-pulse" style={{ backgroundColor: "var(--c-down)" }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </span>
        </button>

        <div className="flex items-center gap-3 pl-3 border-l" style={{ borderColor: "var(--c-card-border)" }}>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold" style={{ color: "var(--c-heading)" }}>{user?.name || "Admin User"}</p>
            <p className="text-[11px] font-medium" style={{ color: "var(--c-muted)" }}>{user?.role || "Admin"}</p>
          </div>
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="relative group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1479c9] to-[#0f5fa0] flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-all duration-200">
                {user?.initials || "AU"}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl border bg-white z-20 py-2 animate-slideDown">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800">{user?.name || "Admin User"}</p>
                  <p className="text-xs text-slate-500">{user?.email || "admin@demo.com"}</p>
                </div>
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3 cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 cursor-pointer border-t border-slate-100"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;