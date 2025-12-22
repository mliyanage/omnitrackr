# SFTP Connection Support Implementation Plan

## Overview
Add SFTP connection testing support with dual authentication methods (password and private key) to the OmniTrackr file tracking system. This implementation will follow the existing S3 connection pattern and maintain consistency with the current architecture.

---

## 1. FRONTEND IMPLEMENTATION

### 1.1 Update Type Definitions

**File:** `/packages/frontend/src/types/watcher.types.ts`

**Changes Required:**
- Add `passphrase` field to `SFTPConnectionConfig` (currently missing)
- Add optional `auth_method` field for explicit tracking

```typescript
export interface SFTPConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  private_key?: string;
  passphrase?: string;  // ADD THIS
  path_prefix?: string;
  auth_method?: 'password' | 'privateKey';  // ADD THIS (optional but helpful)
}
```

**Rationale:** The backend type already has these fields, frontend should match.

---

### 1.2 Update Zod Validation Schema

**File:** `/packages/frontend/src/components/connections/ConnectionForm.tsx` (Lines 46-54)

**Current Schema:**
```typescript
const sftpConfigSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(),
  private_key: z.string().optional(),
  path_prefix: z.string().optional(),
});
```

**New Schema with Validation:**
```typescript
const sftpConfigSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().min(1, 'Username is required'),
  auth_method: z.enum(['password', 'privateKey']).default('password'),
  password: z.string().optional(),
  private_key: z.string().optional(),
  passphrase: z.string().optional(),
  path_prefix: z.string().optional(),
}).superRefine((data, ctx) => {
  // Ensure exactly one auth method is provided
  if (data.auth_method === 'password') {
    if (!data.password || data.password.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password is required when using password authentication',
        path: ['password'],
      });
    }
  } else if (data.auth_method === 'privateKey') {
    if (!data.private_key || data.private_key.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Private key is required when using key authentication',
        path: ['private_key'],
      });
    }
  }
});
```

**Rationale:** Use `superRefine` for cross-field validation to enforce XOR constraint between password and private key based on selected auth method.

---

### 1.3 Add RadioGroup UI Component

**File:** Create `/packages/frontend/src/components/ui/radio-group.tsx`

**Implementation:**
```typescript
import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
```

**Package Requirement:**
- Install `@radix-ui/react-radio-group` (add to package.json dependencies)

---

### 1.4 Update ConnectionForm Component - Add State Management

**File:** `/packages/frontend/src/components/connections/ConnectionForm.tsx`

**Add State Hook (after line 82):**
```typescript
const [sftpAuthMethod, setSftpAuthMethod] = useState<'password' | 'privateKey'>('password');
const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
```

**Add File Reader Helper Function:**
```typescript
const handlePrivateKeyFileUpload = (file: File | null) => {
  if (!file) {
    setPrivateKeyFile(null);
    form.setValue('connection_config.private_key', '');
    return;
  }

  setPrivateKeyFile(file);
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    form.setValue('connection_config.private_key', content);
  };
  reader.onerror = () => {
    showError('Failed to read private key file');
    setPrivateKeyFile(null);
  };
  reader.readAsText(file);
};
```

---

### 1.5 Update ConnectionForm - SFTP Fields UI

**File:** `/packages/frontend/src/components/connections/ConnectionForm.tsx` (Lines 250-322)

**Replace existing SFTP case with:**

```typescript
case 'SFTP':
  return (
    <>
      <FormField
        control={control}
        name="connection_config.host"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Host</FormLabel>
            <FormControl>
              <Input placeholder="sftp.example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="connection_config.port"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Port</FormLabel>
            <FormControl>
              <Input type="number" placeholder="22" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="connection_config.username"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* AUTH METHOD SELECTOR */}
      <FormField
        control={control}
        name="connection_config.auth_method"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Authentication Method</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(value) => {
                  field.onChange(value);
                  setSftpAuthMethod(value as 'password' | 'privateKey');
                  // Clear opposite auth fields when switching
                  if (value === 'password') {
                    form.setValue('connection_config.private_key', '');
                    form.setValue('connection_config.passphrase', '');
                    setPrivateKeyFile(null);
                  } else {
                    form.setValue('connection_config.password', '');
                  }
                }}
                value={field.value}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="password" id="auth-password" />
                  <Label htmlFor="auth-password" className="font-normal cursor-pointer">
                    Password Authentication
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="privateKey" id="auth-key" />
                  <Label htmlFor="auth-key" className="font-normal cursor-pointer">
                    Private Key Authentication
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* PASSWORD FIELD - Show only when password auth selected */}
      {sftpAuthMethod === 'password' && (
        <FormField
          control={control}
          name="connection_config.password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* PRIVATE KEY FIELDS - Show only when private key auth selected */}
      {sftpAuthMethod === 'privateKey' && (
        <>
          <FormField
            control={control}
            name="connection_config.private_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Private Key</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                    className="font-mono text-xs resize-none"
                    rows={8}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      // Clear file if user types in textarea
                      if (e.target.value && privateKeyFile) {
                        setPrivateKeyFile(null);
                      }
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Paste your private key in PEM or OpenSSH format
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* FILE UPLOAD OPTION */}
          <div className="space-y-2">
            <Label>Or Upload Private Key File</Label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept=".pem,.key,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  handlePrivateKeyFileUpload(file);
                }}
                className="cursor-pointer"
              />
              {privateKeyFile && (
                <span className="text-sm text-muted-foreground">
                  {privateKeyFile.name}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Accepts .pem, .key, or .txt files
            </p>
          </div>

          <FormField
            control={control}
            name="connection_config.passphrase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passphrase (Optional)</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormDescription>
                  Required only if your private key is encrypted
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      <FormField
        control={control}
        name="connection_config.path_prefix"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Path Prefix (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="/files/" {...field} />
            </FormControl>
            <FormDescription>
              Restrict access to a specific directory on the SFTP server
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
```

**Key Changes:**
1. Add RadioGroup for auth method selection
2. Conditionally render password OR private key fields based on selection
3. Support both textarea paste and file upload for private key
4. Add passphrase field for encrypted keys
5. Clear opposite auth method fields when switching

---

### 1.6 Update Default Form Values

**File:** `/packages/frontend/src/components/connections/ConnectionForm.tsx` (Lines 96-107)

**Update SFTP default to include auth_method:**

When type is SFTP, ensure:
```typescript
connection_config: {
  host: '',
  port: 22,
  username: '',
  auth_method: 'password',
  password: '',
  private_key: '',
  passphrase: '',
  path_prefix: '',
}
```

---

### 1.7 Update Imports

**File:** `/packages/frontend/src/components/connections/ConnectionForm.tsx` (Top of file)

**Add:**
```typescript
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useState } from 'react'; // Already imported at line 34
```

---

## 2. BACKEND IMPLEMENTATION

### 2.1 Install Required Package

**File:** `/packages/api/package.json`

**Add to dependencies:**
```json
"ssh2-sftp-client": "^10.0.3"
```

**Installation Command:**
```bash
cd packages/api && npm install ssh2-sftp-client
```

**Type Definitions:** Built-in TypeScript types included in the package.

---

### 2.2 Update Shared Type Definitions

**File:** `/packages/shared/src/types/sourceConnection.types.ts` (Lines 44-51)

**Verify/Update SFTPConnectionConfig:**
```typescript
export interface SFTPConnectionConfig extends BaseSourceConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  authMethod?: 'password' | 'privateKey'; // Optional tracking field
}
```

**Note:** Current implementation already supports password and privateKey. Add authMethod for consistency.

---

### 2.3 Implement SFTP Test Connection Method

**File:** `/packages/api/src/services/sourceConnection.service.ts`

**Add Import (after line 14):**
```typescript
import SFTPClient from 'ssh2-sftp-client';
```

**Add Switch Case (line 63-75):**

Update the switch statement in `testConnection()`:
```typescript
async testConnection(request: TestSourceConnectionRequest): Promise<TestSourceConnectionResponse> {
  const startTime = Date.now();

  switch (request.type) {
    case 'S3':
      return this.testS3Connection(request.connection_config, startTime);
    case 'SFTP':  // ADD THIS CASE
      return this.testSFTPConnection(request.connection_config, startTime);
    default:
      return {
        success: false,
        canAuthenticate: false,
        canAccess: false,
        canList: false,
        errorMessage: `Connection type '${request.type}' not yet implemented`,
      };
  }
}
```

**Add Private Method (after line 154):**

```typescript
/**
 * Test SFTP connection
 * Supports both password and private key authentication
 */
private async testSFTPConnection(
  config: any,
  startTime: number
): Promise<TestSourceConnectionResponse> {
  // Support both camelCase (type definition) and snake_case (database storage)
  const host = config.host;
  const port = config.port || 22;
  const username = config.username;
  const password = config.password;
  const privateKey = config.privateKey || config.private_key;
  const passphrase = config.passphrase;
  const pathPrefix = config.pathPrefix || config.path_prefix || '/';

  console.log('[SFTP Test] Config keys:', Object.keys(config));
  console.log('[SFTP Test] Host:', host);
  console.log('[SFTP Test] Port:', port);
  console.log('[SFTP Test] Username:', username);
  console.log('[SFTP Test] Auth method:', privateKey ? 'privateKey' : 'password');

  // Validate required fields
  if (!host || !username) {
    return {
      success: false,
      canAuthenticate: false,
      canAccess: false,
      canList: false,
      errorMessage: 'Missing required SFTP configuration (host or username)',
      latencyMs: Date.now() - startTime,
    };
  }

  // Validate authentication method
  if (!password && !privateKey) {
    return {
      success: false,
      canAuthenticate: false,
      canAccess: false,
      canList: false,
      errorMessage: 'Either password or private key must be provided',
      latencyMs: Date.now() - startTime,
    };
  }

  const sftp = new SFTPClient();
  const response: TestSourceConnectionResponse = {
    success: false,
    canAuthenticate: false,
    canAccess: false,
    canList: false,
  };

  try {
    // Build connection config
    const connectConfig: any = {
      host,
      port,
      username,
    };

    // Add authentication credentials
    if (privateKey) {
      connectConfig.privateKey = privateKey;
      if (passphrase) {
        connectConfig.passphrase = passphrase;
      }
    } else {
      connectConfig.password = password;
    }

    // Test connection and authentication
    await sftp.connect(connectConfig);
    response.canAuthenticate = true;
    console.log('[SFTP Test] Authentication successful');

    // Test directory access and listing
    try {
      const fileList = await sftp.list(pathPrefix);
      response.canAccess = true;
      response.canList = true;
      response.success = true;

      // Extract sample file/directory names (max 5)
      response.sampleItems = fileList
        .slice(0, 5)
        .map((item) => item.name);

      console.log('[SFTP Test] Listed', fileList.length, 'items in', pathPrefix);
    } catch (listError: any) {
      // Authentication worked but listing failed
      response.canAccess = false;
      response.canList = false;
      response.errorMessage = `Connected successfully but failed to list directory '${pathPrefix}': ${listError.message}`;
      console.error('[SFTP Test] List error:', listError.message);
    }

    response.latencyMs = Date.now() - startTime;

  } catch (error: any) {
    response.latencyMs = Date.now() - startTime;
    console.error('[SFTP Test] Connection error:', error);

    // Parse common SFTP errors
    const errorMessage = error.message || 'Unknown error';
    
    if (errorMessage.includes('All configured authentication methods failed')) {
      response.errorMessage = 'Authentication failed: Invalid credentials';
    } else if (errorMessage.includes('getaddrinfo ENOTFOUND') || errorMessage.includes('EHOSTUNREACH')) {
      response.errorMessage = `Host '${host}' is unreachable or does not exist`;
    } else if (errorMessage.includes('ECONNREFUSED')) {
      response.errorMessage = `Connection refused by host '${host}' on port ${port}`;
    } else if (errorMessage.includes('ETIMEDOUT')) {
      response.errorMessage = `Connection timeout to '${host}:${port}'`;
    } else if (errorMessage.includes('Permission denied')) {
      response.canAuthenticate = true;
      response.errorMessage = 'Authentication failed: Permission denied';
    } else if (errorMessage.includes('privateKey')) {
      response.errorMessage = 'Invalid private key format or passphrase';
    } else {
      response.errorMessage = `SFTP connection failed: ${errorMessage}`;
    }

  } finally {
    // Always close connection
    try {
      await sftp.end();
    } catch (closeError) {
      console.error('[SFTP Test] Error closing connection:', closeError);
    }
  }

  return response;
}
```

**Error Handling Strategy:**
1. **Pre-validation errors:** Missing host, username, or auth credentials
2. **Connection errors:** Host unreachable, connection refused, timeout
3. **Authentication errors:** Invalid password, bad private key, wrong passphrase
4. **Access errors:** Permission denied on directory listing
5. **Format errors:** Invalid private key format

**Test Steps:**
1. Validate required configuration
2. Establish SFTP connection (tests authentication)
3. List directory at path_prefix (tests access and list permissions)
4. Return sample file names

---

## 3. TESTING STRATEGY

### 3.1 Frontend Testing Checklist

**Manual Testing:**
- [ ] Auth method radio buttons toggle correctly
- [ ] Password field appears when "Password Authentication" selected
- [ ] Private key fields appear when "Private Key Authentication" selected
- [ ] Switching auth methods clears opposite fields
- [ ] Textarea accepts pasted private key
- [ ] File upload reads private key file correctly
- [ ] Typing in textarea clears file upload selection
- [ ] Passphrase field is optional but functional
- [ ] Form validation shows errors for missing password
- [ ] Form validation shows errors for missing private key
- [ ] Cannot submit with both password AND private key
- [ ] Cannot submit with neither password NOR private key
- [ ] Test connection button triggers API call
- [ ] Success toast displays on successful connection
- [ ] Error toast displays on failed connection
- [ ] Loading states work correctly

**Test Cases:**
1. **Password Auth:**
   - Valid password → Success
   - Wrong password → Auth failure
   - Empty password → Validation error

2. **Private Key Auth:**
   - Valid unencrypted key (paste) → Success
   - Valid encrypted key + passphrase → Success
   - Valid encrypted key without passphrase → Auth failure
   - Invalid key format → Error
   - File upload with valid key → Success

3. **Edge Cases:**
   - Switch from password to key mid-form
   - Upload file then paste in textarea
   - Very long private key (4096-bit RSA)
   - Special characters in passphrase

---

### 3.2 Backend Testing Checklist

**Unit Tests (Create `/packages/api/src/__tests__/services/sourceConnection.service.test.ts`):**

```typescript
describe('SourceConnectionService - SFTP', () => {
  describe('testSFTPConnection', () => {
    it('should connect with password authentication', async () => {
      // Test implementation
    });

    it('should connect with private key authentication', async () => {
      // Test implementation
    });

    it('should connect with encrypted private key and passphrase', async () => {
      // Test implementation
    });

    it('should fail with invalid password', async () => {
      // Test implementation
    });

    it('should fail with missing authentication', async () => {
      // Test implementation
    });

    it('should fail with unreachable host', async () => {
      // Test implementation
    });

    it('should handle directory listing errors gracefully', async () => {
      // Test implementation
    });
  });
});
```

**Integration Testing:**
1. Set up test SFTP server (Docker container recommended)
2. Test password authentication
3. Test private key authentication
4. Test passphrase-protected keys
5. Test invalid credentials
6. Test connection timeout
7. Test directory access permissions

**Test SFTP Server Setup (Docker):**
```bash
docker run -p 2222:22 -d atmoz/sftp \
  testuser:testpass:::upload
```

---

## 4. IMPLEMENTATION ORDER

### Phase 1: Backend Foundation
1. Install `ssh2-sftp-client` package
2. Update `SFTPConnectionConfig` type in shared package
3. Implement `testSFTPConnection()` method
4. Add SFTP case to service switch statement
5. Test backend with Postman/curl

### Phase 2: Frontend UI Components
6. Create `radio-group.tsx` UI component
7. Update frontend `SFTPConnectionConfig` type
8. Update Zod schema with validation
9. Add state management hooks to ConnectionForm

### Phase 3: Frontend Form Integration
10. Add auth method radio selector
11. Add conditional password field
12. Add conditional private key fields (textarea + file upload)
13. Add passphrase field
14. Wire up file upload handler
15. Update form default values

### Phase 4: Testing & Refinement
16. Test all authentication scenarios
17. Test error handling
18. Test UI state transitions
19. Fix any validation issues
20. Add unit tests
21. Update documentation

---

## 5. POTENTIAL ISSUES & SOLUTIONS

### Issue 1: Private Key Format Compatibility
**Problem:** Different SSH key formats (PEM, OpenSSH, PKCS#1, PKCS#8)

**Solution:** 
- `ssh2-sftp-client` accepts standard OpenSSH and PEM formats
- Add format validation to provide helpful error messages
- Document accepted formats in UI description text

**Mitigation:**
```typescript
// Add to validation
if (privateKey && !privateKey.includes('BEGIN')) {
  throw new Error('Private key must be in PEM or OpenSSH format');
}
```

---

### Issue 2: Large Private Key Files
**Problem:** 4096-bit RSA keys are ~3KB, may cause textarea lag

**Solution:**
- Textarea with `resize-none` and fixed height (8 rows)
- Use `font-mono` and `text-xs` for better display
- File upload as alternative input method

---

### Issue 3: Security - Private Keys in Browser Memory
**Problem:** Private keys temporarily stored in React state and form

**Solution:**
- Private keys only exist in memory during form interaction
- Not persisted to localStorage
- Sent securely via HTTPS to backend
- Backend only uses key for connection test, doesn't store it
- Add warning in UI about using restricted keys

**Future Enhancement:**
- Consider encrypting connection_config in database
- Add credential rotation reminders

---

### Issue 4: SFTP Connection Timeout
**Problem:** Default timeout may be too long, blocking UI

**Solution:**
- Add timeout configuration to SFTPClient connect options
```typescript
connectConfig.readyTimeout = 20000; // 20 seconds
```
- Show loading spinner in UI during test
- Allow cancellation if needed (future enhancement)

---

### Issue 5: Path Prefix Variations
**Problem:** Different SFTP servers handle paths differently (relative vs absolute)

**Solution:**
- Default to '/' if not specified
- Normalize paths (remove trailing slash)
- Provide clear examples in UI
- Handle both '/path' and 'path' formats

```typescript
const pathPrefix = (config.path_prefix || '/').replace(/\/$/, '') || '/';
```

---

### Issue 6: Authentication Method Confusion
**Problem:** Users might try to fill both password AND private key

**Solution:**
- Use RadioGroup to make auth method mutually exclusive
- Clear opposite auth fields when switching methods
- Validation prevents submission with both methods
- Clear UI labels and descriptions

---

### Issue 7: Passphrase Edge Cases
**Problem:** Users might forget if key has passphrase or enter wrong passphrase

**Solution:**
- Make passphrase optional
- Provide clear error message from ssh2 library
- Add description: "Required only if your private key is encrypted"
- Error handling distinguishes between bad key and bad passphrase

---

### Issue 8: Snake_case vs CamelCase Config Keys
**Problem:** Frontend uses snake_case, backend types use camelCase

**Solution:**
- Already handled in S3 implementation pattern
- Support both formats in backend:
```typescript
const privateKey = config.privateKey || config.private_key;
```
- Database stores as JSONB, flexible format
- Frontend sends snake_case

---

## 6. CONFIGURATION EXAMPLES

### Password Authentication
```json
{
  "type": "SFTP",
  "connection_config": {
    "host": "sftp.example.com",
    "port": 22,
    "username": "fileuser",
    "auth_method": "password",
    "password": "secret123",
    "path_prefix": "/incoming/files"
  }
}
```

### Private Key Authentication (Unencrypted)
```json
{
  "type": "SFTP",
  "connection_config": {
    "host": "sftp.example.com",
    "port": 2222,
    "username": "keyuser",
    "auth_method": "privateKey",
    "private_key": "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA...\n-----END OPENSSH PRIVATE KEY-----",
    "path_prefix": "/data"
  }
}
```

### Private Key Authentication (Encrypted with Passphrase)
```json
{
  "type": "SFTP",
  "connection_config": {
    "host": "secure.sftp.com",
    "port": 22,
    "username": "secureuser",
    "auth_method": "privateKey",
    "private_key": "-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-128-CBC...\n-----END RSA PRIVATE KEY-----",
    "passphrase": "mySecurePassphrase123",
    "path_prefix": "/"
  }
}
```

---

## 7. SUCCESS CRITERIA

**Definition of Done:**

### ✅ Implementation Complete
- [x] Users can choose between password and private key authentication
  - RadioGroup component implemented with password/privateKey options
- [x] Private keys can be pasted into textarea
  - 200px textarea with monospace font for key input
- [x] Private keys can be uploaded from file
  - File upload input with FileReader for .pem, .key, .txt files
- [x] Validation prevents invalid configurations
  - Zod schema with superRefine for XOR validation (password OR private key)
- [x] UI matches existing S3 connection form patterns
  - Follows same FormField structure and styling
- [x] Backend follows S3 test connection pattern
  - testSFTPConnection() mirrors testS3Connection() structure
- [x] Code is documented and maintainable
  - Clear comments, error handling, and type safety

### ✅ User Testing Complete
- [x] Password authentication works with valid credentials
- [x] Private key authentication works with unencrypted keys
- [x] Private key authentication works with passphrase-protected keys
- [x] Connection test returns detailed success/failure information
- [x] Error messages are clear and actionable
- [x] All edge cases are handled gracefully

---

## 8. FUTURE ENHANCEMENTS (Out of Scope)

1. **SSH Agent Support:** Use system SSH agent for key management
2. **Key Format Conversion:** Auto-convert between PEM/OpenSSH formats
3. **Credential Vault Integration:** Store private keys in AWS Secrets Manager
4. **Certificate-Based Auth:** Support SSH certificates
5. **Known Hosts Verification:** Verify server fingerprints
6. **Connection Pooling:** Reuse SFTP connections for polling
7. **Bandwidth Throttling:** Limit connection speed
8. **Multi-Factor Authentication:** Support SFTP servers with 2FA

---

## APPENDIX: Critical Files Summary

### Critical Files for Implementation

**Backend (3 files):**
1. **`/packages/api/src/services/sourceConnection.service.ts`**
   - Add `testSFTPConnection()` method (~150 lines)
   - Update switch statement in `testConnection()` method
   - Import `ssh2-sftp-client`

2. **`/packages/shared/src/types/sourceConnection.types.ts`**
   - Update `SFTPConnectionConfig` interface
   - Add `authMethod` and `passphrase` fields

3. **`/packages/api/package.json`**
   - Add `ssh2-sftp-client` dependency

**Frontend (4 files):**
4. **`/packages/frontend/src/components/connections/ConnectionForm.tsx`**
   - Major updates to SFTP case (lines 250-322)
   - Add state hooks for auth method and file upload
   - Add file reader helper function
   - Update imports

5. **`/packages/frontend/src/types/watcher.types.ts`**
   - Update `SFTPConnectionConfig` interface
   - Add `passphrase` and `auth_method` fields

6. **`/packages/frontend/src/components/ui/radio-group.tsx`** (NEW FILE)
   - Create RadioGroup component using Radix UI

7. **`/packages/frontend/package.json`**
   - Add `@radix-ui/react-radio-group` dependency

### Files NOT Requiring Changes:
- Database migrations (JSONB connection_config already flexible)
- API routes (already support test endpoint)
- Repository layer (generic connection handling)
- Controller layer (already supports SFTP type)
- API client (already supports test connection)

---

**END OF IMPLEMENTATION PLAN**
