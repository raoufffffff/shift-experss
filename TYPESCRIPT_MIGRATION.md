# 🔐 TypeScript Strict Mode Migration Guide

## Overview

**Problem**: 80+ explicit `any` type usages in the codebase, bypassing TypeScript's type safety.

**Solution**: Gradual strict mode activation + ESLint enforcement to prevent runtime errors and improve code quality.

---

## Current Status

### TypeScript Configuration (`tsconfig.json`)

✅ **Enabled strict rules** (gradual activation):
- `noImplicitAny: true` - Prevents implicit `any` types
- `strictNullChecks: true` - Prevents null/undefined errors
- `strictFunctionTypes: true` - Strict function type checking
- `strictBindCallApply: true` - Strict bind/call/apply
- `noImplicitThis: true` - Prevents implicit `this`
- `alwaysStrict: true` - Enables `'use strict'` in emitted JavaScript

⏳ **TODO** (after cleanup):
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `strict: true` (full strict mode when ready)

### ESLint Configuration (`.eslintrc.json`)

✅ **Strict `any` rules**:
```json
{
  "@typescript-eslint/no-explicit-any": "error",        // 🚫 Blocks new `any` types
  "@typescript-eslint/no-unsafe-assignment": "warn",
  "@typescript-eslint/no-unsafe-member-access": "warn",
  "@typescript-eslint/no-unsafe-call": "warn",
  "@typescript-eslint/no-unsafe-return": "warn"
}
```

---

## Migration Strategy

### Phase 1: Prevent New `any` Types ✅ DONE

1. ✅ Enable `noImplicitAny` in `tsconfig.json`
2. ✅ Set ESLint rule `@typescript-eslint/no-explicit-any` to `error`
3. ✅ All NEW code must not use `any`

### Phase 2: Fix Critical Files ✅ DONE

Fixed files with proper types:
- ✅ `src/utils/logger.ts` - Replaced `any` with `Loggable` type union
- ✅ `src/lib/error-handler.ts` - Replaced `any` with `unknown` + type guards

### Phase 3: Remaining Files (TODO)

Files still containing `any` (80 total occurrences):

#### TypeScript files (57 occurrences):
- `hooks/useNotificationSound.ts` (1)
- `utils/exportDashboardData.ts` (10)
- `tests/setup.ts` (2)
- `tests/lib/error-handler.test.ts` (2)
- `tests/stores/authStore.simple.test.ts` (29)

#### React components (23 occurrences):
- `pages/crm/SupportTickets.tsx` (2)
- `pages/auth/ResetPasswordPage.tsx` (1)
- `pages/crm/CompaniesPage.tsx` (1)
- `pages/dashboard/DashboardPage.tsx` (1)
- `pages/team/TeamPage.tsx` (3)
- `components/shifts/AdjustHoursDialog.tsx` (1)
- And 10 more files...

---

## How to Replace `any` Types

### 1. Use `unknown` for Unknown Types

❌ **Before**:
```typescript
function handleError(error: any) {
  console.log(error.message) // No type safety
}
```

✅ **After**:
```typescript
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.log(error.message) // Type-safe!
  }
}
```

### 2. Use Type Guards

```typescript
// Type guard functions
function hasMessage(value: unknown): value is { message: string } {
  return typeof value === 'object' && value !== null && 'message' in value
}

function hasCode(value: unknown): value is { code: string } {
  return typeof value === 'object' && value !== null && 'code' in value
}

// Usage
function handleError(error: unknown) {
  if (hasMessage(error)) {
    console.log(error.message) // TypeScript knows error has message
  }
}
```

### 3. Use Union Types Instead of `any`

❌ **Before**:
```typescript
function log(...args: any[]) {
  console.log(...args)
}
```

✅ **After**:
```typescript
type Loggable = string | number | boolean | null | undefined | Error | Record<string, unknown>

function log(...args: Loggable[]) {
  console.log(...args)
}
```

### 4. Use Generics for Flexible Types

❌ **Before**:
```typescript
function fetchData(url: string): Promise<any> {
  return fetch(url).then(r => r.json())
}
```

✅ **After**:
```typescript
async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url)
  return response.json() as T
}

// Usage
const user = await fetchData<User>('/api/user')
```

### 5. Use `Record<string, unknown>` for Objects

❌ **Before**:
```typescript
const config: any = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
}
```

✅ **After**:
```typescript
const config: Record<string, unknown> = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
}

// Or better, define an interface
interface Config {
  apiUrl: string
  timeout: number
}

const config: Config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
}
```

---

## Exceptions: When `any` is Acceptable

### 1. Test Files

Test files are excluded from strict `any` rules (`.eslintignore`):
- `**/*.test.ts`
- `**/*.test.tsx`
- `**/*.spec.ts`
- `**/*.spec.tsx`
- `src/tests/**`

### 2. Third-Party Libraries Without Types

If a library doesn't have TypeScript types:

```typescript
// Use @ts-expect-error with explanation
// @ts-expect-error - old-library doesn't have TypeScript types
import oldLibrary from 'old-library'

// Or declare module
declare module 'old-library' {
  export function doSomething(param: string): void
}
```

### 3. Gradual Migration

During migration, you can use `// eslint-disable-next-line` with justification:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Add proper types
const legacyData: any = oldSystemData
```

---

## Testing Your Changes

### 1. Type Check

```bash
cd apps/web
npm run type-check  # or: npx tsc --noEmit
```

### 2. Lint Check

```bash
npm run lint
```

### 3. Build Test

```bash
npm run build
```

---

## Benefits of Strict TypeScript

### 1. Catch Errors at Compile Time

```typescript
// ❌ Before (with any): Runtime error
const user: any = fetchUser()
console.log(user.name.toUpperCase()) // Crashes if user.name is undefined

// ✅ After (strict): Compile-time error
const user: User | null = fetchUser()
console.log(user?.name?.toUpperCase()) // Safe navigation
```

### 2. Better IDE Support

- Autocomplete works correctly
- Refactoring is safer
- Documentation via types

### 3. Self-Documenting Code

```typescript
// ❌ What does this accept?
function process(data: any) { ... }

// ✅ Clear expectations
function process(data: { id: string; items: Item[] }) { ... }
```

### 4. Prevents Common Mistakes

```typescript
// ❌ TypeScript allows this with any
const data: any = null
console.log(data.property) // Runtime error!

// ✅ Strict null checks prevent this
const data: Data | null = null
console.log(data.property) // Compile error: Object is possibly 'null'
console.log(data?.property) // Safe
```

---

## Migration Checklist

- [x] Enable strict TypeScript rules in `tsconfig.json`
- [x] Add ESLint rules to prevent new `any` types
- [x] Fix `logger.ts` (replaced `any` with `Loggable`)
- [x] Fix `error-handler.ts` (replaced `any` with `unknown` + type guards)
- [ ] Fix remaining utility files (57 occurrences in `.ts` files)
- [ ] Fix React components (23 occurrences in `.tsx` files)
- [ ] Enable `noUnusedLocals` and `noUnusedParameters`
- [ ] Enable full `strict: true` mode
- [ ] Achieve 0 `any` types in production code

---

## Estimated Effort

| Task | Occurrences | Estimated Time |
|------|-------------|----------------|
| Utility files | 57 | 2-3 hours |
| React components | 23 | 1-2 hours |
| Testing & fixes | - | 1 hour |
| **Total** | **80** | **4-6 hours** |

---

## Resources

- [TypeScript Handbook - Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [TypeScript Deep Dive - Type Guards](https://basarat.gitbook.io/typescript/type-system/typeguard)
- [ESLint TypeScript Rules](https://typescript-eslint.io/rules/)

---

**Last Updated**: 2025-11-08
**Security Level**: In Progress (80 `any` types remaining)
**Target**: 0 `any` types in production code
