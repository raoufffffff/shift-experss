import { PostgrestError } from '@supabase/supabase-js'
import { logger } from '@/utils/logger'
import i18n from '@/i18n/config'

/**
 * Types d'erreurs possibles
 */
export type ErrorContext = {
  context: string
  operation?: string
  userId?: string
  metadata?: Record<string, unknown>
}

/**
 * Type guard to check if error has code property
 */
function hasCode(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error
}

/**
 * Type guard to check if error has message property
 */
function hasMessage(error: unknown): error is { message: string } {
  return typeof error === 'object' && error !== null && 'message' in error
}

/**
 * Type guard to check if error has status property
 */
function hasStatus(error: unknown): error is { status: number; statusText?: string } {
  return typeof error === 'object' && error !== null && 'status' in error
}

/**
 * Codes d'erreur PostgreSQL/Supabase courants
 */
const ERROR_CODES = {
  NOT_FOUND: 'PGRST116',
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  JWT_EXPIRED: 'PGRST301',
  PERMISSION_DENIED: '42501',
} as const

/**
 * i18n keys for user-friendly error messages
 */
const ERROR_MESSAGE_KEYS: Record<string, string> = {
  [ERROR_CODES.NOT_FOUND]: 'errors.notFoundItem',
  [ERROR_CODES.UNIQUE_VIOLATION]: 'errors.uniqueViolation',
  [ERROR_CODES.FOREIGN_KEY_VIOLATION]: 'errors.foreignKeyViolation',
  [ERROR_CODES.JWT_EXPIRED]: 'errors.jwtExpired',
  [ERROR_CODES.PERMISSION_DENIED]: 'errors.permissionDenied',
}

/**
 * Gère les erreurs Supabase/PostgreSQL de manière centralisée
 *
 * @param error - L'erreur retournée par Supabase
 * @param errorContext - Contexte de l'erreur (page, opération, etc.)
 * @returns Message d'erreur user-friendly
 *
 * @example
 * ```ts
 * const { error } = await supabase.from('employees').select('*').single()
 * if (error) {
 *   const message = handleSupabaseError(error, {
 *     context: 'EmployeeDetailPage',
 *     operation: 'loadEmployee'
 *   })
 *   toast.error(message)
 *   return
 * }
 * ```
 */
export function handleSupabaseError(
  error: PostgrestError | Error | unknown,
  errorContext: ErrorContext
): string {
  // Log détaillé pour le debugging
  const errorDetails = error instanceof Error
    ? { message: error.message, name: error.name }
    : hasCode(error) || hasMessage(error)
    ? {
        message: hasMessage(error) ? error.message : undefined,
        code: hasCode(error) ? error.code : undefined,
        details: 'details' in error ? error.details : undefined,
        hint: 'hint' in error ? error.hint : undefined,
      }
    : { message: String(error) }

  logger.error(`[${errorContext.context}]`, {
    operation: errorContext.operation,
    error: errorDetails,
    userId: errorContext.userId,
    metadata: errorContext.metadata,
  })

  // Erreur PostgreSQL/Supabase avec code
  if (hasCode(error) && ERROR_MESSAGE_KEYS[error.code]) {
    return i18n.t(ERROR_MESSAGE_KEYS[error.code])
  }

  // Erreur JWT (session expirée)
  if (hasMessage(error) && (error.message.includes('JWT') || error.message.includes('expired'))) {
    return i18n.t(ERROR_MESSAGE_KEYS[ERROR_CODES.JWT_EXPIRED])
  }

  // Erreur réseau
  if (hasMessage(error) && (error.message.includes('NetworkError') || error.message.includes('Failed to fetch'))) {
    return i18n.t('errors.networkConnection')
  }

  // Timeout
  if (hasMessage(error) && error.message.includes('timeout')) {
    return i18n.t('errors.timeout')
  }

  // Message par défaut
  return i18n.t('errors.defaultError')
}

/**
 * Gère les erreurs API/Fetch génériques
 *
 * @example
 * ```ts
 * try {
 *   const response = await fetch('/api/users')
 *   if (!response.ok) throw new Error('Fetch failed')
 * } catch (error) {
 *   const message = handleAPIError(error, {
 *     context: 'UsersPage',
 *     operation: 'fetchUsers'
 *   })
 *   toast.error(message)
 * }
 * ```
 */
export function handleAPIError(
  error: Error | unknown,
  errorContext: ErrorContext
): string {
  const errorDetails = error instanceof Error
    ? { message: error.message, name: error.name }
    : hasStatus(error)
    ? { message: hasMessage(error) ? error.message : undefined, status: error.status, statusText: error.statusText }
    : { message: String(error) }

  logger.error(`[${errorContext.context}]`, {
    operation: errorContext.operation,
    error: errorDetails,
    userId: errorContext.userId,
    metadata: errorContext.metadata,
  })

  // Erreur HTTP avec status
  if (hasStatus(error)) {
    switch (error.status) {
      case 400:
        return i18n.t('errors.badRequest')
      case 401:
        return i18n.t('errors.unauthenticated')
      case 403:
        return i18n.t('errors.accessDenied')
      case 404:
        return i18n.t('errors.resourceNotFound')
      case 409:
        return i18n.t('errors.conflict')
      case 422:
        return i18n.t('errors.invalidData')
      case 429:
        return i18n.t('errors.tooManyRequests')
      case 500:
      case 502:
      case 503:
        return i18n.t('errors.serverError')
      default:
        return i18n.t('errors.httpError', { status: error.status, statusText: error.statusText || i18n.t('errors.unknownError') })
    }
  }

  return handleSupabaseError(error, errorContext)
}

/**
 * Wrapper pour gérer les erreurs async de manière élégante
 *
 * @example
 * ```ts
 * const [employee, error] = await catchAsync(
 *   supabase.from('employees').select('*').single(),
 *   { context: 'EmployeeDetailPage', operation: 'loadEmployee' }
 * )
 *
 * if (error) {
 *   toast.error(error.message)
 *   return
 * }
 * ```
 */
export async function catchAsync<T>(
  promise: Promise<{ data: T; error: unknown }>,
  errorContext: ErrorContext
): Promise<[T | null, { message: string; originalError: unknown } | null]> {
  try {
    const { data, error } = await promise

    if (error) {
      const message = handleSupabaseError(error, errorContext)
      return [null, { message, originalError: error }]
    }

    return [data, null]
  } catch (error: unknown) {
    const message = handleAPIError(error, errorContext)
    return [null, { message, originalError: error }]
  }
}
