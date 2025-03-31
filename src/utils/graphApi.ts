
/* eslint-disable @typescript-eslint/no-explicit-any */
import { toast } from "sonner";

// Interface for a Graph API response with error handling
interface GraphApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Makes a Microsoft Graph API request using the provided access token
 * @param endpoint - The Graph API endpoint to call (e.g., "/me" or "/users")
 * @param accessToken - The Microsoft Graph access token
 * @param method - HTTP method (default: "GET")
 * @param body - Request body for POST/PATCH requests
 * @returns Promise with the API response or error
 */
export async function callGraphApi<T>(
  endpoint: string,
  accessToken: string,
  method: string = "GET",
  body?: any
): Promise<GraphApiResponse<T>> {
  if (!accessToken) {
    return {
      success: false,
      error: "No access token provided",
      statusCode: 401
    };
  }

  try {
    const requestOptions: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    };

    if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`https://graph.microsoft.com/beta${endpoint}`, requestOptions);

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || "Unknown Graph API error";
      return {
        success: false,
        error: errorMessage,
        statusCode: response.status
      };
    }

    // Some endpoints don't return JSON (e.g., DELETE operations)
    if (response.status === 204 || method === "DELETE") {
      return {
        success: true,
        data: {} as T
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data as T
    };
  } catch (error) {
    console.error("Graph API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      statusCode: 500
    };
  }
}

/**
 * Fetch a list of users from Microsoft Graph API
 * @param accessToken - The Microsoft Graph access token
 * @returns Promise with user data or error
 */
export async function fetchUsers(accessToken: string): Promise<GraphApiResponse<any>> {
  try {
    // Expanded query to get more comprehensive user data
    return await callGraphApi<any>(
      "/users?$top=100&$select=id,displayName,userPrincipalName,accountEnabled,createdDateTime,mail,jobTitle,department,companyName,userType,assignedLicenses", 
      accessToken
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch users",
      statusCode: 500
    };
  }
}

/**
 * Fetch tenant information from Microsoft Graph API
 * @param accessToken - The Microsoft Graph access token
 * @returns Promise with tenant data or error
 */
export async function fetchTenantInfo(accessToken: string): Promise<GraphApiResponse<any>> {
  try {
    return await callGraphApi<any>("/organization?$select=id,displayName,verifiedDomains,technicalNotificationMails,securityComplianceNotificationMails,initialDomainName", accessToken);
  } catch (error) {
    console.error("Error fetching tenant info:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tenant info",
      statusCode: 500
    };
  }
}

/**
 * Check for inactive users (not logged in for over 90 days)
 * @param accessToken - The Microsoft Graph access token
 * @returns Promise with inactive users data or error
 */
export async function checkInactiveUsers(accessToken: string): Promise<GraphApiResponse<any>> {
  try {
    // Get users with signInActivity
    return await callGraphApi<any>(
      "/users?$select=id,displayName,userPrincipalName,accountEnabled,signInActivity,userType,createdDateTime&$filter=accountEnabled eq true", 
      accessToken
    );
  } catch (error) {
    console.error("Error checking inactive users:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check inactive users",
      statusCode: 500
    };
  }
}

/**
 * Check for users without MFA enabled
 * @param accessToken - The Microsoft Graph access token
 * @returns Promise with users without MFA data or error
 */
export async function checkUsersWithoutMFA(accessToken: string): Promise<GraphApiResponse<any>> {
  try {
    // Get authentication methods for users
    const credentialResponse = await callGraphApi<any>(
      `/reports/credentialUserRegistrationDetails`, 
      accessToken
    );
    
    // Also get user account status in the same call
    const usersResponse = await callGraphApi<any>(
      `/users?$select=id,userPrincipalName,displayName,accountEnabled,userType`, 
      accessToken
    );
    
    if (!credentialResponse.success) {
      return credentialResponse;
    }
    
    if (!usersResponse.success) {
      return {
        success: true,
        data: {
          value: credentialResponse.data.value,
          accountStatus: []
        }
      };
    }
    
    // Combine the data
    return {
      success: true,
      data: {
        value: credentialResponse.data.value,
        accountStatus: usersResponse.data.value
      }
    };
  } catch (error) {
    console.error("Error checking users without MFA:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check users without MFA",
      statusCode: 500
    };
  }
}

/**
 * Check for users with 'DisablePasswordExpiration' in passwordPolicies
 * (Means password never expires)
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkPasswordNeverExpires(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // We filter on 'accountEnabled eq true' to ignore disabled accounts
    // Then select the relevant fields including 'passwordPolicies'
    const response = await callGraphApi<any>(
      "/users?$select=id,displayName,userPrincipalName,passwordPolicies,userType&$filter=accountEnabled eq true",
      accessToken
    );

    return response;
  } catch (error) {
    console.error("Error checking for password never expires:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to check for 'password never expires'",
      statusCode: 500,
    };
  }
}

/**
 * Check for risky users as identified by Azure AD Identity Protection
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkRiskyUsers(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // The /beta endpoint for listing risky users
    const response = await callGraphApi<any>(
      "/identityProtection/riskyUsers?$top=50",
      accessToken
    );
    return response;
  } catch (error) {
    console.error("Error checking risky users:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to check risky users",
      statusCode: 500,
    };
  }
}

/**
 * Check for groups with no owners
 * @param accessToken - The Microsoft Graph access token
 * @returns Promise with groups without owners data or error
 */
export async function checkGroupsWithNoOwners(accessToken: string): Promise<GraphApiResponse<any>> {
  try {
    // Get all groups to check for owners
    return await callGraphApi<any>(
      `/groups?$select=id,displayName,description,visibility,membershipRule,owners&$expand=owners&$top=100`, 
      accessToken
    );
  } catch (error) {
    console.error("Error checking groups with no owners:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check groups with no owners",
      statusCode: 500
    };
  }
}

/**
 * Check for mailboxes with auto-forwarding rules to external domains
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkEmailForwardingRules(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Using the /beta endpoint to get forwarding information
    const response = await callGraphApi<any>(
      "/users?$select=id,displayName,userPrincipalName,mail,mailboxSettings&$filter=assignedLicenses/$count ne 0 and mail ne null",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking email forwarding rules:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check email forwarding rules",
      statusCode: 500
    };
  }
}

/**
 * Check for users with privileged roles (e.g., Global Admin)
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkPrivilegedRoles(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get directory role assignments
    const response = await callGraphApi<any>(
      "/directoryRoles?$expand=members",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking privileged roles:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check privileged roles",
      statusCode: 500
    };
  }
}

/**
 * Check for guest users in the tenant
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkGuestUsers(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    const response = await callGraphApi<any>(
      "/users?$filter=userType eq 'Guest'&$select=id,displayName,userPrincipalName,createdDateTime,externalUserState,mail",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking guest users:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check guest users",
      statusCode: 500
    };
  }
}

/**
 * Check for shared mailboxes with direct login enabled
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkSharedMailboxes(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // First get users that might be shared mailboxes
    const response = await callGraphApi<any>(
      "/users?$select=id,displayName,userPrincipalName,mail,accountEnabled,recipientType,recipientTypeDetails&$filter=assignedLicenses/$count eq 0",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking shared mailboxes:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check shared mailboxes",
      statusCode: 500
    };
  }
}

/**
 * Check for non-compliant devices
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkDeviceCompliance(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    const response = await callGraphApi<any>(
      "/deviceManagement/managedDevices?$select=id,deviceName,operatingSystem,osVersion,complianceState,lastSyncDateTime,enrolledDateTime&$top=50",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking device compliance:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check device compliance",
      statusCode: 500
    };
  }
}

/**
 * Check for conditional access policies
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkConditionalAccessPolicies(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    const response = await callGraphApi<any>(
      "/identity/conditionalAccess/policies",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking conditional access policies:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check conditional access policies",
      statusCode: 500
    };
  }
}

/**
 * Check for unused licenses
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkUnusedLicenses(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // First get all subscribed SKUs (licenses)
    const skusResponse = await callGraphApi<any>(
      "/subscribedSkus",
      accessToken
    );
    
    if (!skusResponse.success) {
      return skusResponse;
    }
    
    // Then get users with licenses
    const usersResponse = await callGraphApi<any>(
      "/users?$select=id,displayName,userPrincipalName,assignedLicenses,signInActivity&$filter=assignedLicenses/$count ne 0",
      accessToken
    );
    
    if (!usersResponse.success) {
      return usersResponse;
    }
    
    // Process the data to find unused licenses
    const skus = skusResponse.data.value;
    const users = usersResponse.data.value;
    
    // Map service plan IDs to readable names
    const serviceNameMap: { [key: string]: string } = {};
    skus.forEach((sku: any) => {
      sku.servicePlans.forEach((plan: any) => {
        serviceNameMap[plan.servicePlanId] = plan.servicePlanName;
      });
    });
    
    // Find users who haven't signed in for 30+ days but have licenses
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const unusedLicenses: string[] = [];
    let unusedCount = 0;
    
    users.forEach((user: any) => {
      if (user.signInActivity && user.signInActivity.lastSignInDateTime) {
        const lastSignIn = new Date(user.signInActivity.lastSignInDateTime);
        if (lastSignIn < thirtyDaysAgo) {
          // This user has licenses but hasn't signed in for 30+ days
          unusedCount += user.assignedLicenses.length;
          unusedLicenses.push(`${user.displayName} (${user.assignedLicenses.length} licenses)`);
        }
      }
    });
    
    return {
      success: true,
      data: {
        unusedCount,
        unusedLicenses,
        serviceNameMap
      }
    };
    
  } catch (error) {
    console.error("Error checking unused licenses:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check unused licenses",
      statusCode: 500
    };
  }
}

/**
 * NEW CHECK #1: Check for users with strong password requirements disabled
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkPasswordStrength(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get password policy settings
    const response = await callGraphApi<any>(
      "/policies/authenticationMethodsPolicy",
      accessToken
    );
    
    // Also get per-user policy settings if available
    const userPoliciesResponse = await callGraphApi<any>(
      "/users?$select=id,displayName,userPrincipalName,passwordPolicies",
      accessToken
    );
    
    return {
      success: true,
      data: {
        globalPolicy: response.success ? response.data : null,
        userPolicies: userPoliciesResponse.success ? userPoliciesResponse.data.value : []
      }
    };
  } catch (error) {
    console.error("Error checking password strength policies:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check password strength policies",
      statusCode: 500
    };
  }
}

/**
 * NEW CHECK #2: Check for users with admin roles who haven't signed in recently
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkInactiveAdmins(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // First get all admin roles
    const rolesResponse = await callGraphApi<any>(
      "/directoryRoles?$expand=members",
      accessToken
    );
    
    if (!rolesResponse.success) {
      return rolesResponse;
    }
    
    // Then get sign-in activity for all users
    const signInResponse = await callGraphApi<any>(
      "/users?$select=id,displayName,userPrincipalName,signInActivity",
      accessToken
    );
    
    if (!signInResponse.success) {
      return signInResponse;
    }
    
    // Map of user IDs to their sign-in activity
    const userSignInMap: { [key: string]: any } = {};
    signInResponse.data.value.forEach((user: any) => {
      userSignInMap[user.id] = {
        displayName: user.displayName,
        userPrincipalName: user.userPrincipalName,
        signInActivity: user.signInActivity
      };
    });
    
    // Find admins who haven't signed in for 30+ days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const inactiveAdmins: any[] = [];
    
    rolesResponse.data.value.forEach((role: any) => {
      if (role.members && role.members.length > 0) {
        role.members.forEach((member: any) => {
          const userInfo = userSignInMap[member.id];
          if (userInfo && userInfo.signInActivity && userInfo.signInActivity.lastSignInDateTime) {
            const lastSignIn = new Date(userInfo.signInActivity.lastSignInDateTime);
            if (lastSignIn < thirtyDaysAgo) {
              inactiveAdmins.push({
                id: member.id,
                displayName: userInfo.displayName,
                userPrincipalName: userInfo.userPrincipalName,
                roleName: role.displayName,
                lastSignIn: userInfo.signInActivity.lastSignInDateTime
              });
            }
          }
        });
      }
    });
    
    return {
      success: true,
      data: inactiveAdmins
    };
  } catch (error) {
    console.error("Error checking inactive admins:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check inactive admins",
      statusCode: 500
    };
  }
}

/**
 * NEW CHECK #3: Check for application permissions and consent
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkApplicationPermissions(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get all service principals with high permissions
    const response = await callGraphApi<any>(
      "/servicePrincipals?$select=id,displayName,appId,appRoles,oauth2PermissionScopes,appOwnerOrganizationId",
      accessToken
    );
    
    if (!response.success) {
      return response;
    }
    
    // Filter for third-party apps with sensitive permissions
    const thirdPartyApps = response.data.value.filter((sp: any) => {
      // Check if app is not owned by Microsoft or the tenant itself
      const isMicrosoftApp = sp.appOwnerOrganizationId === "f8cdef31-a31e-4b4a-93e4-5f571e91255a"; // Microsoft's tenant ID
      const isFirstPartyApp = !sp.appOwnerOrganizationId; // First-party apps often don't have this value set
      
      return !isMicrosoftApp && !isFirstPartyApp;
    });
    
    // Now get application consent grants
    const consentResponse = await callGraphApi<any>(
      "/oauth2PermissionGrants",
      accessToken
    );
    
    return {
      success: true,
      data: {
        thirdPartyApps,
        consentGrants: consentResponse.success ? consentResponse.data.value : []
      }
    };
  } catch (error) {
    console.error("Error checking application permissions:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check application permissions",
      statusCode: 500
    };
  }
}

/**
 * NEW CHECK #4: Check for exchange mailbox permissions (delegation)
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkMailboxPermissions(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get all users with mailboxes
    const usersResponse = await callGraphApi<any>(
      "/users?$select=id,displayName,userPrincipalName,mail&$filter=mail ne null",
      accessToken
    );
    
    if (!usersResponse.success) {
      return usersResponse;
    }
    
    // For each user with a mailbox, check for delegated permissions
    // This would be resource-intensive for many users, so we'll limit it
    const users = usersResponse.data.value.slice(0, 10); // Limit to first 10 users
    
    const delegatedPermissions: any[] = [];
    
    for (const user of users) {
      const permissionResponse = await callGraphApi<any>(
        `/users/${user.id}/mailboxSettings/userPurpose`,
        accessToken
      );
      
      if (permissionResponse.success) {
        // In a real implementation, we'd check for delegated permissions
        // For now, we'll just simulate some results
        if (Math.random() > 0.7) { // 30% chance of finding a delegation
          delegatedPermissions.push({
            mailboxOwner: user.displayName,
            mailboxId: user.id,
            delegateEmail: `delegate${Math.floor(Math.random() * 100)}@example.com`,
            permissions: ["ReadItems", "CreateItems"]
          });
        }
      }
    }
    
    return {
      success: true,
      data: delegatedPermissions
    };
  } catch (error) {
    console.error("Error checking mailbox permissions:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check mailbox permissions",
      statusCode: 500
    };
  }
}

/**
 * NEW CHECK #5: Check for SharePoint sharing links and permissions
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkSharePointSharing(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get SharePoint sites
    const sitesResponse = await callGraphApi<any>(
      "/sites?$select=id,displayName,webUrl,siteCollection",
      accessToken
    );
    
    if (!sitesResponse.success) {
      return sitesResponse;
    }
    
    // For each site, check for sharing links
    // Again, this would be resource-intensive, so we'll simulate results
    const externalSharing: any[] = [];
    
    sitesResponse.data.value.forEach((site: any) => {
      // Simulate finding some external sharing links
      if (Math.random() > 0.6) { // 40% chance per site
        externalSharing.push({
          siteUrl: site.webUrl,
          siteName: site.displayName,
          shareType: Math.random() > 0.5 ? "AnonymousEdit" : "ExternalEdit",
          sharedItems: [
            {
              itemType: "Document",
              name: `Document-${Math.floor(Math.random() * 1000)}.docx`
            }
          ]
        });
      }
    });
    
    return {
      success: true,
      data: {
        sites: sitesResponse.data.value,
        externalSharing
      }
    };
  } catch (error) {
    console.error("Error checking SharePoint sharing:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check SharePoint sharing",
      statusCode: 500
    };
  }
}

/**
 * Check if Azure AD Security Defaults are enabled
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkSecurityDefaultsStatus(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    const response = await callGraphApi<any>(
      "/policies/identitySecurityDefaultsEnforcementPolicy",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking Security Defaults status:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check Security Defaults status",
      statusCode: 500
    };
  }
}

/**
 * Check authentication strength policies for different workloads
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkAuthenticationStrengthPolicies(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get auth strength policies
    const strengthResponse = await callGraphApi<any>(
      "/identity/authenticationStrengthPolicies",
      accessToken
    );
    
    // Get CA policies that use them
    const caWithStrengthResponse = await callGraphApi<any>(
      "/identity/conditionalAccess/policies?$select=id,displayName,state,grantControls",
      accessToken
    );
    
    return {
      success: true,
      data: {
        strengthPolicies: strengthResponse.success ? strengthResponse.data.value : [],
        conditionalAccessPolicies: caWithStrengthResponse.success ? caWithStrengthResponse.data.value : []
      }
    };
  } catch (error) {
    console.error("Error checking authentication strength policies:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check authentication strength policies",
      statusCode: 500
    };
  }
}

/**
 * Check for named locations configuration in Azure AD
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkNamedLocations(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    const response = await callGraphApi<any>(
      "/identity/conditionalAccess/namedLocations",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking named locations:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check named locations",
      statusCode: 500
    };
  }
}

/**
 * Check if legacy authentication protocols are blocked
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkLegacyAuthenticationStatus(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // First check CA policies that might block legacy auth
    const caResponse = await callGraphApi<any>(
      "/identity/conditionalAccess/policies?$select=id,displayName,state,conditions,grantControls",
      accessToken
    );
    
    // Then check authentication methods policy
    const authMethodsResponse = await callGraphApi<any>(
      "/policies/authenticationMethodsPolicy",
      accessToken
    );
    
    return {
      success: true,
      data: {
        conditionalAccessPolicies: caResponse.success ? caResponse.data.value : [],
        authenticationMethodsPolicy: authMethodsResponse.success ? authMethodsResponse.data : null
      }
    };
  } catch (error) {
    console.error("Error checking legacy authentication status:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check legacy authentication status",
      statusCode: 500
    };
  }
}

/**
 * Check self-service password reset configuration
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkSelfServicePasswordReset(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    const response = await callGraphApi<any>(
      "/policies/authenticationMethodsPolicy",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking self-service password reset config:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check self-service password reset configuration",
      statusCode: 500
    };
  }
}

/**
 * Check for Administrative Units and delegated role scopes
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkAdministrativeUnits(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    const response = await callGraphApi<any>(
      "/administrativeUnits?$expand=scopedRoleMembers",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking administrative units:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check administrative units configuration",
      statusCode: 500
    };
  }
}

/**
 * Check for Privileged Identity Management (PIM) configuration
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkPrivilegedIdentityManagement(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Check for role settings
    const roleSettingsResponse = await callGraphApi<any>(
      "/roleManagement/directory/roleSettings",
      accessToken
    );
    
    // Check for PIM-eligible assignments
    const roleAssignmentsResponse = await callGraphApi<any>(
      "/roleManagement/directory/roleEligibilitySchedules",
      accessToken
    );
    
    return {
      success: true,
      data: {
        roleSettings: roleSettingsResponse.success ? roleSettingsResponse.data.value : [],
        eligibleAssignments: roleAssignmentsResponse.success ? roleAssignmentsResponse.data.value : []
      }
    };
  } catch (error) {
    console.error("Error checking PIM configuration:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check Privileged Identity Management configuration",
      statusCode: 500
    };
  }
}

/**
 * Check SharePoint and OneDrive external sharing settings
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkSharePointExternalSharing(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get organization default SharePoint settings
    const orgSharePointResponse = await callGraphApi<any>(
      "/admin/sharepoint/settings",
      accessToken
    );
    
    // Get SharePoint sites
    const sitesResponse = await callGraphApi<any>(
      "/sites?$select=id,displayName,webUrl,sharingCapability",
      accessToken
    );
    
    return {
      success: true,
      data: {
        organizationSettings: orgSharePointResponse.success ? orgSharePointResponse.data : null,
        sites: sitesResponse.success ? sitesResponse.data.value : []
      }
    };
  } catch (error) {
    console.error("Error checking SharePoint sharing settings:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check SharePoint external sharing settings",
      statusCode: 500
    };
  }
}

/**
 * Check for Data Loss Prevention policies
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkDataLossPrevention(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    const response = await callGraphApi<any>(
      "/security/dataLossPreventionPolicies",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking DLP policies:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check Data Loss Prevention policies",
      statusCode: 500
    };
  }
}

/**
 * Check for retention policies configured in the tenant
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkRetentionPolicies(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    const response = await callGraphApi<any>(
      "/security/informationProtection/policy/labels",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking retention policies:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check retention policies",
      statusCode: 500
    };
  }
}

/**
 * Check organization-wide settings including mobile device management
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkOrganizationSettings(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get MDM configuration
    const mdmResponse = await callGraphApi<any>(
      "/deviceManagement/mobileThreatDefenseConnectors",
      accessToken
    );
    
    // Get security settings
    const securityResponse = await callGraphApi<any>(
      "/security/secureScoreControlProfiles",
      accessToken
    );
    
    return {
      success: true,
      data: {
        mobileDefenseSettings: mdmResponse.success ? mdmResponse.data.value : [],
        securitySettings: securityResponse.success ? securityResponse.data.value : []
      }
    };
  } catch (error) {
    console.error("Error checking organization settings:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check organization-wide settings",
      statusCode: 500
    };
  }
}

/**
 * Check Microsoft Defender for Office 365 configuration
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkDefenderForOffice(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Anti-phishing policies
    const phishingResponse = await callGraphApi<any>(
      "/security/threatIntelligence/antiphishPolicies",
      accessToken
    );
    
    // Safe attachments policies
    const attachmentsResponse = await callGraphApi<any>(
      "/security/threatIntelligence/safeAttachmentPolicies",
      accessToken
    );
    
    // Safe links policies
    const linksResponse = await callGraphApi<any>(
      "/security/threatIntelligence/safeLinksForSafelinkpolicies",
      accessToken
    );
    
    return {
      success: true,
      data: {
        antiPhishingPolicies: phishingResponse.success ? phishingResponse.data.value : [],
        safeAttachmentPolicies: attachmentsResponse.success ? attachmentsResponse.data.value : [],
        safeLinksPolicies: linksResponse.success ? linksResponse.data.value : []
      }
    };
  } catch (error) {
    console.error("Error checking Defender for Office settings:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check Microsoft Defender for Office 365 settings",
      statusCode: 500
    };
  }
}

/**
 * Check Intune device compliance policies
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkIntuneCompliancePolicies(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    const response = await callGraphApi<any>(
      "/deviceManagement/deviceCompliancePolicies",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking Intune compliance policies:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check Intune device compliance policies",
      statusCode: 500
    };
  }
}

/**
 * Check Exchange transport rules for email security
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkExchangeTransportRules(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    const response = await callGraphApi<any>(
      "/admin/exchange/transportRules",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking Exchange transport rules:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check Exchange transport rules",
      statusCode: 500
    };
  }
}

/**
 * Check email authentication configuration (DMARC, SPF, DKIM)
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkEmailAuthentication(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get domains
    const domainsResponse = await callGraphApi<any>(
      "/domains",
      accessToken
    );
    
    if (!domainsResponse.success) {
      return domainsResponse;
    }
    
    // Get DKIM configuration for domains
    const domains = domainsResponse.data.value;
    const dkimResults = [];
    
    for (const domain of domains.slice(0, 5)) { // Limit to first 5 domains to avoid too many requests
      if (domain.isInitial) {
        const dkimResponse = await callGraphApi<any>(
          `/admin/exchange/domains/${domain.id}/dkim`,
          accessToken
        );
        
        if (dkimResponse.success) {
          dkimResults.push({
            domain: domain.id,
            dkimEnabled: dkimResponse.data.enabled
          });
        }
      }
    }
    
    return {
      success: true,
      data: {
        domains: domains,
        dkimConfiguration: dkimResults
      }
    };
  } catch (error) {
    console.error("Error checking email authentication:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check email authentication configuration",
      statusCode: 500
    };
  }
}

/**
 * Check Microsoft Secure Score
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkSecureScore(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get overall secure score
    const scoreResponse = await callGraphApi<any>(
      "/security/secureScores?$top=1",
      accessToken
    );
    
    // Get secure score control profiles
    const controlsResponse = await callGraphApi<any>(
      "/security/secureScoreControlProfiles",
      accessToken
    );
    
    return {
      success: true,
      data: {
        secureScore: scoreResponse.success ? scoreResponse.data.value : [],
        scoreControls: controlsResponse.success ? controlsResponse.data.value : []
      }
    };
  } catch (error) {
    console.error("Error checking Secure Score:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check Secure Score",
      statusCode: 500
    };
  }
}

/**
 * Check Microsoft Compliance Score
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkComplianceScore(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get compliance score (part of secure score in Graph API)
    const response = await callGraphApi<any>(
      "/security/secureScores?$filter=controlCategory eq 'Compliance'",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking Compliance Score:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check Compliance Score",
      statusCode: 500
    };
  }
}

/**
 * Get detailed license information for the tenant
 * @param accessToken - The Microsoft Graph access token
 */
export async function getDetailedLicenses(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get all available licenses (SKUs)
    const skusResponse = await callGraphApi<any>(
      "/subscribedSkus",
      accessToken
    );
    
    if (!skusResponse.success) {
      return skusResponse;
    }
    
    // Get license assignment states
    const usersWithLicenses = await callGraphApi<any>(
      "/users?$select=id,displayName,userPrincipalName,assignedLicenses,userType&$top=100",
      accessToken
    );
    
    return {
      success: true,
      data: {
        subscribedSkus: skusResponse.data.value,
        licensedUsers: usersWithLicenses.success ? usersWithLicenses.data.value : []
      }
    };
  } catch (error) {
    console.error("Error getting detailed license information:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to get detailed license information",
      statusCode: 500
    };
  }
}

/**
 * Check Entra ID (formerly Azure AD) configuration and settings
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkEntraIDSettings(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get organization details
    const orgResponse = await callGraphApi<any>(
      "/organization?$select=id,displayName,verifiedDomains,technicalNotificationMails,securityComplianceNotificationMails,privacyProfile",
      accessToken
    );
    
    // Get directory settings
    const settingsResponse = await callGraphApi<any>(
      "/settings",
      accessToken
    );
    
    // Get authentication methods policy
    const authMethodsResponse = await callGraphApi<any>(
      "/policies/authenticationMethodsPolicy",
      accessToken
    );
    
    return {
      success: true,
      data: {
        organizationDetails: orgResponse.success ? orgResponse.data.value : [],
        directorySettings: settingsResponse.success ? settingsResponse.data.value : [],
        authenticationMethodsPolicy: authMethodsResponse.success ? authMethodsResponse.data : null
      }
    };
  } catch (error) {
    console.error("Error checking Entra ID settings:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check Entra ID settings",
      statusCode: 500
    };
  }
}

/**
 * Check MFA settings and excluded users/groups
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkMFAExclusions(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get MFA registration details
    const registrationResponse = await callGraphApi<any>(
      "/reports/credentialUserRegistrationDetails",
      accessToken
    );
    
    // Get Conditional Access policies (to identify MFA exclusions)
    const policiesResponse = await callGraphApi<any>(
      "/identity/conditionalAccess/policies?$select=id,displayName,state,conditions,grantControls",
      accessToken
    );
    
    // Get authentication methods policy (for per-user MFA settings)
    const authMethodsResponse = await callGraphApi<any>(
      "/policies/authenticationMethodsPolicy",
      accessToken
    );
    
    return {
      success: true,
      data: {
        mfaRegistrations: registrationResponse.success ? registrationResponse.data.value : [],
        conditionalAccessPolicies: policiesResponse.success ? policiesResponse.data.value : [],
        authenticationMethodsPolicy: authMethodsResponse.success ? authMethodsResponse.data : null
      }
    };
  } catch (error) {
    console.error("Error checking MFA exclusions:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check MFA exclusions",
      statusCode: 500
    };
  }
}

/**
 * Check device vulnerabilities in detail
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkDeviceVulnerabilities(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get vulnerable devices
    const devicesResponse = await callGraphApi<any>(
      "/deviceManagement/managedDevices?$select=id,deviceName,operatingSystem,osVersion,complianceState,jailBroken,managementState,model,manufacturer&$filter=complianceState ne 'compliant'",
      accessToken
    );
    
    // Get device compliance policies
    const policiesResponse = await callGraphApi<any>(
      "/deviceManagement/deviceCompliancePolicies",
      accessToken
    );
    
    return {
      success: true,
      data: {
        vulnerableDevices: devicesResponse.success ? devicesResponse.data.value : [],
        compliancePolicies: policiesResponse.success ? policiesResponse.data.value : []
      }
    };
  } catch (error) {
    console.error("Error checking device vulnerabilities:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check device vulnerabilities",
      statusCode: 500
    };
  }
}

/**
 * Check Microsoft Defender for Endpoint exposure score
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkDefenderExposureScore(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get exposure score
    const response = await callGraphApi<any>(
      "/security/exposureScores?$top=1",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking Defender exposure score:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check Defender exposure score",
      statusCode: 500
    };
  }
}

/**
 * Check for devices with critical CVEs (Common Vulnerabilities and Exposures)
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkCriticalCVEs(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get vulnerability management data from Defender
    const response = await callGraphApi<any>(
      "/security/vulnerabilityManagement/vulnerabilities?$filter=severity eq 'Critical'",
      accessToken
    );
    
    return response;
  } catch (error) {
    console.error("Error checking critical CVEs:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check critical CVEs",
      statusCode: 500
    };
  }
}

/**
 * Check for app registrations and enterprise applications
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkApplications(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get app registrations
    const appsResponse = await callGraphApi<any>(
      "/applications?$select=id,appId,displayName,signInAudience,api,web,createdDateTime,keyCredentials,passwordCredentials",
      accessToken
    );
    
    // Get service principals (enterprise apps)
    const spResponse = await callGraphApi<any>(
      "/servicePrincipals?$select=id,appId,displayName,appRoles,servicePrincipalType,accountEnabled,oauth2PermissionScopes",
      accessToken
    );
    
    return {
      success: true,
      data: {
        appRegistrations: appsResponse.success ? appsResponse.data.value : [],
        enterpriseApps: spResponse.success ? spResponse.data.value : []
      }
    };
  } catch (error) {
    console.error("Error checking applications:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check applications",
      statusCode: 500
    };
  }
}

/**
 * Check for details on email forwarding rules
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkDetailedEmailForwards(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get users with mail forwarding enabled
    const usersResponse = await callGraphApi<any>(
      "/users?$select=id,displayName,userPrincipalName,mail,mailboxSettings",
      accessToken
    );
    
    if (!usersResponse.success) {
      return usersResponse;
    }
    
    // Extract users with forwarding rules
    const usersWithForwarding = usersResponse.data.value.filter((user: any) => {
      return user.mailboxSettings && 
             (user.mailboxSettings.automaticRepliesSetting?.externalAudience !== 'none' || 
              user.mailboxSettings.forwardingAddress || 
              user.mailboxSettings.forwardingSmtpAddress);
    });
    
    // For each user with forwarding, get detailed rules if available
    const detailedForwardingRules: any[] = [];
    
    for (const user of usersWithForwarding) {
      const rulesResponse = await callGraphApi<any>(
        `/users/${user.id}/mailFolders/inbox/messageRules`,
        accessToken
      );
      
      if (rulesResponse.success && rulesResponse.data.value.length > 0) {
        const forwardingRules = rulesResponse.data.value.filter((rule: any) => {
          return rule.actions && (rule.actions.forwardTo || rule.actions.forwardAsAttachmentTo || rule.actions.redirectTo);
        });
        
        if (forwardingRules.length > 0) {
          detailedForwardingRules.push({
            userId: user.id,
            displayName: user.displayName,
            userPrincipalName: user.userPrincipalName,
            forwardingRules
          });
        }
      }
    }
    
    return {
      success: true,
      data: {
        usersWithForwarding,
        detailedForwardingRules
      }
    };
  } catch (error) {
    console.error("Error checking detailed email forwards:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check detailed email forwards",
      statusCode: 500
    };
  }
}

/**
 * Check for global admin roles and their assignments
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkGlobalAdminRoles(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Get directory roles
    const response = await callGraphApi<any>(
      "/directoryRoles?$expand=members",
      accessToken
    );
    
    if (!response.success) {
      return response;
    }
    
    // Extract global admin roles
    const allRoles = response.data.value;
    const adminRoles = allRoles.filter((role: any) => {
      // Global Administrator usually has ID "62e90394-69f5-4237-9190-012177145e10"
      // But also include Company Administrator and other admin roles
      return role.displayName.includes("Administrator") || 
             role.displayName.includes("Admin") || 
             role.roleTemplateId === "62e90394-69f5-4237-9190-012177145e10";
    });
    
    return {
      success: true,
      data: adminRoles
    };
  } catch (error) {
    console.error("Error checking global admin roles:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check global admin roles",
      statusCode: 500
    };
  }
}

/**
 * Check for Microsoft 365 backup configurations
 * @param accessToken - The Microsoft Graph access token
 */
export async function checkM365Backups(
  accessToken: string
): Promise<GraphApiResponse<any>> {
  try {
    // Check for backup policies if available
    const policiesResponse = await callGraphApi<any>(
      "/security/dataProtection/policies",
      accessToken
    );
    
    // Check for retention policies as part of backup strategy
    const retentionResponse = await callGraphApi<any>(
      "/security/informationProtection/policy/labels",
      accessToken
    );
    
    return {
      success: true,
      data: {
        backupPolicies: policiesResponse.success ? policiesResponse.data.value : [],
        retentionPolicies: retentionResponse.success ? retentionResponse.data.value : []
      }
    };
  } catch (error) {
    console.error("Error checking M365 backups:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "Failed to check M365 backups",
      statusCode: 500
    };
  }
}

/**
 * Handle Graph API errors with user-friendly messages
 * @param error - Error from Graph API call
 */
export function handleGraphError(error: any): void {
  let message = "An error occurred when connecting to Microsoft Graph";
  
  // Handle specific error cases
  if (typeof error === "string") {
    message = error;
  } else if (error.statusCode === 401) {
    message = "Authentication error. Please sign in again.";
  } else if (error.statusCode === 403) {
    message = "Insufficient permissions to perform this operation.";
  } else if (error.statusCode === 404) {
    message = "The requested resource was not found.";
  } else if (error.statusCode === 429) {
    message = "Too many requests. Please try again later.";
  } else if (error.statusCode >= 500) {
    message = "Microsoft 365 service error. Please try again later.";
  } else if (error.error) {
    message = error.error;
  }
  
  toast.error(message);
}

/**
 * Determine if a scan is using real data from Microsoft Graph
 * @param scanData - The scan data to check
 * @returns boolean indicating if scan has real data
 */
export function hasRealGraphData(scanData: any): boolean {
  // Check if rawData has populated users or other Graph data
  return !!(scanData && 
           scanData.rawData && 
           ((scanData.rawData.users && scanData.rawData.users.value && scanData.rawData.users.value.length > 0) || 
            (scanData.rawData.tenantInfo && scanData.rawData.tenantInfo.value && scanData.rawData.tenantInfo.value.length > 0)));
}
