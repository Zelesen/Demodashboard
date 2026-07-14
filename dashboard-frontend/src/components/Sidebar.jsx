import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  Home,
  MessageSquare,
  Settings,
  ChevronRight,
  Sparkles,
  Command,
  ChevronsUpDown,
  Building,
  Bell,
  ChevronLeft,
  Layers,
  ArrowUpRight,
  Plus,
  Layout
} from "lucide-react";

const menuItems = [
  { icon: Home, label: "Home", href: "/" },
  { 
    icon: MessageSquare, 
    label: "Ask Ida", 
    href: "/ask-ida",
    isAi: true,
    badge: "AI"
  },
  { 
    icon: LayoutDashboard, 
    label: "Dashboards", 
    children: [
      { label: "Custom Dashboard", href: "/dashboards", icon: Plus, badge: "AI" },
      { label: "Appointments", href: "/appointments" },
        { label: "Treatment Plans", href: "/treatment-plans" },
        { label: "Invoices", href: "/invoices" },
        { label: "Invoices (Dated On)", href: "/invoices-datedon" },
        { label: "Payments", href: "/payments" },
        { label: "Contracts", href: "/contracts" },
        {/*{ label: "Clinicians", href: "/clinicians" },
        { label: "Finance", href: "/finance" },
        { label: "Sales & Marketing", href: "/sales" },*/}
        
      ],
  },
  {
    icon: Settings,
    label: "Settings",
    children: [
      { label: "Dashboard Creator", href: "/dashboard-creator" },
      { label: "Widgets Catalog", href: "/widgets" },
      { label: "Integrations", href: "/integrations" },
      { label: "App settings", href: "/app-settings" },
    ],
  },
];

function NavItem({
  icon: Icon,
  label,
  href,
  badge,
  isAi,
  collapsed,
  children,
  isExpanded,
  onToggle,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  const visibleChildren = children?.filter(c => !c.separator) || [];
  const hasChildren = visibleChildren.length > 0;
  const isCurrentActive = location.pathname === href;
  const isChildActive = hasChildren && children.some(child => location.pathname === child.href);
  const active = isCurrentActive || isChildActive;

  useEffect(() => {
    if (isChildActive && !isExpanded && !collapsed) {
      onToggle();
    }
  }, [location.pathname]);

  const handleClick = () => {
    if (hasChildren) {
      if (!collapsed) onToggle();
    } else if (href) {
      navigate(href);
    }
  };

  let btnStyles = "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900";
  if (active) {
    btnStyles = "bg-white text-blue-600 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_20px_-5px_rgba(0,0,0,0.04)] border-slate-200/60 font-semibold";
  } else if (isAi) {
    btnStyles = "text-indigo-600 hover:bg-indigo-50/60 bg-gradient-to-r from-indigo-50/30 to-transparent";
  }

  return (
    <div 
      className="relative px-2.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center gap-2.5 px-3 py-2 rounded-xl 
          text-[13px] font-medium transition-all duration-200 relative group/btn border border-transparent
          ${btnStyles}
          ${collapsed ? "justify-center px-0 h-10" : "h-[38px]"}
        `}
      >
        <div className={`flex items-center justify-center transition-all duration-200 ${isHovered && !active ? "scale-105" : ""}`}>
          {isAi ? (
            <div className="relative">
              <Sparkles size={16} className={`transition-colors ${active ? "text-indigo-600" : "text-indigo-500 fill-indigo-100"}`} />
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
            </div>
          ) : (
            <Icon size={16} className={`transition-colors duration-200 ${active ? "text-blue-600" : "text-slate-400 group-hover/btn:text-slate-700"}`} />
          )}
        </div>

        <div className={`flex items-center justify-between flex-1 transition-all duration-300 ${
          collapsed ? "opacity-0 w-0 overflow-hidden invisible" : "opacity-100 w-auto visible"
        }`}>
          <span className="truncate tracking-tight">{label}</span>
          {hasChildren ? (
            <ChevronRight
              size={12}
              className={`text-slate-400 transition-transform duration-200 raw-icon ${
                isExpanded ? "rotate-90 text-slate-800" : ""
              }`}
            />
          ) : (
            badge && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wider uppercase ${
                isAi ? "bg-indigo-100 text-indigo-700 animate-pulse" : "bg-blue-50 text-blue-600"
              }`}>
                {badge}
              </span>
            )
          )}
        </div>
      </button>

      {/* Accordion Children */}
      {!collapsed && hasChildren && (
        <div className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr] opacity-100 mt-0.5" : "grid-rows-[0fr] opacity-0 overflow-hidden"
        }`}>
          <div className="overflow-hidden ml-[21px] pl-3 border-l border-slate-200/80 space-y-0.5 py-0.5">
            {children.map((child, idx) => {
              if (child.separator) {
                return <div key={`sep-${idx}`} className="h-px bg-slate-200/80 my-1.5" />;
              }
              const isSubActive = location.pathname === child.href;
              const ChildIcon = child.icon;
              return (
                <button
                  key={child.label}
                  onClick={() => navigate(child.href)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-1.5 rounded-lg 
                    text-[13px] font-medium transition-all duration-150 text-left relative
                    ${
                      isSubActive
                        ? "text-blue-600 font-semibold"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/40"
                    }
                  `}
                >
                  {ChildIcon && <ChildIcon size={13} className="shrink-0" />}
                  <span className="truncate flex-1">{child.label}</span>
                  {child.badge && (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-indigo-100 text-indigo-700">{child.badge}</span>
                  )}
                  {isSubActive && (
                    <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsed Hover Flyout */}
      {collapsed && hasChildren && isHovered && (
        <div className="absolute left-[calc(100%-4px)] top-0 w-52 bg-white/95 border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)] rounded-2xl py-2 z-[60] animate-in fade-in slide-in-from-left-3 duration-200 backdrop-blur-md">
          <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            {label}
          </div>
          <div className="space-y-0.5 px-2">
            {children.map((child, idx) => {
              if (child.separator) {
                return <div key={`sep-${idx}`} className="h-px bg-slate-200/80 my-1.5 mx-1" />;
              }
              const isSubActive = location.pathname === child.href;
              const ChildIcon = child.icon;
              return (
                <button
                  key={child.label}
                  onClick={() => navigate(child.href)}
                  className={`
                    w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl 
                    text-[13px] font-medium transition-all text-left
                    ${
                      isSubActive
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  {ChildIcon && <ChildIcon size={13} className="shrink-0" />}
                  <span className="truncate flex-1">{child.label}</span>
                  {child.badge && (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-indigo-100 text-indigo-700">{child.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Plain Tooltip */}
      {collapsed && !hasChildren && isHovered && (
        <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-xl pointer-events-none z-[60] whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
          {label}
        </div>
      )}
    </div>
  );
}

function Sidebar({ collapsed, onToggle, isOffcanvas, onClose, onLogout }) {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [userData, setUserData] = useState(null);
  const [userDashboards, setUserDashboards] = useState([]);

  const currentUser = (() => {
    try { return JSON.parse(sessionStorage.getItem("user") || "{}"); }
    catch { return {}; }
  })();
  const userId = currentUser?.id || null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, dashRes] = await Promise.all([
          fetch('http://localhost:8000/api/auth/user'),
          userId ? fetch(`http://localhost:8000/api/dashboards?user_id=${userId}`) : Promise.resolve(null),
        ]);
        const userData = await userRes.json();
        setUserData(userData);
        if (dashRes) {
          const dashData = await dashRes.json();
          setUserDashboards((dashData.dashboards || []).filter(d => d.user_id !== null));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, [userId, location.pathname]);

  const dynamicMenuItems = menuItems.map(item => {
    if (item.label === "Dashboards" && userDashboards.length > 0) {
      return {
        ...item,
        children: [
          ...item.children,
          { separator: true },
          ...userDashboards.map(d => ({
            label: d.name,
            href: `/dashboard-view/${d.id}`,
            icon: Layout,
          })),
        ],
      };
    }
    return item;
  });

  const toggleMenu = (label) => {
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  return (
    <aside
      className={`
        ${isOffcanvas ? "" : "fixed"} top-0 left-0 h-screen
        bg-slate-100/80 border-r border-slate-200/60
        flex flex-col justify-between select-none group/sidebar
        transition-all duration-300 ease-in-out z-50 backdrop-blur-xl
        ${collapsed ? "w-[76px]" : "w-[250px]"}
      `}
    >
      {/* Structural Top Segment */}
      <div>
        {/* Header / Brand with Micro Toggle */}
        <div className="h-14 flex items-center justify-between px-4 mt-2 relative">
          {isOffcanvas && (
            <button
              onClick={onClose}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm z-50 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          )}
          <div className={`flex items-center gap-2.5 p-1 rounded-xl w-full ${isOffcanvas ? "pr-8" : ""}`}>
            <div className="w-8 h-8 min-w-[32px] rounded-xl bg-slate-900 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-slate-900/20 relative overflow-hidden group-hover/sidebar:bg-blue-600 transition-colors duration-300">
              <Layers size={15} className="text-white" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
            </div>
            <div className={`flex flex-col min-w-0 transition-all duration-200 ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"}`}>
              <span className="text-[13px] font-bold text-slate-800 tracking-tight leading-none mb-0.5">IntelliDent</span>
              <span className="text-[10px] text-slate-400 font-medium truncate">v2.4.1</span>
            </div>
          </div>

          {/* Persistent Floating Collapse Button (desktop only) */}
          {!isOffcanvas && (
            <button 
              onClick={onToggle}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 shadow-sm hover:scale-105 opacity-0 group-hover/sidebar:opacity-100 transition-all duration-200 z-50"
            >
              <ChevronLeft size={12} className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>

        {/* Dynamic Workspace Switcher Module */}
        <div className="px-2.5 mt-2">
          <div className={`flex items-center gap-2.5 p-2 rounded-xl bg-white/60 border border-slate-200/40 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all ${collapsed ? "justify-center cursor-pointer hover:bg-white" : "hover:border-slate-200 cursor-pointer"}`}>
            <div className="w-6 h-6 min-w-[24px] rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-[11px]">
              <Building size={12} />
            </div>
            <div className={`flex items-center justify-between flex-1 min-w-0 transition-all duration-200 ${collapsed ? "opacity-0 w-0 overflow-hidden invisible" : "opacity-100 w-auto visible"}`}>
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-semibold text-slate-700 truncate leading-tight">Acme Dental Group</span>
                <span className="text-[10px] text-slate-400 truncate font-medium">Enterprise Workspace</span>
              </div>
              <ChevronsUpDown size={12} className="text-slate-400 shrink-0 ml-2" />
            </div>
          </div>
        </div>

        {/* Global Navigation Hub */}
        <nav className="mt-5 space-y-0.5 overflow-y-auto max-h-[calc(100vh-21rem)] scrollbar-none">
          {dynamicMenuItems.map((item) => (
            <NavItem
              key={item.label}
              {...item}
              collapsed={collapsed}
              isExpanded={expandedMenus[item.label]}
              onToggle={() => toggleMenu(item.label)}
            />
          ))}
        </nav>
      </div>

      {/* Structural Bottom Segment */}
      <div className="p-2.5 space-y-2">
        {/* Dynamic Inline Upsell Card Component */}
        {!collapsed && (
          <div className="mx-0.5 p-3 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-white relative overflow-hidden shadow-xl border border-slate-800 animate-in fade-in zoom-in-95 duration-300 group/card">
            <div className="absolute -right-6 -top-6 w-20 h-20 bg-blue-500/20 rounded-full blur-xl group-hover/card:bg-blue-500/30 transition-all" />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 border border-blue-400/20 px-1.5 py-0.5 rounded-md text-blue-300">
                  New Feature
                </span>
              </div>
              <p className="text-[12px] font-semibold text-slate-100 mb-2 leading-snug">Automate with AI Claims</p>
              <button className="w-full py-1.5 px-2.5 bg-white text-slate-900 hover:bg-slate-50 active:scale-[0.98] transition-all rounded-xl text-[11px] font-bold flex items-center justify-center gap-1">
                Explore Analytics <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Minimal Search Trigger Bar */}
        {!collapsed && (
          <div className="mx-0.5 px-3 h-8 rounded-xl bg-slate-200/40 border border-slate-200/20 flex items-center justify-between text-slate-400 hover:bg-slate-200/70 transition-all cursor-pointer">
            <span className="text-[11px] font-medium flex items-center gap-1.5 text-slate-500">
              <Command size={12} /> Search operations...
            </span>
            <kbd className="text-[9px] font-mono bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded-md shadow-sm">
              ⌘K
            </kbd>
          </div>
        )}

        {/* Clean Line Break Divider */}
        <div className="h-[1px] bg-slate-200/60 mx-1" />

        {/* Interactive User Info Cluster */}
        <div className={`flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-200/50 transition-all cursor-pointer group/user ${collapsed ? "justify-center" : ""}`}>
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold border border-slate-200">
              {userData?.user?.initials || "AU"}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-100 rounded-full" />
          </div>
          
          <div className={`flex items-center justify-between flex-1 min-w-0 transition-all duration-200 ${collapsed ? "opacity-0 w-0 overflow-hidden invisible" : "opacity-100 w-auto visible"}`}>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold text-slate-800 truncate leading-none mb-0.5 group-hover/user:text-blue-600 transition-colors">{userData?.user?.name || "Admin User"}</span>
              <span className="text-[10px] text-slate-400 truncate font-medium">{userData?.user?.email || "admin@demo.com"}</span>
            </div>
            <button className="p-1 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600 transition-all">
              <Bell size={13} />
            </button>
          </div>
        </div>

        {/* Signout Anchor Row */}
        <button
          onClick={onLogout}
          className={`
            w-full flex items-center gap-2.5 px-3 rounded-xl
            text-[12px] font-medium text-slate-400 hover:bg-rose-50/80 hover:text-rose-600 
            transition-all duration-150 border border-transparent
            ${collapsed ? "justify-center h-10" : "h-9"}
          `}
        >
          <LogOut size={15} />
          <span className={`transition-all duration-200 overflow-hidden whitespace-nowrap ${
            collapsed ? "w-0 opacity-0 invisible" : "w-auto opacity-100 visible"
          }`}>
            Sign out
          </span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;