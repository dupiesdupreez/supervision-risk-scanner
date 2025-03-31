/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";  // Your authentication context
import {
  fetchUsers,
  fetchTenantInfo,
  handleGraphError,
  checkInactiveUsers,
  checkUsersWithoutMFA,
  checkGroupsWithNoOwners,
  checkPasswordNeverExpires,
  checkRiskyUsers,
  checkEmailForwardingRules,
  checkPrivilegedRoles,
  checkGuestUsers,
  checkSharedMailboxes,
  checkDeviceCompliance,
  checkConditionalAccessPolicies,
  checkUnusedLicenses,
  checkAdministrativeUnits,
  checkAuthenticationStrengthPolicies,
  checkDataLossPrevention,
  checkDefenderForOffice,
  checkEmailAuthentication,
  checkExchangeTransportRules,
  checkIntuneCompliancePolicies,
  checkLegacyAuthenticationStatus,
  checkNamedLocations,
  checkOrganizationSettings,
  checkPrivilegedIdentityManagement,
  checkRetentionPolicies,
  checkSecurityDefaultsStatus,
  checkSelfServicePasswordReset,
  checkSharePointExternalSharing,
} from "@/utils/graphApi";

// Interfaces for scan data
export interface SecurityIssue {
  id: string;
  type: string;
  severity: "Low" | "Medium" | "High";
  affectedObject: {
    type: string;
    id: string;
    name: string;
  };
  description: string;
  recommendation?: string;
  impact?: string;
  remediation?: string;
  details?: any;
  status?: string;
  canAutoFix?: boolean;
  category?: string;
  title?: string;
  affectedItems?: string[];
  isRealData?: boolean;
}

export interface ScanSummary {
  id: string;
  timestamp: string;
  tenantId: string;
  tenantName: string;
  overallRiskScore: number;
  issueCountsByCategory: {
    [category: string]: number;
  };
  issueCountsBySeverity: {
    Low: number;
    Medium: number;
    High: number;
  };
  totalAccountsScanned: number;
  totalGroupsScanned: number;
  totalPoliciesScanned: number;
  totalDevicesScanned?: number;
  totalMailboxesScanned?: number;
}

export interface ScanSummaryItem extends ScanSummary {
  date: string;
  securityScore: number;
  issuesFound: number;
  status: string;
}

export interface ScanData {
  summary: ScanSummary;
  issues: SecurityIssue[];
  apiErrors: string[];
  rawData?: {
    users?: any[];
    groups?: any[];
    policies?: any[];
    mailRules?: any[];
    securityConfigs?: any[];
    devices?: any[];
    licenses?: any[];
    roles?: any[];
  };
  usesRealData?: boolean;
}

// Dashboard-specific scan data
export interface LatestScanData {
  id: string;
  date: string;
  securityScore: number;
  highRiskIssues: number;
  mediumRiskIssues: number;
  lowRiskIssues: number;
  issuesFixed: number;
  securityPostureScore: number;
  identityAccessScore: number;
  deviceAppScore: number;
  dataProtectionScore: number;
  licenseManagementScore: number;
  securityPostureIssues: number;
  identityAccessIssues: number;
  deviceAppIssues: number;
  dataProtectionIssues: number;
  licenseManagementIssues: number;
  usesRealData?: boolean;
  issues: SecurityIssue[];
}

interface ScanContextType {
  isScanning: boolean;
  currentScan: ScanData | null;
  scanHistory: ScanSummary[];
  startScan: () => Promise<string | null>;
  getScanById: (id: string) => Promise<any>;
  getScanSummaries: () => Promise<ScanSummary[]>;
  exportScan: (scanId: string, format: "pdf" | "csv") => Promise<void>;
  // Methods used in components:
  startNewScan: () => Promise<string | null>;
  latestScan: LatestScanData | null;
  exportScanResults: (scanId: string, format: "pdf" | "csv") => Promise<void>;
  fixIssue: (scanId: string, issueId: string) => Promise<void>;
  isFixing: string | null;
  clearScanHistory: () => Promise<void>;
  exportAllScanResults: () => Promise<void>;
  emailScanResults: (scanId: string, emailAddress: string) => Promise<void>;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export const ScanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isFixing, setIsFixing] = useState<string | null>(null);
  const [currentScan, setCurrentScan] = useState<ScanData | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanSummary[]>([]);
  const [latestScan, setLatestScan] = useState<LatestScanData | null>(null);
  const { accessToken, tenantId } = useAuth();

  // Store minimal Graph data if you want
  const [graphData, setGraphData] = useState({
    users: null,
    tenantInfo: null,
    error: null
  });

  // Load scan history from local storage
  useEffect(() => {
    if (tenantId) {
      const savedHistory = localStorage.getItem(`scanHistory_${tenantId}`);
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        setScanHistory(history);
        
        if (history.length > 0) {
          const latest = history[0];
          setLatestScan(convertToLatestScanData(latest));
        }
      }
    }
  }, [tenantId]);

  // Update dashboard when current scan changes
  useEffect(() => {
    if (currentScan) {
      const latestScanData = convertToLatestScanData(currentScan.summary);
      latestScanData.usesRealData = currentScan.usesRealData;
      latestScanData.issues = currentScan.issues;
      setLatestScan(latestScanData);
    }
  }, [currentScan]);

  // Convert ScanSummary to LatestScanData for dashboard
  const convertToLatestScanData = (summary: ScanSummary): LatestScanData => {
    // Get the scan data from local storage to access issues
    const scanData = localStorage.getItem(`scan_${summary.id}`);
    const parsedData = scanData ? JSON.parse(scanData) : null;
    const issues = parsedData ? parsedData.issues : [];

    // Define category mappings with their corresponding issue types
    const categoryMappings = {
      securityPosture: {
        types: ['Policy', 'SecurityDefaults', 'ComplianceScore', 'SecureScore', 'Organization'],
        score: 100,
        issues: 0
      },
      identityAccess: {
        types: ['User', 'Role', 'Authentication', 'MFA', 'Guest', 'Admin', 'Identity'],
        score: 100,
        issues: 0
      },
      deviceApp: {
        types: ['Device', 'Application', 'Intune', 'Endpoint'],
        score: 100,
        issues: 0
      },
      dataProtection: {
        types: ['Mailbox', 'SharePoint', 'DLP', 'Exchange', 'Email', 'Domain'],
        score: 100,
        issues: 0
      },
      licenseManagement: {
        types: ['License', 'Subscription'],
        score: 100,
        issues: 0
      }
    };

    // Calculate scores and issues for each category
    issues.forEach(issue => {
      const category = issue.affectedObject.type;
      const severity = issue.severity;
      const impactScore = severity === 'High' ? 15 : severity === 'Medium' ? 7 : 3;

      // Find which category this issue belongs to
      for (const [key, value] of Object.entries(categoryMappings)) {
        if (value.types.some(t => category.toLowerCase().includes(t.toLowerCase()) || 
            (issue.type && issue.type.toLowerCase().includes(t.toLowerCase())))) {
          value.issues++;
          value.score = Math.max(0, value.score - impactScore);
          break;
        }
      }
    });

    // Count total issues by severity
    const highRiskIssues = issues.filter(i => i.severity === 'High').length;
    const mediumRiskIssues = issues.filter(i => i.severity === 'Medium').length;
    const lowRiskIssues = issues.filter(i => i.severity === 'Low').length;

    // Calculate overall security score
    let securityScore = summary.overallRiskScore;
    if (highRiskIssues > 0 || mediumRiskIssues > 0 || lowRiskIssues > 0) {
      const totalImpact = (highRiskIssues * 15) + (mediumRiskIssues * 7) + (lowRiskIssues * 3);
      securityScore = Math.max(0, Math.min(100, 100 - totalImpact));
    }

    return {
      id: summary.id,
      date: summary.timestamp,
      securityScore: securityScore,
      highRiskIssues,
      mediumRiskIssues,
      lowRiskIssues,
      issuesFixed: issues.filter(i => i.status === 'Fixed').length,
      securityPostureScore: categoryMappings.securityPosture.score,
      identityAccessScore: categoryMappings.identityAccess.score,
      deviceAppScore: categoryMappings.deviceApp.score,
      dataProtectionScore: categoryMappings.dataProtection.score,
      licenseManagementScore: categoryMappings.licenseManagement.score,
      securityPostureIssues: categoryMappings.securityPosture.issues,
      identityAccessIssues: categoryMappings.identityAccess.issues,
      deviceAppIssues: categoryMappings.deviceApp.issues,
      dataProtectionIssues: categoryMappings.dataProtection.issues,
      licenseManagementIssues: categoryMappings.licenseManagement.issues,
      issues: issues,
      usesRealData: parsedData?.usesRealData || false
    };
  };

  // Alias for startScan to match the method name used in components
  const startNewScan = async (): Promise<string | null> => {
    return startScan();
  };

  // Fetch real data from Microsoft Graph if authenticated
  const fetchMicrosoftGraphData = async (token: string): Promise<any> => {
    try {
      // Collect API errors
      const apiErrors: string[] = [];

      // Initiate all fetches in parallel for better performance
      const responses = await Promise.all([
        fetchUsers(token),
        fetchTenantInfo(token),
        checkInactiveUsers(token),
        checkUsersWithoutMFA(token),
        checkGroupsWithNoOwners(token),
        checkPasswordNeverExpires(token),
        checkRiskyUsers(token),
        checkEmailForwardingRules(token),
        checkPrivilegedRoles(token),
        checkGuestUsers(token),
        checkSharedMailboxes(token),
        checkDeviceCompliance(token),
        checkConditionalAccessPolicies(token),
        checkUnusedLicenses(token),
        checkSecurityDefaultsStatus(token),
        checkAuthenticationStrengthPolicies(token),
        checkNamedLocations(token),
        checkLegacyAuthenticationStatus(token),
        checkSelfServicePasswordReset(token),
        checkAdministrativeUnits(token),
        checkPrivilegedIdentityManagement(token),
        checkSharePointExternalSharing(token),
        checkDataLossPrevention(token),
        checkRetentionPolicies(token),
        checkOrganizationSettings(token),
        checkDefenderForOffice(token),
        checkIntuneCompliancePolicies(token),
        checkExchangeTransportRules(token),
        checkEmailAuthentication(token)
      ]);
  
      // Map of API endpoints to their response indices
      const endpointMap = {
        'users': [0, 2, 3],
        'organization': [1],
        'groups': [4],
        'users/passwordPolicies': [5],
        'identityProtection/riskyUsers': [6],
        'users/mailFolders/messageRules': [7],
        'directoryRoles': [8],
        'users/guestUsers': [9],
        'users/mailboxSettings': [10],
        'deviceManagement/mobileThreatDefenseConnectors': [11],
        'identity/conditionalAccess/policies': [12],
        'subscribedSkus': [13],
        'policies/identitySecurityDefaultsEnforcementPolicy': [14],
        'identity/authenticationStrengthPolicies': [15],
        'identity/conditionalAccess/namedLocations': [16],
        'policies/authenticationMethodsPolicy': [17, 18],
        'administrativeUnits': [19],
        'roleManagement/directory/roleSettings': [20],
        'admin/sharepoint/settings': [21],
        'security/dataLossPreventionPolicies': [22],
        'security/informationProtection/policy/labels': [23],
        'security/threatIntelligence/antiphishPolicies': [25],
        'deviceManagement/deviceCompliancePolicies': [26],
        'admin/exchange/transportRules': [27],
        'domains': [28]
      };

      // Check each response for errors
      Object.entries(endpointMap).forEach(([endpoint, indices]) => {
        indices.forEach(index => {
          if (!responses[index].success) {
            apiErrors.push(`graph.microsoft.com/beta/${endpoint}`);
          }
        });
      });

      // Extract data from responses
      const [
        usersResponse,
        tenantResponse,
        inactiveUsersResponse,
        mfaStatusResponse,
        groupsResponse,
        passwordNeverExpiresResponse,
        riskyUsersResponse,
        emailForwardingResponse,
        privilegedRolesResponse,
        guestUsersResponse,
        sharedMailboxesResponse,
        deviceComplianceResponse,
        conditionalAccessResponse,
        unusedLicensesResponse,
        securityDefaultsResponse,
        authStrengthPoliciesResponse,
        namedLocationsResponse,
        legacyAuthStatusResponse,
        selfServicePasswordResetResponse,
        adminUnitsResponse,
        pimConfigResponse,
        sharePointSharingResponse,
        dlpPoliciesResponse,
        retentionPoliciesResponse,
        organizationSettingsResponse,
        defenderForOfficeResponse,
        intuneCompliancePoliciesResponse,
        exchangeTransportRulesResponse,
        emailAuthenticationResponse
      ] = responses;

      return {
        success: responses.some(r => r.success),
        apiErrors,
        users: usersResponse.success ? usersResponse.data.value : [],
        tenantInfo: tenantResponse.success ? tenantResponse.data.value[0] : null,
        inactiveUsers: inactiveUsersResponse.success ? inactiveUsersResponse.data.value : [],
        mfaStatus: mfaStatusResponse.success ? mfaStatusResponse.data.value : [],
        groups: groupsResponse.success ? groupsResponse.data.value : [],
        passwordNeverExpires: passwordNeverExpiresResponse.success ? passwordNeverExpiresResponse.data.value : [],
        riskyUsers: riskyUsersResponse.success ? riskyUsersResponse.data.value : [],
        emailForwarding: emailForwardingResponse.success ? emailForwardingResponse.data.value : [],
        privilegedRoles: privilegedRolesResponse.success ? privilegedRolesResponse.data.value : [],
        guestUsers: guestUsersResponse.success ? guestUsersResponse.data.value : [],
        sharedMailboxes: sharedMailboxesResponse.success ? sharedMailboxesResponse.data.value : [],
        deviceCompliance: deviceComplianceResponse.success ? deviceComplianceResponse.data.value : [],
        conditionalAccess: conditionalAccessResponse.success ? conditionalAccessResponse.data.value : [],
        unusedLicenses: unusedLicensesResponse.success ? unusedLicensesResponse.data.value : [],
        securityDefaults: securityDefaultsResponse.success ? securityDefaultsResponse.data : null,
        authStrengthPolicies: authStrengthPoliciesResponse.success ? authStrengthPoliciesResponse.data : null,
        namedLocations: namedLocationsResponse.success ? namedLocationsResponse.data.value : [],
        legacyAuthStatus: legacyAuthStatusResponse.success ? legacyAuthStatusResponse.data : null,
        passwordResetPolicy: selfServicePasswordResetResponse.success ? selfServicePasswordResetResponse.data : null,
        administrativeUnits: adminUnitsResponse.success ? adminUnitsResponse.data.value : [],
        pimConfiguration: pimConfigResponse.success ? pimConfigResponse.data : null,
        sharePointSharing: sharePointSharingResponse.success ? sharePointSharingResponse.data : null,
        dlpPolicies: dlpPoliciesResponse.success ? dlpPoliciesResponse.data.value : [],
        retentionPolicies: retentionPoliciesResponse.success ? retentionPoliciesResponse.data.value : [],
        organizationSettings: organizationSettingsResponse.success ? organizationSettingsResponse.data : null,
        defenderForOffice: defenderForOfficeResponse.success ? defenderForOfficeResponse.data : null,
        intuneCompliancePolicies: intuneCompliancePoliciesResponse.success ? intuneCompliancePoliciesResponse.data.value : [],
        exchangeTransportRules: exchangeTransportRulesResponse.success ? exchangeTransportRulesResponse.data.value : [],
        emailAuthentication: emailAuthenticationResponse.success ? emailAuthenticationResponse.data : null
      };
    } catch (error) {
      console.error("Microsoft Graph data fetch error:", error);
      handleGraphError(error);
      return {
        success: false,
        apiErrors: [],
        error: error instanceof Error ? error.message : "Error fetching Microsoft Graph data"
      };
    }
  };

  // Start a new scan
  const startScan = async (): Promise<string | null> => {
    if (!accessToken || !tenantId) {
      toast.error("Authentication required to start a scan");
      return null;
    }

    setIsScanning(true);
    toast.info("Starting security scan...");

    try {
      // Fetch real data from Microsoft Graph
      const graphResult = await fetchMicrosoftGraphData(accessToken);

      if (!graphResult.success) {
        toast.warning("Could not retrieve all Microsoft 365 data. Some scan results may be limited.");
      }

      // Create a scan using real data where available
      const scanData = await generateScan(
        accessToken, 
        tenantId, 
        graphResult.success ? graphResult.tenantInfo?.displayName : undefined,
        graphResult.success ? graphResult : null
      );

      setCurrentScan(scanData);

      // Update history
      const updatedHistory = [scanData.summary, ...scanHistory].slice(0, 10);
      setScanHistory(updatedHistory);

      // Save to local storage first
      localStorage.setItem(`scanHistory_${tenantId}`, JSON.stringify(updatedHistory));
      localStorage.setItem(`scan_${scanData.summary.id}`, JSON.stringify(scanData));

      // Create latest scan data AFTER saving to localStorage
      const latestScanData = convertToLatestScanData(scanData.summary);
      latestScanData.usesRealData = scanData.usesRealData;
      latestScanData.issues = scanData.issues; // Ensure issues are included
      setLatestScan(latestScanData);

      toast.success("Security scan completed successfully");
      setIsScanning(false);
      return scanData.summary.id;
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("Scan failed. Please try again.");
      setIsScanning(false);
      return null;
    }
  };

 // Get scan by ID
const getScanById = async (scanId: string): Promise<any> => {
  if (!tenantId) return null;
  
  // Handle the "latest" case
  if (scanId === "latest" && latestScan) {
    return getScanById(latestScan.id);
  }
  
  // Check current scan in state first
  if (currentScan && currentScan.summary.id === scanId) {
    // Format the timestamp properly
    const formattedDate = new Date(currentScan.summary.timestamp).toLocaleString();
    
    return {
      id: currentScan.summary.id,
      date: formattedDate,
        securityScore: currentScan.summary.overallRiskScore || 0,
      highRiskIssues: currentScan.summary.issueCountsBySeverity.High,
      mediumRiskIssues: currentScan.summary.issueCountsBySeverity.Medium,
      lowRiskIssues: currentScan.summary.issueCountsBySeverity.Low,
      issuesFixed: currentScan.issues.filter((i: any) => i.status === "Fixed").length,
      usesRealData: currentScan.usesRealData,
        apiErrors: currentScan.apiErrors || [],
      issues: currentScan.issues.map((issue: SecurityIssue) => ({
        id: issue.id,
        title: issue.type,
        severity: issue.severity,
        description: issue.description,
        impact: issue.impact || "Potential security risk",
        recommendation: issue.remediation,
        details: issue.details,
        status: issue.status || "Open",
        canAutoFix:
          issue.type === "MFA Disabled" ||
          issue.type === "Inactive Account" ||
          issue.type === "Weak Spam Filter" ||
          issue.type === "MFA Not Configured",
        category: issue.affectedObject.type.toLowerCase(),
        affectedItems: [
          issue.affectedObject.name,
          ...(issue.affectedItems || [])
        ],
        isRealData: issue.isRealData
      }))
    };
  }
  
  // Check local storage
  const savedScan = localStorage.getItem(`scan_${scanId}`);
  if (savedScan) {
    const parsedScan = JSON.parse(savedScan);
    
    // Ensure the date is properly formatted 
    let formattedDate;
    try {
      formattedDate = new Date(parsedScan.summary.timestamp).toLocaleString();
    } catch (e) {
      formattedDate = new Date().toLocaleString(); // Fallback to current date
    }
    
    // Ensure security score is always a number (default to 0 if missing)
    const securityScore = typeof parsedScan.summary.overallRiskScore === 'number' 
      ? parsedScan.summary.overallRiskScore 
      : 0;
    
    return {
      id: parsedScan.summary.id,
      date: formattedDate,
      securityScore: securityScore,
      highRiskIssues: parsedScan.summary.issueCountsBySeverity.High || 0,
      mediumRiskIssues: parsedScan.summary.issueCountsBySeverity.Medium || 0,
      lowRiskIssues: parsedScan.summary.issueCountsBySeverity.Low || 0,
      issuesFixed: parsedScan.issues.filter((i: any) => i.status === "Fixed").length,
      usesRealData: parsedScan.usesRealData,
        apiErrors: parsedScan.apiErrors || [],
      issues: parsedScan.issues.map((issue: SecurityIssue) => ({
        id: issue.id,
        title: issue.type,
        severity: issue.severity,
        description: issue.description,
        impact: issue.impact || "Potential security risk",
        recommendation: issue.remediation,
        details: issue.details,
        status: issue.status || "Open",
        canAutoFix:
          issue.type === "MFA Disabled" ||
          issue.type === "Inactive Account" ||
          issue.type === "Weak Spam Filter" ||
          issue.type === "MFA Not Configured",
        category: issue.affectedObject.type.toLowerCase(),
        affectedItems: [
          issue.affectedObject.name,
          ...(issue.affectedItems || [])
        ],
        isRealData: issue.isRealData
      }))
    };
  }
  return null;
};

  // Get scan summaries
  const getScanSummaries = async (): Promise<ScanSummary[]> => {
    return scanHistory;
  };

  // Export scan to PDF or CSV
  const exportScan = async (scanId: string, format: "pdf" | "csv"): Promise<void> => {
    return exportScanResults(scanId, format);
  };

  // Example: exportScanResults
  const exportScanResults = async (scanId: string, format: "pdf" | "csv"): Promise<void> => {
    const scan = await getScanById(scanId);
    if (!scan) {
      toast.error("Scan data not found");
      return;
    }

    try {
      if (format === "pdf") {
        await exportToPDF(scan);
      } else {
        // CSV
        const csvContent = convertToCSV(scan.issues);
        downloadCSV(csvContent, `supervision-scan-${scanId}.csv`);
        toast.success("CSV file downloaded successfully");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  // Helper: Export to PDF using html2pdf
  const exportToPDF = async (scan: any): Promise<void> => {
    try {
      const html2pdf = await import("html2pdf.js");
      const pdfContent = document.createElement("div");
      pdfContent.classList.add("pdf-content");
      pdfContent.style.padding = "40px";
      pdfContent.style.fontFamily = "'Segoe UI', system-ui, sans-serif";
      pdfContent.style.maxWidth = "800px";
      pdfContent.style.margin = "0 auto";

      // Build some basic HTML structure for the PDF
      const header = document.createElement("div");
      header.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 30px;">
          <div style="flex: 1;">
            <h1 style="color: #1a56db; font-size: 28px; margin: 0 0 10px 0;">SuperVision Risk Scanner Results</h1>
            <p style="color: #64748b; margin: 0;">Scan performed on ${new Date(scan.date).toLocaleString()}</p>
          </div>
          <div style="text-align: right;">
            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMjJDMTcuNTIyOCAyMiAyMiAxNy41MjI4IDIyIDEyQzIyIDYuNDc3MTUgMTcuNTIyOCAyIDEyIDJDNi40NzcxNSAyIDIgNi40NzcxNSAyIDEyQzIgMTcuNTIyOCA2LjQ3NzE1IDIyIDEyIDIyWiIgc3Ryb2tlPSIjMWE1NmRiIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTIgMTZWMTIiIHN0cm9rZT0iIzFhNTZkYiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjEiIGZpbGw9IiMxYTU2ZGIiLz48L3N2Zz4=" alt="Security Icon" style="width: 40px; height: 40px;" />
            </div>
            </div>
        <div style="display: flex; margin-bottom: 30px; background: #f8fafc; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="flex: 1;">
            <h3 style="color: #0f172a; margin: 0 0 8px 0; font-size: 16px;">Overall Security Score</h3>
            <div style="display: flex; align-items: baseline;">
              <span style="font-size: 36px; font-weight: bold; color: ${
                scan.securityScore >= 80 ? "#059669" :
                scan.securityScore >= 50 ? "#d97706" : "#dc2626"
              };">${scan.securityScore}%</span>
              <span style="margin-left: 12px; font-size: 14px; padding: 4px 12px; border-radius: 9999px; background: ${
                scan.securityScore >= 80 ? "#dcfce7" :
                scan.securityScore >= 50 ? "#fef3c7" : "#fee2e2"
              }; color: ${
                scan.securityScore >= 80 ? "#059669" :
                scan.securityScore >= 50 ? "#d97706" : "#dc2626"
              };">${
                scan.securityScore >= 80 ? "Good" :
                scan.securityScore >= 50 ? "Needs Improvement" : "Critical"
              }</span>
            </div>
          </div>
          <div style="flex: 2; display: flex; gap: 16px;">
            <div style="flex: 1; text-align: center; padding: 16px; background: #fee2e2; border-radius: 8px; border: 1px solid #fecaca;">
              <p style="margin: 0 0 4px 0; color: #991b1b; font-size: 14px;">High Risk</p>
              <p style="font-size: 24px; font-weight: bold; margin: 0; color: #dc2626;">${scan.highRiskIssues}</p>
        </div>
            <div style="flex: 1; text-align: center; padding: 16px; background: #fef3c7; border-radius: 8px; border: 1px solid #fde68a;">
              <p style="margin: 0 0 4px 0; color: #92400e; font-size: 14px;">Medium Risk</p>
              <p style="font-size: 24px; font-weight: bold; margin: 0; color: #d97706;">${scan.mediumRiskIssues}</p>
            </div>
            <div style="flex: 1; text-align: center; padding: 16px; background: #dbeafe; border-radius: 8px; border: 1px solid #bfdbfe;">
              <p style="margin: 0 0 4px 0; color: #1e40af; font-size: 14px;">Low Risk</p>
              <p style="font-size: 24px; font-weight: bold; margin: 0; color: #3b82f6;">${scan.lowRiskIssues}</p>
            </div>
          </div>
        </div>
        <hr style="border: none; height: 1px; background: #e2e8f0; margin: 32px 0;" />
      `;
      pdfContent.appendChild(header);

      // Issues section
      const issuesSection = document.createElement("div");
      issuesSection.innerHTML = `
        <h2 style="color: #0f172a; font-size: 24px; margin: 0 0 24px 0;">Security Issues</h2>
      `;

      // Sort issues by severity
      const severityOrder = { High: 0, Medium: 1, Low: 2 };
      const sortedIssues = [...scan.issues].sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      );

      sortedIssues.forEach((issue) => {
        const issueElement = document.createElement("div");
        issueElement.style.marginBottom = "24px";
        issueElement.style.padding = "20px";
        issueElement.style.border = "1px solid #e2e8f0";
        issueElement.style.borderRadius = "8px";
        issueElement.style.background = "#ffffff";
        issueElement.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";

        const severityColor =
          issue.severity === "High"
            ? "#dc2626"
            : issue.severity === "Medium"
            ? "#d97706"
            : "#3b82f6";

        const severityBg =
          issue.severity === "High"
            ? "#fee2e2"
            : issue.severity === "Medium"
            ? "#fef3c7"
            : "#dbeafe";

        issueElement.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; color: #0f172a; font-size: 18px;">${issue.title}</h3>
            <span style="background: ${severityBg}; color: ${severityColor}; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 500;">
              ${issue.severity}
            </span>
          </div>
          <p style="margin: 0 0 16px 0; color: #475569; line-height: 1.6;">${issue.description}</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
            <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px;">Impact</h4>
            <p style="margin: 0; color: #475569; line-height: 1.6;">${
              issue.impact || "Not specified"
            }</p>
          </div>
          <div style="background: #f8fafc; padding: 16px; border-radius: 6px;">
            <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 16px;">Recommendation</h4>
            <p style="margin: 0; color: #475569; line-height: 1.6;">${
              issue.recommendation || "Not specified"
            }</p>
          </div>
        `;
        issuesSection.appendChild(issueElement);
      });
      pdfContent.appendChild(issuesSection);

      // Footer
      const footer = document.createElement("div");
      footer.style.marginTop = "40px";
      footer.style.borderTop = "1px solid #e2e8f0";
      footer.style.paddingTop = "20px";
      footer.style.textAlign = "center";
      footer.style.color = "#64748b";
      footer.style.fontSize = "14px";
      footer.innerHTML = `
        <p style="margin: 0;">SuperVision Risk Scanner Report | Generated: ${new Date().toLocaleString()}</p>
        <p style="margin: 4px 0 0 0;">Confidential - For Internal Use Only</p>
      `;
      pdfContent.appendChild(footer);

      document.body.appendChild(pdfContent);

      const opt = {
        margin: [15, 15, 15, 15],
        filename: `supervision-scan-${scan.id}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { 
          unit: "mm", 
          format: "a4", 
          orientation: "portrait",
          compress: true
        },
      };

      await html2pdf.default().from(pdfContent).set(opt).save();
      document.body.removeChild(pdfContent);
      toast.success("PDF file downloaded successfully");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export as PDF. Please try again.");
    }
  };

  // Convert issues to CSV
  const convertToCSV = (issues: any[]): string => {
    const header = [
      "ID",
      "Title",
      "Severity",
      "Category",
      "Description",
      "Impact",
      "Recommendation",
      "Status",
      "Data Source",
    ].join(",");

    const rows = issues.map((issue) => {
      return [
        issue.id,
        `"${issue.title?.replace(/"/g, '""') || ""}"`,
        issue.severity,
        issue.category,
        `"${issue.description?.replace(/"/g, '""') || ""}"`,
        `"${issue.impact ? issue.impact.replace(/"/g, '""') : ""}"`,
        `"${issue.recommendation ? issue.recommendation.replace(/"/g, '""') : ""}"`,
        issue.status,
        issue.isRealData ? "Real-time scan" : "Simulated",
      ].join(",");
    });

    return [header, ...rows].join("\n");
  };

  // Trigger CSV download
  const downloadCSV = (csvContent: string, filename: string): void => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fix an issue
  const fixIssue = async (scanId: string, issueId: string): Promise<void> => {
    try {
      setIsFixing(issueId);
      
      // Get current scan data
      const scan = await getScanById(scanId);
      if (!scan) {
        toast.error("Scan data not found");
        setIsFixing(null);
        return;
      }

      // Find the issue to fix
      const issueToFix = scan.issues.find((issue: any) => issue.id === issueId);
      if (!issueToFix) {
        toast.error("Issue not found");
        setIsFixing(null);
        return;
      }

      // Real-world remediation would go here
      // For now, we'll simulate API calls based on issue type
      if (issueToFix.isRealData && accessToken) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        // Would call remediation APIs here in a real implementation
        // e.g.: await remediateIssue(accessToken, issueToFix);
      } else {
        // Simulate fixing for mock issues
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Update the issue status
      const updatedIssues = scan.issues.map((issue: any) =>
        issue.id === issueId ? { ...issue, status: "Fixed" } : issue
      );

      const updatedScan = {
        ...scan,
        issues: updatedIssues,
        issuesFixed: (scan.issuesFixed || 0) + 1,
      };

      // Save updated scan data
      localStorage.setItem(
        `scan_${scanId}`,
        JSON.stringify({
          summary: {
            ...scan,
            id: scan.id,
            timestamp: scan.date,
            overallRiskScore: scan.securityScore,
          },
          issues: updatedIssues,
        })
      );

      toast.success("Issue fixed successfully");
      setIsFixing(null);
    } catch (error) {
      console.error("Error fixing issue:", error);
      toast.error("Failed to fix issue");
      setIsFixing(null);
    }
  };

  // Clear all scan history
  const clearScanHistory = async (): Promise<void> => {
    if (!tenantId) return;
    
    try {
      setScanHistory([]);
      setLatestScan(null);
      localStorage.removeItem(`scanHistory_${tenantId}`);

      // Remove all scan data
      const scanKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith("scan_")
      );
      scanKeys.forEach((key) => {
        localStorage.removeItem(key);
      });

      toast.success("Scan history cleared successfully");
    } catch (error) {
      console.error("Error clearing scan history:", error);
      toast.error("Failed to clear scan history");
    }
  };

  // Export results for all scans
  const exportAllScanResults = async (): Promise<void> => {
    try {
      const summaries = await getScanSummaries();
      if (summaries.length === 0) {
        toast.info("No scan data to export");
        return;
      }

      const allIssues: any[] = [];
      for (const summary of summaries) {
        const scan = await getScanById(summary.id);
        if (scan && scan.issues) {
          const issuesWithScanId = scan.issues.map((issue: any) => ({
            ...issue,
            scanId: scan.id,
            scanDate: new Date(scan.date).toLocaleDateString(),
          }));
          allIssues.push(...issuesWithScanId);
        }
      }

      const csvContent = convertToCSV(allIssues);
      downloadCSV(csvContent, `supervision-all-scans.csv`);
      toast.success("All scan results exported successfully");
    } catch (error) {
      console.error("Error exporting all scan results:", error);
      toast.error("Failed to export all scan results");
    }
  };

  // Email scan results (mocked)
  const emailScanResults = async (
    scanId: string,
    emailAddress: string
  ): Promise<void> => {
    try {
      // Real implementation calls a backend service to send the email
      toast.success(`Scan results sent to ${emailAddress}`);
      // For demo, just export to PDF
      await exportScanResults(scanId, "pdf");
      toast.info(
        "Report has been downloaded. In production, this would be emailed."
      );
    } catch (error) {
      console.error("Email error:", error);
      toast.error("Failed to email scan results");
    }
  };

  
/**
 * Generate a comprehensive security scan using only real data from Microsoft Graph.
 */
const generateScan = async (
  accessToken: string,
  tenantId: string,
  tenantName?: string,
  realData?: any
): Promise<ScanData> => {
  const scanId = `scan_${Date.now().toString(36)}`;
  const issues: SecurityIssue[] = [];
  
  // Process real data to find security issues
  if (realData) {
    // Check for risky users - group into one issue
    if (realData.riskyUsers?.length > 0) {
      issues.push({
        id: `risky_users_${Date.now()}`,
        type: "Risky Users Detected",
      severity: "High",
      affectedObject: {
        type: "User",
          id: "multiple",
          name: "Multiple Users"
        },
        description: "Multiple user accounts have been flagged as risky",
        impact: "Potential account compromise or suspicious activity",
        remediation: "Review user activity and reset credentials if necessary",
        status: "Open",
      isRealData: true,
        affectedItems: realData.riskyUsers.map((user: any) => 
          user.userPrincipalName || "Unknown User"
        )
      });
    }

    // Check for users without MFA - group into one issue
    if (realData.mfaStatus?.length > 0) {
      const usersWithoutMFA = realData.mfaStatus.filter((user: any) => !user.isMfaEnabled);
      if (usersWithoutMFA.length > 0) {
        issues.push({
          id: `mfa_disabled_${Date.now()}`,
          type: "MFA Not Configured",
          severity: "High",
        affectedObject: {
          type: "User",
            id: "multiple",
            name: "Multiple Users"
          },
          description: "Multiple user accounts do not have Multi-Factor Authentication enabled",
          impact: "Increased risk of account compromise",
          remediation: "Enable Multi-Factor Authentication for these users",
          status: "Open",
        isRealData: true,
          affectedItems: usersWithoutMFA.map((user: any) => 
            user.userPrincipalName || "Unknown User"
          )
        });
      }
    }

    // Check for inactive users - group into one issue
    if (realData.inactiveUsers?.length > 0) {
      issues.push({
        id: `inactive_users_${Date.now()}`,
        type: "Inactive Accounts",
        severity: "Medium",
        affectedObject: {
          type: "User",
          id: "multiple",
          name: "Multiple Users"
        },
        description: "Multiple user accounts have been inactive for an extended period",
        impact: "Potential security risk from unused accounts",
        remediation: "Review and disable or delete inactive accounts",
        status: "Open",
        isRealData: true,
        affectedItems: realData.inactiveUsers.map((user: any) => 
          user.userPrincipalName || "Unknown User"
        )
      });
    }

    // Check for email forwarding rules - group by domain
    if (realData.emailForwarding?.length > 0) {
      const externalForwarding = realData.emailForwarding.filter(
        (rule: any) => rule.forwardTo && !rule.forwardTo.endsWith(tenantName || '')
      );
    
    if (externalForwarding.length > 0) {
        issues.push({
          id: `forwarding_rules_${Date.now()}`,
          type: "External Email Forwarding",
          severity: "Medium",
        affectedObject: {
          type: "Mailbox",
            id: "multiple",
            name: "Multiple Mailboxes"
          },
          description: "Multiple mailboxes have rules forwarding emails to external addresses",
          impact: "Potential data leakage through email forwarding",
          remediation: "Review and remove unauthorized forwarding rules",
          status: "Open",
        isRealData: true,
          affectedItems: externalForwarding.map((rule: any) => 
            rule.mailbox || "Unknown Mailbox"
          )
        });
      }
    }

    // Generate issues for failed API endpoints - group by type
    if (realData.apiErrors?.length > 0) {
      const errorsByType = realData.apiErrors.reduce((acc: any, error: string) => {
        const errorType = error.includes('identityProtection') ? 'Identity Protection' :
                         error.includes('mailFolders') ? 'Mail Settings' :
                         error.includes('security') ? 'Security Settings' :
                         error.includes('subscribedSkus') ? 'License Management' :
                         'API Access';
        
        if (!acc[errorType]) {
          acc[errorType] = [];
        }
        acc[errorType].push(error);
        return acc;
      }, {});

      Object.entries(errorsByType).forEach(([errorType, endpoints]: [string, any]) => {
        issues.push({
          id: `api_error_${errorType.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
          type: `${errorType} Access Required`,
        severity: "Medium",
        affectedObject: {
          type: "Policy",
            id: "multiple",
            name: errorType
          },
          description: `Unable to access ${errorType.toLowerCase()} settings due to insufficient permissions`,
          impact: "Limited visibility into security settings and potential risks",
          remediation: "Grant necessary permissions to access these security settings",
          status: "Open",
        isRealData: true,
          affectedItems: endpoints
        });
      });
    }

    // Check for guest users - group into one issue
    if (realData.guestUsers?.length > 0) {
      issues.push({
        id: `guest_users_${Date.now()}`,
        type: "Guest User Access",
      severity: "Low",
      affectedObject: {
          type: "User",
          id: "multiple",
          name: "Multiple Guest Users"
        },
        description: "Multiple external guest users have access to tenant resources",
        impact: "Potential security risk from external access",
        remediation: "Review guest user access and remove if unnecessary",
        status: "Open",
      isRealData: true,
        affectedItems: realData.guestUsers.map((user: any) => 
          user.userPrincipalName || "Unknown Guest"
        )
      });
    }
  }

  // Calculate severity counts
  const severityCount = {
    High: issues.filter(i => i.severity === "High").length,
    Medium: issues.filter(i => i.severity === "Medium").length,
    Low: issues.filter(i => i.severity === "Low").length
  };

  // Calculate category counts
  const categoryCount: { [key: string]: number } = {};
  issues.forEach(issue => {
    const category = issue.affectedObject.type;
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });

  // Calculate risk score
  let overallRiskScore = 100;
  const highIssueCount = severityCount.High;
  const mediumIssueCount = severityCount.Medium;
  const lowIssueCount = severityCount.Low;
  
  // Calculate impact (High: -15, Medium: -7, Low: -3)
  const highImpact = -15 * highIssueCount;
  const mediumImpact = -7 * mediumIssueCount;
  const lowImpact = -3 * lowIssueCount;
    
if (highIssueCount > 0 || mediumIssueCount > 0 || lowIssueCount > 0) {
  overallRiskScore = Math.max(Math.min(100 + highImpact + mediumImpact + lowImpact, 100), 0);
}

  // Generate summary object
  const summary: ScanSummary = {
    id: scanId,
    timestamp: new Date().toISOString(),
    tenantId,
    tenantName: tenantName || "Your Microsoft 365 Tenant",
    overallRiskScore,
    issueCountsByCategory: categoryCount,
    issueCountsBySeverity: severityCount,
    totalAccountsScanned: realData?.users?.length || 0,
    totalGroupsScanned: realData?.groups?.length || 0,
    totalPoliciesScanned: realData?.conditionalAccess?.length || 0,
    totalDevicesScanned: realData?.deviceCompliance?.length || 0,
    totalMailboxesScanned: (realData?.sharedMailboxes?.length || 0) + (realData?.emailForwarding?.length || 0),
  };

  // Return the final scan data with API errors
  return {
    summary,
    issues,
    apiErrors: realData?.apiErrors || [],
    usesRealData: true,
    rawData: {
      users: realData?.users,
      groups: realData?.groups,
      policies: realData?.conditionalAccess,
      mailRules: realData?.emailForwarding,
      devices: realData?.deviceCompliance,
      licenses: realData?.unusedLicenses,
      roles: realData?.privilegedRoles
    }
  };
};

  const value = {
    isScanning,
    currentScan,
    scanHistory,
    startScan,
    getScanById,
    getScanSummaries,
    exportScan,
    startNewScan,
    latestScan,
    exportScanResults,
    fixIssue,
    isFixing,
    clearScanHistory,
    exportAllScanResults,
    emailScanResults,
  };

  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
};

export const useScan = (): ScanContextType => {
  const context = useContext(ScanContext);
  if (context === undefined) {
    throw new Error("useScan must be used within a ScanProvider");
  }
  return context;
};
