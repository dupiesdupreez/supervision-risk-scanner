import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  BarChart3,
  ShieldAlert,
  Users,
  Mail,
  Lock,
  ServerOff,
  RefreshCw,
  Shield,
  Info,
  AlertTriangle,
  PieChart,
  UserX,
  KeyRound,
  BellRing,
  CheckCircle2,
  Copy,
  BookTemplate,
  ArrowRightLeft,
  Settings,
  ExternalLink,
  ShieldCheck,
  Laptop,
  Key,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AppLayout from "@/components/layouts/AppLayout";
import ScanHistoryTable from "@/components/ScanHistoryTable";
import { Separator } from "@/components/ui/separator";
import { CustomProgress } from "@/components/ui/custom-progress";
import { useScan } from "@/contexts/ScanContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import IssueDetailsModal from "@/components/IssueDetailsModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Dashboard = () => {
  const navigate = useNavigate();
  const { startNewScan, latestScan, isScanning, fixIssue } = useScan();
  const { isAuthenticated } = useAuth();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isFixing, setIsFixing] = useState(null);
  const [showSupervisionInfo, setShowSupervisionInfo] = useState(false);
  const [applicationId, setApplicationId] = useState(
    localStorage.getItem("setupClientId") || ""
  );
  const [showSetup, setShowSetup] = useState(!applicationId);

  // Defensive check - redirect to home if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Save applicationId to localStorage when it changes
  useEffect(() => {
    if (applicationId) {
      localStorage.setItem("setupClientId", applicationId);
    }
  }, [applicationId]);

  const handleStartScan = async () => {
    if (!applicationId) {
      toast.error("Please enter your Application ID to start scanning");
      setShowSetup(true);
      return;
    }

    if (isScanning) {
      toast.info("A scan is already in progress");
      return;
    }

    try {
      const scanId = await startNewScan();
      toast.success("Scan started successfully");
      navigate(`/scan-results/${scanId}`);
    } catch (error) {
      console.error("Failed to start scan:", error);
      toast.error("Failed to start scan. Please try again.");
    }
  };

  const toggleCardExpansion = (cardId: string) => {
    if (expandedCard === cardId) {
      setExpandedCard(null);
    } else {
      setExpandedCard(cardId);
    }
  };

  // Function to open the issue details modal
  const openIssueDetails = (issue) => {
    setSelectedIssue(issue);
    setIsIssueModalOpen(true);
  };

  // Function to handle issue fixing
  const handleFixIssue = async (issueId: string): Promise<void> => {
    if (latestScan) {
      setIsFixing(issueId);
      try {
        await fixIssue(latestScan.id, issueId);
        toast.success("Issue fixed successfully");
      } catch (error) {
        console.error("Failed to fix issue:", error);
        toast.error("Failed to fix issue. Please try again.");
      } finally {
        setIsFixing(null);
      }
    } else {
      toast.error("No active scan found");
    }
  };

  // Save application setup
  const saveApplicationSetup = () => {
    if (!applicationId) {
      toast.error("Please enter your Application ID");
      return;
    }
    
    toast.success("Application setup saved successfully");
    setShowSetup(false);
  };

  // Summary cards data
  const summaryCards = [
    {
      title: "Security Posture",
      score: latestScan?.securityPostureScore || 0,
      issues: latestScan?.securityPostureIssues || 0,
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      description: "Overall security posture including policies and compliance"
    },
    {
      title: "Identity & Access",
      score: latestScan?.identityAccessScore || 0,
      issues: latestScan?.identityAccessIssues || 0,
      icon: <Users className="h-8 w-8 text-primary" />,
      description: "User authentication and role-based access control"
    },
    {
      title: "Device & App Security",
      score: latestScan?.deviceAppScore || 0,
      issues: latestScan?.deviceAppIssues || 0,
      icon: <Laptop className="h-8 w-8 text-primary" />,
      description: "Device management and application security"
    },
    {
      title: "Data Protection",
      score: latestScan?.dataProtectionScore || 0,
      issues: latestScan?.dataProtectionIssues || 0,
      icon: <Shield className="h-8 w-8 text-primary" />,
      description: "Data loss prevention and information protection"
    },
    {
      title: "License Management",
      score: latestScan?.licenseManagementScore || 0,
      issues: latestScan?.licenseManagementIssues || 0,
      icon: <Key className="h-8 w-8 text-primary" />,
      description: "License allocation and compliance"
    }
  ];

  return (
    <AppLayout pageTitle="Security Dashboard">
      <div className="grid grid-cols-1 gap-6">
        {/* Overview Panel with Application Setup */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <div>
              <CardTitle className="text-xl">
                {applicationId ? (
                  <>SuperVision Risk Scanner Dashboard</>
                ) : (
                  <>Welcome to SuperVision Risk Scanner</>
                )}
              </CardTitle>
              <CardDescription>
                {applicationId
                  ? "Identify vulnerabilities and security risks in your Microsoft 365 environment"
                  : "Set up your Application ID to start scanning"}
              </CardDescription>
            </div>
            {applicationId ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSetup(!showSetup)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Setup
                </Button>
                <Button onClick={handleStartScan} disabled={isScanning || !applicationId}>
                  {isScanning ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {latestScan ? "Run New Scan" : "Start First Scan"}
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowSetup(true)}>
                Set Up Scanner
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {showSetup && (
              <div className="bg-slate-50 p-6 rounded-lg mb-4">
                <h3 className="text-lg font-medium mb-4">Scanner Setup</h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="applicationId" className="font-medium">Application (Client) ID</Label>
                    <Input
                      id="applicationId"
                      value={applicationId}
                      onChange={(e) => setApplicationId(e.target.value)}
                      placeholder="Enter the Application ID from Azure portal"
                      className="max-w-md"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      This is the Application (Client) ID from your Azure AD app registration.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100 max-w-3xl">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Azure Portal Setup Instructions</h4>
                    <ol className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start">
                        <span className="font-semibold mr-2">1.</span>
                        <span>Login to <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="underline flex items-center">Azure Portal <ExternalLink className="h-3 w-3 ml-1" /></a></span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2">2.</span>
                        <span>Navigate to "App Registrations" in Azure Active Directory</span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2">3.</span>
                        <span>Create a new Multi-tenant application</span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2">4.</span>
                        <span>Copy the Application (Client) ID into the field above</span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2">5.</span>
                        <span>Go to "Authentication" → "Add a platform" → "Single-page application"</span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-semibold mr-2">6.</span>
                        <span>Add the following redirect URI: <code className="bg-white px-2 py-0.5 rounded text-indigo-700">https://graph-scan.web.app/</code></span>
                      </li>
                    </ol>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={saveApplicationSetup}>
                      Save and Continue
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {latestScan && !showSetup && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Overall Security Score</h3>
                    <span
                      className={`text-sm font-bold ${
                        latestScan.securityScore >= 80
                          ? "text-green-600"
                          : latestScan.securityScore >= 50
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {latestScan.securityScore}%
                    </span>
                  </div>
                  <CustomProgress
                    value={latestScan.securityScore}
                    max={100}
                    className="h-2"
                    indicatorClassName={
                      latestScan.securityScore >= 80
                        ? "bg-green-600"
                        : latestScan.securityScore >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Last scan: {new Date(latestScan.date).toLocaleString()}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-50 p-3 rounded-lg flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 mb-1">
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="text-2xl font-bold">{latestScan.highRiskIssues}</span>
                    <span className="text-xs text-muted-foreground">High Risk Issues</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 mb-1">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="text-2xl font-bold">{latestScan.mediumRiskIssues}</span>
                    <span className="text-xs text-muted-foreground">Medium Risk</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 mb-1">
                      <Info className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-2xl font-bold">{latestScan.lowRiskIssues}</span>
                    <span className="text-xs text-muted-foreground">Low Risk</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 mb-1">
                      <BarChart3 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-2xl font-bold">{latestScan.issuesFixed}</span>
                    <span className="text-xs text-muted-foreground">Issues Fixed</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supervision Information Card */}
        {applicationId && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-100">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <CardTitle className="text-lg flex items-center">
                  <BookTemplate className="h-5 w-5 text-indigo-600 mr-2" />
                  Introducing Supervision: Multi-Tenant Management Solution
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSupervisionInfo(!showSupervisionInfo)}
                  className="text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100"
                >
                  {showSupervisionInfo ? "Show Less" : "Learn More"}
                </Button>
              </div>
              <CardDescription className="text-indigo-800">
                Streamline security management across all your Microsoft 365 environments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showSupervisionInfo ? (
                <div className="space-y-4 text-sm">
                  <p>
                    While the Risk Scanner identifies issues in a single tenant, <strong>Supervision</strong> enables you to 
                    manage and secure multiple Microsoft 365 environments from a single console using our unique <strong>Golden Master</strong> approach.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Card className="bg-white">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-base flex items-center">
                          <BookTemplate className="h-4 w-4 text-indigo-600 mr-2" />
                          Golden Master Templates
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-4 text-sm">
                        Create standardized security blueprints that define your ideal configuration once, 
                        then apply them across all customer environments.
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-white">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-base flex items-center">
                          <ArrowRightLeft className="h-4 w-4 text-amber-600 mr-2" />
                          Divergence Detection
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-4 text-sm">
                        Continuously monitor for security deviations across all tenants and receive alerts 
                        when configurations drift from your standards.
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-white">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-base flex items-center">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                          Automated Remediation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-4 text-sm">
                        Automatically fix security issues across all customer environments 
                        to maintain consistent security standards at scale.
                      </CardContent>
                    </Card>
                  </div>
                  
                  <p className="mt-4">
                    With Supervision, you can turn the issues identified by the Risk Scanner into standardized 
                    security policies that are automatically enforced across your entire customer base.
                  </p>
                  
                  <div className="flex justify-end mt-2">
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      Learn More About Supervision
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <p className="text-sm text-indigo-900">
                    After scanning with the Risk Scanner, use <strong>Supervision</strong> to create automated
                    security policies (Golden Masters) that can fix these same issues across <strong>all your customer tenants</strong> at once.
                  </p>
                </div>
                <a
                  href="https://supervision.nl"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    Explore Supervision
                  </Button>
                </a>
              </div>
              
              )}
            </CardContent>
          </Card>
        )}

        {latestScan && (
          <>
            {/* Critical Issues Panel */}
            <div className="grid grid-cols-1 gap-4">
              <h2 className="text-lg font-semibold flex items-center">
                <BellRing className="mr-2 h-5 w-5 text-red-500" />
                Critical Issues Requiring Attention
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {latestScan.issues && latestScan.issues.length > 0 ? (
                  latestScan.issues
                    .filter(issue => 
                      (issue.severity === "High" || issue.severity === "Medium") && 
                      issue.status !== "Fixed"
                    )
                    .sort((a, b) => {
                      // Sort by severity (High first) and then by type
                      if (a.severity === b.severity) {
                        return a.type.localeCompare(b.type);
                      }
                      return a.severity === "High" ? -1 : 1;
                    })
                    .slice(0, 3) // Show top 3 critical issues
                    .map((issue) => (
                      <Card key={issue.id} className={`border-l-4 ${issue.severity === "High" ? "border-l-red-500" : "border-l-amber-500"}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                              {issue.severity === "High" ? (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                              )}
                              <CardTitle className="text-base ml-2">{issue.type || issue.title}</CardTitle>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            issue.severity === "High"
                              ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </div>
                      <CardDescription className="mt-2">{issue.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-0 pt-0">
                      {/* Supervision solution hint */}
                      <div className="mt-2 p-2 bg-blue-50 rounded-md text-xs text-blue-800 flex items-start">
                        <BookTemplate className="h-3 w-3 text-blue-500 mr-1 mt-0.5 flex-shrink-0" />
                        <span>
                          {(() => {
                            const type = issue.affectedObject?.type;
                            const issueType = issue.type?.toLowerCase() || '';
                            
                            if (type === "User" || issueType.includes("user")) {
                              if (issueType.includes("inactive")) {
                                return "With Supervision's Golden Master, you can create a standardized user account lifecycle policy that automatically identifies and disables inactive accounts across all your tenants.";
                              } else if (issueType.includes("admin")) {
                                return "Supervision's Golden Master enables you to enforce standardized admin role assignments and permissions across all your managed tenants.";
                              } else {
                                return "Supervision's Golden Master helps you maintain consistent user security policies across all your managed tenants.";
                              }
                            }
                            
                            if (type === "Policy" || issueType.includes("policy")) {
                              if (issueType.includes("mfa")) {
                                return "Supervision's Golden Master templates include standardized MFA policies that can be applied across all your managed tenants, ensuring consistent security standards.";
                              } else if (issueType.includes("password")) {
                                return "With Supervision, you can enforce consistent password policies and security standards across all your managed tenants.";
                              } else {
                                return "Supervision's Golden Master templates help you maintain consistent security policies across your entire tenant base.";
                              }
                            }
                            
                            if (type === "Email" || issueType.includes("email") || issueType.includes("mail")) {
                              if (issueType.includes("forward")) {
                                return "Supervision continuously monitors for external mail forwarding rules across all customer tenants and can automatically disable unauthorized configurations.";
                              } else if (issueType.includes("spam") || issueType.includes("phish")) {
                                return "With Supervision, you can enforce consistent email security and anti-phishing policies across all your managed tenants.";
                              } else {
                                return "Supervision's Golden Master templates help you maintain robust email security standards across all your managed tenants.";
                              }
                            }
                            
                            if (type === "Device" || issueType.includes("device")) {
                              return "Supervision's Golden Master templates enable you to enforce consistent device security policies and compliance standards across all your managed tenants.";
                            }
                            
                            if (type === "License" || issueType.includes("license")) {
                              return "With Supervision, you can implement standardized license management policies and optimize license allocation across all your managed tenants.";
                            }
                            
                            if (issueType.includes("compliance")) {
                              return "Supervision's Golden Master templates help you maintain consistent compliance standards and security baselines across all your managed tenants.";
                            }
                            
                            // Default message for other types
                            return "Supervision's Golden Master templates provide standardized security policies that can be automatically enforced across all your managed tenants.";
                          })()}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto"
                        onClick={() => openIssueDetails(issue)}
                      >
                        View details
                      </Button>
                    </CardFooter>
                  </Card>
                    ))
                ) : (
                  <Card className="col-span-3">
                    <CardContent className="pt-6 pb-4 text-center">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <h3 className="text-lg font-medium mb-1">No Critical Issues Found</h3>
                      <p className="text-sm text-muted-foreground">
                        Great job! Your environment is currently free of high and medium severity issues.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Security Areas */}
            <div className="grid grid-cols-1 gap-4">
              <h2 className="text-lg font-semibold flex items-center">
                <PieChart className="mr-2 h-5 w-5 text-blue-500" />
                Security by Category
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((card) => (
                  <Card
                    key={card.title}
                    className={`${
                      expandedCard === card.title ? "row-span-2 md:col-span-2" : ""
                    } cursor-pointer transition-all duration-300`}
                    onClick={() => toggleCardExpansion(card.title)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          {card.icon}
                          <CardTitle className="text-base ml-2">{card.title}</CardTitle>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            card.score >= 80
                              ? "bg-green-100 text-green-800"
                              : card.score >= 50
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {card.score}%
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <CustomProgress
                          value={card.score}
                          max={100}
                          className="h-2"
                          indicatorClassName={
                            card.score >= 80
                              ? "bg-green-600"
                              : card.score >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }
                        />
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{card.description}</span>
                          <span className="font-medium">
                            {card.issues} {card.issues === 1 ? "issue" : "issues"}
                          </span>
                        </div>
                      </div>

                      {expandedCard === card.title && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t"
                        >
                          <h4 className="font-medium mb-2">Top Issues:</h4>
                          <ul className="space-y-2 text-sm">
                            {latestScan && Array.isArray(latestScan.issues) && latestScan.issues
                              .filter(issue => {
                                const category = issue.affectedObject.type;
                                switch (card.title) {
                                  case "Security Posture":
                                    return ["Policy", "SecurityDefaults", "ComplianceScore", "SecureScore", "Organization"].includes(category);
                                  case "Identity & Access":
                                    return ["User", "Role", "Authentication", "MFA", "Guest", "Admin", "Identity"].includes(category);
                                  case "Device & App Security":
                                    return ["Device", "Application", "Intune", "Endpoint"].includes(category);
                                  case "Data Protection":
                                    return ["Mailbox", "SharePoint", "DLP", "Exchange", "Email", "Domain"].includes(category);
                                  case "License Management":
                                    return ["License", "Subscription"].includes(category);
                                  default:
                                    return false;
                                }
                              })
                              .sort((a, b) => {
                                const severityOrder = { High: 0, Medium: 1, Low: 2 };
                                return severityOrder[a.severity] - severityOrder[b.severity];
                              })
                              .slice(0, 3)
                              .map(issue => (
                                <li key={issue.id} className="flex items-start">
                                  <AlertTriangle 
                                    className={`h-4 w-4 mr-2 mt-0.5 flex-shrink-0 ${
                                      issue.severity === "High" 
                                        ? "text-red-500" 
                                        : issue.severity === "Medium" 
                                        ? "text-amber-500" 
                                        : "text-blue-500"
                                    }`} 
                                  />
                                  <span>{issue.description}</span>
                            </li>
                              ))}
                            {(!latestScan || !Array.isArray(latestScan.issues) || latestScan.issues.length === 0) && (
                              <li className="text-muted-foreground">No issues found in this category</li>
                            )}
                          </ul>
                          
                          {/* Supervision Golden Master info */}
                          <div className="mt-4 p-2 bg-indigo-50 rounded-md text-xs">
                            <p className="flex items-start text-indigo-800">
                              <BookTemplate className="h-3 w-3 text-indigo-600 mr-1 mt-0.5 flex-shrink-0" />
                              <span>With Supervision, you can create a Golden Master template that automatically enforces best practices for {card.title.toLowerCase()} across all your customer tenants.</span>
                            </p>
                          </div>
                          
                          <div className="flex space-x-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/scan-results/${latestScan.id}?category=${card.title.toLowerCase()}`);
                              }}
                            >
                              View All Issues
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Scans */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-4">Recent Scans</h2>
              <ScanHistoryTable limit={5} showViewAll={true} />
            </div>
          </>
        )}

        {!latestScan && !isScanning && applicationId && (
          <Card className="bg-slate-50 border-dashed">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="rounded-full bg-white p-3 shadow-sm mb-4">
                <ServerOff className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Scan Data Available</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Start a security scan of your Microsoft 365 environment to identify vulnerabilities,
                misconfigurations, and security risks.
              </p>
              <Button onClick={handleStartScan}>Start First Scan</Button>
            </CardContent>
          </Card>
        )}

        {isScanning && !latestScan && (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="rounded-full bg-blue-50 p-3 mb-4">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
              <h3 className="text-lg font-medium mb-2">Scan in Progress</h3>
              <p className="text-muted-foreground mb-6">
                We're analyzing your Microsoft 365 environment. This may take a few minutes.
              </p>
              <CustomProgress
                value={45}
                max={100}
                className="w-full max-w-md h-2"
                indicatorClassName="bg-blue-500"
              />
            </CardContent>
          </Card>
        )}
        
        {/* Issue Details Modal - reuse the same component from scan results */}
        <IssueDetailsModal
          issue={selectedIssue}
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          onFix={handleFixIssue}
          isFixing={isFixing}
        />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
