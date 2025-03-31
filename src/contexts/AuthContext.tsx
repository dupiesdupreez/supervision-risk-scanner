import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// MS Graph Auth Parameters - Get clientId from localStorage or use a default (for development only)
const getClientId = () => localStorage.getItem("setupClientId") || "";
const redirectUri = window.location.origin;
const scopes = [
  "openid",
  "profile",
  "offline_access",
  // Directory access
  "Directory.Read.All",
  "User.Read.All",
  "Group.Read.All",
  // Security and compliance
  "SecurityEvents.Read.All",
  "IdentityRiskyUser.Read.All",
  "Policy.Read.All",
  "SecurityActions.Read.All",
  // Audit and reports
  "AuditLog.Read.All",
  "Reports.Read.All",
  // Organization
  "Organization.Read.All",
  // Applications
  "Application.Read.All",
  // Exchange and email
  "Mail.Read",
  //"Exchange.ManageAsApp",
  // Device management
  "DeviceManagementConfiguration.Read.All",
  "DeviceManagementManagedDevices.Read.All",
  // Security APIs
 // "ThreatAssessment.Read.All",
  "ThreatIndicators.Read.All",
  "SecurityIncident.Read.All",
  // Information protection
 // "InformationProtectionPolicy.Read.All",
  // Role management
  "RoleManagement.Read.All",
  // Sites and SharePoint
  "Sites.Read.All"
];

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  tenantId: string | null;
  login: (redirectPath?: string) => void;
  logout: () => void;
  handleAuthCallback: (code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuthCallback = useCallback(async (code: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const codeVerifier = localStorage.getItem("codeVerifier");
      if (!codeVerifier) {
        throw new Error("Code verifier missing");
      }

      console.log("Code Verifier:", codeVerifier); // Debug log

      // Exchange auth code for tokens
      const tokenResponse = await fetchTokens(code, codeVerifier);
      console.log("Token Response:", tokenResponse); // Debug log

      // Extract tenant ID from ID token
      const idToken = parseJwt(tokenResponse.id_token);
      const detectedTenantId = idToken.tid;
      console.log("Detected Tenant ID:", detectedTenantId); // Debug log

      // Store tokens and expiration
      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();
      localStorage.setItem("accessToken", tokenResponse.access_token);
      localStorage.setItem("refreshToken", tokenResponse.refresh_token);
      localStorage.setItem("idToken", tokenResponse.id_token);
      localStorage.setItem("expiresAt", expiresAt);
      localStorage.setItem("tenantId", detectedTenantId);

      // Update state
      setAccessToken(tokenResponse.access_token);
      setTenantId(detectedTenantId);
      setIsAuthenticated(true);

      toast.success("Successfully authenticated with Microsoft 365");
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("Token exchange error:", error);
      localStorage.removeItem("codeVerifier");
      setIsLoading(false);
      throw error;
    }
  }, []);

  // Add refreshToken function
  const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem("refreshToken");
    const clientId = getClientId();

    if (!refreshToken || !clientId) {
      return false;
    }

    try {
      const params = new URLSearchParams();
      params.append("client_id", clientId);
      params.append("scope", scopes.join(" "));
      params.append("refresh_token", refreshToken);
      params.append("grant_type", "refresh_token");

      const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const tokenResponse = await response.json();
      
      // Update tokens and expiration
      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();
      localStorage.setItem("accessToken", tokenResponse.access_token);
      localStorage.setItem("refreshToken", tokenResponse.refresh_token);
      localStorage.setItem("expiresAt", expiresAt);

      setAccessToken(tokenResponse.access_token);
      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  };

  // Add automatic token refresh
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const expiresAt = localStorage.getItem("expiresAt");
    if (!expiresAt) return;

    const expiryDate = new Date(expiresAt);
    const timeUntilExpiry = expiryDate.getTime() - Date.now();
    
    // Refresh token 5 minutes before expiry
    const refreshBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    const refreshTimeout = timeUntilExpiry - refreshBuffer;

    if (refreshTimeout <= 0) {
      // Token is expired or about to expire, refresh immediately
      refreshAccessToken().then((success) => {
        if (!success) {
          logout();
        }
      });
      return;
    }

    // Schedule token refresh
    const refreshTimer = setTimeout(() => {
      refreshAccessToken().then((success) => {
        if (!success) {
          logout();
        }
      });
    }, refreshTimeout);

    return () => clearTimeout(refreshTimer);
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem("accessToken");
    const storedTenantId = localStorage.getItem("tenantId");
    const expiresAt = localStorage.getItem("expiresAt");

    if (token && storedTenantId && expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (expiryDate > new Date()) {
        // Token is still valid
        setAccessToken(token);
        setTenantId(storedTenantId);
        setIsAuthenticated(true);
      } else {
        // Token is expired, try to refresh
        refreshAccessToken().then((success) => {
          if (success) {
            setAccessToken(localStorage.getItem("accessToken"));
            setTenantId(storedTenantId);
            setIsAuthenticated(true);
          } else {
            // Refresh failed, clear everything
            logout();
          }
        });
      }
    }

    setIsLoading(false);

    // Check for auth code in URL (callback from Microsoft login)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      console.log("Auth code found in URL:", code); // Debug log
      handleAuthCallback(code)
        .then(() => {
          // Remove code from URL without refreshing page
          const newUrl = window.location.href.split("?")[0];
          window.history.pushState({ path: newUrl }, "", newUrl);
        })
        .catch((error) => {
          console.error("Authentication error:", error);
          toast.error("Authentication failed. Please try again.");
        });
    }
  }, [navigate, handleAuthCallback]);

  const login = async (redirectPath?: string) => {
    const state = redirectPath || "/dashboard";
    const clientId = getClientId();
    
    if (!clientId) {
      toast.error("No Application ID found. Please enter your Application ID on the home page.");
      navigate("/");
      return;
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();

    try {
      // Calculate code challenge
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      localStorage.setItem("codeVerifier", codeVerifier);
      localStorage.setItem("authRedirectPath", state);

      // Build auth URL - Remove "prompt=admin_consent" parameter
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?`
        + `client_id=${clientId}`
        + `&response_type=code`
        + `&redirect_uri=${encodeURIComponent(redirectUri)}`
        + `&response_mode=query`
        + `&scope=${encodeURIComponent(scopes.join(" "))}`
        + `&state=${encodeURIComponent(state)}`
        + `&code_challenge=${encodeURIComponent(codeChallenge)}`
        + `&code_challenge_method=S256`
        + `&prompt=consent`; // Changed from admin_consent to consent

      // Redirect to Microsoft login
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error generating code challenge:", error);
      toast.error("Failed to initialize login. Please try again.");
    }
  };

  const logout = () => {
    // Clear all auth data
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("idToken");
    localStorage.removeItem("expiresAt");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("codeVerifier");

    setAccessToken(null);
    setTenantId(null);
    setIsAuthenticated(false);

    // Redirect to home
    navigate("/");
  };

  // Helper functions for authentication
  const fetchTokens = async (code: string, codeVerifier: string) => {
    const tokenEndpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const clientId = getClientId();
  
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("scope", scopes.join(" "));
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("grant_type", "authorization_code");
    params.append("code_verifier", codeVerifier);
  
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange failed:", errorText);
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }
  
    return await response.json();
  };
  

  // Function to parse JWT
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(atob(base64).split("").map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(""));

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error parsing JWT", error);
      return {};
    }
  };

  // Generate a random code verifier string for PKCE
  const generateCodeVerifier = (): string => {
    // Create a random string between 43-128 characters
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const length = 43 + Math.floor(Math.random() * 43); // Between 43-86 characters

    let result = "";
    const randValues = new Uint8Array(length);
    window.crypto.getRandomValues(randValues);

    for (let i = 0; i < length; i++) {
      result += chars.charAt(randValues[i] % chars.length);
    }

    return result;
  };

  // Generate code challenge from verifier using SHA-256
  const generateCodeChallenge = async (verifier: string): Promise<string> => {
    // Convert verifier to UTF-8
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);

    // Generate SHA-256 hash
    const hash = await window.crypto.subtle.digest("SHA-256", data);

    // Convert hash to Base64URL format
    return base64UrlEncode(new Uint8Array(hash));
  };

  // Helper function to encode Uint8Array to base64url format
  const base64UrlEncode = (buffer: Uint8Array): string => {
    // Convert buffer to base64
    const base64 = btoa(String.fromCharCode.apply(null, [...buffer]));

    // Convert to base64url (replace + with -, / with _, and remove =)
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const value = {
    isAuthenticated,
    isLoading,
    accessToken,
    tenantId,
    login,
    logout,
    handleAuthCallback,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
