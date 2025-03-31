
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Lock, Users, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import SecureGraphLogo from "@/components/SecureGraphLogo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Index = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [applicationId, setApplicationId] = useState(
    localStorage.getItem("setupClientId") || ""
  );
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleGetStarted = () => {
    if (!applicationId) {
      toast.error("Please enter your Application ID to continue");
      return;
    }
    
    // Save applicationId to localStorage
    localStorage.setItem("setupClientId", applicationId);
    login();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-sg-blue-50">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center">
          <SecureGraphLogo className="h-10 w-auto" />
          <h1 className="text-2xl font-display font-medium ml-2 text-sg-neutral-900">Risk Scanner</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mt-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col"
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-sg-blue-100 text-sg-blue-700 text-sm font-medium mb-6 self-start">
              <ShieldCheck className="w-4 h-4 mr-1" />
              Microsoft 365 Security Scanner
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight text-sg-neutral-900 mb-6">
              <span className="text-balance">Identify Microsoft 365 security vulnerabilities in minutes</span>
            </h1>
            
            <p className="text-lg text-sg-neutral-700 mb-8 max-w-xl text-balance">
              This free scanner identifies vulnerabilities, misconfigurations, and security risks in your Microsoft 365 environment. Discover gaps that can be addressed with SuperVision's comprehensive management solution.
            </p>
            
            {/* Setup Section */}
            <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-sg-blue-100">
              <h2 className="text-xl font-semibold mb-4 text-sg-neutral-900">Get Started</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="applicationId" className="font-medium">Application (Client) ID</Label>
                  <Input
                    id="applicationId"
                    value={applicationId}
                    onChange={(e) => setApplicationId(e.target.value)}
                    placeholder="Enter the Application ID from Azure portal"
                    className="max-w-md"
                  />
                  <p className="text-sm text-muted-foreground">
                    Required for scanning your Microsoft 365 environment
                  </p>
                </div>
                
                <div className="flex items-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowSetupInstructions(!showSetupInstructions)}
                    className="text-sg-blue-600"
                  >
                    {showSetupInstructions ? "Hide Setup Instructions" : "Show Setup Instructions"}
                  </Button>
                </div>
                
                {showSetupInstructions && (
                  <div className="bg-sg-blue-50 p-4 rounded-md border border-sg-blue-100 mt-2">
                    <h3 className="text-sm font-semibold text-sg-blue-800 mb-2">Azure Portal Setup Instructions</h3>
                    <ol className="space-y-2 text-sm text-sg-blue-800 list-decimal pl-5">
                      <li>Login to <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="underline flex items-center inline-flex">Azure Portal <ExternalLink className="h-3 w-3 ml-1" /></a></li>
                      <li>Go to App Registrations</li>
                      <li>Create a new Multitenant application</li>
                      <li>Copy the Application (Client) ID into the field above</li>
                      <li>Go to "Authentication" → "Add a platform" → "Single-page application"</li>
                      <li>Add the following Redirect URI: <code className="bg-white px-2 py-0.5 rounded text-indigo-700">https://graph-scan.web.app/</code></li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleGetStarted}
                disabled={!applicationId}
                className="bg-sg-blue-600 hover:bg-sg-blue-700 text-white px-8 py-6 rounded-lg text-lg font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center"
              >
                Start Scanning
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-panel rounded-2xl p-8 shadow-glass-lg"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FeatureCard 
                icon={<ShieldCheck className="w-6 h-6 text-sg-blue-600" />}
                title="Comprehensive Scanning"
                description="Scan users, groups, licenses, mail rules, and security settings in one go."
              />
              
              <FeatureCard 
                icon={<Lock className="w-6 h-6 text-sg-blue-600" />}
                title="Security Insights"
                description="Get actionable insights on MFA, inactive accounts, and policy gaps."
              />
              
              <FeatureCard 
                icon={<Users className="w-6 h-6 text-sg-blue-600" />}
                title="User Management"
                description="Identify ghost accounts, excessive privileges, and license waste."
              />
              
              <FeatureCard 
                icon={<Settings className="w-6 h-6 text-sg-blue-600" />}
                title="Remediation Options"
                description="Discover how SuperVision can address each identified security issue."
              />
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="border-t border-sg-neutral-200 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <SecureGraphLogo className="h-8 w-auto" />
              <span className="text-sm text-sg-neutral-600 ml-2">© 2025 SuperVision Risk Scanner. All rights reserved.</span>
            </div>
            
            <div className="flex space-x-6">
            <a
            href="https://supervision.nl/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sg-neutral-600 hover:text-sg-blue-600 transition-colors"
          >
            Supervision
          </a>
          <a
            href="https://supervision.nl/contact/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sg-neutral-600 hover:text-sg-blue-600 transition-colors"
          >
            Contact
          </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="flex flex-col p-4">
    <div className="mb-3">{icon}</div>
    <h3 className="text-lg font-semibold text-sg-neutral-900 mb-2">{title}</h3>
    <p className="text-sm text-sg-neutral-600">{description}</p>
  </div>
);

export default Index;
