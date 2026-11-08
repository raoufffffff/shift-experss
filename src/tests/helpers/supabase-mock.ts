import { vi } from 'vitest'

// Mock user data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'admin',
  company_id: 'company-123',
  full_name: 'Test User',
}

export const mockCompany = {
  id: 'company-123',
  name: 'Test Company',
  subscription_status: 'active',
  stripe_customer_id: 'cus_123',
}

// Mock Supabase client
export const createMockSupabaseClient = () => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { access_token: 'mock-token', user: mockUser } },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: { access_token: 'mock-token' } },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({
      error: null,
    }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: table === 'users' ? mockProfile : mockCompany,
      error: null,
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: table === 'users' ? mockProfile : mockCompany,
      error: null,
    }),
  })),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  })),
  removeChannel: vi.fn(),
})

// Mock implementation for successful operations
export const mockSupabaseSuccess = createMockSupabaseClient()

// Mock implementation for failed operations
export const createMockSupabaseError = (errorMessage: string) => {
  const client = createMockSupabaseClient()

  client.auth.signInWithPassword = vi.fn().mockResolvedValue({
    data: { user: null, session: null },
    error: { message: errorMessage },
  })

  return client
}
