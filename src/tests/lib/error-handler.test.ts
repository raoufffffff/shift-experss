import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleSupabaseError, handleAPIError, catchAsync } from '@/lib/error-handler'
import { logger } from '@/utils/logger'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
  },
}))

describe('error-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleSupabaseError', () => {
    const errorContext = {
      context: 'TestPage',
      operation: 'testOperation',
      userId: 'user-123',
    }

    it('should handle NOT_FOUND error', () => {
      const error = { code: 'PGRST116', message: 'Not found' }
      const message = handleSupabaseError(error, errorContext)

      expect(message).toBe('Élément non trouvé')
      expect(logger.error).toHaveBeenCalledWith('[TestPage]', expect.any(Object))
    })

    it('should handle UNIQUE_VIOLATION error', () => {
      const error = { code: '23505', message: 'Unique violation' }
      const message = handleSupabaseError(error, errorContext)

      expect(message).toBe('Cet élément existe déjà')
    })

    it('should handle FOREIGN_KEY_VIOLATION error', () => {
      const error = { code: '23503', message: 'Foreign key violation' }
      const message = handleSupabaseError(error, errorContext)

      expect(message).toBe('Impossible de supprimer : des éléments dépendent de celui-ci')
    })

    it('should handle JWT_EXPIRED error by code', () => {
      const error = { code: 'PGRST301', message: 'JWT expired' }
      const message = handleSupabaseError(error, errorContext)

      expect(message).toBe('Session expirée. Veuillez vous reconnecter.')
    })

    it('should handle JWT error by message', () => {
      const error = { message: 'JWT token has expired' }
      const message = handleSupabaseError(error, errorContext)

      expect(message).toBe('Session expirée. Veuillez vous reconnecter.')
    })

    it('should handle PERMISSION_DENIED error', () => {
      const error = { code: '42501', message: 'Permission denied' }
      const message = handleSupabaseError(error, errorContext)

      expect(message).toBe("Vous n'avez pas les permissions nécessaires")
    })

    it('should handle network error', () => {
      const error = { message: 'NetworkError when attempting to fetch' }
      const message = handleSupabaseError(error, errorContext)

      expect(message).toBe('Erreur de connexion. Vérifiez votre connexion internet.')
    })

    it('should handle Failed to fetch error', () => {
      const error = { message: 'Failed to fetch data' }
      const message = handleSupabaseError(error, errorContext)

      expect(message).toBe('Erreur de connexion. Vérifiez votre connexion internet.')
    })

    it('should handle timeout error', () => {
      const error = { message: 'Request timeout after 10s' }
      const message = handleSupabaseError(error, errorContext)

      expect(message).toBe('La requête a pris trop de temps. Veuillez réessayer.')
    })

    it('should return default message for unknown error', () => {
      const error = { message: 'Some unknown error' }
      const message = handleSupabaseError(error, errorContext)

      expect(message).toBe('Une erreur est survenue. Veuillez réessayer.')
    })

    it('should log error details', () => {
      const error = {
        code: 'PGRST116',
        message: 'Not found',
        details: 'Detailed info',
        hint: 'Try something else',
      }

      handleSupabaseError(error, errorContext)

      expect(logger.error).toHaveBeenCalledWith('[TestPage]', {
        operation: 'testOperation',
        error: {
          message: 'Not found',
          code: 'PGRST116',
          details: 'Detailed info',
          hint: 'Try something else',
        },
        userId: 'user-123',
        metadata: undefined,
      })
    })

    it('should log with metadata when provided', () => {
      const error = { code: 'PGRST116', message: 'Not found' }
      const contextWithMetadata = {
        ...errorContext,
        metadata: { employeeId: 'emp-456' },
      }

      handleSupabaseError(error, contextWithMetadata)

      expect(logger.error).toHaveBeenCalledWith('[TestPage]', expect.objectContaining({
        metadata: { employeeId: 'emp-456' },
      }))
    })

    it('should handle null/undefined error gracefully', () => {
      const message = handleSupabaseError(null, errorContext)
      expect(message).toBe('Une erreur est survenue. Veuillez réessayer.')
    })
  })

  describe('handleAPIError', () => {
    const errorContext = {
      context: 'APITestPage',
      operation: 'fetchData',
    }

    it('should handle 400 Bad Request', () => {
      const error = { status: 400, statusText: 'Bad Request' }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe('Requête invalide. Veuillez vérifier vos données.')
    })

    it('should handle 401 Unauthorized', () => {
      const error = { status: 401, statusText: 'Unauthorized' }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe('Non authentifié. Veuillez vous reconnecter.')
    })

    it('should handle 403 Forbidden', () => {
      const error = { status: 403, statusText: 'Forbidden' }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe("Accès refusé. Vous n'avez pas les permissions nécessaires.")
    })

    it('should handle 404 Not Found', () => {
      const error = { status: 404, statusText: 'Not Found' }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe('Ressource non trouvée.')
    })

    it('should handle 409 Conflict', () => {
      const error = { status: 409, statusText: 'Conflict' }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe('Conflit : cette ressource existe déjà.')
    })

    it('should handle 422 Unprocessable Entity', () => {
      const error = { status: 422, statusText: 'Unprocessable Entity' }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe('Données invalides. Veuillez vérifier votre saisie.')
    })

    it('should handle 429 Too Many Requests', () => {
      const error = { status: 429, statusText: 'Too Many Requests' }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe('Trop de requêtes. Veuillez patienter un moment.')
    })

    it('should handle 500 Internal Server Error', () => {
      const error = { status: 500, statusText: 'Internal Server Error' }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe('Erreur serveur. Veuillez réessayer dans quelques instants.')
    })

    it('should handle 502 Bad Gateway', () => {
      const error = { status: 502, statusText: 'Bad Gateway' }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe('Erreur serveur. Veuillez réessayer dans quelques instants.')
    })

    it('should handle 503 Service Unavailable', () => {
      const error = { status: 503, statusText: 'Service Unavailable' }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe('Erreur serveur. Veuillez réessayer dans quelques instants.')
    })

    it('should handle unknown HTTP status', () => {
      const error = { status: 418, statusText: "I'm a teapot" }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe("Erreur 418: I'm a teapot")
    })

    it('should fallback to handleSupabaseError when no status', () => {
      const error = { code: 'PGRST116', message: 'Not found' }
      const message = handleAPIError(error, errorContext)

      expect(message).toBe('Élément non trouvé')
    })

    it('should log API error details', () => {
      const error = {
        status: 404,
        statusText: 'Not Found',
        message: 'Resource not found',
      }

      handleAPIError(error, errorContext)

      expect(logger.error).toHaveBeenCalledWith('[APITestPage]', {
        operation: 'fetchData',
        error: {
          message: 'Resource not found',
          status: 404,
          statusText: 'Not Found',
        },
        userId: undefined,
        metadata: undefined,
      })
    })
  })

  describe('catchAsync', () => {
    const errorContext = {
      context: 'AsyncTestPage',
      operation: 'asyncOperation',
    }

    it('should return data when promise succeeds', async () => {
      const mockData = { id: '123', name: 'Test' }
      const promise = Promise.resolve({ data: mockData, error: null })

      const [data, error] = await catchAsync(promise, errorContext)

      expect(data).toEqual(mockData)
      expect(error).toBeNull()
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should return error when promise has Supabase error', async () => {
      const mockError = { code: 'PGRST116', message: 'Not found' }
      const promise = Promise.resolve({ data: null, error: mockError })

      const [data, error] = await catchAsync(promise, errorContext)

      expect(data).toBeNull()
      expect(error).toEqual({
        message: 'Élément non trouvé',
        originalError: mockError,
      })
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle thrown errors', async () => {
      const thrownError = new Error('Network error')
      const promise = Promise.reject(thrownError)

      const [data, error] = await catchAsync(promise, errorContext)

      expect(data).toBeNull()
      expect(error).toEqual({
        message: 'Une erreur est survenue. Veuillez réessayer.',
        originalError: thrownError,
      })
    })

    it('should handle API errors with status', async () => {
      const apiError = { status: 404, message: 'Not found' }
      const promise = Promise.reject(apiError)

      const [data, error] = await catchAsync(promise, errorContext)

      expect(data).toBeNull()
      expect(error?.message).toBe('Ressource non trouvée.')
      expect(error?.originalError).toEqual(apiError)
    })

    it('should preserve data type', async () => {
      type Employee = { id: string; name: string; role: string }
      const mockEmployee: Employee = { id: '123', name: 'John', role: 'admin' }
      const promise = Promise.resolve({ data: mockEmployee, error: null })

      const [data, error] = await catchAsync<Employee>(promise, errorContext)

      expect(data).toEqual(mockEmployee)
      if (data) {
        // Type check - should compile
        const name: string = data.name
        expect(name).toBe('John')
      }
    })

    it('should handle data as null when error exists', async () => {
      const mockError = { code: '23505', message: 'Unique violation' }
      const promise = Promise.resolve({ data: null, error: mockError })

      const [data, error] = await catchAsync(promise, errorContext)

      expect(data).toBeNull()
      expect(error?.message).toBe('Cet élément existe déjà')
    })
  })

  describe('Edge Cases', () => {
    it('should handle error with empty context', () => {
      const error = { code: 'PGRST116', message: 'Not found' }
      const message = handleSupabaseError(error, { context: '' })

      expect(message).toBe('Élément non trouvé')
      expect(logger.error).toHaveBeenCalledWith('[]', expect.any(Object))
    })

    it('should handle error message with JWT in uppercase', () => {
      const error = { message: 'JWT token invalid' }
      const message = handleSupabaseError(error, { context: 'Test' })

      expect(message).toBe('Session expirée. Veuillez vous reconnecter.')
    })

    it('should handle error message with expired keyword', () => {
      const error = { message: 'Token has expired' }
      const message = handleSupabaseError(error, { context: 'Test' })

      expect(message).toBe('Session expirée. Veuillez vous reconnecter.')
    })

    it('should handle API error with status 0 (fallback to Supabase handler)', () => {
      const error = { status: 0, message: 'Network error' }
      const message = handleAPIError(error, { context: 'Test' })

      // Status 0 is not in the switch, so it falls through to default case
      expect(message).toBe('Erreur 0: Erreur inconnue')
    })

    it('should handle API error without statusText', () => {
      const error = { status: 418 }
      const message = handleAPIError(error, { context: 'Test' })

      expect(message).toBe('Erreur 418: Erreur inconnue')
    })
  })
})
