# OmniTrackr Testing Guide

Complete guide for running and writing tests for the OmniTrackr project.

## 🎯 Testing Philosophy

Our tests serve a critical purpose: **Prevent breaking existing functionality when making changes**.

### Test Coverage Goals
- ✅ **Unit Tests** - Test individual functions/methods in isolation
- ✅ **Integration Tests** - Test how components work together
- ✅ **Regression Tests** - Ensure bugs don't reappear
- 🚧 **E2E Tests** - Test complete user workflows (Future)

---

## 🚀 Quick Start

### Run All Tests

```bash
# From project root
npm test --workspace=packages/api

# Or from packages/api
cd packages/api
npm test
```

### Run Tests in Watch Mode (Development)

```bash
# Automatically re-runs tests when files change
npm test --workspace=packages/api -- --watch
```

### Run Tests with Coverage

```bash
npm test --workspace=packages/api -- --coverage
```

---

## 📁 Test Structure

```
packages/api/
└── src/
    ├── __tests__/
    │   ├── setup.ts                    # Test configuration
    │   ├── helpers/
    │   │   └── database.helper.ts      # DB test utilities
    │   └── services/
    │       └── fileSource.service.test.ts
    │
    └── services/
        └── fileSource.service.ts       # Source code

packages/shared/
└── src/
    ├── __tests__/
    │   └── repositories/
    │       └── fileSource.repository.test.ts
    │
    └── repositories/
        └── fileSource.repository.ts    # Source code
```

**Convention:** Test files are named `*.test.ts` and located in `__tests__` directories.

---

## 🧪 Test Types

### 1. Repository Tests (Integration Tests)

**Location:** `packages/shared/src/__tests__/repositories/`

**Purpose:** Test database operations with an in-memory SQLite database.

**Example:**
```typescript
describe('FileSourceRepository', () => {
  let repository: FileSourceRepository;

  beforeEach(async () => {
    // Create test database
    // Insert test data
  });

  it('should create a new file source', async () => {
    const result = await repository.create(mockData);
    expect(result.id).toBeDefined();
  });
});
```

**What They Test:**
- ✅ CRUD operations work correctly
- ✅ SQL queries are correct
- ✅ Data validation
- ✅ Foreign key relationships
- ✅ Timestamps are generated

**Why In-Memory SQLite?**
- Fast (no network calls)
- Isolated (each test gets fresh database)
- No Docker dependencies
- SQL-compatible with PostgreSQL for basic operations

### 2. Service Tests (Unit Tests)

**Location:** `packages/api/src/__tests__/services/`

**Purpose:** Test business logic with mocked dependencies.

**Example:**
```typescript
describe('FileSourceService', () => {
  let service: FileSourceService;
  let mockRepo: jest.Mocked<FileSourceRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      // ... other methods
    } as any;

    service = new FileSourceService();
  });

  it('should throw NotFoundError when file source not found', async () => {
    mockRepo.findById.mockResolvedValue(undefined);

    await expect(service.getById(999)).rejects.toThrow(NotFoundError);
  });
});
```

**What They Test:**
- ✅ Business logic correctness
- ✅ Error handling
- ✅ Edge cases
- ✅ Validation logic
- ✅ Method interactions

**Why Mock Dependencies?**
- Fast (no actual database calls)
- Isolated (test only the service logic)
- Predictable (control exact return values)
- Test error scenarios easily

---

## 🛠️ Writing Tests

### Basic Test Structure

```typescript
describe('ComponentName', () => {
  // Setup before all tests
  beforeAll(() => {
    // Runs once before all tests
  });

  // Setup before each test
  beforeEach(() => {
    // Runs before each test
    // Use this to reset state
  });

  // Cleanup after each test
  afterEach(() => {
    // Runs after each test
  });

  // Cleanup after all tests
  afterAll(() => {
    // Runs once after all tests
  });

  // Group related tests
  describe('methodName', () => {
    it('should do something specific', async () => {
      // Arrange - Set up test data
      const input = { ... };

      // Act - Call the method
      const result = await service.method(input);

      // Assert - Check the result
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });

    it('should handle error case', async () => {
      await expect(service.method(badInput))
        .rejects
        .toThrow(ErrorType);
    });
  });
});
```

### Naming Conventions

#### Test Suite Names
```typescript
describe('FileSourceService', () => {  // ✅ Component name
  describe('getById', () => {          // ✅ Method name
    it('should...', () => {});         // ✅ Behavior description
  });
});
```

#### Test Case Names
```typescript
// ✅ Good - Describes behavior
it('should return file source when found', () => {});
it('should throw NotFoundError when not found', () => {});
it('should update timestamps on save', () => {});

// ❌ Bad - Too vague
it('works', () => {});
it('test getById', () => {});
```

### Common Assertions

```typescript
// Equality
expect(result).toBe(5);                    // Exact equality (===)
expect(result).toEqual({ id: 1 });         // Deep equality

// Truthiness
expect(result).toBeDefined();
expect(result).toBeNull();
expect(result).toBeTruthy();
expect(result).toBeFalsy();

// Numbers
expect(result).toBeGreaterThan(5);
expect(result).toBeLessThanOrEqual(10);

// Strings
expect(result).toContain('text');
expect(result).toMatch(/regex/);

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(ErrorType);
await expect(asyncFn()).rejects.toThrow();

// Mock functions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(2);
```

---

## 🎭 Mocking

### Why Mock?

**Benefits:**
- ✅ Fast tests (no real API/database calls)
- ✅ Isolated tests (test one thing at a time)
- ✅ Reliable tests (no network issues)
- ✅ Test error scenarios (simulate failures)

### Mocking Repositories

```typescript
const mockRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
} as jest.Mocked<FileSourceRepository>;

// Set return value
mockRepo.findById.mockResolvedValue(mockFileSource);

// Set different values for different calls
mockRepo.findById
  .mockResolvedValueOnce(fileSource1)
  .mockResolvedValueOnce(fileSource2);

// Simulate error
mockRepo.findById.mockRejectedValue(new Error('DB Error'));

// Check if called
expect(mockRepo.findById).toHaveBeenCalledWith(1);
expect(mockRepo.findById).toHaveBeenCalledTimes(1);
```

### Mocking Modules

```typescript
// Mock entire module
jest.mock('@aws-sdk/client-s3');

// Mock with custom implementation
jest.mock('../../config/database', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));
```

---

## 📊 Test Coverage

### View Coverage Report

```bash
npm test --workspace=packages/api -- --coverage
```

**Output:**
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   85.5  |   78.3   |   90.2  |   84.8  |
 services/          |   88.2  |   82.1   |   95.0  |   87.9  |
  fileSource.service|   88.2  |   82.1   |   95.0  |   87.9  |
--------------------|---------|----------|---------|---------|
```

### Coverage Goals

- **Statements:** 80%+ (lines of code executed)
- **Branches:** 75%+ (if/else paths covered)
- **Functions:** 90%+ (functions called)
- **Lines:** 80%+ (lines executed)

### View HTML Report

```bash
npm test --workspace=packages/api -- --coverage
open packages/api/coverage/lcov-report/index.html
```

---

## 🐛 Debugging Tests

### Run Single Test File

```bash
npm test --workspace=packages/api -- fileSource.service.test.ts
```

### Run Tests Matching Pattern

```bash
npm test --workspace=packages/api -- --testNamePattern="getById"
```

### Debug with VS Code

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "${file}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Add `console.log` for Debugging

```typescript
it('should do something', () => {
  console.log('Debug value:', someValue);
  expect(someValue).toBe(expected);
});
```

---

## ✅ Test Checklist

When writing tests, ensure you cover:

### Happy Path
- ✅ Valid input produces expected output
- ✅ Data is saved correctly
- ✅ Correct values are returned

### Error Handling
- ✅ Invalid input throws appropriate error
- ✅ Not found scenarios handled
- ✅ Validation errors caught

### Edge Cases
- ✅ Empty arrays/objects
- ✅ Null/undefined values
- ✅ Boundary values (min/max)
- ✅ Large datasets

### State Changes
- ✅ Timestamps updated
- ✅ Status changes tracked
- ✅ Side effects occur

---

## 📝 Examples

### Example 1: Testing a Create Method

```typescript
describe('create', () => {
  it('should create new file source', async () => {
    const input = { name: 'Test', type: 'S3', ... };
    
    const result = await repository.create(input);
    
    expect(result.id).toBeDefined();
    expect(result.name).toBe('Test');
    expect(result.created_at).toBeDefined();
  });

  it('should throw error if required field missing', async () => {
    const invalidInput = { name: 'Test' }; // Missing required fields
    
    await expect(repository.create(invalidInput))
      .rejects
      .toThrow();
  });
});
```

### Example 2: Testing Update Logic

```typescript
describe('update', () => {
  it('should update only specified fields', async () => {
    const created = await repository.create(mockData);
    
    const updated = await repository.update(created.id, {
      name: 'New Name'
    });
    
    expect(updated.name).toBe('New Name');
    expect(updated.type).toBe(created.type); // Unchanged
    expect(updated.updated_at).not.toBe(created.updated_at);
  });

  it('should throw NotFoundError for invalid ID', async () => {
    await expect(repository.update(999, { name: 'Test' }))
      .rejects
      .toThrow(NotFoundError);
  });
});
```

### Example 3: Testing Service with Mocks

```typescript
describe('FileSourceService', () => {
  it('should call repository with correct parameters', async () => {
    mockRepo.paginate.mockResolvedValue({ data: [], pagination: {...} });
    
    await service.getAll(2, 50, 'Finance');
    
    expect(mockRepo.paginate).toHaveBeenCalledWith({
      page: 2,
      limit: 50,
      filters: { department: 'Finance' }
    });
  });
});
```

---

## 🚨 Common Issues

### Issue 1: Tests Failing Due to Database State

**Problem:** Tests pass individually but fail when run together.

**Solution:** Clean database before each test.
```typescript
beforeEach(async () => {
  await dbHelper.cleanDatabase();
});
```

### Issue 2: Async Tests Timing Out

**Problem:** `Exceeded timeout of 5000ms`

**Solution:** Increase timeout or await properly.
```typescript
jest.setTimeout(10000); // In setup.ts

// Or per test
it('slow test', async () => {
  // ...
}, 15000);
```

### Issue 3: Mock Not Working

**Problem:** Mock function not being called.

**Solution:** Ensure mock is set up before service instantiation.
```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Clear previous calls
  mockRepo = { ... };
  service = new Service(); // Create AFTER mocks
});
```

---

## 🎓 Best Practices

### DO ✅

1. **Write tests as you code**
   - Don't wait until the end
   - Test-driven development (TDD) is ideal

2. **Test behavior, not implementation**
   ```typescript
   // ✅ Good - Tests behavior
   expect(result.enabled).toBe(true);
   
   // ❌ Bad - Tests implementation
   expect(service['privateMethod']).toHaveBeenCalled();
   ```

3. **Keep tests simple and focused**
   - One concept per test
   - Clear arrange-act-assert structure

4. **Use descriptive names**
   ```typescript
   // ✅ Good
   it('should throw NotFoundError when file source does not exist')
   
   // ❌ Bad
   it('test error')
   ```

5. **Clean up after tests**
   ```typescript
   afterEach(async () => {
     await dbHelper.cleanDatabase();
   });
   ```

### DON'T ❌

1. **Don't test implementation details**
   - Test public interfaces
   - Don't access private methods

2. **Don't share state between tests**
   - Each test should be independent
   - Use beforeEach to reset state

3. **Don't skip cleanup**
   - Always clean database
   - Always close connections

4. **Don't write flaky tests**
   - Avoid timing dependencies
   - Mock external services
   - Use deterministic data

---

## 📚 Resources

- **Jest Documentation:** https://jestjs.io/docs/getting-started
- **Testing Best Practices:** https://testingjavascript.com/
- **Mocking Guide:** https://jestjs.io/docs/mock-functions

---

## 🎯 Summary

### Running Tests
```bash
# All tests
npm test --workspace=packages/api

# Watch mode
npm test --workspace=packages/api -- --watch

# Coverage
npm test --workspace=packages/api -- --coverage

# Single file
npm test --workspace=packages/api -- fileSource.service.test.ts
```

### Writing Tests
1. Create `*.test.ts` file in `__tests__` directory
2. Use `describe` to group related tests
3. Use `it` for individual test cases
4. Follow arrange-act-assert pattern
5. Mock external dependencies
6. Test happy path AND error cases

### Key Principles
- ✅ Tests prevent breaking changes
- ✅ Each test is independent
- ✅ Mock external dependencies
- ✅ Test behavior, not implementation
- ✅ Aim for 80%+ coverage

---

_Last Updated: 2025-10-27_
