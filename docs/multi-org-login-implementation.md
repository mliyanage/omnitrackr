# Multi-Organization Login Selection Implementation Plan

## Problem Statement

Users with the same email address can exist in multiple organizations in the OmniTrackr system. Currently, the login flow does not support organization selection, causing unpredictable behavior when a user with multiple organization memberships tries to log in.

**Current Issue:**
- Database constraint allows same email across different organizations: `UNIQUE (email, organization_id)`
- `AuthService.login()` uses `findByEmail()` which searches globally and returns the first match
- Users have no way to select which organization they want to log into
- This results in users being logged into a random organization (whichever was returned first by the query)

## Industry Best Practices

### Approach Comparison

| Approach | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Organization Selector After Password** | Simple UX, secure, common in B2B SaaS | Extra step for single-org users | ✅ **Recommended for OmniTrackr** |
| **Subdomain-based** (acme.omnitrackr.com) | Clear org separation, SEO benefits | Complex DNS setup, harder to switch orgs | Enterprise with branded URLs |
| **URL Parameter** (/login?org=acme) | Easy to implement | Users need to remember org identifier | Simple B2B apps |
| **Email Domain Mapping** | Automatic, no user input | Requires email domain verification, doesn't work for personal emails | Enterprise SSO scenarios |
| **Remember Last Org** | Convenient for repeat logins | Still need selector for first login | Enhancement, not primary solution |

**Industry Examples:**
- **Slack**: Shows organization selector after password validation
- **Asana**: Displays workspace selector post-authentication
- **Monday.com**: Lists all accessible organizations
- **GitHub**: Shows organization/account switcher after login

## Recommended Solution: Organization Selector After Password Validation

### UX Flow

```
1. User enters email + password
2. Backend validates credentials
3. Backend checks: How many organizations does this email belong to?

   Case A: Single Organization
   → Proceed directly to login
   → Issue JWT with that organization_id
   → Redirect to dashboard

   Case B: Multiple Organizations
   → Return list of organizations user belongs to
   → Frontend shows organization selector screen
   → User selects organization
   → Backend issues JWT with selected organization_id
   → Redirect to dashboard
```

### Security Considerations

1. **Password Validation First**: Always validate password before revealing organization list
2. **Temporary Session Token**: Use short-lived temp token for organization selection (5 min expiry)
3. **Organization List**: Only show organizations where user account is active
4. **Rate Limiting**: Prevent enumeration attacks on organization lists
5. **Audit Logging**: Log organization selection events

---

## Implementation Plan

### Phase 1: Backend API Changes

#### 1.1 Add New Repository Methods

**File:** `/packages/shared/src/repositories/user.repository.ts`

```typescript
/**
 * Find all user records by email across all organizations
 * Used for multi-org login detection
 */
async findAllByEmail(email: string): Promise<User[]> {
  return this.db(this.tableName)
    .where({ email: email.toLowerCase(), deleted_at: null })
    .where('status', '!=', 'deactivated')
    .orderBy('last_login_at', 'desc');  // Most recently used org first
}
```

**Why:** Current `findByEmail()` returns first match only. Need to get all organizations for an email.

#### 1.2 Update AuthService Login Method

**File:** `/packages/api/src/services/auth.service.ts`

**New Login Response Types:**

```typescript
// Single org or after org selection
interface LoginSuccessResponse {
  requires2FA: false;
  requiresOrgSelection: false;
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Multiple orgs detected
interface LoginOrgSelectionResponse {
  requires2FA: false;
  requiresOrgSelection: true;
  tempToken: string;  // 5-min temp token for org selection
  organizations: Array<{
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
    role: string;  // User's role in this org
    last_login_at: string | null;  // When user last logged into this org
  }>;
}

// 2FA required
interface Login2FAResponse {
  requires2FA: true;
  requiresOrgSelection: false;
  tempToken: string;
  // If multiple orgs, we'll handle after 2FA verification
}
```

**Updated Login Flow:**

```typescript
async login(email: string, password: string, deviceInfo: DeviceInfo) {
  // Step 1: Find all users with this email
  const users = await this.userRepo.findAllByEmail(email);

  if (users.length === 0) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Step 2: Validate password against ALL user records
  // (password should be same across all orgs for same email)
  const user = users[0];
  const isPasswordValid = await verifyPassword(password, user.password_hash);

  if (!isPasswordValid) {
    // Track failed login, account lockout logic
    throw new UnauthorizedError('Invalid email or password');
  }

  // Step 3: Check account status and lockout
  if (user.status === 'deactivated') {
    throw new UnauthorizedError('Account is deactivated');
  }

  if (await this.userRepo.isAccountLocked(user.id)) {
    throw new UnauthorizedError('Account locked due to too many failed attempts');
  }

  // Step 4: Handle 2FA if enabled (for any of the user's orgs)
  if (user.two_fa_enabled) {
    const tempToken = generateTempToken({ email, verified2FA: false });
    return {
      requires2FA: true,
      requiresOrgSelection: false,
      tempToken,
    };
  }

  // Step 5: Check if user belongs to multiple organizations
  if (users.length > 1) {
    // Multiple organizations - need selection
    const tempToken = generateTempToken({
      email,
      verified2FA: true,
      passwordVerified: true
    });

    // Fetch organization details for each user
    const organizations = await Promise.all(
      users.map(async (u) => {
        const org = await db('organizations')
          .where({ id: u.organization_id })
          .first();

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo_url: org.logo_url,
          role: u.role,
          last_login_at: u.last_login_at,
        };
      })
    );

    return {
      requires2FA: false,
      requiresOrgSelection: true,
      tempToken,
      organizations: organizations.sort((a, b) => {
        // Sort by last login - most recent first
        if (!a.last_login_at) return 1;
        if (!b.last_login_at) return -1;
        return new Date(b.last_login_at).getTime() - new Date(a.last_login_at).getTime();
      }),
    };
  }

  // Step 6: Single organization - proceed with normal login
  const tokens = await this.generateTokensForUser(user, deviceInfo);
  await this.userRepo.resetFailedLoginAttempts(user.id);
  await this.userRepo.updateLastLogin(user.id, deviceInfo.ip);

  return {
    requires2FA: false,
    requiresOrgSelection: false,
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  };
}
```

#### 1.3 Add New Endpoint: Select Organization

**File:** `/packages/api/src/controllers/auth.controller.ts`

**New Endpoint:**

```typescript
/**
 * POST /api/auth/select-organization
 * Select organization after password validation
 * Requires temp token from login response
 */
selectOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tempToken, organizationId } = req.body;
    const deviceInfo = {
      deviceName: req.body.deviceName || 'Unknown Device',
      userAgent: req.headers['user-agent'],
      ip: (req.ip || req.socket.remoteAddress || '').replace('::ffff:', ''),
    };

    const result = await this.service.selectOrganization(
      tempToken,
      organizationId,
      deviceInfo
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Organization selected successfully',
    });
  } catch (error) {
    next(error);
  }
};
```

**Add to Routes:**
```typescript
router.post('/auth/select-organization', authController.selectOrganization);
```

#### 1.4 Add AuthService.selectOrganization Method

**File:** `/packages/api/src/services/auth.service.ts`

```typescript
/**
 * Complete login by selecting organization
 * Called when user has multiple organization memberships
 */
async selectOrganization(
  tempToken: string,
  organizationId: number,
  deviceInfo: DeviceInfo
): Promise<{ user: User; accessToken: string; refreshToken: string; expiresIn: number }> {
  // Step 1: Verify temp token
  let payload: any;
  try {
    payload = verifyTempToken(tempToken);
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  if (!payload.passwordVerified) {
    throw new UnauthorizedError('Password not verified');
  }

  // Step 2: Find user by email AND organization_id
  const user = await this.userRepo.findByEmailAndOrganization(
    payload.email,
    organizationId
  );

  if (!user || user.deleted_at) {
    throw new NotFoundError('User', 'email/organization combination');
  }

  if (user.status === 'deactivated') {
    throw new UnauthorizedError('Account is deactivated in this organization');
  }

  // Step 3: Generate tokens for selected organization
  const tokens = await this.generateTokensForUser(user, deviceInfo);

  // Step 4: Update login tracking
  await this.userRepo.resetFailedLoginAttempts(user.id);
  await this.userRepo.updateLastLogin(user.id, deviceInfo.ip);

  // Step 5: Log security event
  await this.logSecurityEvent(user.id, 'organization_selected', {
    organization_id: organizationId,
    ip: deviceInfo.ip,
  });

  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  };
}
```

#### 1.5 Update 2FA Verification for Multi-Org

**File:** `/packages/api/src/services/auth.service.ts`

After 2FA verification, if user belongs to multiple orgs, return organization selector:

```typescript
async verify2FA(email: string, totpCode: string, tempToken: string, deviceInfo: DeviceInfo) {
  // ... existing 2FA verification logic ...

  // After successful 2FA verification
  const users = await this.userRepo.findAllByEmail(email);

  if (users.length > 1) {
    // Multiple organizations - need selection
    const newTempToken = generateTempToken({
      email,
      verified2FA: true,
      passwordVerified: true
    });

    const organizations = await this.getOrganizationsForEmail(email);

    return {
      requiresOrgSelection: true,
      tempToken: newTempToken,
      organizations,
    };
  }

  // Single org - proceed with login
  // ... existing login logic ...
}
```

---

### Phase 2: Frontend Changes

#### 2.1 Update Login API Types

**File:** `/packages/frontend/src/api/auth.api.ts`

```typescript
// Update LoginResponse type
export interface LoginResponse {
  requires2FA?: boolean;
  requiresOrgSelection?: boolean;
  tempToken?: string;
  organizations?: Array<{
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
    role: string;
    last_login_at: string | null;
  }>;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

// Add new API function
export const selectOrganization = async (
  tempToken: string,
  organizationId: number,
  deviceName?: string
): Promise<ApiResponse<TokenResponse>> => {
  const response = await apiClient.post<ApiResponse<TokenResponse>>(
    '/auth/select-organization',
    { tempToken, organizationId, deviceName }
  );
  return response.data;
};
```

#### 2.2 Update LoginPage Component

**File:** `/packages/frontend/src/pages/LoginPage.tsx`

**Add New State:**

```typescript
// Track organization selection
const [requiresOrgSelection, setRequiresOrgSelection] = useState(false);
const [organizations, setOrganizations] = useState<any[]>([]);
const [orgTempToken, setOrgTempToken] = useState('');
const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
```

**Update Login Mutation:**

```typescript
const loginMutation = useMutation({
  mutationFn: login,
  onSuccess: (response) => {
    if (response.success && response.data) {
      // Case 1: Requires 2FA
      if (response.data.requires2FA) {
        setRequires2FA(true);
        setTempToken(response.data.tempToken || '');
        setUserEmail(loginForm.getValues('email'));
        showSuccess('Please enter your 2FA code');
      }
      // Case 2: Requires Organization Selection
      else if (response.data.requiresOrgSelection) {
        setRequiresOrgSelection(true);
        setOrganizations(response.data.organizations || []);
        setOrgTempToken(response.data.tempToken || '');
        showSuccess('Please select your organization');
      }
      // Case 3: Direct login (single org, no 2FA)
      else if (response.data.user && response.data.accessToken && response.data.refreshToken) {
        setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
        showSuccess('Welcome back!');
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    }
  },
  onError: showError,
});
```

**Add Organization Selection Mutation:**

```typescript
const selectOrgMutation = useMutation({
  mutationFn: ({ tempToken, organizationId }: { tempToken: string; organizationId: number }) =>
    selectOrganization(tempToken, organizationId, navigator.userAgent),
  onSuccess: (response) => {
    if (response.success && response.data) {
      setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
      showSuccess('Welcome back!');
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  },
  onError: showError,
});
```

**Handle Organization Selection:**

```typescript
const handleOrgSelection = (organizationId: number) => {
  setSelectedOrgId(organizationId);
  selectOrgMutation.mutate({
    tempToken: orgTempToken,
    organizationId,
  });
};
```

#### 2.3 Add Organization Selector UI

**File:** `/packages/frontend/src/pages/LoginPage.tsx`

Add new screen after login form and 2FA screen:

```tsx
{requiresOrgSelection && (
  <div className="space-y-4">
    <div className="text-center mb-6">
      <Building2 className="h-12 w-12 mx-auto text-primary mb-2" />
      <p className="text-sm text-muted-foreground">
        You belong to multiple organizations. Please select one to continue.
      </p>
    </div>

    <div className="space-y-3">
      {organizations.map((org) => (
        <button
          key={org.id}
          onClick={() => handleOrgSelection(org.id)}
          disabled={selectOrgMutation.isPending}
          className={cn(
            "w-full p-4 border rounded-lg text-left transition-all",
            "hover:border-primary hover:bg-primary/5",
            selectedOrgId === org.id && "border-primary bg-primary/5"
          )}
        >
          <div className="flex items-center gap-3">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="h-10 w-10 rounded" />
            ) : (
              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium">{org.name}</p>
              <p className="text-sm text-muted-foreground">
                {org.role.charAt(0).toUpperCase() + org.role.slice(1)}
                {org.last_login_at && (
                  <span className="ml-2">
                    · Last login: {new Date(org.last_login_at).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
            {selectedOrgId === org.id && selectOrgMutation.isPending && (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </div>
        </button>
      ))}
    </div>

    <Button
      variant="ghost"
      onClick={() => {
        setRequiresOrgSelection(false);
        setOrganizations([]);
        setOrgTempToken('');
        loginForm.reset();
      }}
      className="w-full"
    >
      Back to Login
    </Button>
  </div>
)}
```

---

### Phase 3: Database & Security Enhancements

#### 3.1 Add Organization Selection Audit Logging

Track when users select organizations:

```sql
-- Add to security_events table
INSERT INTO security_events (
  user_id,
  organization_id,
  event_type,
  severity,
  description,
  ip_address,
  metadata
) VALUES (
  user_id,
  selected_organization_id,
  'organization_selected',
  'info',
  'User selected organization during multi-org login',
  ip_address,
  jsonb_build_object('available_orgs', organization_count)
);
```

#### 3.2 Add Organization Switching Feature (Optional Enhancement)

**Future Enhancement:** Allow users to switch organizations without logging out

**New Endpoint:** `POST /api/auth/switch-organization`
- Requires valid access token
- Issues new tokens with different organization_id
- Logs organization switch event

---

### Phase 4: Testing Strategy

#### 4.1 Unit Tests

**Test:** `auth.service.test.ts`
- ✅ Login with single organization
- ✅ Login with multiple organizations returns org list
- ✅ Login with 2FA + multiple orgs
- ✅ Select organization with valid temp token
- ✅ Select organization with expired temp token
- ✅ Select organization with invalid org ID
- ✅ Password validation before org list reveal

#### 4.2 Integration Tests

**Test:** `auth.integration.test.ts`
- ✅ Complete multi-org login flow (password → org selection → JWT)
- ✅ 2FA + multi-org flow
- ✅ Organization list sorted by last login
- ✅ Deactivated user in one org can still access other org
- ✅ Audit log created for org selection

#### 4.3 E2E Tests

**Test:** `login.e2e.test.ts`
- ✅ User with 1 org sees no selector
- ✅ User with 2+ orgs sees selector with all orgs
- ✅ Can select organization and proceed to dashboard
- ✅ Organization logos display correctly
- ✅ Back button returns to login form

---

## Alternative Approaches Considered

### Approach 2: Subdomain-Based Organization Selection

**How it works:**
- Each organization has subdomain: `acme.omnitrackr.com`, `corp.omnitrackr.com`
- Login page detects subdomain
- Only searches for user in that organization

**Pros:**
- Clear URL-based organization separation
- Better for enterprise branding
- Simpler login flow (no selector needed)

**Cons:**
- Complex DNS configuration
- Harder for users to remember multiple URLs
- Requires wildcard SSL certificates
- Users can't easily switch between organizations

**Verdict:** Not recommended for current implementation. Can be added later as premium feature.

---

### Approach 3: Remember Last Organization

**How it works:**
- Store last selected organization in browser localStorage
- Auto-select last used org
- Show "Switch Organization" link

**Pros:**
- Convenient for repeat logins
- Reduces clicks for common case

**Cons:**
- Still need selector for first login
- localStorage can be cleared
- Doesn't work across devices

**Verdict:** Good enhancement to add ON TOP of organization selector, not a replacement.

**Implementation:**
```typescript
// In LoginPage.tsx
const lastOrgId = localStorage.getItem(`lastOrg_${email}`);
if (lastOrgId && organizations.some(o => o.id === parseInt(lastOrgId))) {
  // Auto-select and proceed
  handleOrgSelection(parseInt(lastOrgId));
} else {
  // Show selector
  setRequiresOrgSelection(true);
}
```

---

## Implementation Checklist

### Backend Tasks
- [ ] Add `findAllByEmail()` method to UserRepository
- [ ] Update `AuthService.login()` to detect multiple organizations
- [ ] Create `AuthService.selectOrganization()` method
- [ ] Add `POST /api/auth/select-organization` endpoint
- [ ] Update 2FA flow to handle multi-org post-verification
- [ ] Add organization selection audit logging
- [ ] Update API response types
- [ ] Write unit tests for multi-org login
- [ ] Write integration tests

### Frontend Tasks
- [ ] Update LoginResponse type definitions
- [ ] Add `selectOrganization()` API function
- [ ] Add organization selector state to LoginPage
- [ ] Update login mutation to handle `requiresOrgSelection`
- [ ] Create organization selector UI component
- [ ] Add organization selection mutation
- [ ] Handle back navigation from org selector
- [ ] Add loading states and error handling
- [ ] Update 2FA flow for multi-org
- [ ] Add "Remember my organization" feature (optional)
- [ ] Write E2E tests

### Testing Tasks
- [ ] Test user with single organization (no selector shown)
- [ ] Test user with multiple organizations (selector shown)
- [ ] Test 2FA + multiple organizations
- [ ] Test expired temp token
- [ ] Test selecting deactivated organization
- [ ] Test organization list sorted by last login
- [ ] Test audit logging

---

## Critical Files to Modify

### Backend
```
/packages/shared/src/repositories/user.repository.ts
  - Add findAllByEmail() method

/packages/api/src/services/auth.service.ts
  - Update login() method for multi-org detection
  - Add selectOrganization() method
  - Update verify2FA() for multi-org

/packages/api/src/controllers/auth.controller.ts
  - Add selectOrganization endpoint

/packages/api/src/routes/auth.routes.ts
  - Register new route

/packages/api/src/utils/jwt.utils.ts
  - Add generateTempToken() function
```

### Frontend
```
/packages/frontend/src/api/auth.api.ts
  - Update LoginResponse type
  - Add selectOrganization() function

/packages/frontend/src/pages/LoginPage.tsx
  - Add organization selector state
  - Add organization selector UI
  - Update login mutation
  - Add selectOrganization mutation

/packages/frontend/src/types/auth.types.ts
  - Update LoginResponse interface
```

---

## Security Considerations

1. **Temp Token Expiry**: 5 minutes to prevent token abuse
2. **Organization List Privacy**: Only show after password validation
3. **Rate Limiting**: Apply to org selection endpoint
4. **Audit Logging**: Track all organization selections
5. **Active Organizations Only**: Don't show deactivated organizations
6. **Session Isolation**: Each org selection creates new refresh token

---

## UX Considerations

1. **Sort by Last Login**: Show most recently used org first
2. **Visual Hierarchy**: Show organization logos if available
3. **Role Display**: Show user's role in each organization
4. **Last Login Date**: Help users remember which org they use
5. **Back Button**: Allow users to return to login form
6. **Loading States**: Show spinner during organization selection
7. **Error Handling**: Clear error messages for invalid selections

---

## Success Criteria

✅ Users with single organization see no change in login flow
✅ Users with multiple organizations see organization selector after password validation
✅ Organization list is sorted by last login (most recent first)
✅ Selecting organization issues correct JWT with chosen organization_id
✅ 2FA flow works correctly with multi-org users
✅ All organization selections are audit logged
✅ Temp tokens expire after 5 minutes
✅ No security vulnerabilities (enumeration, token abuse, etc.)
✅ E2E tests pass for both single-org and multi-org flows

---

## Rollout Plan

### Phase 1: Development & Testing (Week 1)
- Implement backend changes
- Write unit tests
- Test with multiple organizations in dev environment

### Phase 2: Frontend Implementation (Week 1-2)
- Build organization selector UI
- Integrate with backend API
- Write E2E tests

### Phase 3: Staging Testing (Week 2)
- Deploy to staging
- Test with real multi-org scenarios
- Gather feedback from internal team

### Phase 4: Production Rollout (Week 3)
- Deploy to production
- Monitor login flows
- Track organization selection metrics

### Phase 5: Enhancements (Week 4+)
- Add "Remember my organization" feature
- Add organization switching without logout
- Consider subdomain approach for enterprise tier

---

## Monitoring & Metrics

**Key Metrics to Track:**
1. **Multi-Org Login Rate**: % of logins that trigger org selector
2. **Organization Selection Time**: Time spent on selector screen
3. **Organization Switch Frequency**: How often users switch orgs
4. **Failed Org Selection**: Track invalid org selections
5. **Temp Token Expiry Rate**: How many tokens expire unused

**Alerts:**
- High rate of failed org selections
- Spike in multi-org logins (could indicate data issue)
- Temp token expiry > 10% (UX problem)
