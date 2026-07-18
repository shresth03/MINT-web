import { vi } from 'vitest'

// Default resolved value for terminal awaits
const DEFAULT = { data: [], error: null }

// Build a chainable mock that is also thenable (awaitable without a terminal method)
function makeChain(resolved = DEFAULT) {
  const chain = {
    // Thenable: allows `await supabase.from(...).select(...).eq(...)`
    then: vi.fn((resolve) => Promise.resolve(resolved).then(resolve)),
    catch: vi.fn((reject) => Promise.resolve(resolved).catch(reject)),
    // Terminal methods that return promises directly
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Channel for realtime subscriptions
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  // All chainable filter/modifier methods return the same chain
  const chainable = [
    'from', 'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt',
    'ilike', 'like', 'textSearch', 'order', 'limit',
    'not', 'filter', 'match', 'is',
  ]
  chainable.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain) })
  return chain
}

export const mockSupabase = makeChain()

mockSupabase.auth = {
  getSession: vi.fn().mockResolvedValue({
    data: { session: { access_token: 'test-jwt-token' } },
    error: null,
  }),
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: 'test-user-id' } },
    error: null,
  }),
  onAuthStateChange: vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  }),
}

vi.mock('../../api/supabase', () => ({ supabase: mockSupabase }))
