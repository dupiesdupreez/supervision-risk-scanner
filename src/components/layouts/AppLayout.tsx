
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  BarChart2,
  Shield,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import SecureGraphLogo from "@/components/SecureGraphLogo";
import { motion } from "framer-motion";
import { useMobileDetect } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, pageTitle }) => {
  const { logout, tenantId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMobileDetect();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isCurrentRoute = (route: string) => {
    return location.pathname === route;
  };

  const sidebarItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      route: "/dashboard",
    },
    {
      name: "Scan Results",
      icon: <BarChart2 className="w-5 h-5" />,
      route: "/scan-results/latest",
      disabled: true,
    },
    {
      name: "Settings",
      icon: <Settings className="w-5 h-5" />,
      route: "/settings",
    },
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex w-64 flex-col h-screen sticky top-0 bg-sidebar-background border-r border-sidebar-border">
        <div className="px-4 py-6">
          <div className="flex items-center">
            <SecureGraphLogo className="h-8 w-auto" />
            <h1 className="text-lg font-display font-medium ml-2 text-slate-900">Risk Scanner</h1>
          </div>
          
          {tenantId && (
            <div className="mt-4 px-3 py-2 rounded-md bg-slate-100">
              <p className="text-xs text-slate-500">Connected Tenant:</p>
              <p className="text-sm font-medium text-slate-700 truncate">{tenantId}</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 px-4 mt-5 space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.name}
              to={item.disabled ? "#" : item.route}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                isCurrentRoute(item.route)
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary"
              } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={(e) => {
                if (item.disabled) {
                  e.preventDefault();
                }
              }}
            >
              {item.icon}
              <span className="ml-3">{item.name}</span>
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="outline"
            className="w-full justify-start bg-white"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center">
          <SecureGraphLogo className="h-8 w-auto" />
          <h1 className="text-lg font-display font-medium ml-2 text-slate-900">Risk Scanner</h1>
        </div>
        <button
          onClick={toggleMobileMenu}
          className="text-gray-600 focus:outline-none"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden fixed top-12 left-0 right-0 z-10 bg-white border-b border-gray-200 shadow-lg"
        >
          <nav className="px-4 py-2 space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.name}
                to={item.disabled ? "#" : item.route}
                className={`flex items-center px-3 py-3 rounded-md text-sm font-medium ${
                  isCurrentRoute(item.route)
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary"
                } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={(e) => {
                  if (item.disabled) {
                    e.preventDefault();
                  } else {
                    setMobileMenuOpen(false);
                  }
                }}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            ))}
            <Button
              variant="outline"
              className="w-full justify-start mt-2"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </nav>
        </motion.div>
      )}

      {/* Main content */}
      <main className="flex-1 py-6 px-4 sm:px-6 md:px-8 mt-12 md:mt-0">
        <h1 className="text-2xl font-display font-bold mb-6">{pageTitle}</h1>
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
