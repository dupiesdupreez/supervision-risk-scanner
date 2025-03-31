
import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  X,
  RefreshCw,
  ChevronRight,
  FileText,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useScan } from "@/contexts/ScanContext";

interface IssueDetailsModalProps {
  issue: any;
  isOpen: boolean;
  onClose: () => void;
  onFix?: (issueId: string) => Promise<void>;
  isFixing: string | null;
}

const IssueDetailsModal: React.FC<IssueDetailsModalProps> = ({
  issue,
  isOpen,
  onClose,
  onFix,
  isFixing,
}) => {
  const { fixIssue } = useScan();
  
  if (!issue) return null;

  // Define category styling
  const getCategoryBadgeStyles = (category?: string) => {
    const categoryStyles: Record<string, { bg: string, text: string }> = {
      "user": { bg: "bg-indigo-50", text: "text-indigo-700" },
      "policy": { bg: "bg-amber-50", text: "text-amber-700" },
      "mailbox": { bg: "bg-emerald-50", text: "text-emerald-700" },
      "device": { bg: "bg-purple-50", text: "text-purple-700" },
      "group": { bg: "bg-blue-50", text: "text-blue-700" },
      "role": { bg: "bg-red-50", text: "text-red-700" },
      "license": { bg: "bg-teal-50", text: "text-teal-700" },
      "application": { bg: "bg-orange-50", text: "text-orange-700" },
      "sharepoint": { bg: "bg-cyan-50", text: "text-cyan-700" },
      "domain": { bg: "bg-rose-50", text: "text-rose-700" },
    };
    
    if (!category) return { bg: "bg-gray-50", text: "text-gray-700" };
    
    // Get the style based on category (case-insensitive)
    const lowerCaseCategory = category.toLowerCase();
    
    for (const key in categoryStyles) {
      if (lowerCaseCategory.includes(key)) {
        return categoryStyles[key];
      }
    }
    
    return { bg: "bg-gray-50", text: "text-gray-700" };
  };

  // Get category display name
  const getCategoryName = (category?: string) => {
    if (!category) return "General";
    
    // Convert to title case and clean up
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  };

  // Security reference materials based on issue type
  const getReferenceMaterials = () => {
    const references = {
      "MFA Disabled": [
        {
          title: "Microsoft MFA Best Practices",
          url: "https://learn.microsoft.com/en-us/azure/active-directory/authentication/concept-mfa-howitworks"
        },
        {
          title: "Enforcing MFA in your organization",
          url: "https://learn.microsoft.com/en-us/azure/active-directory/authentication/howto-mfa-getstarted"
        }
      ],
      "Inactive Account": [
        {
          title: "Managing Inactive User Accounts",
          url: "https://learn.microsoft.com/en-us/azure/active-directory/reports-monitoring/howto-manage-inactive-user-accounts"
        },
        {
          title: "Security Best Practices for User Accounts",
          url: "https://learn.microsoft.com/en-us/microsoft-365/admin/security-and-compliance/secure-your-business-data"
        }
      ],
      "External Mail Forwarding": [
        {
          title: "Managing External Forwarding in Exchange Online",
          url: "https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/conditional-mail-routing/conditional-mail-routing"
        },
        {
          title: "Email Security Best Practices",
          url: "https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/secure-email-recommended-policies"
        }
      ],
      "Legacy Authentication": [
        {
          title: "Blocking Legacy Authentication",
          url: "https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/howto-conditional-access-policy-block-legacy"
        },
        {
          title: "Legacy Authentication and Security Risks",
          url: "https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/concept-fundamentals-block-legacy-authentication"
        }
      ],
      "Excessive Admin": [
        {
          title: "Azure AD Privileged Identity Management",
          url: "https://learn.microsoft.com/en-us/azure/active-directory/privileged-identity-management/pim-configure"
        },
        {
          title: "Reducing Global Admin Accounts",
          url: "https://learn.microsoft.com/en-us/microsoft-365/admin/add-users/about-admin-roles"
        }
      ],
      "default": [
        {
          title: "Microsoft 365 Security Best Practices",
          url: "https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/security-roadmap-overview"
        },
        {
          title: "Microsoft Secure Score Improvement Actions",
          url: "https://learn.microsoft.com/en-us/microsoft-365/security/defender/microsoft-secure-score"
        }
      ]
    };
    
    return references[issue.title] || references["default"];
  };

  const referenceLinks = getReferenceMaterials();
  
  // Get the category style
  const categoryStyle = getCategoryBadgeStyles(issue.category);
  const categoryName = getCategoryName(issue.category);

  // Handle fix action
  const handleFix = async () => {
    try {
      if (onFix) {
        await onFix(issue.id);
      } else if (fixIssue) {
        // If onFix prop is not provided, use the context's fixIssue
        await fixIssue(issue.id, issue.id);
      }
    } catch (error) {
      console.error("Error fixing issue:", error);
      toast.error("Failed to fix the issue");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div>
              {issue.status === "Fixed" ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : issue.severity === "High" ? (
                <AlertCircle className="h-6 w-6 text-red-500" />
              ) : issue.severity === "Medium" ? (
                <AlertCircle className="h-6 w-6 text-amber-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-blue-500" />
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl flex items-center gap-2 flex-wrap">
                {issue.title}
                <Badge
                  variant={
                    issue.severity === "High"
                      ? "destructive"
                      : issue.severity === "Medium"
                      ? "secondary"
                      : "default"
                  }
                  className="ml-2"
                >
                  {issue.severity} Risk
                </Badge>
                {issue.status === "Fixed" && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Fixed
                  </Badge>
                )}
                {/* Category badge */}
                {issue.category && (
                  <Badge 
                    variant="outline" 
                    className={`${categoryStyle.bg} ${categoryStyle.text} border-transparent ml-2 flex items-center gap-1`}
                  >
                    <Tag className="h-3 w-3" />
                    {categoryName}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1">{issue.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <h3 className="text-sm font-semibold mb-1">Impact</h3>
            <p className="text-sm text-muted-foreground">{issue.impact}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">Recommendation</h3>
            <p className="text-sm text-muted-foreground">{issue.recommendation}</p>
          </div>

          <Separator />

          {issue.details && (
            <div>
              <h3 className="text-sm font-semibold mb-1">Technical Details</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{issue.details}</p>
            </div>
          )}

          {issue.affectedItems && issue.affectedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-1">
                Affected Items ({issue.affectedItems.length})
              </h3>
              <ul className="border rounded-md divide-y max-h-60 overflow-y-auto">
                {issue.affectedItems.map((item: string, idx: number) => (
                  <li key={idx} className="px-3 py-2 text-sm hover:bg-slate-50 flex items-center">
                    <ChevronRight className="h-4 w-4 text-muted-foreground mr-2" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-2">Reference Materials</h3>
            <div className="space-y-2">
              {referenceLinks.map((reference, index) => (
                <a
                  key={index}
                  href={reference.url}
                  className="flex items-center text-sm text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {reference.title}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          
          <div className="space-x-2">
            {issue.status === "Fixed" ? (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                disabled
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Issue Fixed
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                toast.info("This would link to the page where you can manually fix it.");
              }
            }>
                <ExternalLink className="h-4 w-4 mr-2" />
                Fix Manually
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IssueDetailsModal;
