
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Key, 
  RefreshCw, 
  ShieldAlert, 
  Trash2, 
  Upload,
  Save
} from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layouts/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useScan } from "@/contexts/ScanContext";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();
  const { tenantId, logout } = useAuth();
  const { clearScanHistory, scanHistory, exportAllScanResults } = useScan();
  const [exportLoading, setExportLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: true,
    autoScan: false,
    scanFrequency: "weekly",
    sendReports: false,
    reportEmail: "",
    scanDetails: {
      userSecurity: true,
      emailSecurity: true,
      endpointSecurity: true,
      licenseAudit: true,
      threatDetection: true,
      conditionalAccess: true,
    },
  });

  const handleSettingChange = (setting, value) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: value,
    }));
  };

  const handleScanDetailChange = (detail, value) => {
    setSettings((prev) => ({
      ...prev,
      scanDetails: {
        ...prev.scanDetails,
        [detail]: value,
      },
    }));
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to the backend
    toast.success("Settings saved successfully");
  };

  const handleExportAllData = async () => {
    setExportLoading(true);
    try {
      await exportAllScanResults();
      toast.success("All scan data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export scan data");
    } finally {
      setExportLoading(false);
    }
  };

  const handleClearScanHistory = async () => {
    if (window.confirm("Are you sure you want to clear all scan history? This action cannot be undone.")) {
      setClearLoading(true);
      try {
        await clearScanHistory();
        toast.success("Scan history cleared successfully");
      } catch (error) {
        console.error("Clear history error:", error);
        toast.error("Failed to clear scan history");
      } finally {
        setClearLoading(false);
      }
    }
  };

  const handleDisconnect = () => {
    if (window.confirm("Are you sure you want to disconnect from this tenant? You will need to reconnect to perform scans.")) {
      logout();
      navigate("/");
    }
  };

  return (
    <AppLayout pageTitle="Settings">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full md:w-auto mb-6">
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="security">Security Preferences</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scan Settings</CardTitle>
              <CardDescription>
                Configure how SecureGraph scans your Microsoft 365 environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications" className="text-base">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when scans complete or security issues are detected
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(checked) => handleSettingChange("notifications", checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoScan" className="text-base">Automatic Scans</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically run security scans on a regular schedule
                  </p>
                </div>
                <Switch
                  id="autoScan"
                  checked={settings.autoScan}
                  onCheckedChange={(checked) => handleSettingChange("autoScan", checked)}
                />
              </div>
              
              {settings.autoScan && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-6 mt-2 space-y-2"
                >
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="scanFrequency" className="text-sm">Scan Frequency</Label>
                    <select
                      id="scanFrequency"
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={settings.scanFrequency}
                      onChange={(e) => handleSettingChange("scanFrequency", e.target.value)}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </motion.div>
              )}
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sendReports" className="text-base">Email Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Send scan reports via email when complete
                  </p>
                </div>
                <Switch
                  id="sendReports"
                  checked={settings.sendReports}
                  onCheckedChange={(checked) => handleSettingChange("sendReports", checked)}
                />
              </div>
              
              {settings.sendReports && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-6 mt-2 space-y-2"
                >
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="reportEmail" className="text-sm">Email Address</Label>
                    <input
                      id="reportEmail"
                      type="email"
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={settings.reportEmail}
                      onChange={(e) => handleSettingChange("reportEmail", e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                </motion.div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSettings}>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Scan Preferences</CardTitle>
              <CardDescription>
                Configure which security aspects to include in your scans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.scanDetails).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key} className="text-base">
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Scan for {key
                        .replace(/([A-Z])/g, " $1")
                        .toLowerCase()} issues and vulnerabilities
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) => handleScanDetailChange(key, checked)}
                  />
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSettings}>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your Microsoft 365 tenant connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Connected Tenant</h3>
                <div className="p-4 border rounded-md bg-slate-50">
                  <div className="flex items-start">
                    <div className="flex-grow">
                      <p className="font-medium">{tenantId || "Not connected"}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {tenantId 
                          ? "Your Microsoft 365 tenant is connected successfully" 
                          : "No Microsoft 365 tenant connected"}
                      </p>
                    </div>
                    {tenantId && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-600">Connected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Account Actions</h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-amber-600 border-amber-200 hover:bg-amber-50"
                    onClick={() => toast.info("Refreshing connection...")}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Connection
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDisconnect}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Disconnect Tenant
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Export or delete your scan data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Export Data</h3>
                <p className="text-sm text-muted-foreground">
                  Download all your scan history and results
                </p>
                <Button 
                  variant="outline"
                  onClick={handleExportAllData}
                  disabled={exportLoading || scanHistory.length === 0}
                >
                  {exportLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export All Data
                    </>
                  )}
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-red-600 flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground">
                  These actions cannot be undone
                </p>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleClearScanHistory}
                    disabled={clearLoading || scanHistory.length === 0}
                  >
                    {clearLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All Scan History
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                        toast.error("Account deletion is not implemented in this demo");
                      }
                    }}
                  >
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Settings;
