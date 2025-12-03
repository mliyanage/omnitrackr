# Component Refactoring Plan: Connections, Schedules, Departments

## Overview

Refactor Connection, Schedule, and Department components from `/components/watchers/` to their own folders for reusability, create standalone CRUD pages for each entity, and set up comprehensive testing infrastructure.

**User Preferences:**
- ✅ Vitest for frontend testing (faster, better Vite integration)
- ✅ Comprehensive test coverage
- ✅ Clean break (no backward compatibility)

## Goals

1. **Reusability** - Move components to proper folders for use across the application
2. **Standalone Pages** - Create ConnectionsPage, SchedulesPage, DepartmentsPage with full CRUD
3. **Preserve Workflow** - Maintain inline creation within WatcherForm (nested sheets)
4. **Testing** - Set up frontend testing infrastructure and ensure refactoring doesn't break anything
5. **Quality** - Comprehensive test coverage for all components and pages

---

## New Folder Structure

### Current Structure (Problem)
```
src/components/watchers/
├── ConnectionCombobox.tsx      ❌ Should be in /connections/
├── ConnectionForm.tsx           ❌ Should be in /connections/
├── ConnectionSheet.tsx          ❌ Should be in /connections/
├── ScheduleCombobox.tsx        ❌ Should be in /schedules/
├── ScheduleForm.tsx            ❌ Should be in /schedules/
├── ScheduleSheet.tsx           ❌ Should be in /schedules/
├── DepartmentCombobox.tsx      ❌ Should be in /departments/
├── DepartmentForm.tsx          ❌ Should be in /departments/
├── DepartmentSheet.tsx         ❌ Should be in /departments/
├── WatcherForm.tsx             ✅ Stays here
└── WatcherSheet.tsx            ✅ Stays here
```

### New Structure (Solution)
```
src/components/
├── connections/
│   ├── ConnectionCombobox.tsx
│   ├── ConnectionForm.tsx
│   ├── ConnectionSheet.tsx
│   └── ConnectionTable.tsx      [NEW]
├── schedules/
│   ├── ScheduleCombobox.tsx
│   ├── ScheduleForm.tsx
│   ├── ScheduleSheet.tsx
│   └── ScheduleTable.tsx        [NEW]
├── departments/
│   ├── DepartmentCombobox.tsx
│   ├── DepartmentForm.tsx
│   ├── DepartmentSheet.tsx
│   └── DepartmentTable.tsx      [NEW]
└── watchers/
    ├── WatcherForm.tsx          [UPDATE imports]
    ├── WatcherSheet.tsx
    └── WatcherTable.tsx
```

### New Pages
```
src/pages/
├── ConnectionsPage.tsx          [NEW]
├── SchedulesPage.tsx            [NEW]
└── DepartmentsPage.tsx          [NEW]
```

---

## Component Refactoring Strategy

### Phase 1: Move Components

**No changes to component logic** - just relocate and update imports.

#### Connections Components
- **Move from:** `/components/watchers/Connection*.tsx`
- **Move to:** `/components/connections/`
- **Files:** ConnectionCombobox.tsx, ConnectionForm.tsx, ConnectionSheet.tsx
- **No prop changes needed** - components remain identical

#### Schedules Components
- **Move from:** `/components/watchers/Schedule*.tsx`
- **Move to:** `/components/schedules/`
- **Files:** ScheduleCombobox.tsx, ScheduleForm.tsx, ScheduleSheet.tsx
- **No prop changes needed** - components remain identical

#### Departments Components
- **Move from:** `/components/watchers/Department*.tsx`
- **Move to:** `/components/departments/`
- **Files:** DepartmentCombobox.tsx, DepartmentForm.tsx, DepartmentSheet.tsx
- **No prop changes needed** - components remain identical

### Phase 2: Update Imports

**WatcherForm.tsx** must update imports:

```typescript
// OLD imports
import { ConnectionCombobox } from './ConnectionCombobox';
import { ConnectionSheet } from './ConnectionSheet';
import { ScheduleCombobox } from './ScheduleCombobox';
import { ScheduleSheet } from './ScheduleSheet';
import { DepartmentCombobox } from './DepartmentCombobox';
import { DepartmentSheet } from './DepartmentSheet';

// NEW imports
import { ConnectionCombobox } from '@/components/connections/ConnectionCombobox';
import { ConnectionSheet } from '@/components/connections/ConnectionSheet';
import { ScheduleCombobox } from '@/components/schedules/ScheduleCombobox';
import { ScheduleSheet } from '@/components/schedules/ScheduleSheet';
import { DepartmentCombobox } from '@/components/departments/DepartmentCombobox';
import { DepartmentSheet } from '@/components/departments/DepartmentSheet';
```

**No other changes to WatcherForm.tsx** - all component usage remains the same.

---

## New Pages Implementation

Each page follows the **WatchersPage pattern** with table, filters, and CRUD operations.

### 1. ConnectionsPage

**Path:** `/connections`

**Features:**
- Header with "Create Connection" button
- Search input (filter by name, description, bucket/host)
- Type filter dropdown (All, S3, SFTP, Azure Blob)
- Status filter (All, Active, Inactive, Error)
- Table columns: Name, Type, Config (bucket/host), Status, Created, Actions
- Actions dropdown: View, Edit, Test Connection, Delete
- ConnectionSheet for create/edit
- Summary stats: Total Connections, Active, Error, Types breakdown

**API Integration:**
- `useQuery(['connections'], getConnections)`
- `useMutation(createConnection)` with cache invalidation
- `useMutation(updateConnection)` with cache invalidation
- `useMutation(deleteConnection)` with cache invalidation
- `useMutation(testConnection)` for connection validation

**New Component:** ConnectionTable.tsx
- Displays connection data in table format
- Action dropdown menu
- Status badges with colors
- Connection type icons

### 2. SchedulesPage

**Path:** `/schedules`

**Features:**
- Header with "Create Schedule" button
- Search input (filter by name, description)
- Frequency type filter (All, Daily, Hourly, Weekly, Monthly, Yearly, Minutely)
- Status filter (All, Enabled, Disabled)
- Table columns: Name, Frequency, Execution Times, Timezone, Status, Next Run, Actions
- Actions dropdown: View, Edit, Calculate Next Run, Disable/Enable, Delete
- ScheduleSheet for create/edit
- Summary stats: Total Schedules, Enabled, By Frequency Type

**API Integration:**
- `useQuery(['schedules'], getSchedules)`
- `useMutation(createSchedule)` with cache invalidation
- `useMutation(updateSchedule)` with cache invalidation
- `useMutation(deleteSchedule)` with cache invalidation
- `useMutation(calculateNextRunTime)` for schedule preview

**New Component:** ScheduleTable.tsx
- Displays schedule data in table format
- Formatted frequency display (e.g., "Every 2 hours at :00")
- Next run time calculation display
- Enable/disable toggle
- Action dropdown menu

### 3. DepartmentsPage

**Path:** `/departments`

**Features:**
- Header with "Create Department" button
- Search input (filter by name, abbreviation, description)
- Status filter (All, Active, Inactive)
- Table columns: Name, Abbreviation, Description, Sort Order, Status, Watchers Count, Actions
- Actions dropdown: Edit, Deactivate/Activate, Delete
- DepartmentSheet for create/edit
- Summary stats: Total Departments, Active, Inactive

**API Integration:**
- `useQuery(['departments'], getDepartments)`
- `useMutation(createRefData)` with cache invalidation
- `useMutation(updateRefData)` with cache invalidation
- `useMutation(deleteRefData)` with cache invalidation

**New Component:** DepartmentTable.tsx
- Displays department data in table format
- Active/inactive status badges
- Watcher count (requires API enhancement or calculation)
- Action dropdown menu
- Sorted by sort_order or name

---

## Testing Infrastructure Setup

### Choice: Vitest

**Rationale:**
- Native Vite integration (your frontend uses Vite)
- 10x faster than Jest for Vite projects
- Jest-compatible API (minimal learning curve)
- Better ESM/TypeScript support
- No additional Vite configuration needed

### Dependencies to Install

```bash
cd packages/frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
```

### Configuration Files

#### 1. `vitest.config.ts`

Create in `/packages/frontend/vitest.config.ts`

#### 2. `src/__tests__/setup.ts`

Global test setup with cleanup and mocks

#### 3. Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

### Test Utilities

#### `src/__tests__/utils/test-utils.tsx`
Custom render function with React Query and Router providers

#### `src/__tests__/utils/mockData.ts`
Mock data factories for Connection, Schedule, Department, Watcher

#### `src/__tests__/utils/mockApi.ts`
MSW server setup with API request handlers

---

## Comprehensive Test Coverage Plan

### Test Files to Create (17 test suites)

**Connection Components:**
1. ✅ ConnectionCombobox.test.tsx - Dropdown, search, create new
2. ✅ ConnectionForm.test.tsx - Validation, submission, type-specific fields
3. ✅ ConnectionSheet.test.tsx - Open/close, form integration
4. ✅ ConnectionTable.test.tsx - Display, actions, filters

**Schedule Components:**
5. ✅ ScheduleCombobox.test.tsx - Dropdown, search, create new
6. ✅ ScheduleForm.test.tsx - Validation, frequency fields, execution times
7. ✅ ScheduleSheet.test.tsx - Open/close, form integration
8. ✅ ScheduleTable.test.tsx - Display, actions, enable/disable

**Department Components:**
9. ✅ DepartmentCombobox.test.tsx - Dropdown, search, create new
10. ✅ DepartmentForm.test.tsx - Validation, duplicate check
11. ✅ DepartmentSheet.test.tsx - Open/close, form integration
12. ✅ DepartmentTable.test.tsx - Display, actions, active/inactive

**Integration Tests:**
13. ✅ WatcherForm.test.tsx - Nested sheet workflow, inline creation

**Page Tests:**
14. ✅ ConnectionsPage.test.tsx - Full CRUD workflow, filters, search
15. ✅ SchedulesPage.test.tsx - Full CRUD workflow, filters, search
16. ✅ DepartmentsPage.test.tsx - Full CRUD workflow, filters, search
17. ✅ WatchersPage.test.tsx - Verify no regressions after refactoring

---

## Step-by-Step Migration Plan

### Step 1: Set Up Testing Infrastructure ⏱️ 2 hours

1. Install testing dependencies
2. Create `vitest.config.ts`
3. Create test utilities (setup, test-utils, mockData, mockApi)
4. Add test scripts to `package.json`
5. Verify setup: `npm test` should run with no tests found

**Verification:** No errors, test command works

---

### Step 2: Write Tests for Existing Components ⏱️ 3 hours

Write tests for components **before moving them** to establish baseline.

**Tasks:**
1. Create test files in current location (`/components/watchers/`)
2. Write comprehensive tests for:
   - ConnectionCombobox, ConnectionForm, ConnectionSheet
   - ScheduleCombobox, ScheduleForm, ScheduleSheet
   - DepartmentCombobox, DepartmentForm, DepartmentSheet
   - WatcherForm (integration test)

**Verification:** All tests pass - `npm test`

**Critical:** Do not proceed until all tests pass

---

### Step 3: Move Connection Components ⏱️ 20 min

1. Create `src/components/connections/` directory
2. Move 6 files (3 components + 3 tests)
3. Update imports in WatcherForm.tsx
4. Run tests

**Verification:** All tests pass, no TypeScript errors

---

### Step 4: Move Schedule Components ⏱️ 20 min

1. Create `src/components/schedules/` directory
2. Move 6 files (3 components + 3 tests)
3. Update imports in WatcherForm.tsx
4. Run tests

**Verification:** All tests pass, no TypeScript errors

---

### Step 5: Move Department Components ⏱️ 20 min

1. Create `src/components/departments/` directory
2. Move 6 files (3 components + 3 tests)
3. Update imports in WatcherForm.tsx
4. Run tests

**Verification:** All tests pass, WatcherForm integration test passes

---

### Step 6: Create ConnectionTable Component ⏱️ 45 min

1. Create `ConnectionTable.tsx`
2. Create `ConnectionTable.test.tsx`
3. Implement table with actions

**Verification:** ConnectionTable tests pass

---

### Step 7: Create ConnectionsPage ⏱️ 1 hour

1. Create `ConnectionsPage.tsx`
2. Create `ConnectionsPage.test.tsx`
3. Add route to `routes/index.tsx`
4. Test in browser

**Verification:** Page tests pass, page works in browser

---

### Step 8: Create ScheduleTable Component ⏱️ 45 min

1. Create `ScheduleTable.tsx`
2. Create `ScheduleTable.test.tsx`
3. Implement table with actions

**Verification:** ScheduleTable tests pass

---

### Step 9: Create SchedulesPage ⏱️ 1 hour

1. Create `SchedulesPage.tsx`
2. Create `SchedulesPage.test.tsx`
3. Add route to `routes/index.tsx`
4. Test in browser

**Verification:** Page tests pass, page works in browser

---

### Step 10: Create DepartmentTable Component ⏱️ 45 min

1. Create `DepartmentTable.tsx`
2. Create `DepartmentTable.test.tsx`
3. Implement table with actions

**Verification:** DepartmentTable tests pass

---

### Step 11: Create DepartmentsPage ⏱️ 1 hour

1. Create `DepartmentsPage.tsx`
2. Create `DepartmentsPage.test.tsx`
3. Add route to `routes/index.tsx`
4. Test in browser

**Verification:** Page tests pass, page works in browser

---

### Step 12: Integration Testing ⏱️ 1 hour

**Manual Testing:**
1. Test WatchersPage end-to-end
2. Test inline creation workflow (nested sheets)
3. Test navigation between pages
4. Verify data consistency

**Verification:** All workflows work, no regressions

---

### Step 13: Final Cleanup ⏱️ 30 min

1. Remove empty directories
2. Run full test suite with coverage
3. Run type checking
4. Run linting
5. Build for production
6. Deploy to staging

**Verification:** All checks pass, staging works

---

## Critical Files

### Files to Create (35 files)

**Test Infrastructure (5):**
- `packages/frontend/vitest.config.ts`
- `packages/frontend/src/__tests__/setup.ts`
- `packages/frontend/src/__tests__/utils/test-utils.tsx`
- `packages/frontend/src/__tests__/utils/mockData.ts`
- `packages/frontend/src/__tests__/utils/mockApi.ts`

**Connection Components (8):**
- Move: ConnectionCombobox.tsx, ConnectionForm.tsx, ConnectionSheet.tsx
- Move: ConnectionCombobox.test.tsx, ConnectionForm.test.tsx, ConnectionSheet.test.tsx
- New: ConnectionTable.tsx, ConnectionTable.test.tsx

**Schedule Components (8):**
- Move: ScheduleCombobox.tsx, ScheduleForm.tsx, ScheduleSheet.tsx
- Move: ScheduleCombobox.test.tsx, ScheduleForm.test.tsx, ScheduleSheet.test.tsx
- New: ScheduleTable.tsx, ScheduleTable.test.tsx

**Department Components (8):**
- Move: DepartmentCombobox.tsx, DepartmentForm.tsx, DepartmentSheet.tsx
- Move: DepartmentCombobox.test.tsx, DepartmentForm.test.tsx, DepartmentSheet.test.tsx
- New: DepartmentTable.tsx, DepartmentTable.test.tsx

**Pages (6):**
- New: ConnectionsPage.tsx, ConnectionsPage.test.tsx
- New: SchedulesPage.tsx, SchedulesPage.test.tsx
- New: DepartmentsPage.tsx, DepartmentsPage.test.tsx

### Files to Modify (3)

- `packages/frontend/src/components/watchers/WatcherForm.tsx` - Update imports
- `packages/frontend/src/routes/index.tsx` - Add 3 routes
- `packages/frontend/package.json` - Add test dependencies and scripts

---

## Success Criteria

✅ Components in proper folders (`/connections/`, `/schedules/`, `/departments/`)
✅ Three new pages with full CRUD operations
✅ Inline creation workflow still works (nested sheets)
✅ Testing infrastructure set up (Vitest + RTL + MSW)
✅ Comprehensive test coverage (>80%)
✅ All tests passing
✅ No TypeScript errors
✅ No ESLint errors
✅ Production build succeeds
✅ No console errors in browser
✅ Staging deployment works

---

## Timeline

**Total: 10-12 hours**

- Testing setup: 2 hours
- Initial tests: 3 hours
- Move components: 1 hour
- Create Tables + Pages: 4.5 hours
- Integration testing: 1 hour
- Cleanup: 0.5 hours

---

## Risk Mitigation

### Risks & Mitigations

1. **Breaking inline creation**
   - Mitigation: Write integration tests BEFORE moving

2. **Import path issues**
   - Mitigation: Configure vitest with proper aliases

3. **Z-index conflicts**
   - Mitigation: Verify z-index values (z-50 parent, z-60 nested)

4. **API mocking issues**
   - Mitigation: Test MSW setup early

### Rollback Plan

If issues arise:
1. Revert commits step by step
2. Restore components to `/components/watchers/`
3. Revert import changes
4. Keep testing infrastructure

---

## Notes

- **Test-first approach** ensures safety
- **Incremental changes** allow verification at each step
- **Clean break** simplifies codebase
- **MSW for mocking** matches backend philosophy
- **Vitest for speed** optimized for Vite projects
