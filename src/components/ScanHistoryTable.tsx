import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle, ShieldCheck, Info, CheckCircle } from "lucide-react";
import { useScan } from "@/contexts/ScanContext";
import { ScanSummary } from "@/contexts/ScanContext";

// Define the shape of a scan summary item for the table display
export interface ScanSummaryItem {
  id: string;
  date: string;
  securityScore: number;
  issuesFound: number;
  status: "Completed" | "In Progress" | "Failed";
  scanTypes: ScanTypeStatus[];
}

// Define a type for scan types with status
interface ScanTypeStatus {
  name: string;
  hasWarning: boolean;
}

interface ScanHistoryTableProps {
  limit?: number;
  showViewAll?: boolean;
}

const ScanHistoryTable: React.FC<ScanHistoryTableProps> = ({ 
  limit = 5, 
  showViewAll = true 
}) => {
  const navigate = useNavigate();
  const { scanHistory } = useScan();
  
  // Convert ScanSummary items to the format needed for the table
  const convertToScanSummaryItem = (summary: ScanSummary): ScanSummaryItem => {
    // Calculate total issues found
    const totalIssues = 
      summary.issueCountsBySeverity.High + 
      summary.issueCountsBySeverity.Medium + 
      summary.issueCountsBySeverity.Low;
    
    // Get scan types from categories and determine which have warnings
    const scanTypes: ScanTypeStatus[] = [];
    
    // Map from category to a more user-friendly scan type name
    const categoryToScanTypeName: Record<string, string> = {
      'User': 'User Security',
      'Mailbox': 'Email Security',
      'Policy': 'Policy Compliance',
      'Device': 'Device Security',
      'License': 'License Audit',
      'Role': 'Admin Roles',
      'Application': 'Application Security',
      'SharePoint': 'SharePoint Security',
      'Domain': 'Domain Security'
    };
    
    // Add all available scan types
    Object.entries(categoryToScanTypeName).forEach(([category, scanName]) => {
      const issueCount = summary.issueCountsByCategory[category] || 0;
      scanTypes.push({
        name: scanName,
        hasWarning: issueCount > 0
      });
    });
    
    // Add some default scan types if they're not already included
    const defaultTypes = [
      'Secure Score', 
      'Compliance Score', 
      'MFA Settings', 
      'Defender Exposure',
      'M365 Backups'
    ];
    
    defaultTypes.forEach(typeName => {
      if (!scanTypes.some(type => type.name === typeName)) {
        scanTypes.push({
          name: typeName,
          hasWarning: false
        });
      }
    });

    // Get the scan data from local storage to access the actual security score
    const scanData = localStorage.getItem(`scan_${summary.id}`);
    let securityScore = summary.overallRiskScore;
    
    if (scanData) {
      const parsedScanData = JSON.parse(scanData);
      if (parsedScanData.summary && typeof parsedScanData.summary.overallRiskScore === 'number') {
        securityScore = parsedScanData.summary.overallRiskScore;
      }
    }
    
    return {
      id: summary.id,
      date: summary.timestamp,
      securityScore: securityScore,
      issuesFound: totalIssues,
      status: "Completed", // Default status, in a real app this would come from the server
      scanTypes
    };
  };
  
  // Convert scan history to ScanSummaryItem items and take only the most recent scans up to the limit
  const recentScans: ScanSummaryItem[] = scanHistory 
    ? scanHistory.slice(0, limit).map(convertToScanSummaryItem) 
    : [];
  
  const getSeverityIcon = (score: number) => {
    if (score >= 80) {
      return <ShieldCheck className="h-5 w-5 text-green-500" />;
    } else if (score >= 50) {
      return <Info className="h-5 w-5 text-amber-500" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  if (recentScans.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-gray-500">No scan history available. Start a new scan to see results here.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Security Score</TableHead>
            <TableHead>Issues Found</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentScans.map((scan) => (
            <TableRow key={scan.id}>
              <TableCell className="font-medium">{formatDate(scan.date)}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  {getSeverityIcon(scan.securityScore)}
                  <span className="ml-2">{scan.securityScore}%</span>
                </div>
              </TableCell>
              <TableCell>{scan.issuesFound}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  scan.status === "Completed" 
                    ? "bg-green-100 text-green-800" 
                    : scan.status === "In Progress" 
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {scan.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/scan-results/${scan.id}`)}
                >
                  View <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {showViewAll && scanHistory && scanHistory.length > limit && (
        <div className="p-4 border-t border-gray-100">
          <Button 
            variant="link" 
            onClick={() => navigate("/scan-results/history")}
            className="text-sg-blue-600 hover:text-sg-blue-700"
          >
            View all scan history
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ScanHistoryTable;
