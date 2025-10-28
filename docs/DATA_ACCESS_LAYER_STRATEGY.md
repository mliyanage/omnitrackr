# Data Access Layer Strategy - API and Worker Services

**Version:** 1.0
**Date:** October 26, 2025
**Purpose:** Define strategy for sharing database access code between API and Worker services

---

## Table of Contents

1. [The Question](#the-question)
2. [Current Architecture](#current-architecture)
3. [Options Analysis](#options-analysis)
4. [Recommended Approach](#recommended-approach)
5. [Implementation Plan](#implementation-plan)
6. [Code Examples](#code-examples)

---

## The Question

**Should we duplicate database access code between the API and Worker services, or share it?**

Our architecture has:
- **API Service** - REST API for CRUD operations on file_sources, inward_files, etc.
- **Worker Service** - Polls file sources and writes detected files to database
- **Notification Manager** - Processes notification events

All three services need to access the same PostgreSQL database.

---

## Current Architecture

From `S3_FILE_SOURCE_DESIGN.md`, we have a layered architecture:

```
API Service:
  ├── API Layer (Express routes)
  ├── Business Logic Layer (Services)
  └── Data Access Layer (Repositories) ← Need this!

Worker Service:
  ├── Pollers (S3, SFTP, FTP, etc.)
  ├── File Processor
  └── Database Writer ← Also needs data access!

Notification Manager:
  ├── Notification Processor
  ├── Channel Handlers
  └── Delivery Status Updater ← Also needs data access!
```

**Key Insight:** All services access the **same tables**:
- `file_sources`
- `inward_files`
- `file_tracking`
- `notification_data`
- `file_source_credentials`

---

## Options Analysis

### Option 1: ❌ Duplicate Repository Code (Not Recommended)

**Approach:** Copy repository code into each service

```
packages/
├── api/
│   └── src/repositories/
│       ├── fileSource.repository.ts
│       └── inwardFile.repository.ts
└── worker/
    └── src/repositories/
        ├── fileSource.repository.ts  ← DUPLICATE!
        └── inwardFile.repository.ts  ← DUPLICATE!
```

**Pros:**
- ✅ Complete service independence
- ✅ Can deploy services separately
- ✅ No shared dependencies

**Cons:**
- ❌ Code duplication
- ❌ Bug fixes need to be applied in multiple places
- ❌ Schema changes require updating multiple repositories
- ❌ Inconsistent implementations
- ❌ Higher maintenance burden
- ❌ **NOT best practice for monorepos**

**Verdict:** ❌ **Do NOT use** - defeats the purpose of a monorepo

---

### Option 2: ❌ Each Service Owns Different Tables (Not Applicable)

**Approach:** Microservices best practice - each service owns its own tables

```
API Service owns:
  - file_sources
  - file_source_credentials

Worker Service owns:
  - inward_files
  - file_tracking

Notification Manager owns:
  - notification_data
  - notification_config
```

**Pros:**
- ✅ True microservices pattern
- ✅ Clear ownership boundaries
- ✅ Can scale databases independently

**Cons:**
- ❌ Requires inter-service communication (HTTP/gRPC/messaging)
- ❌ More complex architecture
- ❌ Eventual consistency challenges
- ❌ **Doesn't fit our use case** - Worker needs to READ file_sources and WRITE to multiple tables

**Verdict:** ❌ **Not applicable** - OmniTrackr is NOT a distributed microservices architecture

---

### Option 3: ✅ Shared Package for Repositories (Recommended)

**Approach:** Create `@omnitrackr/shared` package with repositories

```
packages/
├── shared/
│   └── src/
│       ├── types/
│       ├── utils/
│       ├── constants/
│       └── repositories/  ← SHARED!
│           ├── base.repository.ts
│           ├── fileSource.repository.ts
│           ├── inwardFile.repository.ts
│           ├── fileTracking.repository.ts
│           ├── notificationData.repository.ts
│           └── credentials.repository.ts
├── api/
│   └── src/
│       ├── services/
│       └── api/
└── worker/
    └── src/
        ├── pollers/
        └── services/
```

**Pros:**
- ✅ **Single source of truth** for data access
- ✅ Consistent database operations across services
- ✅ Bug fixes propagate automatically
- ✅ Schema changes update once
- ✅ **Monorepo best practice**
- ✅ Easy to version and test
- ✅ TypeScript types shared
- ✅ Can still deploy services independently

**Cons:**
- ⚠️ Services depend on shared package (but that's the point!)
- ⚠️ Need to rebuild shared package when changes occur (Turborepo handles this)

**Verdict:** ✅ **RECOMMENDED** - Best practice for monorepo architecture

---

### Option 4: ⚠️ Hybrid Approach (Possible but Complex)

**Approach:** Shared base, service-specific extensions

```
packages/
├── shared/
│   └── src/
│       └── repositories/
│           └── base.repository.ts  ← Only base classes
├── api/
│   └── src/
│       └── repositories/
│           ├── fileSource.repository.ts  ← Extends base
│           └── apiSpecificMethods.ts
└── worker/
    └── src/
        └── repositories/
            ├── fileSource.repository.ts  ← Extends base
            └── workerSpecificMethods.ts
```

**Pros:**
- ✅ Service-specific optimizations possible
- ✅ Some code reuse

**Cons:**
- ⚠️ More complex
- ⚠️ Still some duplication
- ⚠️ Harder to maintain

**Verdict:** ⚠️ **Use only if needed** - Start with Option 3, evolve to this if required

---

## Recommended Approach

### ✅ **Option 3: Shared Repository Package**

**Why this is the best practice for OmniTrackr:**

1. **We're using a monorepo** - Sharing code is the entire point!
2. **Same database schema** - All services access the same tables
3. **Consistency is critical** - File detection logic must match across services
4. **Not true microservices** - We're not building distributed, independently deployed services
5. **Industry standard** - This is how Netflix, Uber, Google structure monorepos

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                     @omnitrackr/shared                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Types (fileSource.types.ts, inwardFile.types.ts)         │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Repositories (Data Access Layer)                          │ │
│  │  - FileSourceRepository                                    │ │
│  │  - InwardFileRepository                                    │ │
│  │  - FileTrackingRepository                                  │ │
│  │  - NotificationDataRepository                              │ │
│  │  - CredentialsRepository                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Utilities (logger, dateUtils, validators)                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   API Service   │ │Worker Service│ │Notification Mgr  │
│                 │ │              │ │                  │
│ Uses repos for: │ │Uses repos for│ │Uses repos for:   │
│ - CRUD ops      │ │ - Read sources│ │- Read events     │
│ - Read files    │ │ - Write files │ │- Update delivery │
│ - Test conns    │ │ - Track files │ │- Write status    │
└─────────────────┘ └──────────────┘ └──────────────────┘
```

### Key Principles

1. **Repositories are pure data access** - No business logic
2. **Services contain business logic** - Each service has its own service layer
3. **Shared package is stateless** - Just functions and classes
4. **Versioned together** - Shared package versions with monorepo
5. **One database connection** - Initialized per service, passed to repositories

---

## Implementation Plan

### Phase 1: Set Up Shared Package Structure

```bash
packages/shared/
├── src/
│   ├── types/
│   │   ├── fileSource.types.ts
│   │   ├── inwardFile.types.ts
│   │   ├── fileTracking.types.ts
│   │   ├── notification.types.ts
│   │   └── index.ts
│   │
│   ├── repositories/
│   │   ├── base.repository.ts
│   │   ├── fileSource.repository.ts
│   │   ├── inwardFile.repository.ts
│   │   ├── fileTracking.repository.ts
│   │   ├── notificationData.repository.ts
│   │   ├── credentials.repository.ts
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── dateUtils.ts
│   │   ├── patternMatcher.ts
│   │   └── index.ts
│   │
│   ├── constants/
│   │   ├── eventTypes.ts
│   │   ├── statusCodes.ts
│   │   └── index.ts
│   │
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

### Phase 2: Define Repository Interfaces

```typescript
// packages/shared/src/repositories/base.repository.ts

import { Knex } from 'knex';

export abstract class BaseRepository {
  constructor(protected db: Knex) {}

  protected get tableName(): string {
    throw new Error('tableName must be implemented by subclass');
  }

  async findById<T>(id: number | string): Promise<T | undefined> {
    return this.db(this.tableName).where({ id }).first();
  }

  async findAll<T>(filters?: any): Promise<T[]> {
    let query = this.db(this.tableName);
    if (filters) {
      query = query.where(filters);
    }
    return query;
  }

  async create<T>(data: Partial<T>): Promise<T> {
    const [result] = await this.db(this.tableName)
      .insert(data)
      .returning('*');
    return result;
  }

  async update<T>(id: number | string, data: Partial<T>): Promise<T> {
    const [result] = await this.db(this.tableName)
      .where({ id })
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return result;
  }

  async delete(id: number | string): Promise<boolean> {
    const count = await this.db(this.tableName).where({ id }).del();
    return count > 0;
  }
}
```

### Phase 3: Implement Specific Repositories

```typescript
// packages/shared/src/repositories/fileSource.repository.ts

import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { FileSource, FileSourceStatus, FileSourceType } from '../types';

export class FileSourceRepository extends BaseRepository {
  protected get tableName(): string {
    return 'file_sources';
  }

  async findByDepartment(department: string): Promise<FileSource[]> {
    return this.db(this.tableName)
      .where({ department })
      .orderBy('name', 'asc');
  }

  async findActiveByType(type: FileSourceType): Promise<FileSource[]> {
    return this.db(this.tableName)
      .where({ type, enabled: true, status: 'active' });
  }

  async findDueForPolling(currentTime: Date): Promise<FileSource[]> {
    // Complex query for finding sources due for polling
    // based on schedule and last_sync
    return this.db(this.tableName)
      .where({ enabled: true })
      .whereRaw(`
        last_sync IS NULL OR
        last_sync + INTERVAL '1 hour' * poll_frequency_hours <= ?
      `, [currentTime]);
  }

  async updateSyncStatus(
    id: number,
    status: 'success' | 'failed',
    error?: string
  ): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        last_sync: this.db.fn.now(),
        last_sync_status: status,
        last_sync_error: error || null,
        updated_at: this.db.fn.now(),
      });
  }

  async incrementFilesProcessed(id: number, count: number): Promise<void> {
    await this.db.raw(`
      UPDATE file_sources
      SET files_processed = files_processed + ?
      WHERE id = ?
    `, [count, id]);
  }
}
```

### Phase 4: Use in Services

**API Service:**
```typescript
// packages/api/src/services/fileSource.service.ts

import { FileSourceRepository } from '@omnitrackr/shared';
import { db } from '../config/database';

export class FileSourceService {
  private fileSourceRepo: FileSourceRepository;

  constructor() {
    this.fileSourceRepo = new FileSourceRepository(db);
  }

  async createFileSource(data: CreateFileSourceRequest) {
    // Business logic here
    const fileSource = await this.fileSourceRepo.create(data);
    return fileSource;
  }

  async getFileSourcesByDepartment(department: string) {
    return this.fileSourceRepo.findByDepartment(department);
  }
}
```

**Worker Service:**
```typescript
// packages/worker/src/services/pollOrchestrator.ts

import { FileSourceRepository, InwardFileRepository } from '@omnitrackr/shared';
import { db } from '../config/database';

export class PollOrchestrator {
  private fileSourceRepo: FileSourceRepository;
  private inwardFileRepo: InwardFileRepository;

  constructor() {
    this.fileSourceRepo = new FileSourceRepository(db);
    this.inwardFileRepo = new InwardFileRepository(db);
  }

  async pollSources() {
    const sources = await this.fileSourceRepo.findDueForPolling(new Date());

    for (const source of sources) {
      // Poll logic
      const files = await this.pollSource(source);

      // Write detected files
      for (const file of files) {
        await this.inwardFileRepo.create(file);
      }

      // Update sync status
      await this.fileSourceRepo.updateSyncStatus(source.id, 'success');
    }
  }
}
```

---

## Code Examples

### Complete Repository Example

```typescript
// packages/shared/src/repositories/inwardFile.repository.ts

import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { InwardFile, SLAStatus } from '../types';

export class InwardFileRepository extends BaseRepository {
  protected get tableName(): string {
    return 'inward_files';
  }

  async findByFileSource(fileSourceId: number): Promise<InwardFile[]> {
    return this.db(this.tableName)
      .where({ file_source_id: fileSourceId })
      .orderBy('detected_at', 'desc');
  }

  async findBySLAStatus(
    fileSourceId: number,
    slaStatus: SLAStatus
  ): Promise<InwardFile[]> {
    return this.db(this.tableName)
      .where({
        file_source_id: fileSourceId,
        sla_status: slaStatus,
      });
  }

  async checkDuplicate(
    fileSourceId: number,
    filePath: string,
    s3LastModified: Date
  ): Promise<boolean> {
    const existing = await this.db(this.tableName)
      .where({
        file_source_id: fileSourceId,
        file_path: filePath,
        s3_last_modified: s3LastModified,
      })
      .first();

    return !!existing;
  }

  async createBatch(files: Partial<InwardFile>[]): Promise<InwardFile[]> {
    return this.db(this.tableName)
      .insert(files)
      .returning('*');
  }

  async updateSLAStatus(
    id: number,
    slaStatus: SLAStatus
  ): Promise<void> {
    await this.db(this.tableName)
      .where({ id })
      .update({
        sla_status: slaStatus,
        updated_at: this.db.fn.now(),
      });
  }
}
```

### Dependency Injection Pattern (Advanced)

```typescript
// packages/shared/src/repositories/repositoryFactory.ts

import { Knex } from 'knex';
import { FileSourceRepository } from './fileSource.repository';
import { InwardFileRepository } from './inwardFile.repository';
// ... other repositories

export class RepositoryFactory {
  constructor(private db: Knex) {}

  get fileSources(): FileSourceRepository {
    return new FileSourceRepository(this.db);
  }

  get inwardFiles(): InwardFileRepository {
    return new InwardFileRepository(this.db);
  }

  // ... other repositories
}

// Usage in services:
import { RepositoryFactory } from '@omnitrackr/shared';
import { db } from '../config/database';

const repos = new RepositoryFactory(db);
const fileSources = await repos.fileSources.findAll();
```

---

## Benefits of This Approach

### 1. **Single Source of Truth**
- One place to fix bugs
- One place to optimize queries
- One place to add features

### 2. **Type Safety**
- Shared TypeScript interfaces
- Compile-time checks across services
- Consistent data models

### 3. **Testing**
- Test repositories once
- Mock easily in services
- Integration tests shared

### 4. **Scalability**
- Easy to add new services
- Easy to add new repositories
- Turborepo builds only what changed

### 5. **Maintenance**
- Schema changes update once
- Database migrations in one place
- Clear ownership of data access layer

---

## Best Practices

### ✅ Do's

1. **Keep repositories pure** - Only database operations, no business logic
2. **Use dependency injection** - Pass db connection to repositories
3. **Write integration tests** - Test repositories against real database
4. **Version the shared package** - Use semantic versioning
5. **Document repository methods** - Clear JSDoc comments
6. **Use transactions** - Expose transaction support for complex operations

### ❌ Don'ts

1. **Don't put business logic in repositories** - That belongs in services
2. **Don't create circular dependencies** - Repositories should not import services
3. **Don't hardcode database connection** - Always inject it
4. **Don't skip types** - Always use TypeScript interfaces
5. **Don't over-abstract** - Keep it simple and readable

---

## Migration Strategy

### Step 1: Create Shared Package (Week 1)
- Set up `packages/shared` structure
- Move types to shared package
- Create base repository class

### Step 2: Implement Repositories (Week 2)
- FileSourceRepository
- InwardFileRepository
- FileTrackingRepository
- NotificationDataRepository
- CredentialsRepository

### Step 3: Update API Service (Week 3)
- Replace inline queries with repositories
- Update services to use repositories
- Update tests

### Step 4: Implement Worker Service (Week 4)
- Use shared repositories
- Implement polling logic
- Write worker-specific services

### Step 5: Implement Notification Manager (Week 5)
- Use shared repositories
- Implement notification logic

---

## Summary

### ✅ **RECOMMENDATION: Use Shared Repository Package**

**Rationale:**
1. We're building a **monorepo**, not distributed microservices
2. All services access the **same database**
3. Consistency is **critical** for file tracking
4. Industry best practice for **monorepo architecture**
5. Eliminates code duplication and maintenance burden

**Structure:**
```
@omnitrackr/shared
  ├── types/
  ├── repositories/  ← SHARED DATA ACCESS LAYER
  ├── utils/
  └── constants/

Used by:
  - @omnitrackr/api
  - @omnitrackr/worker
  - @omnitrackr/notification-manager
```

**Next Steps:**
1. Set up `packages/shared` package structure
2. Implement base repository pattern
3. Create specific repositories for each table
4. Update services to use shared repositories

---

**This is the industry-standard approach for monorepo architectures like OmniTrackr!** 🚀
