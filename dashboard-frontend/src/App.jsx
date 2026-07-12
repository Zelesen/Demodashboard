import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Invoices from "./pages/Invoices";
import InvoicesDatedOn from "./pages/InvoicesDatedOn";
import Clinicians from "./pages/Clinicians";
import Finance from "./pages/Finance";
import Sales from "./pages/Sales";
import Contracts from "./pages/Contracts";
import TreatmentPlans from "./pages/TreatmentPlans";
import Payments from "./pages/Payments";
import NewDashboard from "./pages/NewDashboard";
import DashboardsList from "./pages/DashboardsList";
import StartDashboard from "./pages/StartDashboard";
import ChatIDA from "./pages/ChatIDA";
import DashboardResult from "./pages/DashboardResult";
import Login from "./pages/Login";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = sessionStorage.getItem("access_token");
    const storedUser = sessionStorage.getItem("user");
    if (token && storedUser) {
      try {
        JSON.parse(storedUser);
        return true;
      } catch {
        sessionStorage.clear();
        return false;
      }
    }
    return false;
  });
  const [user, setUser] = useState(() => {
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setUser(null);
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen flex" style={{ backgroundColor: "var(--c-page)" }}>
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} isOffcanvas={false} onLogout={handleLogout} />
        </div>

        {/* Mobile offcanvas overlay */}
        {isMobile && (
          <>
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-slate-900/50 z-40 transition-opacity duration-300 ${
                mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-over sidebar */}
            <div
              className={`fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out ${
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <Sidebar
                collapsed={false}
                onToggle={() => setMobileMenuOpen(false)}
                isOffcanvas={true}
                onClose={() => setMobileMenuOpen(false)}
                onLogout={handleLogout}
              />
            </div>
          </>
        )}

        <div className={`flex-1 transition-all duration-300 ease-out ${
          isMobile ? "ml-0" : (sidebarCollapsed ? "ml-20" : "ml-60")
        }`}>
          <Navbar onMenuClick={() => setMobileMenuOpen(true)} isMobile={isMobile} user={user} onLogout={handleLogout} />
          <main className="p-4 sm:p-6 xl:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices-datedon" element={<InvoicesDatedOn />} />
              <Route path="/treatment-plans" element={<TreatmentPlans />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/clinicians" element={<Clinicians />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/new-dashboard" element={<NewDashboard />} />
              <Route path="/dashboards" element={<DashboardsList />} />
              <Route path="/start-dashboard" element={<StartDashboard />} />
              <Route path="/chat-IDA" element={<ChatIDA />} />
              <Route path="/dashboard-result" element={<DashboardResult />} />
              <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;