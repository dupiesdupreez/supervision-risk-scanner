import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ScanProvider } from "@/contexts/ScanContext";
import App from "@/App";
import Dashboard from "@/pages/Dashboard";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import ScanResults from "@/pages/ScanResults";
import Settings from "@/pages/Settings";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Toaster } from "sonner";

const Root = () => (
  <Router>
    <AuthProvider>
      <ScanProvider>
        <TooltipProvider>
          <Toaster />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scan-results/:scanId" element={<ScanResults />} />
            <Route path="/settings" element={<Settings />} />
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </ScanProvider>
    </AuthProvider>
  </Router>
);

export default Root;
