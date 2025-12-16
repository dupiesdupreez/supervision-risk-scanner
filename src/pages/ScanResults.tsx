  import React, { useState, useEffect } from "react";
  import { useParams, useNavigate, useSearchParams } from "react-router-dom";
  import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Download,
    ExternalLink,
    FileText,
    RefreshCw,
    Search,
    Shield,
    X,
    Mail,
    AlertTriangle
  } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { motion, AnimatePresence } from "framer-motion";
  import { CustomProgress } from "@/components/ui/custom-progress";
  import { Separator } from "@/components/ui/separator";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { toast } from "sonner";
  import { useScan } from "@/contexts/ScanContext";
  import { useAuth } from "@/contexts/AuthContext";
  import AppLayout from "@/components/layouts/AppLayout";
  import IssueDetailsModal from "@/components/IssueDetailsModal";
  import EmailResultsModal from "@/components/EmailResultsModal";
  import ScanHistoryTable from "@/components/ScanHistoryTable";

  interface Issue {
    id: string;
    title: string;
    description: string;
    severity: 'High' | 'Medium' | 'Low';
    status?: 'Fixed';
    type: string;
    impact?: string;
    recommendation?: string;
    details?: string;
    affectedItems?: string[];
    category?: string;
  }

  interface ScanData {
    id: string;
    date: string;
    issues: Issue[];
    apiErrors?: string[];
    highRiskIssues: number;
    mediumRiskIssues: number;
    lowRiskIssues: number;
    issuesFixed: number;
  }

  const ScanResults = () => {
    const { scanId } = useParams();
    const [searchParams] = useSearchParams();
    const categoryFilter = searchParams.get("category");
    const navigate = useNavigate();
    const { getScanById, exportScanResults, fixIssue, isFixing, emailScanResults } = useScan();
    const { isAuthenticated } = useAuth();
    const [scan, setScan] = useState<ScanData | null>(null);
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedIssues, setExpandedIssues] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    useEffect(() => {
      // Scroll to top when component mounts
      window.scrollTo(0, 0);
    }, []); // Empty dependency array means this runs once on mount

    useEffect(() => {
      if (!isAuthenticated) {
        navigate("/");
      }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
      const loadScan = async () => {
        setLoading(true);
        try {
          const targetScanId = scanId === "latest" ? "latest" : scanId;
          console.log("[ScanResults] Loading scan data for ID:", targetScanId);
          const scanData = await getScanById(targetScanId);
          
          if (!scanData) {
            console.error("[ScanResults] Scan data not found");
            toast.error("Scan not found");
            navigate("/dashboard");
            return;
          }
          
          console.log("[ScanResults] Loaded scan data:", {
            id: scanData.id,
            date: scanData.date,
            issueCount: scanData.issues?.length || 0,
            apiErrors: scanData.apiErrors || [],
          });

          if (scanData.apiErrors?.length > 0) {
            console.warn("[ScanResults] API Errors detected:", scanData.apiErrors);
          }
          
          setScan({
            ...scanData,
            issues: Array.isArray(scanData.issues) ? scanData.issues : []
          });
          
          if (categoryFilter) {
            setActiveTab(categoryFilter);
          }
        } catch (error) {
          console.error("[ScanResults] Error loading scan:", error);
          toast.error("Failed to load scan results");
        } finally {
          setLoading(false);
        }
      };
      
      loadScan();
    }, [scanId, getScanById, navigate, categoryFilter]);

    const handleExport = async (format) => {
      try {
        await exportScanResults(scan.id, format);
      } catch (error) {
        console.error("Export error:", error);
        toast.error("Failed to export scan results");
      }
    };

    const handleEmailResults = async (email) => {
      try {
        await emailScanResults(scan.id, email);
        setIsEmailModalOpen(false);
      } catch (error) {
        console.error("Email error:", error);
        toast.error("Failed to email scan results");
      }
    };

    const toggleIssueExpansion = (issueId) => {
      setExpandedIssues((prev) => ({
        ...prev,
        [issueId]: !prev[issueId],
      }));
    };

    const openIssueDetails = (issue) => {
      setSelectedIssue(issue);
      setIsIssueModalOpen(true);
    };

    const handleFixIssue = async (issueId: string): Promise<void> => {
      if (!scan) return;
      
      try {
        await fixIssue(scan.id, issueId);
        
        const updatedScan = await getScanById(scan.id);
        setScan(updatedScan);
      } catch (error) {
        console.error("Error fixing issue:", error);
        toast.error("Failed to fix issue");
      }
    };

    const getFilteredIssues = () => {
      if (!scan || !scan.issues) return [];
      
      const filtered = scan.issues.filter((issue) => {
        const matchesSearch = searchQuery === "" || 
          issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          issue.description.toLowerCase().includes(searchQuery.toLowerCase());
          
        const matchesTab = activeTab === "all" || 
          issue.category === activeTab ||
          (activeTab === "high" && issue.severity === "High") ||
          (activeTab === "medium" && issue.severity === "Medium") ||
          (activeTab === "low" && issue.severity === "Low") ||
          (activeTab === "fixed" && issue.status === "Fixed");
          
        return matchesSearch && matchesTab;
      });
      
      const sortedIssues = [...filtered].sort((a, b) => {
        const severityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
      
      return sortedIssues;
    };

    const calculateSecurityScore = () => {
      if (!scan?.issues) return 100;

      // Count issues by severity (excluding fixed issues)
      const highIssueCount = scan.issues.filter(i => i.severity === "High" && i.status !== "Fixed").length;
      const mediumIssueCount = scan.issues.filter(i => i.severity === "Medium" && i.status !== "Fixed").length;
      const lowIssueCount = scan.issues.filter(i => i.severity === "Low" && i.status !== "Fixed").length;
      
      // Calculate impact (High: -15, Medium: -7, Low: -3)
      const highImpact = -15 * highIssueCount;
      const mediumImpact = -7 * mediumIssueCount;
      const lowImpact = -3 * lowIssueCount;
      
      // Calculate final score
      if (highIssueCount > 0 || mediumIssueCount > 0 || lowIssueCount > 0) {
        return Math.max(Math.min(100 + highImpact + mediumImpact + lowImpact, 100), 0);
      }
      
      return 100;
    };

    const hasApiError = (errorKeys: string[]) => {
      if (!scan?.apiErrors) {
        console.debug("[hasApiError] No API errors in scan data");
        return false;
      }

      const hasError = errorKeys.some(key => 
        scan.apiErrors.some(error => {
          const matches = 
            error.toLowerCase().includes(key.toLowerCase()) ||
            error.toLowerCase().includes(`graph.microsoft.com/beta/${key.toLowerCase()}`) ||
            error.toLowerCase().includes(`graph.microsoft.com/v1.0/${key.toLowerCase()}`);
          
          if (matches) {
            console.warn(`[hasApiError] Found API error match for key "${key}":`, error);
          }
          
          return matches;
        })
      );

      console.debug("[hasApiError] Checking keys:", errorKeys, "Result:", hasError);
      return hasError;
    };

    if (loading) {
      return (
        <AppLayout pageTitle="Loading Scan Results">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Loading scan results...</p>
            </div>
          </div>
        </AppLayout>
      );
    }

    if (!scan) {
      return (
        <AppLayout pageTitle="Scan Results">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Scan Not Found</h3>
              <p className="text-muted-foreground mb-6">
                The requested scan could not be found. It may have been deleted or may not exist.
              </p>
              <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
            </CardContent>
          </Card>
        </AppLayout>
      );
    }

    const filteredIssues = getFilteredIssues();
    const highRiskCount = scan.highRiskIssues || 0;
    const mediumRiskCount = scan.mediumRiskIssues || 0;
    const lowRiskCount = scan.lowRiskIssues || 0;
    const fixedCount = scan.issuesFixed || 0;

    return (
      <AppLayout pageTitle="Security Scan Results">
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-xl mb-1">SuperVision Risk Scanner Results</CardTitle>
                <CardDescription>
                  Scan performed on {new Date(scan.date).toLocaleString()}
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEmailModalOpen(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Results
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport("pdf")}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("csv")}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" onClick={() => navigate("/dashboard")}>
                  Return to Dashboard
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1">
                  <h3 className="text-sm font-medium mb-2">Overall Security Score</h3>
                  <div className="flex items-center mb-1">
                    <span className="text-3xl font-bold mr-2">{calculateSecurityScore()}%</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      calculateSecurityScore() >= 80
                        ? "bg-green-100 text-green-800"
                        : calculateSecurityScore() >= 50
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {calculateSecurityScore() >= 80
                        ? "Good"
                        : calculateSecurityScore() >= 50
                        ? "Needs Improvement"
                        : "Critical"}
                    </span>
                  </div>
                  <CustomProgress
                    value={calculateSecurityScore()}
                    max={100}
                    className="h-2 mb-2"
                    indicatorClassName={
                      calculateSecurityScore() >= 80
                        ? "bg-green-600"
                        : calculateSecurityScore() >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }
                  />
                </div>
                
                <div className="col-span-2 grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg text-center">
                    <span className="text-sm text-muted-foreground">High Risk</span>
                    <p className="text-2xl font-bold text-red-600">{highRiskCount}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-center">
                    <span className="text-sm text-muted-foreground">Medium Risk</span>
                    <p className="text-2xl font-bold text-amber-600">{mediumRiskCount}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-center">
                    <span className="text-sm text-muted-foreground">Low Risk</span>
                    <p className="text-2xl font-bold text-blue-600">{lowRiskCount}</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />
              
              <div>
                <h3 className="text-sm font-medium mb-4">Security Checks Performed</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Security Posture Assessments */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Security Posture</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">Microsoft Secure Score</span>
                        {hasApiError(['security/secureScores', 'security/secureScoreControlProfiles']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to fetch Secure Score. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "LowSecureScore") ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">Compliance Score</span>
                        {hasApiError(['security/complianceScores', 'security/complianceProfiles']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to fetch Compliance Score. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "LowComplianceScore") ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">Defender Exposure Score</span>
                        {hasApiError(['security/secureScores/defender', 'security/alerts']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to fetch Defender Score. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "HighExposureScore") ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Identity & Access Management */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Identity & Access</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">Entra ID Configuration</span>
                        {hasApiError(['policies/authenticationMethodsPolicy', 'policies/authenticationStrengthPolicies']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check Entra ID configuration. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "EntraIDMisconfiguration") ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">Risky Users</span>
                        {hasApiError(['identityProtection/riskyUsers', 'users']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check for risky users. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "RiskyUserDetected") ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">MFA Configuration</span>
                        {hasApiError(['policies/authenticationMethodsPolicy', 'policies/conditionalAccessPolicies']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check MFA configuration. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "MFADisabled" || i?.type === "MFAExclusions") ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">Inactive Users</span>
                        {hasApiError(['inactiveUsers', 'reports/credentialUserRegistrationDetails']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check for inactive users. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "InactiveUsers") ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">Admin Role Assignment</span>
                        {hasApiError(['directoryRoles', 'roleManagement/directory/roleAssignments']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check admin role assignments. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "ExcessiveAdminRoles") ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Device & Application Security */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Device & App Security</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">Device Vulnerabilities</span>
                        {hasApiError(['deviceManagement/mobileThreatDefenseConnectors', 'deviceManagement/deviceCompliancePolicies', 'deviceManagement/deviceConfigurations']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check device vulnerabilities. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "DeviceVulnerability") ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">Critical CVEs</span>
                        {hasApiError(['security/vulnerabilities', 'security/secureScores']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check for critical CVEs. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type?.includes("CVE")) ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">App Registrations</span>
                        {hasApiError(['applications', 'servicePrincipals']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check app registrations. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "RiskyAppRegistrations") ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">Enterprise Applications</span>
                        {hasApiError(['applications/enterprise', 'servicePrincipals']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check enterprise applications. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "RiskyEnterpriseApps") ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Data Protection */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Data Protection</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">Email Forwarding Rules</span>
                        {hasApiError(['users/mailFolders/messageRules', 'users/mailboxSettings']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check email forwarding rules. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "RiskyEmailForwarding") ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">M365 Backups</span>
                        {hasApiError(['admin/serviceAnnouncement/issues', 'informationProtection/dataLossPreventionPolicies']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check M365 backup status. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "NoBackupSolution") ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* License Management */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">License Management</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">License Allocation</span>
                        {hasApiError(['subscribedSkus', 'users/licenseDetails']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check license allocation. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "LicenseAllocationIssues") ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between group relative">
                        <span className="text-sm">License Usage</span>
                        {hasApiError(['reports/getOffice365ActivationsUserDetail', 'subscribedSkus']) ? (
                          <div className="relative">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <div className="hidden group-hover:block absolute z-10 -top-2 right-6 w-48 p-2 bg-amber-50 text-xs text-amber-900 rounded shadow-lg border border-amber-200">
                              Unable to check license usage. This may require additional permissions.
                            </div>
                          </div>
                        ) : scan?.issues?.some(i => i?.type === "UnusedLicenses") ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Show warning counts */}
                <div className="mt-4 text-sm text-muted-foreground">
                  {scan?.issues?.length > 0 ? (
                    <p>
                      Found {scan.issues.length} potential security {scan.issues.length === 1 ? 'issue' : 'issues'} across these checks.
                      See details in the Security Issues section below.
                    </p>
                  ) : (
                    <p>All security checks completed successfully with no issues found.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                <CardTitle>Security Issues</CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search issues..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs 
                defaultValue={activeTab} 
                onValueChange={(value) => {
                  // Prevent default scroll behavior
                  const tabsContent = document.querySelector('[role="tabpanel"]');
                  if (tabsContent) {
                    tabsContent.scrollIntoView = () => {};
                  }
                  setActiveTab(value);
                }}
              >
                <div className="px-6 sticky top-0 bg-white z-10 border-b">
                  <TabsList className="w-full md:w-auto">
                    <TabsTrigger value="all" onClick={(e) => e.preventDefault()}>All Issues ({scan.issues ? scan.issues.length : 0})</TabsTrigger>
                    <TabsTrigger value="high" onClick={(e) => e.preventDefault()}>High Risk ({highRiskCount})</TabsTrigger>
                    <TabsTrigger value="medium" onClick={(e) => e.preventDefault()}>Medium Risk ({mediumRiskCount})</TabsTrigger>
                    <TabsTrigger value="low" onClick={(e) => e.preventDefault()}>Low Risk ({lowRiskCount})</TabsTrigger>
                    <TabsTrigger value="fixed" onClick={(e) => e.preventDefault()}>Fixed ({fixedCount})</TabsTrigger>
                  </TabsList>
                </div>
                <div className="overflow-auto">
                  <TabsContent value={activeTab} className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <div className="divide-y">
                      {filteredIssues.length === 0 ? (
                        <div className="py-12 text-center">
                          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No issues found</h3>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            {searchQuery
                              ? "No issues match your search criteria. Try a different search term."
                              : activeTab === "fixed"
                              ? "No fixed issues yet. Fix security issues to see them here."
                              : "No security issues found in this category."}
                          </p>
                        </div>
                      ) : (
                        filteredIssues.map((issue) => (
                          <div key={issue.id} className="px-6 py-4">
                            <div
                              className="flex items-start justify-between cursor-pointer"
                              onClick={() => toggleIssueExpansion(issue.id)}
                            >
                              <div className="flex items-start">
                                <div className="mr-3">
                                  {issue.status === "Fixed" ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  ) : issue.severity === "High" ? (
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                  ) : issue.severity === "Medium" ? (
                                    <AlertCircle className="h-5 w-5 text-amber-500" />
                                  ) : (
                                    <AlertCircle className="h-5 w-5 text-blue-500" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-sm font-medium flex items-center">
                                    {issue.title}
                                    {issue.status === "Fixed" && (
                                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                                        Fixed
                                      </span>
                                    )}
                                  </h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {issue.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center ml-4">
                                <span
                                  className={`text-xs font-medium mr-2 px-2 py-1 rounded-full ${
                                    issue.severity === "High"
                                      ? "bg-red-100 text-red-800"
                                      : issue.severity === "Medium"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {issue.severity}
                                </span>
                                {expandedIssues[issue.id] ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {expandedIssues[issue.id] && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="mt-3 pt-3 border-t border-border"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="col-span-3 space-y-3">
                                      <div>
                                        <h4 className="text-sm font-medium mb-1">Impact</h4>
                                        <p className="text-sm text-muted-foreground">
                                          {issue.impact}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium mb-1">Recommendation</h4>
                                        <p className="text-sm text-muted-foreground">
                                          {issue.recommendation}
                                        </p>
                                      </div>
                                      {issue.details && (
                                        <div>
                                          <h4 className="text-sm font-medium mb-1">Additional Details</h4>
                                          <p className="text-sm text-muted-foreground">
                                            {issue.details}
                                          </p>
                                        </div>
                                      )}
                                      
                                      {issue.affectedItems && issue.affectedItems.length > 0 && (
                                        <div className="mt-2">
                                          <h4 className="text-sm font-medium mb-1">
                                            Affected Items ({issue.affectedItems.length})
                                          </h4>
                                          <ul className="text-sm space-y-1 pl-5 list-disc text-muted-foreground">
                                            {issue.affectedItems.slice(0, 5).map((item, idx) => (
                                              <li key={idx}>{item}</li>
                                            ))}
                                            {issue.affectedItems.length > 5 && (
                                              <li>
                                                <Button
                                                  variant="link"
                                                  className="h-auto p-0 text-sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openIssueDetails(issue);
                                                  }}
                                                >
                                                  View all {issue.affectedItems.length} items
                                                </Button>
                                              </li>
                                            )}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="col-span-1">
                                      <h4 className="text-sm font-medium mb-2">Actions</h4>
                                      <div className="space-y-2">
                                        {issue.status === "Fixed" ? (
                                          <Button
                                            size="sm"
                                            className="w-full"
                                            variant="outline"
                                            disabled
                                          >
                                            <CheckCircle2 className="mr-2 h-3 w-3" />
                                            Issue Fixed
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            className="w-full"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              toast.info("This would link to the page where you can manually fix it.");
                                          }
                                            }
                                          >
                                            <ExternalLink className="mr-2 h-3 w-3" />
                                            Fix Manually
                                          </Button>
                                        )}
                                        <Button
                                          size="sm"
                                          className="w-full"
                                          variant="default"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openIssueDetails(issue);
                                          }}
                                        >
                                          View Details
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <IssueDetailsModal
          issue={selectedIssue}
          isOpen={isIssueModalOpen}
          onClose={() => setIsIssueModalOpen(false)}
          onFix={handleFixIssue}
          isFixing={isFixing}
        />
        
        <EmailResultsModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          onSubmit={handleEmailResults}
        />
      </AppLayout>
    );
  };

  export default ScanResults;
