# Multi-Tenant User Management Implementation Plan

**Status:** All Backend Phases Complete ✅ | Phases 1-3 Frontend Complete ✅ | Phase 4-5 Frontend Pending
**Last Updated:** 2026-01-08
**Document Version:** 1.9 (Phases 1-3 Frontend Complete: Auth, User Management, Settings, 2FA)

---

## Table of Contents

1. [Overview](#overview)
2. [Task Progress Tracker](#task-progress-tracker)
3. [Architecture Summary](#architecture-summary)
4. [Implementation Phases](#implementation-phases)
5. [Database Schema Design](#database-schema-design)
6. [API Endpoints](#api-endpoints)
7. [Security Best Practices](#security-best-practices)
8. [Migration Strategy](#migration-strategy)
9. [Dependencies & Environment](#dependencies--environment)
10. [Testing Strategy](#testing-strategy)
11. [Success Criteria](#success-criteria)

---

## Implementation Status Summary

### ✅ Completed Phases

**Phase 1: Core Authentication** (Backend + Frontend Complete)
- ✅ Login/logout with JWT tokens
- ✅ Token refresh with automatic retry
- ✅ Protected routes and authentication middleware
- ✅ User settings page (profile, password change, 2FA management)
- ✅ Rate limiting on auth endpoints

**Phase 2: User & Department Management** (Backend + Frontend Complete)
- ✅ User invitation system with email notifications
- ✅ Department CRUD operations
- ✅ User management page (list, invite, edit, deactivate)
- ✅ Department assignment for users
- ✅ Complete migration from ref_data to departments table

**Phase 3: 2FA Implementation** (Backend + Frontend Complete)
- ✅ TOTP-based 2FA with QR code generation
- ✅ Backup codes (10 single-use codes)
- ✅ Complete 2FA setup UI in Settings page
- ✅ Enable/disable 2FA with password confirmation
- ✅ Regenerate backup codes feature
- ✅ 2FA verification during login

**Phase 4: Authorization & Tenant Isolation** (Backend Complete | Frontend Partial)
- ✅ Backend: Role-based access control (Super Admin, Owner, Editor, Viewer)
- ✅ Backend: Organization-level data isolation
- ✅ Backend: Department-based resource filtering
- ✅ Backend: Authorization middleware for all endpoints
- ✅ Frontend: User menu with role display and logout
- ⏳ Frontend: Role-based sidebar navigation (pending)
- ⏳ Frontend: Comprehensive role-based UI updates (pending)

**Phase 5: Security & Audit** (Backend Complete | Frontend Pending)
- ✅ Backend: Automatic audit logging via middleware
- ✅ Backend: Security event tracking
- ✅ Backend: Account lockout after failed attempts
- ✅ Backend: Password history (prevent reuse)
- ⏳ Frontend: Audit logs viewer page (pending)
- ⏳ Frontend: Security events page (pending)
- ⏳ Frontend: Active sessions management page (pending)

**Phase 6: Data Migration** (Complete)
- ✅ Departments migrated from ref_data
- ✅ Multi-tenant schema applied
- ✅ Default super admin and owner accounts created
- ✅ Frontend updated to use new departments API

### ⏳ Remaining Tasks

**Phase 4 Frontend - Role-Based UI** (Optional enhancements)
1. Update AppSidebar to show/hide menu items based on role
2. Add role-based badges and indicators throughout UI
3. Hide/disable actions users don't have permission for

**Phase 5 Frontend - Audit & Security Pages** (Optional - for Owners/Admins)
1. Create AuditLogsPage - View all audit logs with filtering
2. Create SecurityEventsPage - View security events and threats
3. Create ActiveSessionsPage - View and revoke active sessions
4. Create APIs for audit endpoints (audit.api.ts)

**Testing & Documentation** (Ongoing)
1. Unit tests for utilities (password, JWT, TOTP)
2. Integration tests for auth flows
3. E2E tests for complete user journeys
4. API documentation updates

### 🎯 Next Recommended Steps

The core multi-tenant authentication system is **fully functional**. The remaining tasks are optional enhancements:

1. **For Production Readiness:**
   - Add comprehensive testing (unit, integration, E2E)
   - Add email verification page (VerifyEmailPage.tsx)
   - Add 2FA reminder banner for users without 2FA enabled
   - Add organization settings page

2. **For Enhanced Security:**
   - Implement audit logs viewer (AuditLogsPage)
   - Implement security events dashboard
   - Implement active sessions management

3. **For Better UX:**
   - Role-based sidebar navigation
   - More granular permission checks in UI
   - Loading states and error boundaries

---

## Overview

Implement enterprise-grade multi-tenant authentication and authorization system with organization-level isolation, role-based access control (RBAC), 2FA support, and SSO preparation.

### Goals
- ✅ Organization-level data isolation
- ✅ Role-based access control (Super Admin, Owner, Editor, Viewer)
- ✅ Department-based resource segmentation
- ✅ 2FA with TOTP (Google Authenticator)
- ✅ Session management with device tracking
- ✅ Password policies and security
- ✅ Comprehensive audit logging
- ✅ SSO preparation for future integration

### Architecture Decisions
- **Tenancy Model:** Organizations → Departments → Users
- **Authentication:** JWT (access + refresh tokens) with email verification
- **Authorization:** Role-based + Department-based (single role per user)
- **2FA:** TOTP (speakeasy library, works with all authenticator apps)
- **Email Service:** Mailjet for transactional emails
- **State Management:** Zustand (frontend)
- **Database:** PostgreSQL with Knex.js migrations
- **Audit Logging:** Automatic via middleware

---

## Task Progress Tracker

### Phase 1: Core Authentication ✅ Complete (Backend + Frontend)
**Goal:** Basic login/logout functionality with JWT
**Status:** Backend and frontend implementation complete
**Backend Completed:** 2026-01-03
**Frontend Completed:** 2026-01-07

#### Database Migrations ✅ Complete
- [x] Create `user_role` enum (super_admin, owner, editor, viewer, service_account)
- [x] Create `organizations` table
- [x] Create `users` table with 2FA fields and email verification
- [x] Create `refresh_tokens` table with device tracking
- [x] Create `password_reset_tokens` table
- [x] Create `email_verification_tokens` table
- **Migration:** `20260102000001_add_auth_tables.ts` executed successfully

#### Backend - Utilities ✅ Complete
- [x] Create `password.utils.ts` - bcrypt hashing, validation, history checking
- [x] Create `jwt.utils.ts` - JWT generation/verification, temp tokens for 2FA
- [x] Create `token.utils.ts` - Secure token generation, SHA-256 hashing, device fingerprinting

#### Backend - Repositories ✅ Complete
- [x] Create `OrganizationRepository` (extends BaseRepository)
- [x] Create `UserRepository` (extends BaseRepository) - with account locking, login tracking
- [x] Create `RefreshTokenRepository` (extends BaseRepository) - with session management
- [x] Export repositories from `index.ts`
- Note: PasswordResetToken and EmailVerificationToken repositories will be in Phase 2

#### Backend - Services ✅ Complete
- [x] Create `AuthService` - login, logout, refresh, 2FA flow, password change, password reset request
- [x] Create `EmailService` - Mailjet integration with HTML templates (verification, password reset, invitations, welcome, 2FA enabled)

#### Backend - Middleware ✅ Complete
- [x] Create `auth.middleware.ts` - JWT verification, user validation, department loading
- [x] Create `rateLimiter.middleware.ts` - Auth (5/15min), Password Reset (3/hour), Email Verification (3/10min), General API (100/15min)

#### Backend - Controllers & Routes ✅ Complete
- [x] Create `AuthController` - login, verify-2fa, refresh, logout, logout-all, me, change-password, request-password-reset
- [x] Create `auth.routes.ts` - All authentication endpoints with rate limiting
- [x] Update `/packages/api/src/routes/index.ts` - Register auth routes at `/api/auth`
- [x] **Apply authentication to all existing routes** - All API endpoints now require valid JWT token
- [x] Install dependencies: `nodemailer`, `@types/nodemailer`
- [x] Configure environment variables in `.env.development`, `.env.example`

**Protected Routes (Require Authentication):**
All routes below now require a valid `Authorization: Bearer <token>` header:
- `/api/watchers` - Watcher management
- `/api/source-connections` - Connection configurations
- `/api/schedules` - Schedule management
- `/api/file-tracking` - File tracking records
- `/api/dashboard` - Dashboard analytics
- `/api/ref-data` - Reference data management

**Note:** Full authorization (role-based access, department filtering, tenant isolation) will be implemented in **Phase 4**. Currently, any authenticated user can access all resources.

#### Frontend - State Management ✅ Complete
- [x] Create `authStore.ts` - Zustand store with persist middleware
  - Stores user, access token, refresh token in localStorage
  - Helper methods: setAuth, clearAuth, setUser, setTokens
  - Role checking: isSuperAdmin, isOwner, isEditor, isViewer
  - Custom hooks: useHasRole, useCanAccessDepartment
- [x] Update `client.ts` - Add JWT interceptors and auto-refresh
  - Automatic JWT injection in Authorization header
  - Token refresh on 401 errors with request queue
  - Prevents refresh loops for auth endpoints
- [x] Create `auth.api.ts` - Auth API functions
  - All authentication endpoints (login, 2FA, logout, token refresh, password management, 2FA management)

#### Frontend - Components & Pages ✅ Complete
- [x] Create `ProtectedRoute.tsx` - Route guard component with role-based access
- [x] Create `LoginPage.tsx` - Login form with 2FA verification flow
  - React Hook Form + Zod validation
  - 2FA code input for users with 2FA enabled
  - Redirect to intended page after login
- [x] Create `UnauthorizedPage.tsx` - 403 error page
- [x] Update `routes/index.tsx` - Add ProtectedRoute wrapper and auth routes
  - /login (public)
  - /unauthorized (public)
  - All app routes protected
- [x] Add user menu to AppLayout header
  - Displays user name, email, role badge
  - Shows 2FA status
  - Logout functionality
- [x] Create `SettingsPage.tsx` - User settings with tabbed interface (Profile, Security, Preferences)
  - Profile tab: Edit name, phone, timezone, locale
  - Security tab: Password change + 2FA setup/management
  - Preferences tab: Application preferences (future)
- [x] Create `ProfileForm.tsx` - User profile editing component
- [x] Create `PasswordChangeForm.tsx` - Password change with strength validation
- [x] Create `TwoFactorSetup.tsx` - Complete 2FA management component
  - QR code display for setup
  - Backup codes generation and download
  - Enable/disable 2FA with password confirmation
  - Regenerate backup codes
- [ ] Create `VerifyEmailPage.tsx` - Email verification confirmation (Future)
- [ ] Create `Enable2FABanner.tsx` - Persistent 2FA reminder component (Future)

#### Testing ⏳ Pending
- [ ] Unit tests for password utilities
- [ ] Unit tests for JWT utilities
- [ ] Integration tests for login flow
- [ ] Integration tests for token refresh
- [ ] E2E test for login/logout

**Manual Testing:** ✅ Verified working
- Login with email/password
- 2FA verification flow
- User menu display
- Logout functionality
- Token refresh on 401 errors
- Protected routes redirect to login

---

### Phase 2: User & Department Management ✅ Complete (Backend + Frontend)
**Goal:** Owner can manage users and departments
**Status:** Backend and frontend implementation complete
**Backend Completed:** 2026-01-05
**Frontend Completed:** 2026-01-08

#### Database Migrations ✅ Complete
- [x] Create `departments` table
- [x] Create `user_departments` junction table
- [x] Create `user_invitations` table
- [x] Add `organization_id` to `watchers` table
- [x] Add `organization_id` to `source_connections` table
- [x] Add `organization_id` to `schedules` table
- [x] Add `organization_id` to `file_tracking` table
- [x] Add `department_id` to `watchers` table
- **Migrations:**
  - `20260105035841_create_departments_table.ts` ✅
  - `20260105035939_create_user_departments_table.ts` ✅
  - `20260105035941_create_user_invitations_table.ts` ✅
  - `20260105035942_add_multitenancy_columns.ts` ✅

#### Backend - Repositories ✅ Complete
- [x] Create `DepartmentRepository` (with findByOrganization, findActiveByOrganization, softDelete)
- [x] Create `UserInvitationRepository` (with findByToken, findPendingByEmail, expireOldInvitations)
- [x] Export repositories from `index.ts`

#### Backend - Services ✅ Complete
- [x] Create `UserService` - CRUD, invite, activate, deactivate, assignDepartments
- [x] Create `DepartmentService` - CRUD departments with validation
- [x] Create `OrganizationService` - Get/update organization, createWithOwner (super admin)
- [x] Update `EmailService` - Add invitation email template (reused existing service)

#### Backend - Controllers & Routes ✅ Complete
- [x] Create `UserController` - User management endpoints (list, invite, update, deactivate, assign departments)
- [x] Create `DepartmentController` - Department CRUD with role-based access
- [x] Create `OrganizationController` - Org settings (get, update)
- [x] Create `AdminController` - Super admin endpoints (create org with owner)
- [x] Create `users.routes.ts`
- [x] Create `departments.routes.ts`
- [x] Create `organizations.routes.ts`
- [x] Create `admin.routes.ts` - Super admin only routes
- [x] Register all routes in `/packages/api/src/routes/index.ts` with authentication

#### Frontend - API & Pages ✅ Complete
- [x] Create `users.api.ts` - All user management API functions
  - listUsers, getUser, inviteUser, updateUser, deactivateUser, assignDepartments
- [x] Create `departments.api.ts` - Department CRUD API functions
  - listDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment
- [x] Create `UsersPage.tsx` - User management page with:
  - Stats cards (total, active, inactive, suspended users)
  - Search and filters (name, email, role, status)
  - User table with role badges, department assignments, 2FA indicators
  - Edit and deactivate actions (role-protected)
- [x] Create `UserInviteSheet.tsx` - Invite user form with:
  - Email, name, role selection
  - Department assignment with checkboxes
  - Send email option
- [x] Create `UserEditSheet.tsx` - Edit user form with:
  - Tabbed interface (Details/Permissions)
  - Update user info, role, status
  - Department assignment management
- [x] Update `DepartmentsPage.tsx` - Migrated from ref_data API to new departments API
  - Replaced RefData type with Department type
  - Updated filter logic and role-based access control
- [x] Create `DepartmentForm.tsx` - Department form with:
  - Real-time duplicate code validation
  - Auto-uppercase code field
  - Status dropdown (active/inactive)
- [x] Create `DepartmentTable.tsx` - Department table component
- [x] Create `DepartmentSheet.tsx` - Department sheet wrapper
- [ ] Create `organizations.api.ts` (Future)
- [ ] Create `OrganizationSettingsPage.tsx` (Future)

#### Testing
- [ ] Unit tests for UserService
- [ ] Unit tests for DepartmentService
- [ ] Integration tests for user invitation flow
- [ ] Integration tests for department CRUD
- [ ] E2E test for user management workflow

---

### Phase 3: 2FA Implementation ✅ Complete (Backend + Frontend)
**Goal:** Optional 2FA for enhanced security
**Status:** Backend and frontend implementation complete
**Backend Completed:** 2026-01-05
**Frontend Completed:** 2026-01-08

#### Dependencies ✅ Complete
- [x] Install `speakeasy` and `qrcode` (backend)
- [x] No additional dependencies needed (frontend) - Using base64 QR codes from backend

#### Backend - Utilities & Services ✅ Complete
- [x] Create `totp.utils.ts` - TOTP generation/verification with speakeasy
- [x] Update `AuthService` - Add 2FA setup/enable/disable methods
- [x] Update `AuthService` - Add 2FA verification to login flow (supports TOTP and backup codes)
- [x] Update `AuthController` - Add 2FA endpoints (setup, enable, disable, regenerate-backup-codes)
- [x] Update `auth.routes.ts` - Add 2FA routes under `/api/auth/2fa/*`

**API Endpoints Added:**
- `POST /api/auth/2fa/setup` - Generate TOTP secret and QR code (requires auth)
- `POST /api/auth/2fa/enable` - Enable 2FA after verifying TOTP code (requires auth)
- `POST /api/auth/2fa/disable` - Disable 2FA with password (requires auth)
- `POST /api/auth/2fa/regenerate-backup-codes` - Generate new backup codes (requires auth)

**Features Implemented:**
- TOTP-based 2FA compatible with Google Authenticator, Authy, etc.
- QR code generation for easy setup
- 10 backup codes generated on setup (hashed with bcrypt for security)
- Backup codes are single-use (removed after verification)
- Password verification required for sensitive operations (disable, regenerate codes)
- 2FA verification during login with tempToken flow
- Email notifications when 2FA is enabled (via EmailService)

#### Frontend - Components & Pages ✅ Complete
- [x] Create `TwoFactorSetup.tsx` - Complete 2FA management component (integrated in SettingsPage)
  - QR code display for authenticator app setup
  - Manual secret key entry with copy button
  - 10 backup codes with individual copy buttons
  - Download backup codes as text file
  - Verification code input to complete setup
  - Enable/disable 2FA with password confirmation
  - Regenerate backup codes feature
  - State management for setup flow
- [x] Update `LoginPage.tsx` - 2FA verification flow already integrated
  - Shows 2FA code input when user has 2FA enabled
  - Supports both TOTP codes and backup codes

#### Testing
- [ ] Unit tests for TOTP generation/verification
- [ ] Unit tests for backup code generation
- [ ] Integration tests for 2FA setup flow
- [ ] Integration tests for 2FA login flow
- [ ] E2E test for complete 2FA workflow

---

### Phase 4: Authorization & Tenant Isolation ✅ Complete
**Goal:** Enforce role-based and department-based access control
**Status:** Backend implementation complete
**Completed:** 2026-01-05

**Before Phase 4:**
- ✅ Authentication required: All routes require valid JWT token
- ❌ No permission checks: Any authenticated user could access/modify all resources
- ❌ No tenant isolation: Users could see data from other organizations
- ❌ No department filtering: Editors/Viewers could access all departments

**After Phase 4:**
- ✅ **Role-based access control:** Super admin, Owner, Editor, Viewer roles enforced
- ✅ **Tenant isolation:** Users can only access resources in their organization
- ✅ **Department filtering:** Editors/Viewers restricted to assigned departments
- ✅ **Proper audit trails:** All created_by/updated_by fields use actual user IDs

#### Backend - Middleware ✅ Complete
- [x] Create `authorization.middleware.ts` - Complete authorization helper functions:
  - `requireRole()` - Check user has required role
  - `requireSuperAdmin()`, `requireOwner()`, `requireEditor()` - Role shortcuts
  - `requireSameOrganization()` - Validate resource belongs to user's org
  - `requireDepartmentAccess()` - Validate user has department access
  - `addOrganizationFilter()` - Filter queries by organization
  - `addDepartmentFilter()` - Filter queries by departments
  - `canModifyResource()` - Check if user can modify resource
  - `validateOrganizationId()`, `validateDepartmentIds()` - Validation helpers

#### Backend - Updated Existing Controllers ✅ Complete
- [x] Update `WatcherController` - Organization filtering via departments, replaced 'system' with `req.user.id`
- [x] Update `SourceConnectionController` - Audit trail updates (shared resource)
- [x] Update `ScheduleController` - Audit trail updates (shared resource)
- [x] Update `FileTrackingController` - Tenant isolation via watcher->department->org chain
- [x] Update `RefDataController` - Audit trail updates (shared resource)
- [x] Update `DashboardController` - Organization/department filtering based on role

#### Backend - Updated Existing Services ✅ Complete
- [x] Update `WatcherService` - Added comprehensive authorization:
  - `getOrganizationIdForDepartment()` - Maps department to organization
  - `validateWatcherAccess()` - Validates user access to watcher
  - `canModifyWatcher()` - Checks modification permissions
  - All methods accept `AuthenticatedRequest` as first parameter
  - Organization filtering via department membership
- [x] Update `FileTrackingService` - Tenant isolation via `getAccessibleWatcherIds()`
- [x] Update `DashboardService` - Organization/department scoped queries
- [x] Note: SourceConnection and Schedule services handle shared resources

#### Backend - Updated Existing Repositories ✅ Complete
- [x] Update `WatcherRepository` - Added `departmentCodes` parameter to `findWithFilters()`

#### Backend - Route Protection ✅ Complete
- [x] Authentication middleware - Already done in Phase 1
- [x] Role checks:
  - **Super Admin:** Access all organizations and resources
  - **Owner:** Full access within their organization
  - **Editor:** Create/update/delete in assigned departments
  - **Viewer:** Read-only access to assigned departments
- [x] Department checks: Editor/Viewer restricted to assigned departments
- [x] Organization checks: All users restricted to their organization (except super admin)

**Tenant Isolation Architecture:**
```
User → Organization → Departments → Watchers → File Tracking
                    ↓
              Shared Resources: Source Connections, Schedules, Ref Data
```

**Key Implementation Details:**
- Indirect tenant isolation: `watchers.department_code` → `departments.organization_id`
- Department-level granularity for editors/viewers
- Shared resources (connections, schedules, ref data) accessible across orgs
- All audit fields (`created_by`, `updated_by`) now track actual user IDs

#### Frontend - Role-Based UI
- [ ] Update `AppSidebar.tsx` - Conditional rendering based on role
- [ ] Add user menu with logout
- [ ] Add role-based route restrictions
- [ ] Update all pages to respect permissions

#### Testing
- [ ] Unit tests for authorization middleware
- [ ] Integration tests for role-based access
- [ ] Integration tests for tenant isolation
- [ ] Integration tests for department access
- [ ] E2E tests for permission boundaries

---

### Phase 5: Security & Audit ✅ Complete
**Goal:** Comprehensive audit logging and security monitoring
**Status:** Backend implementation complete
**Completed:** 2026-01-05

#### Database Migrations ✅ Complete
- [x] Create `audit_logs` table - Tracks all CRUD operations
- [x] Create `security_events` table - Tracks authentication and security events
- [x] Create `password_history` table - Prevents password reuse
- **Migrations Run:** Batch 8 (3 migrations)

#### Backend - Repositories ✅ Complete
- [x] Create `AuditLogRepository` - Methods: findByUser, findByOrganization, findByResource, findByDateRange, log
- [x] Create `SecurityEventRepository` - Methods: findByUser, findByType, findCriticalEvents, log
- [x] Both exported from `/packages/shared/src/repositories/index.ts`

#### Backend - Services ✅ Complete
- [x] Create `AuditService` - Query logs with filters, pagination, statistics, resource history
- [x] Create `SecurityEventService` - Log events with smart severity, query with filters, critical event detection

#### Backend - Middleware ✅ Complete
- [x] Create `auditLog.middleware.ts` - Automatic logging of all CRUD operations
  - Captures: user, organization, action, resource, changes, IP, user agent, metadata
  - Skips GET requests (read operations)
  - Asynchronous logging (doesn't block requests)
  - Sanitizes sensitive data (passwords, tokens)
- [x] Apply audit middleware to all protected routes (except /auth, /audit, /health, /dashboard)

#### Backend - Security Event Integration ✅ Complete
- [x] Update `AuthService` - Integrated SecurityEventService
  - Logs: login_success, login_failed, login_locked, password_changed, 2fa_enabled
  - Captures: user, organization, IP, user agent, metadata
  - Smart severity classification (critical/warning/info)

**Account Security Already Implemented (Phase 1):**
- ✅ Account lockout: 5 failed attempts = 15 minute lockout
- ✅ Password history: Prevents reuse of last 5 passwords
- ✅ Password strength validation
- ✅ Password expiration (90 days configurable)

#### Backend - Controllers & Routes ✅ Complete
- [x] Create `AuditController` - Owner/Super Admin only endpoints:
  - GET /api/audit/logs - Query audit logs
  - GET /api/audit/logs/stats - Audit log statistics
  - GET /api/audit/security-events - Query security events
  - GET /api/audit/security-events/critical - Critical events only
  - GET /api/audit/security-events/stats - Security event statistics
- [x] Create `audit.routes.ts` - All endpoints with requireOwnerOrSuperAdmin()
- [x] Register routes at `/api/audit` (no audit logging on audit routes)

#### Frontend - Pages
- [ ] Create `AuditLogsPage.tsx` - Audit log viewer
- [ ] Create `SecurityEventsPage.tsx`
- [ ] Create `ActiveSessionsPage.tsx` - View/revoke sessions

#### Testing
- [ ] Unit tests for audit logging
- [ ] Unit tests for security event tracking
- [ ] Integration tests for account lockout
- [ ] Integration tests for password history
- [ ] E2E test for audit log viewing

---

### Phase 6: Data Migration ✅ Complete
**Goal:** Migrate departments from ref_data and link existing data to multi-tenant structure
**Completed:** 2026-01-07
**Migration:** `20260107054303_migrate_to_multitenancy.ts` executed successfully

#### Migration Scripts ✅ Complete
- [x] Create `20260107054303_migrate_to_multitenancy.ts` migration
- [x] Test migration in development environment
- [x] Verify data integrity after migration
- [x] Implement rollback script (in migration down() function)

#### Migration Tasks ✅ Complete
- [x] Create default "System Organization" (ID: 4, slug: 'system')
- [x] Migrate 6 departments from ref_data to departments table:
  - Loyalty (LOY) → ID: 7
  - Finance (FIN) → ID: 8
  - Operations (OPS) → ID: 9
  - Information Technology (IT) → ID: 10
  - Human Resources (HR) → ID: 11
  - Sales (SALES) → ID: 12
- [x] Link 2 existing watchers to department_id and organization_id
- [x] Link 4 source_connections to organization_id
- [x] Link 8 schedules to organization_id
- [x] Link 3,603 file_tracking records to organization_id
- [x] Create default super admin user (superadmin@omnitrackr.local)
- [x] Create default organization owner (owner@omnitrackr.local)

#### Migration Results Summary
```
✅ Created organization: System Organization (ID: 4)
✅ Migrated 6 departments (IDs: 7-12)
✅ Linked 2 watchers to departments
✅ Linked 4 source connections to organization
✅ Linked 8 schedules to organization
✅ Linked 3,603 file tracking records to organization
✅ Created super admin: superadmin@omnitrackr.local
✅ Created organization owner: owner@omnitrackr.local
```

#### Post-Migration ✅ Complete
- [x] Update frontend DepartmentsPage to use new departments API
- [x] Update frontend department dropdowns (DepartmentCombobox) to use new API
- [x] All frontend pages using departments updated
- [ ] Test all API endpoints with authentication (Manual testing ongoing)
- [ ] Test all frontend pages (Manual testing ongoing)
- [ ] Run full regression test suite (Pending)

---

## Architecture Summary

### Tenancy Model
```
Organizations (Top-level tenants)
  └── Departments (Resource segmentation)
      └── Users (Assigned to departments)
          └── Resources (Watchers, Connections, etc.)
```

### User Roles

**Note:** Each user has ONE role. Users cannot have multiple roles simultaneously.

| Role | Scope | Permissions | Use Case |
|------|-------|-------------|----------|
| **Super Admin** | Platform-level (no org) | Create organizations, create initial owners, access all data | OmniTrackr platform administrators |
| **Owner** | Organization-level | Manage users, departments, all resources in their org | Organization administrators |
| **Editor** | Department-level | Create/update/delete resources in assigned departments | Power users who manage resources |
| **Viewer** | Department-level | Read-only access to resources in assigned departments | Stakeholders, auditors |
| **Service Account** | Organization-level | Automated operations (polling, monitoring) | Background processes, worker jobs |

### Authentication Flow
1. **New User Invited** → Receives email with invitation link
2. **User Clicks Link** → Sets password, account created
3. **Email Verification** → Automatic verification email sent, user clicks link
4. **Login** → User submits email/password
5. **Credentials Valid** → Check if email verified (must be verified to login)
6. **2FA Check** → If enabled, request TOTP code from authenticator app
7. **2FA Reminder** → If NOT enabled, show persistent banner recommending 2FA
8. **Token Generation** → Generate access token (15 min) + refresh token (30 days)
9. **Session Tracking** → Store refresh token in database with device info
10. **Response** → Return tokens + user info to client
11. **Client Storage** → Access token in memory, refresh token in localStorage
12. **Token Refresh** → On expiry, use refresh token to get new access token automatically

### Authorization Flow
1. Client sends request with JWT in Authorization header
2. `auth.middleware.ts` verifies JWT and extracts user info
3. `authorization.middleware.ts` checks role and department access
4. Service layer filters data by organization_id
5. Repository layer enforces tenant isolation
6. Response only includes user's authorized data

---

## Implementation Phases

### Phase 1: Core Authentication (Priority 1)
**Timeline:** Week 1-2

**Deliverables:**
- Users can login with email/password
- JWT tokens issued and verified
- Protected routes require authentication
- Token refresh works automatically
- Frontend redirects to login when unauthorized

**Critical Files:**
- `/packages/api/migrations/20260101000001_add_auth_tables.ts`
- `/packages/api/src/middleware/auth.middleware.ts`
- `/packages/api/src/services/auth.service.ts`
- `/packages/api/src/utils/password.utils.ts`
- `/packages/api/src/utils/jwt.utils.ts`
- `/packages/frontend/src/stores/authStore.ts`
- `/packages/frontend/src/pages/LoginPage.tsx`

### Phase 2: User & Department Management (Priority 2)
**Timeline:** Week 3

**Deliverables:**
- Owners can invite users
- Users can accept invitations
- Owners can manage departments
- Users assigned to departments
- All existing data has organization_id

**Critical Files:**
- `/packages/api/migrations/20260102000001_add_departments_and_multitenancy.ts`
- `/packages/api/src/services/user.service.ts`
- `/packages/api/src/services/department.service.ts`
- `/packages/frontend/src/pages/UsersPage.tsx`

### Phase 3: 2FA Implementation (Priority 3)
**Timeline:** Week 4 (Days 1-4)

**Deliverables:**
- Users can enable 2FA
- Login requires 2FA code when enabled
- Backup codes work
- 2FA can be disabled with password

**Critical Files:**
- `/packages/api/src/utils/totp.utils.ts`
- `/packages/frontend/src/pages/Setup2FAPage.tsx`

### Phase 4: Authorization & Tenant Isolation (Priority 4)
**Timeline:** Week 4-5

**Deliverables:**
- Editors can only access their departments
- Viewers have read-only access
- Super admins can access all orgs
- Tenant isolation enforced
- All endpoints protected

**Critical Files:**
- `/packages/api/src/middleware/authorization.middleware.ts`
- All existing controllers, services, and repositories

### Phase 5: Security & Audit (Priority 5)
**Timeline:** Week 5 (Days 4-7)

**Deliverables:**
- All actions logged to audit_logs
- Security events tracked
- Users can view active sessions
- Account lockout works
- Password history prevents reuse

**Critical Files:**
- `/packages/api/migrations/20260103000001_add_audit_tables.ts`
- `/packages/api/src/middleware/auditLog.middleware.ts`
- `/packages/frontend/src/pages/AuditLogsPage.tsx`

### Phase 6: Data Migration (Priority 6)
**Timeline:** Week 6

**Deliverables:**
- All existing data migrated
- No data loss or corruption
- All functionality works
- Default admin/owner accounts exist
- Departments accessible by ID

**Critical Files:**
- `/packages/api/scripts/migrate-to-multitenancy.ts`
- `/packages/api/migrations/20260104000001_migrate_multitenancy_data.ts`

---

## Database Schema Design

### Core Tables Overview

```
organizations (Top-level tenants)
  ├── users (Organization members)
  ├── departments (Resource segmentation)
  ├── watchers (File watchers)
  ├── source_connections (Reusable connections)
  └── schedules (Reusable schedules)

users
  ├── refresh_tokens (Session management)
  ├── password_reset_tokens (Password recovery)
  ├── email_verification_tokens (Email verification)
  └── password_history (Password reuse prevention)

user_departments (Many-to-many)
  ├── user_id → users
  └── department_id → departments

audit_logs (Audit trail)
security_events (Security monitoring)
user_invitations (User onboarding)
```

### Table: organizations

```sql
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,

  -- Organization Identity
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  domain VARCHAR(255),

  -- Branding
  logo_url VARCHAR(500),
  primary_color VARCHAR(7),

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,

  -- SSO Configuration (Future)
  sso_enabled BOOLEAN DEFAULT false,
  sso_provider VARCHAR(50),
  sso_config JSONB,

  -- Subscription
  max_users INTEGER DEFAULT 50,
  max_watchers INTEGER,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_expires_at TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'active',

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  deleted_at TIMESTAMP
);
```

### Table: users

```sql
CREATE TYPE user_role AS ENUM (
  'super_admin',      -- Platform administrators
  'owner',            -- Organization administrators
  'editor',           -- Can modify resources in assigned departments
  'viewer',           -- Read-only access to assigned departments
  'service_account'   -- Automated background processes
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,

  -- Foreign Keys
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  -- NULL for super_admin

  -- Identity
  email VARCHAR(255) NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,

  -- Authentication
  password_hash VARCHAR(255) NOT NULL,
  password_changed_at TIMESTAMP DEFAULT NOW(),
  password_expires_at TIMESTAMP,

  -- 2FA
  two_fa_enabled BOOLEAN DEFAULT false,
  two_fa_secret VARCHAR(255),
  two_fa_backup_codes TEXT[],
  two_fa_verified_at TIMESTAMP,

  -- Profile
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  avatar_url VARCHAR(500),
  timezone VARCHAR(50) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en-US',

  -- Role
  role user_role NOT NULL DEFAULT 'viewer',

  -- Status
  status VARCHAR(20) DEFAULT 'invited',

  -- Login Tracking
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,

  -- Security
  must_change_password BOOLEAN DEFAULT false,

  -- SSO
  sso_provider VARCHAR(50),
  sso_subject VARCHAR(255),

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  deleted_at TIMESTAMP,

  CONSTRAINT check_super_admin_no_org CHECK (
    (role = 'super_admin' AND organization_id IS NULL) OR
    (role != 'super_admin' AND organization_id IS NOT NULL)
  )
);
```

### Table: departments

```sql
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,

  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  description TEXT,

  parent_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,

  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  deleted_at TIMESTAMP,

  UNIQUE(organization_id, code),
  UNIQUE(organization_id, name)
);
```

### Table: user_departments

```sql
CREATE TABLE user_departments (
  id SERIAL PRIMARY KEY,

  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),

  UNIQUE(user_id, department_id)
);
```

### Table: refresh_tokens

```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,

  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  token_hash VARCHAR(255) NOT NULL UNIQUE,

  -- Device Info
  device_name VARCHAR(255),
  device_fingerprint VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Geolocation
  country VARCHAR(2),
  city VARCHAR(100),

  -- Lifecycle
  expires_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP,
  revoke_reason VARCHAR(100),

  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table: audit_logs

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,

  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,

  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),

  old_values JSONB,
  new_values JSONB,

  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(100),

  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### Migration Updates to Existing Tables

```sql
-- Add organization_id to existing tables
ALTER TABLE watchers
  ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE source_connections
  ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE schedules
  ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE file_tracking
  ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Login with email/password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "device_name": "Chrome on MacOS"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "a1b2c3d4...",
    "expires_in": 900,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "owner",
      "organization_id": 1
    },
    "requires_2fa": false,
    "security_recommendation": {
      "enable_2fa": true,
      "message": "Protect your account with 2FA"
    }
  }
}
```

#### POST /api/auth/verify-email
Verify email using token from email link

**Request:**
```json
{
  "token": "verification_token_from_email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### POST /api/auth/resend-verification
Resend verification email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

#### POST /api/auth/forgot-password
Request password reset link

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

#### POST /api/auth/reset-password
Reset password using token

**Request:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### POST /api/auth/verify-2fa
Complete 2FA verification

**Request:**
```json
{
  "email": "user@example.com",
  "totp_code": "123456",
  "temp_token": "temp_token_from_login"
}
```

#### POST /api/auth/refresh
Refresh access token

**Request:**
```json
{
  "refresh_token": "a1b2c3d4..."
}
```

#### POST /api/auth/logout
Logout current session

#### GET /api/auth/me
Get current user profile

#### POST /api/auth/change-password
Change password

#### POST /api/auth/setup-2fa
Generate 2FA secret

#### POST /api/auth/enable-2fa
Enable 2FA

#### POST /api/auth/disable-2fa
Disable 2FA

### User Management Endpoints (Owner Only)

#### GET /api/users
List all users in organization

**Query Parameters:**
- `page`: number
- `limit`: number
- `role`: UserRole
- `status`: UserStatus
- `department_id`: number
- `search`: string

#### POST /api/users/invite
Invite new user

**Request:**
```json
{
  "email": "newuser@example.com",
  "role": "editor",
  "department_ids": [1, 2],
  "first_name": "Jane",
  "last_name": "Smith"
}
```

#### GET /api/users/:userId
Get user details

#### PATCH /api/users/:userId
Update user

#### DELETE /api/users/:userId
Deactivate user

#### POST /api/users/:userId/reset-password
Force password reset

#### POST /api/users/:userId/unlock
Unlock locked account

### Department Management Endpoints (Owner Only)

#### GET /api/departments
List departments

#### POST /api/departments
Create department

#### GET /api/departments/:departmentId
Get department details

#### PATCH /api/departments/:departmentId
Update department

#### DELETE /api/departments/:departmentId
Delete department

### Organization Endpoints

#### GET /api/organizations/current
Get current organization

#### PATCH /api/organizations/current
Update organization settings

### Admin Endpoints (Super Admin Only)

#### POST /api/admin/organizations
Create new organization with initial owner

**Request:**
```json
{
  "organization": {
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "domain": "acme.com",
    "subscription_tier": "enterprise"
  },
  "owner": {
    "email": "owner@acme.com",
    "first_name": "John",
    "last_name": "Smith"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": 5,
      "name": "Acme Corporation",
      "slug": "acme-corp",
      "status": "active"
    },
    "owner_invitation": {
      "email": "owner@acme.com",
      "role": "owner",
      "invitation_url": "https://omnitrackr.com/accept-invitation?token=abc123",
      "expires_at": "2026-01-09T00:00:00Z"
    }
  },
  "message": "Organization created and invitation sent to owner"
}
```

#### GET /api/admin/organizations
List all organizations

**Query Parameters:**
- `page`: number
- `limit`: number
- `status`: string (active, suspended, trial)
- `search`: string

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Acme Corporation",
      "slug": "acme-corp",
      "status": "active",
      "subscription_tier": "enterprise",
      "user_count": 25,
      "created_at": "2025-12-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### PATCH /api/admin/organizations/:orgId
Update organization

**Request:**
```json
{
  "status": "suspended",
  "max_users": 100,
  "subscription_tier": "enterprise"
}
```

---

## Security Best Practices

### Password Security

**Requirements:**
- Minimum 8 characters
- Must contain: uppercase, lowercase, number, special character
- Password history: prevent reuse of last 5 passwords
- Optional expiration: 90 days
- Account lockout: 5 failed attempts → 15 minute lockout

**Implementation:**
```typescript
// bcrypt with 12 rounds
const hash = await bcrypt.hash(password, 12);

// Password validation
const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
```

### JWT Security

**Configuration:**
- Access token: 15 minutes expiry
- Refresh token: 30 days expiry
- Algorithm: HS256 (HMAC with SHA-256)
- Secret: Minimum 32 characters, rotate every 90 days

**Token Storage:**
- Access token: Memory only (never localStorage)
- Refresh token: localStorage or httpOnly cookies
- Never expose in URLs or logs

### 2FA Security

**Configuration:**
- Algorithm: TOTP (Time-based One-Time Password) - RFC 6238 standard
- Window: **30 seconds** (industry standard, DO NOT change)
- Code length: 6 digits
- Window tolerance: ±1 step (accepts codes from previous/current/next 30s window = 90s total)
- Works with: Google Authenticator, Authy, Microsoft Authenticator, 1Password, LastPass, etc.

**User Experience:**
- 2FA is **optional but recommended**
- Users can skip during setup
- Persistent reminder banner shown on every page if 2FA not enabled
- Banner includes "Enable 2FA" button linking to settings
- Users can enable/disable 2FA from UserSettingsPage → Security tab

**Backup Codes:**
- Generate 10 single-use codes
- Hash with bcrypt before storage
- Display only once during setup (must be saved by user)
- Allow regeneration with password verification
- Each code can only be used once

**Future Extensibility:**
- Current: TOTP only (all authenticator apps)
- Future: Can add SMS codes, Email codes, WebAuthn (biometric)
- Architecture supports adding `two_fa_provider` field for multiple methods

### Session Security

**Features:**
- Track all active sessions per user
- Store device fingerprints
- Allow users to revoke individual sessions
- Auto-revoke all sessions on password change
- Limit concurrent sessions (configurable, default: 5)

### Audit Logging

 **Architecture**

  Audit Log Flow:
  API Request → Controller → Service → Database
                  ↓
           auditLog.middleware
                  ↓
           AuditLogRepository.log()
                  ↓
             audit_logs table

  Security Event Flow:
  AuthService (login/password/2FA)
         ↓
  SecurityEventService.logEvent()
         ↓
  SecurityEventRepository.log()
         ↓
    security_events table

**Implementation:**
- **Automatic via middleware** - No manual logging in services required
- `auditLog.middleware.ts` intercepts all successful requests
- Captures request body, response data, user info, IP, user agent
- Async logging (doesn't block response)

**Events to Log:**
- User login/logout
- Failed login attempts
- Password changes
- 2FA enable/disable
- User CRUD operations (create, update, delete users)
- Department changes (create, update, delete departments)
- Permission changes (role changes, department assignments)
- Resource access (watchers, connections, schedules - all CRUD operations)

**Usage:**
```typescript
// Applied via middleware to routes
router.post('/watchers',
  authenticate,
  auditLog('watcher.create'),  // Automatic logging
  watcherController.create
);
```

---

## Migration Strategy

### Pre-Migration Checklist

- [ ] Backup production database
- [ ] Test migration script in development
- [ ] Verify data integrity in development
- [ ] Run full test suite in development
- [ ] Test migration script in staging
- [ ] Verify data integrity in staging
- [ ] Run full test suite in staging
- [ ] Document rollback procedure
- [ ] Schedule maintenance window
- [ ] Notify users of maintenance

### Migration Steps

#### 1. Schema Migration
Run migrations to create new tables:
```bash
npm run migrate:latest
```

Tables created:
- organizations
- users
- departments
- user_departments
- refresh_tokens
- password_reset_tokens
- email_verification_tokens
- user_invitations
- password_history
- audit_logs
- security_events

#### 2. Data Migration (SIMPLIFIED)
Run migration script:
```bash
npm run migrate:departments
```

Script will:
1. Create default "System" organization
2. **Migrate ref_data departments to departments table ONLY**
3. Create default super admin user (from env: ADMIN_EMAIL)
4. Create default organization owner (from env: OWNER_EMAIL)
5. **DELETE all test data** from:
   - watchers
   - source_connections
   - schedules
   - file_tracking
   - watcher_logs

**Why delete test data?**
- Simpler than migrating complex relationships
- Only test data exists, safe to delete
- Fresh start with new multi-tenant schema
- Will recreate test data with organization_id and department_id

#### 3. Verification
```bash
npm run verify:migration
```

Verify:
- No data loss
- All foreign keys valid
- All unique constraints satisfied
- No orphaned records
- Department mapping correct

#### 4. Schema Enforcement
Make columns non-nullable:
```sql
ALTER TABLE watchers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE source_connections ALTER COLUMN organization_id SET NOT NULL;
-- etc.
```

### Rollback Plan

**If migration fails:**
1. Stop application
2. Restore database from backup
3. Investigate failure
4. Fix migration script
5. Retry in development

**Rollback SQL:**
```sql
-- Drop new foreign keys
ALTER TABLE watchers DROP COLUMN organization_id;
ALTER TABLE watchers DROP COLUMN department_id;

-- Drop new tables
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_departments CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
```

---

## Dependencies & Environment

### Backend Dependencies

```bash
cd packages/api
npm install jsonwebtoken bcrypt speakeasy qrcode express-rate-limit
npm install -D @types/jsonwebtoken @types/bcrypt @types/speakeasy @types/qrcode
```

**Packages:**
- `jsonwebtoken@^9.0.2` - JWT generation/verification
- `bcrypt@^5.1.1` - Password hashing
- `speakeasy@^2.0.0` - TOTP 2FA
- `qrcode@^1.5.0` - QR code generation
- `express-rate-limit@^7.0.0` - Rate limiting

### Frontend Dependencies

```bash
cd packages/frontend
npm install zustand qrcode.react
```

**Packages:**
- `zustand@^4.5.2` - State management
- `qrcode.react@^3.1.0` - QR code display

### Environment Variables

**Backend (.env):**
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Password Security
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8
PASSWORD_EXPIRY_DAYS=90
PASSWORD_HISTORY_COUNT=5

# Account Security
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_MINUTES=15
MAX_CONCURRENT_SESSIONS=5

# 2FA Configuration
TOTP_WINDOW=1
TOTP_ISSUER=OmniTrackr
BACKUP_CODES_COUNT=10

# Email Configuration (Mailjet)
SMTP_HOST=in-v3.mailjet.com
SMTP_PORT=587
SMTP_USER=your-mailjet-api-key
SMTP_PASSWORD=your-mailjet-secret-key
FROM_EMAIL=noreply@omnitrackr.com
FROM_NAME=OmniTrackr

# Email Templates (Optional - for Mailjet templates)
MAILJET_TEMPLATE_VERIFICATION=template-id-123
MAILJET_TEMPLATE_INVITATION=template-id-456
MAILJET_TEMPLATE_PASSWORD_RESET=template-id-789

# Application URLs (environment-specific)
# Development: APP_URL=http://localhost:5173
# Staging: APP_URL=https://staging.omnitrackr.dev
# Production: APP_URL=https://omnitrackr.com
APP_URL=http://localhost:5173

# Default Admin Credentials (migration only - CHANGE IMMEDIATELY)
ADMIN_EMAIL=admin@omnitrackr.local
ADMIN_DEFAULT_PASSWORD=ChangeMe123!
OWNER_EMAIL=owner@omnitrackr.local
OWNER_DEFAULT_PASSWORD=ChangeMe123!
```

**Frontend (.env):**

Environment-specific files already exist:
- `.env.development` → `VITE_API_URL=http://localhost:3000`
- `.env.staging` → `VITE_API_URL=https://staging.omnitrackr.dev`
- `.env.production` → `VITE_API_URL=https://api.omnitrackr.com`

No changes needed for frontend environment variables.

---

## Testing Strategy

### Unit Tests

**Password Utilities:**
- ✓ Password hashing
- ✓ Password verification
- ✓ Password strength validation
- ✓ Password history checking

**JWT Utilities:**
- ✓ Token generation
- ✓ Token verification
- ✓ Token expiration
- ✓ Invalid token handling

**TOTP Utilities:**
- ✓ Secret generation
- ✓ Code verification
- ✓ Backup code generation
- ✓ Backup code verification

**Authorization:**
- ✓ Role-based access checks
- ✓ Department-based access checks
- ✓ Tenant isolation
- ✓ Permission boundaries

### Integration Tests

**Authentication Flow:**
- ✓ Successful login
- ✓ Failed login (wrong password)
- ✓ Account lockout after 5 failures
- ✓ Token refresh
- ✓ 2FA verification
- ✓ Password reset flow

**User Management:**
- ✓ Invite user
- ✓ Accept invitation
- ✓ Update user role
- ✓ Assign departments
- ✓ Deactivate user

**Authorization:**
- ✓ Owner can access all resources
- ✓ Editor can modify their departments
- ✓ Viewer cannot modify resources
- ✓ Tenant isolation enforced
- ✓ Department access enforced

### E2E Tests

**User Journeys:**
- ✓ Complete signup flow
- ✓ Login with 2FA
- ✓ User management workflow
- ✓ Department assignment
- ✓ Multi-device sessions
- ✓ Password reset
- ✓ Security event handling

---

## Success Criteria

### Phase 1: Core Authentication ✅
- [ ] Users can login with email/password
- [ ] JWT tokens are issued and verified correctly
- [ ] Protected routes require authentication
- [ ] Token refresh works automatically
- [ ] Frontend redirects to login when unauthorized
- [ ] All unit tests pass
- [ ] All integration tests pass

### Phase 2: User & Department Management ✅
- [ ] Owners can invite users via email
- [ ] Users can accept invitations and create accounts
- [ ] Owners can manage departments (CRUD)
- [ ] Users can be assigned to multiple departments
- [ ] All existing data has organization_id
- [ ] All unit tests pass
- [ ] All integration tests pass

### Phase 3: 2FA Implementation ✅
- [ ] Users can enable 2FA with QR code
- [ ] Login requires 2FA code when enabled
- [ ] Backup codes work for login
- [ ] 2FA can be disabled with password verification
- [ ] All unit tests pass
- [ ] All integration tests pass

### Phase 4: Authorization & Tenant Isolation ✅
- [ ] Editors can only access their assigned departments
- [ ] Viewers have read-only access to their departments
- [ ] Super admins can access all organizations
- [ ] Tenant isolation is enforced at database level
- [ ] All existing endpoints are protected
- [ ] All unit tests pass
- [ ] All integration tests pass

### Phase 5: Security & Audit ✅
- [ ] All user actions are logged to audit_logs
- [ ] Security events are tracked and viewable
- [ ] Users can view their active sessions
- [ ] Account lockout works after failed attempts
- [ ] Password history prevents password reuse
- [ ] All unit tests pass
- [ ] All integration tests pass

### Phase 6: Data Migration ✅
- [ ] All existing data is migrated successfully
- [ ] No data loss or corruption
- [ ] All existing functionality works
- [ ] Default admin and owner accounts exist
- [ ] Departments are accessible by ID
- [ ] Rollback procedure is documented and tested

---

## Next Steps

1. **Review this document** - Ensure you understand the architecture and approach
2. **Ask questions** - Clarify any ambiguities before we start building
3. **Approve the plan** - Give the go-ahead to start Phase 1
4. **Track progress** - Use the task checklist above to monitor implementation
5. **Test incrementally** - Test each phase before moving to the next

**Ready to start when you are!** 🚀

---

## Key Design Decisions & Q&A Summary

### Authentication on Existing Endpoints
✅ **All existing API endpoints will require authentication** after Phase 1 is complete. Auth middleware will be applied globally to `/api` routes (except `/api/auth` which is public).

### Service Accounts for Background Processes
✅ **Added `service_account` role** to user_role enum. Background processes (polling, monitoring) will use service account users for automated operations. Each organization can have a service account user.

### Migration Strategy - Simplified
✅ **Only migrate departments, delete test data** for watchers, connections, schedules. This is simpler and acceptable since only test data exists. Fresh test data will be created with new multi-tenant schema.

### Email Verification
✅ **Email verification added to Phase 1**. Users must verify their email before they can login. Verification token sent via Mailjet.

### Email Service - Mailjet
✅ **Using Mailjet for transactional emails** (verification, invitations, password reset). Configuration added to environment variables.

### 2FA User Experience
✅ **2FA is optional but recommended**. Users can skip setup, but a persistent banner will remind them on every page. 2FA settings managed from UserSettingsPage → Security tab.

### User Settings Page
✅ **UserSettingsPage added to Phase 1** with tabs for Profile, Security (password, 2FA, sessions), and Preferences (timezone, locale).

### Multiple Roles Per User
✅ **Each user has ONE role** (simpler, standard for SaaS). Department assignments provide granularity for Editor/Viewer roles.

### User Role Extensibility
✅ **PostgreSQL enums are extensible**. Can add new roles later with `ALTER TYPE user_role ADD VALUE 'new_role'`. For custom roles, can migrate to table-based roles in future.

### Audit Logging Implementation
✅ **Automatic via middleware**. `auditLog.middleware.ts` intercepts all successful requests and logs asynchronously. No manual logging required in services.

### 2FA Provider Extensibility
✅ **Currently supports TOTP** (works with all authenticator apps). Architecture supports adding other providers (SMS, email, WebAuthn) in future via `two_fa_provider` field.

### 2FA Window Configuration
✅ **30 seconds is the industry standard** (RFC 6238). Window tolerance of ±1 step means codes are accepted for 90 seconds total (previous, current, next window).

### Super Admin Onboarding Flow
✅ **POST /api/admin/organizations endpoint** allows super admins to create organizations with initial owners. Sends invitation email to owner. Added to Phase 2.

---

**Document Version History:**
- v1.0 (2026-01-01): Initial plan created
- v1.1 (2026-01-02): Updated with refinements based on Q&A:
  - Added service_account role
  - Simplified migration strategy (delete test data)
  - Added email verification flow
  - Updated to use Mailjet for emails
  - Added 2FA skip with persistent reminders
  - Added UserSettingsPage
  - Clarified single role per user
  - Added automatic audit logging via middleware
  - Added super admin organization creation workflow
  - Documented 2FA extensibility and window configuration
- v1.2-1.7 (2026-01-03 to 2026-01-07): Backend implementation progress tracking
- v1.8 (2026-01-07): Phase 1 Frontend completion (Authentication + Login)
- v1.9 (2026-01-08): Phases 1-3 Frontend completion:
  - ✅ Phase 1: SettingsPage with profile, password change, 2FA management
  - ✅ Phase 2: UsersPage, user invitation/editing, DepartmentsPage migration
  - ✅ Phase 3: Complete 2FA setup/management integrated in SettingsPage
  - 📝 Added comprehensive status summary section
  - 📝 Documented remaining tasks (Phase 4-5 frontend enhancements)

---

**Note:** You can create additional test users anytime by running:
```bash
cd packages/api
npx tsx scripts/create-test-user.ts
```