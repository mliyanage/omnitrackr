# 5 Critical Mistakes Non-Technical Founders Make When Building MVPs with AI (And How to Avoid Them)

## Introduction

You've got a brilliant SaaS idea. You're ready to build. But there's one problem: you don't have a technical co-founder, and hiring a development team would burn through your runway before you even validate product-market fit.

Enter AI dev tools like Claude, GitHub Copilot, and ChatGPT. They promise to democratize software development, letting anyone build production-ready applications with the right prompts. And they deliver—to a point.

I recently built [OmniTrackr](https://staging.omnitrackr.dev/), a file monitoring and SLA tracking platform, using Claude as my primary development partner. The AI helped me ship a full-stack application with React frontend, Express API, PostgreSQL database, background workers, and automated CI/CD pipelines—all without writing most of the code myself.

But here's what nobody tells you: **the quality of your AI-built MVP depends entirely on how well you prompt it**. Make the wrong assumptions early, and you'll spend days (and thousands of tokens) refactoring. Skip critical architectural decisions, and you'll hand off a codebase that real developers will want to rewrite from scratch.

After building OmniTrackr and accumulating over 300KB of documentation, countless refactoring sessions, and valuable lessons learned, I've identified the 5 most critical mistakes non-technical founders make when "vibe coding" with AI.

These aren't just theoretical pitfalls—they're real mistakes I made, complete with the technical debt they created and how I fixed them. Whether you're building a proof-of-concept or an MVP you plan to scale, avoiding these mistakes will save you time, money, and your sanity.

---

## Mistake #1: Skipping Architecture Documentation and Design Decisions

### The Mistake

When you start building with AI, it's tempting to jump straight into feature development. You type "build me a user dashboard" and watch the code materialize. It feels like magic.

But here's the trap: **AI generates code that works now, but you need a codebase that can be understood and maintained later**—preferably by a team of real developers you'll hire once you've validated your idea.

Without proper documentation of your architectural decisions, database schema design, and system design, you're creating a mystery box that even you won't understand in six months.

### Why This Matters

You're not building a throwaway prototype. You're building the foundation for a company. Future developers need to understand:

- **Why** certain architectural decisions were made
- **What** trade-offs were considered
- **How** different components interact
- **When** to use specific patterns or approaches

### What I Did Wrong

Initially, I focused solely on getting features working. The AI would suggest an approach, I'd approve it, and we'd move on. No documentation, no decision logs.

Three weeks later, when I wanted to refactor the file source connection logic, I couldn't remember why we chose a certain database schema. Did we consider alternatives? Were there trade-offs? I had no idea.

### The Fix

I started instructing the AI to document every major decision:

**Prompt Template:**
```
Before implementing [feature], create a design document that covers:
1. Problem statement and requirements
2. Proposed solution with alternatives considered
3. Database schema design with justification
4. API contract specifications
5. Security considerations
6. Testing strategy
7. Deployment plan
```

### Real Examples from OmniTrackr

Check out these design documents that saved me countless hours:

- **[Schema Split Design](./SCHEMA_SPLIT_DESIGN.md)** - Documents the decision to split a monolithic `file_sources` table into normalized tables (`source_connections`, `schedules`, `watchers`). Includes alternatives considered, migration strategy, and trade-off analysis.

- **[Credential Storage Architecture](./CREDENTIAL_STORAGE_ARCHITECTURE.md)** - Details the multi-layered approach to storing AWS credentials (Secrets Manager + encrypted database fallback), including security considerations and key rotation strategy.

- **[Data Model and API Plan](./DATA_MODEL_AND_API_PLAN.md)** - Comprehensive overview of the entire data model with entity relationships, API endpoints, and business logic.

- **[S3 File Source Design](./S3_FILE_SOURCE_DESIGN.md)** - 97KB deep-dive into handling S3 file sources, including credential validation, bucket access patterns, and error handling strategies.

- **[Repository Structure](./REPOSITORY_STRUCTURE.md)** - Documents the monorepo structure, package dependencies, and architectural patterns.

### Action Items

✅ **Create a `/docs` folder** from day one
✅ **Document before building** major features
✅ **Include alternatives considered** to show thought process
✅ **Explain trade-offs** so future developers understand constraints
✅ **Update docs during refactoring** to reflect learnings

---

## Mistake #2: Not Thinking About Component Reusability and Organization

### The Mistake

You prompt the AI: "Build a page where users can create, read, update, and delete file watchers."

The AI delivers. It creates a beautiful feature with inline forms to create schedules, departments, and connections right from the watcher creation flow. Everything works perfectly.

**But here's the problem:** The AI put all the code in `/src/components/watchers/` because that's where you told it to build the feature.

Now you need those same schedule, department, and connection components on other pages. But they're tightly coupled to the watcher workflow, nested three folders deep in watcher-specific code.

### Why This Matters

Features you build in isolation often need to be reused elsewhere. When you don't plan for component reusability upfront:

- Components become **tightly coupled** to specific workflows
- You end up **duplicating code** across different pages
- **Refactoring costs** multiply (time, tokens, bugs)
- You introduce **inconsistent UX** when duplicate components diverge

### What I Did Wrong

I asked the AI to build inline creation for schedules, connections, and departments within the watcher creation flow—before building standalone pages for these entities.

The result? All the components ended up in `/src/components/watchers/`:

```
src/components/watchers/
├── ConnectionCombobox.tsx
├── ConnectionForm.tsx
├── DepartmentCombobox.tsx
├── DepartmentForm.tsx
├── ScheduleCombobox.tsx
├── ScheduleForm.tsx
├── WatcherForm.tsx
└── WatcherSheet.tsx
```

These should have been in:
- `/src/components/connections/`
- `/src/components/departments/`
- `/src/components/schedules/`

When I later needed a standalone Connections page, I had to refactor everything. This created:
- **Token cost** for extensive refactoring
- **Time waste** re-generating similar code
- **Bugs** from missed references during the move
- **Inconsistencies** between old and new versions

### The Fix

**Think through your entire feature set BEFORE building individual features.**

**Better Prompt Strategy:**
```
I need to build a watcher management system that will eventually include:
1. Standalone pages for Connections, Schedules, and Departments
2. Inline creation of these entities within other workflows
3. Reusable components across multiple pages

Please structure the codebase with:
- Shared components in /src/components/[entity]/
- Each entity gets: ComboBox, Form, Sheet, Table components
- Components should accept onSuccess callbacks for flexibility
- Keep business logic separate from UI components
```

### Proper Component Structure

Here's how OmniTrackr should have been structured from the start:

```
src/components/
├── connections/
│   ├── ConnectionCombobox.tsx    # Reusable selector
│   ├── ConnectionForm.tsx         # Reusable form
│   └── ConnectionSheet.tsx        # Reusable dialog
├── departments/
│   ├── DepartmentCombobox.tsx
│   ├── DepartmentForm.tsx
│   └── DepartmentSheet.tsx
├── schedules/
│   ├── ScheduleCombobox.tsx
│   ├── ScheduleForm.tsx
│   └── ScheduleSheet.tsx
└── watchers/
    ├── WatcherForm.tsx            # Only watcher-specific code
    └── WatcherSheet.tsx
```

Each component accepts props for flexibility:

```typescript
interface ConnectionComboboxProps {
  value: number | null;
  onChange: (id: number | null) => void;
  allowInlineCreate?: boolean;      // Show "Create New" option
  onCreated?: (connection: Connection) => void;  // Callback after creation
}
```

### Action Items

✅ **Map your domain model** before building features
✅ **Identify reusable entities** (users, departments, settings, etc.)
✅ **Build shared components first** before feature-specific workflows
✅ **Use composition** with callbacks rather than tight coupling
✅ **Review component organization** after each major feature

---

## Mistake #3: Ignoring Multi-Environment Configuration from the Start

### The Mistake

You're building locally. Everything works. The AI hardcodes database credentials, API endpoints, and configuration values directly in the code.

Then you want to deploy to staging. Suddenly you need different database credentials, different AWS buckets, different secrets. You start doing find-and-replace across your codebase.

**This is a nightmare.**

### Why This Matters

Modern applications need to run in multiple environments:
- **Development** - Your local machine with test data
- **Staging** - Cloud environment that mirrors production
- **Production** - Real users with real data
- **CI/CD** - Automated testing and deployment pipelines

Each environment needs different:
- Database connections
- API keys and secrets
- Feature flags
- Logging levels
- Third-party service endpoints

Hardcoding these values or handling them inconsistently leads to:
- Accidentally using production data in development
- Secrets committed to Git
- Broken deployments
- Security vulnerabilities

### What I Did Wrong

Initially, I had a single `.env` file with hardcoded values. When deploying to Google Cloud Run, I realized:
- The staging database shouldn't be the same as dev
- Environment variables needed to be injected via Cloud Run configuration
- Local development needed Cloud SQL Proxy for secure database access
- Different environments needed different logging levels and error handling

### The Fix

I restructured the configuration system with environment-specific files and validation.

See the full strategy in [Environment Configuration](./ENVIRONMENT_CONFIGURATION.md).

**Key Pattern:**

```typescript
// packages/api/knexfile.ts
// Load environment-specific .env files with priority:
// .env.{NODE_ENV}.local > .env.{NODE_ENV} > .env

const nodeEnv = process.env.NODE_ENV || 'development';

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, `.env.${nodeEnv}`) });
dotenv.config({ path: path.resolve(__dirname, `.env.${nodeEnv}.local`) });
```

**Environment Files:**
```
.env                    # Default values, safe to commit
.env.development        # Dev-specific values
.env.development.local  # Your personal overrides (gitignored)
.env.staging            # Staging configuration
.env.production         # Production configuration
```

**Validation at Startup:**

```typescript
function validateEnvVars(requiredVars: string[]): void {
  const missing = requiredVars.filter((varName) => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Make sure you have created .env.${nodeEnv}.local file`
    );
  }
}

// Fail fast if critical config is missing
if (nodeEnv === 'staging' || nodeEnv === 'production') {
  validateEnvVars(['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']);
}
```

**Cloud SQL Proxy Support:**

```typescript
connection: (() => {
  const useProxy = process.env.USE_CLOUD_SQL_PROXY === 'true';
  if (useProxy) {
    return {
      host: '127.0.0.1',
      port: parseInt(process.env.CLOUD_SQL_PROXY_PORT || '5433'),
      // Proxy handles encryption, no SSL needed
    };
  } else {
    return {
      host: process.env.DB_HOST,
      ssl: { rejectUnauthorized: false }
    };
  }
})()
```

### Real-World Example

Check out the [staging environment](https://staging.omnitrackr.dev/) running with:
- Separate PostgreSQL database
- Google Cloud Run deployment
- Cloud SQL Proxy for secure connections
- Environment-specific secrets in Google Secret Manager
- Automated deployments on push to `develop` branch

### Prompt Strategy

**From the beginning, tell your AI:**
```
Structure this application to support multiple environments (dev, staging, production):

1. Use environment variables for ALL configuration
2. Create .env.example with all required variables
3. Support layered config: .env → .env.{NODE_ENV} → .env.{NODE_ENV}.local
4. Validate required environment variables at startup
5. Never commit actual secrets to Git
6. Support both local development and cloud deployment
7. Use Cloud SQL Proxy for secure database connections in development
```

### Action Items

✅ **Use environment variables** from day one
✅ **Create `.env.example`** documenting all required variables
✅ **Implement config validation** that fails fast with helpful errors
✅ **Add `.env*.local` to `.gitignore`**
✅ **Support Cloud SQL Proxy** for safe remote database access
✅ **Document environment setup** in your README

---

## Mistake #4: Not Designing Your Database Schema Properly Upfront

### The Mistake

You tell the AI: "Create a database table for file sources that stores S3 connection info, file patterns, and scheduling configuration."

The AI creates a single `file_sources` table with 30+ columns mixing:
- Connection credentials
- Bucket configuration
- File patterns and filters
- Scheduling settings
- Monitoring configuration
- Status and tracking data

It works! You ship the feature.

Two weeks later, you realize you need to:
- Reuse the same S3 connection across multiple file sources
- Create schedules that apply to multiple resources
- Track file changes separately from configuration

**Now you're in trouble.** You need to split one monolithic table into 5 normalized tables, migrate existing data, update all your API endpoints, refactor the frontend, and update documentation.

This is exactly what happened to OmniTrackr.

### Why This Matters

Database schema is the **foundation of your application**. Poor database design leads to:

- **Data duplication** - Same S3 credentials stored in multiple rows
- **Update anomalies** - Changing a schedule requires updating multiple records
- **Deletion problems** - Can't delete a schedule without losing file source config
- **Query complexity** - Retrieving related data requires massive JOINs or multiple queries
- **Scaling issues** - Table grows unwieldy with mixed concerns
- **Migration nightmares** - Refactoring requires complex data migrations

### What I Did Wrong

I started with a monolithic `file_sources` table that mixed everything:

```sql
CREATE TABLE file_sources (
  id SERIAL PRIMARY KEY,
  name TEXT,
  type TEXT,

  -- Connection config (should be separate table)
  aws_access_key_id TEXT,
  aws_secret_access_key TEXT,
  aws_region TEXT,
  bucket_name TEXT,

  -- Scheduling (should be separate table)
  schedule_type TEXT,
  schedule_value TEXT,
  schedule_timezone TEXT,

  -- File patterns (should be separate table)
  file_patterns JSONB,
  file_filters JSONB,

  -- Monitoring (should be separate table)
  sla_max_age_hours INTEGER,
  sla_alert_recipients JSONB,

  -- Status tracking (should be separate table)
  last_checked_at TIMESTAMPTZ,
  last_file_detected_at TIMESTAMPTZ,
  status TEXT,

  -- ... 15 more columns
);
```

**Problems this created:**
- Creating multiple watchers for the same S3 bucket meant duplicating credentials
- Changing schedule from "daily at 2 AM" to "every 6 hours" required updating multiple file sources
- Couldn't share departments or tags across different file sources
- Couldn't track file-level changes independently from configuration
- The table had 30+ columns and kept growing

### The Fix

I had to perform a major schema redesign, splitting the monolithic table into a normalized structure.

See the full design in [Schema Split Design](./SCHEMA_SPLIT_DESIGN.md).

**New normalized schema:**

```sql
-- Reusable connection configuration
CREATE TABLE source_connections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 's3', 'azure', 'gcp'
  connection_config JSONB NOT NULL,  -- Credentials and config
  created_by INTEGER REFERENCES users(id)
);

-- Reusable schedules
CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'daily', 'interval', 'cron'
  config JSONB NOT NULL,  -- { hour: 14, minute: 30 } or { interval_hours: 6 }
  timezone TEXT DEFAULT 'UTC'
);

-- Specific file watchers
CREATE TABLE watchers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  connection_id INTEGER REFERENCES source_connections(id),
  schedule_id INTEGER REFERENCES schedules(id),
  department_id INTEGER REFERENCES departments(id),

  -- Watcher-specific config
  file_pattern TEXT NOT NULL,
  file_filters JSONB,
  sla_max_age_hours INTEGER,

  status TEXT DEFAULT 'active'
);

-- File-level tracking
CREATE TABLE file_tracking (
  id SERIAL PRIMARY KEY,
  watcher_id INTEGER REFERENCES watchers(id),
  file_key TEXT NOT NULL,
  file_size BIGINT,
  last_modified TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE watcher_logs (
  id SERIAL PRIMARY KEY,
  watcher_id INTEGER REFERENCES watchers(id),
  event_type TEXT NOT NULL,  -- 'check', 'error', 'sla_breach'
  message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Benefits of normalized design:**

✅ **Reusability** - One S3 connection used by multiple watchers
✅ **Consistency** - Update schedule in one place
✅ **Flexibility** - Easy to add new connection types or schedule patterns
✅ **Performance** - Smaller tables with better indexes
✅ **Clarity** - Each table has a single, clear purpose

### The Migration Nightmare

Refactoring required:

1. **Creating new tables** with migration scripts
2. **Migrating data** from old table to new normalized structure
3. **Updating API endpoints** to handle new relationships
4. **Refactoring frontend** to work with separate entities
5. **Rewriting queries** to use JOINs
6. **Updating tests** for new data structure
7. **Dropping old tables** after validation

See the actual migration: `/packages/api/migrations/20251119000010_drop_old_tables.ts`

```typescript
/**
 * Migration: Drop old tables
 * IMPORTANT: This migration should only be run after:
 * 1. All data has been migrated to new tables
 * 2. All code has been updated to use new tables
 * 3. The system has been tested thoroughly
 */
```

**Cost:** Multiple days of refactoring, thousands of tokens, introduced bugs, delayed feature development.

### How to Avoid This

**Prompt your AI to design a proper schema BEFORE coding:**

```
I'm building a file monitoring system. Before writing any code,
create a database schema design document that:

1. Lists all entities and their relationships
2. Shows entity-relationship diagrams
3. Identifies what should be normalized vs denormalized
4. Considers future extensibility (new connection types, schedule patterns)
5. Plans for audit logging and change tracking
6. Includes proper indexes for query performance
7. Documents why each design decision was made

Entities to consider:
- Users and authentication
- Source connections (S3, Azure, GCP) - REUSABLE
- Schedules (daily, interval, cron) - REUSABLE
- Departments/teams - REUSABLE
- File watchers (specific file patterns to monitor)
- File tracking (individual file metadata)
- Audit logs and events
- SLA definitions and breach tracking
```

**Ask the AI to explain trade-offs:**
- "Why did you choose this design over alternative X?"
- "What are the pros/cons of normalizing this data?"
- "How will this schema handle [specific future requirement]?"

### Reference Documents

- **[File Sources Schema Design](./FILE_SOURCES_SCHEMA_DESIGN.md)** - Initial schema design
- **[Schema Split Design](./SCHEMA_SPLIT_DESIGN.md)** - Refactoring analysis and migration plan
- **[Data Model and API Plan](./DATA_MODEL_AND_API_PLAN.md)** - Complete data model overview

### Action Items

✅ **Design your schema BEFORE coding** features
✅ **Identify reusable entities** vs feature-specific tables
✅ **Normalize appropriately** - avoid massive tables mixing concerns
✅ **Plan for extensibility** - new types, patterns, configurations
✅ **Document your schema** with ERD diagrams and explanations
✅ **Use migrations properly** - never alter production schema manually
✅ **Add proper indexes** based on expected queries

---

## Mistake #5: Neglecting Type Safety and Input Validation from Day One

### The Mistake

You're building fast with AI. You tell it to create an API endpoint to accept user input. The AI generates the route, the controller, the database query.

It works! You can create records, update them, delete them.

But you didn't tell the AI to:
- Validate input formats (is that email actually an email?)
- Sanitize user input (hello, SQL injection!)
- Handle edge cases (what if the user sends `null`? Empty strings? Negative numbers?)
- Provide helpful error messages (just "Invalid input" isn't helpful)
- Enforce type safety across frontend and backend

**Result:** Your app works in happy-path scenarios but breaks in production when users inevitably send unexpected data.

### Why This Matters

Without proper validation and type safety:

- **Security vulnerabilities** - SQL injection, XSS, command injection
- **Data corruption** - Invalid data gets into your database
- **Cryptic errors** - Users see "500 Internal Server Error" with no context
- **Debugging nightmares** - Runtime errors that should have been caught at compile time
- **Frontend/backend drift** - Types don't match, fields are missing or renamed
- **Poor user experience** - No helpful validation messages

### What I Got Right (After Learning the Hard Way)

OmniTrackr uses **strict TypeScript** across the entire stack with comprehensive validation at every boundary.

#### 1. Strict TypeScript Configuration

**File: `/tsconfig.json`**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Why this matters:**
- Catches type errors at compile time, not runtime
- Prevents `undefined` and `null` bugs
- Enforces consistent naming across imports
- Makes refactoring safer

#### 2. Shared Types Package

**File: `/packages/shared/src/types/`**

```typescript
// Shared across frontend, backend, and worker
export interface SourceConnection {
  id: number;
  name: string;
  type: SourceType;  // Enum: 's3' | 'azure' | 'gcp'
  connection_config: S3ConnectionConfig | AzureConnectionConfig;
  status: ConnectionStatus;  // Enum: 'active' | 'inactive' | 'error'
  created_at: string;
  updated_at: string;
  created_by: number;
}

export enum SourceType {
  S3 = 's3',
  Azure = 'azure',
  GCP = 'gcp'
}

export interface S3ConnectionConfig {
  aws_access_key_id: string;
  aws_secret_access_key: string;
  aws_region: string;
  bucket_name: string;
}
```

**Benefits:**
- Frontend knows exactly what fields the API returns
- Backend and worker share the same type definitions
- Refactoring a field name updates everywhere
- Auto-complete works perfectly in your IDE

#### 3. Joi Validation with Custom Error Messages

**File: `/packages/api/src/middleware/validation.ts`**

```typescript
import Joi from 'joi';

export const createS3ConnectionSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'Connection name is required',
      'string.max': 'Connection name must be at most 100 characters',
    }),

  aws_access_key_id: Joi.string().trim().required()
    .pattern(/^[A-Z0-9]{20}$/)
    .messages({
      'string.pattern.base': 'Invalid AWS Access Key ID format. Must be 20 uppercase alphanumeric characters.',
      'any.required': 'AWS Access Key ID is required',
    }),

  aws_secret_access_key: Joi.string().trim().required()
    .pattern(/^[A-Za-z0-9/+=]{40}$/)
    .messages({
      'string.pattern.base': 'Invalid AWS Secret Access Key format',
    }),

  aws_region: Joi.string().trim().required()
    .valid('us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1')
    .messages({
      'any.only': 'AWS region must be one of: us-east-1, us-west-2, eu-west-1, ap-southeast-1',
    }),

  bucket_name: Joi.string().trim().required()
    .pattern(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/)
    .min(3).max(63)
    .messages({
      'string.pattern.base': 'Invalid S3 bucket name format',
      'string.min': 'Bucket name must be at least 3 characters',
      'string.max': 'Bucket name cannot exceed 63 characters',
    }),
}).options({
  stripUnknown: true,  // Remove unexpected fields
  abortEarly: false,   // Return all errors, not just the first
});

// Middleware to validate requests
export const validate = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors,
        },
      });
    }

    req.body = value;  // Use validated & sanitized data
    next();
  };
};
```

**Using validation in routes:**

```typescript
router.post(
  '/connections',
  authenticate,
  validate(createS3ConnectionSchema),
  async (req: Request, res: Response) => {
    // req.body is now validated and typed
    const connection = await connectionService.create(req.body);
    res.json({ success: true, data: connection });
  }
);
```

**Benefits:**
- Regex validation for AWS credentials (correct format)
- Custom error messages that help users fix issues
- Automatically strips unknown fields (security)
- Returns ALL validation errors at once (better UX)
- Sanitizes input (`.trim()`, type coercion)

#### 4. Connection Validation Before Storage

**Even better:** OmniTrackr tests AWS credentials BEFORE accepting them.

```typescript
// File: /packages/api/src/middleware/validation.ts

export const validateS3Connection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { aws_access_key_id, aws_secret_access_key, aws_region, bucket_name } = req.body;

  try {
    const s3Client = new S3Client({
      region: aws_region,
      credentials: {
        accessKeyId: aws_access_key_id,
        secretAccessKey: aws_secret_access_key,
      },
    });

    // Test connection by listing bucket objects
    await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket_name,
      MaxKeys: 1,
    }));

    next();  // Credentials work!
  } catch (error) {
    if (error.name === 'NoSuchBucket') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BUCKET',
          message: `S3 bucket '${bucket_name}' does not exist or is not accessible`,
        },
      });
    }

    if (error.name === 'InvalidAccessKeyId') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'AWS Access Key ID is invalid',
        },
      });
    }

    return res.status(400).json({
      success: false,
      error: {
        code: 'CONNECTION_FAILED',
        message: 'Failed to connect to S3 bucket. Please verify credentials and permissions.',
        details: { error: error.message },
      },
    });
  }
};
```

**Why this is critical:**
- Prevents storing invalid credentials in the database
- Gives immediate, helpful feedback to users
- Tests actual AWS permissions (not just format)
- Specific error messages guide users to fix issues

#### 5. Custom Error Classes with Consistent Format

**File: `/packages/api/src/utils/errors.ts`**

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with ID ${identifier} not found`
      : `${resource} not found`;
    super(404, message, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}
```

**Global error handler:**

```typescript
// File: /packages/api/src/middleware/errorHandler.ts

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Don't leak internal errors in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
};
```

**Benefits:**
- Consistent error format across entire API
- Different status codes for different error types
- Environment-aware (hide details in production)
- Structured logging for debugging

### How to Get This Right from the Start

**Prompt your AI with validation requirements:**

```
Build this feature with comprehensive type safety and validation:

1. Define TypeScript interfaces in /packages/shared/src/types/
2. Use strict TypeScript mode (noImplicitAny, strictNullChecks)
3. Create Joi validation schemas with:
   - Regex patterns for format validation
   - Custom error messages that help users
   - Input sanitization (trim, stripUnknown)
   - Return all errors at once (abortEarly: false)
4. Test external connections before accepting credentials
5. Use custom error classes (ValidationError, NotFoundError, etc.)
6. Implement global error handler with environment-aware messages
7. Never return sensitive details in error messages
8. Log errors with context for debugging

Example validations needed:
- Email format
- Phone number format
- Password strength (min length, complexity)
- AWS credential format and validity
- Date ranges
- Numeric ranges (positive, within bounds)
```

### Real-World Examples

Check out these validation examples in OmniTrackr:

**AWS Credential Validation:**
- Pattern: `/^[A-Z0-9]{20}$/` for Access Key ID
- Pattern: `/^[A-Za-z0-9/+=]{40}$/` for Secret Access Key
- Live connection test before storage

**S3 Bucket Validation:**
- Pattern: `/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/`
- Length: 3-63 characters
- Must start/end with alphanumeric

**Schedule Validation:**
- Time format: `/^([01]\d|2[0-3]):([0-5]\d)$/` (HH:MM)
- Interval: 1-168 hours
- Timezone: valid IANA timezone string

**See full implementation:** [AWS Credentials Setup Guide](./AWS_CREDENTIALS_SETUP.md)

### Action Items

✅ **Enable strict TypeScript** from day one
✅ **Create shared types package** for frontend/backend consistency
✅ **Use Joi or Zod** for runtime validation
✅ **Write custom error messages** that help users fix issues
✅ **Test external connections** before accepting credentials
✅ **Use custom error classes** for consistent error handling
✅ **Implement global error handler** with environment-aware logging
✅ **Validate at boundaries** (API inputs, environment variables, external data)

---

## Conclusion: Build Smart, Not Just Fast

AI dev tools like Claude can help you build an MVP incredibly fast—but **speed without strategy creates technical debt**.

The difference between a throwaway prototype and a maintainable codebase comes down to how well you prompt the AI and whether you plan for the future.

### The 5 Mistakes Recap

1. **Skipping Documentation** → Document architecture decisions, database schema, and trade-offs
2. **Ignoring Reusability** → Plan component structure before building features
3. **No Environment Strategy** → Support dev/staging/production from day one
4. **Poor Database Design** → Normalize your schema upfront, avoid monolithic tables
5. **No Type Safety/Validation** → Use strict TypeScript and comprehensive input validation

### The Meta-Lesson

**You're not just prompting the AI to write code. You're prompting it to make architectural decisions.**

The better you understand software architecture, the better you can guide the AI. If you don't know what questions to ask, the AI will make reasonable guesses—but those guesses might not align with your future needs.

### What to Do Next

If you're building an MVP with AI:

1. **Start with documentation** - Design docs, schema design, architecture decisions
2. **Plan your domain model** - What entities exist? How do they relate?
3. **Structure for reusability** - Think about component organization early
4. **Support multiple environments** - Even if you only use dev at first
5. **Validate everything** - Type safety and input validation prevent bugs
6. **Ask the AI to explain** - "Why this approach? What are the alternatives?"

### See OmniTrackr in Action

Check out the [staging environment](https://staging.omnitrackr.dev/) built using these principles. The codebase demonstrates:

- ✅ 300KB+ of comprehensive documentation
- ✅ Normalized database schema with proper relationships
- ✅ Strict TypeScript across the entire stack
- ✅ Multi-environment support (dev, staging, production)
- ✅ Comprehensive validation and error handling
- ✅ Automated CI/CD with GitHub Actions
- ✅ Modular, reusable component structure

Browse the design docs in the `/docs` folder to see real examples of architecture documentation that saved me countless refactoring hours.

---

**Remember:** Building with AI isn't about blindly accepting every suggestion. It's about being a thoughtful product architect who uses AI as a highly capable implementation partner.

The MVPs that succeed aren't the ones built fastest—they're the ones built with enough foresight to evolve into real products.

Happy building! 🚀

---

*Want to discuss these lessons or share your own? I'd love to hear about your experience building with AI dev tools. Connect with me or drop a comment below.*
