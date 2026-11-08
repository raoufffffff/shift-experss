# 📝 Logging Guide - Web Application

## 🔐 Security Policy: NO console.* in Production

**All `console.log`, `console.warn`, etc. are automatically removed from production builds.**

This prevents:
- Sensitive data exposure in browser console
- Debug information leakage
- Performance overhead from logging
- Potential security vulnerabilities

---

## ✅ Correct Usage: Use `logger`

### Import the logger

```typescript
import { logger } from '@/utils/logger'
```

### Basic logging

```typescript
// Development: Shows in console
// Production: Completely silent
logger.log('User clicked button')
logger.info('API call successful')
logger.warn('Deprecated feature used')
logger.error('Failed to fetch data:', error)
logger.debug('Detailed debugging info:', data)
```

### Advanced features

```typescript
// Group related logs
logger.group('User Authentication')
logger.log('Starting login process')
logger.log('Validating credentials')
logger.groupEnd()

// Display data as table
logger.table(users)

// Measure performance
logger.time('API Request')
// ... your code ...
logger.timeEnd('API Request')

// Show call stack
logger.trace('Function call trace')
```

---

## ❌ Incorrect Usage: Direct console.*

```typescript
// ❌ WRONG - Will trigger ESLint warning
console.log('User data:', user)

// ✅ CORRECT - Use logger instead
logger.log('User data:', user)
```

---

## 🛡️ Security Features

### 1. **Automatic Removal in Production**

Vite configuration (`vite.config.ts`) automatically removes ALL `console.*` and `debugger` statements in production builds:

```typescript
esbuild: {
  drop: isProduction ? ['console', 'debugger'] : [],
}
```

### 2. **ESLint Protection**

ESLint rule `no-console` warns developers when using direct `console.*`:

```json
{
  "rules": {
    "no-console": "warn"
  }
}
```

### 3. **Conditional Logging**

The logger only outputs in development/test environments:

```typescript
const isDevelopment = import.meta.env.MODE === 'development'
const isTest = import.meta.env.MODE === 'test'
```

---

## 📋 Migration Checklist

If you have existing `console.*` calls:

1. **Find all console.* usage**
   ```bash
   # In apps/web directory
   grep -r "console\." src/ --exclude-dir=tests
   ```

2. **Replace with logger**
   ```typescript
   // Before
   console.log('Debug info')

   // After
   import { logger } from '@/utils/logger'
   logger.log('Debug info')
   ```

3. **Run ESLint to find remaining issues**
   ```bash
   npm run lint
   ```

4. **Test that production build removes all logs**
   ```bash
   npm run build
   # Check dist/ bundle - should have no console.* calls
   ```

---

## 🧪 Testing

Console.* is allowed in test files:

- `**/*.test.ts`
- `**/*.test.tsx`
- `**/*.spec.ts`
- `**/*.spec.tsx`
- `src/tests/**`

These are excluded in `.eslintignore`.

---

## 🚀 Future Enhancements

### Sentry Integration (TODO)

When Sentry is configured, errors will be automatically sent:

```typescript
error(...args: any[]): void {
  if (this.shouldLog('error')) {
    console.error(...args)
  }
  // Send to Sentry in production
  if (!isDevelopment && !isTest && typeof window !== 'undefined') {
    Sentry.captureException(new Error(args.join(' ')))
  }
}
```

To enable:
1. Install Sentry: `npm install @sentry/react`
2. Uncomment Sentry code in `logger.ts`
3. Configure Sentry DSN in environment variables

---

## 📊 Current Status

- ✅ Logger utility created and documented
- ✅ Vite configured to remove console.* in production
- ✅ ESLint rule added to warn about console.* usage
- ✅ Test files excluded from console.* warnings
- ⏳ Migration of existing console.* calls (in progress)
- ⏳ Sentry integration (not yet implemented)

---

## 🔗 Related Files

- `src/utils/logger.ts` - Logger implementation
- `vite.config.ts` - Production console removal config
- `.eslintrc.json` - ESLint rules
- `.eslintignore` - Files excluded from linting
- `SECURITY_GUIDE.md` - Overall security documentation

---

**Last Updated**: 2025-11-08
**Security Level**: Production-Ready ✅
