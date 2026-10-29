import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import { useMessages, conversationName, ENCRYPTED_PREVIEW } from '../../hooks/social/useMessages'

// Stable user object: useMessages refetches whenever `user` changes identity
const mockUser = { id: 'me', email: 'test@test.com' }
vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

// Answers each msg_* RPC by name; anything else gets an empty list
function rpcReturns(byName) {
  mockSupabase.rpc.mockImplementation(async name =>
    ({ data: name in byName ? byName[name] : [], error: null }))
}

const INBOX = [
  {
    conversation_id: 'c1', kind: 'direct', other_user_id: 'u1',
    last_message_id: 9, last_message_kind: 'text', last_message_body: 'hello there',
    last_message_sender_id: 'me', last_activity_at: '2026-10-29T10:00:00Z', unread_count: 0,
  },
  {
    conversation_id: 'c2', kind: 'direct', other_user_id: 'u2', is_e2ee: true,
    last_message_id: 12, last_message_kind: 'e2ee', last_message_body: null,
    last_message_sender_id: 'u2', last_activity_at: '2026-10-29T09:00:00Z', unread_count: 3,
  },
  {
    conversation_id: 'g1', kind: 'group', title: 'Mumbai Flood', other_user_id: null,
    last_message_id: 4, last_message_kind: 'text', last_message_body: '',
    last_message_sender_id: 'u1', last_activity_at: '2026-10-13T09:00:00Z', unread_count: 1,
  },
]

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rpcReturns({ msg_get_inbox: INBOX })
  })

  it('loads the inbox from msg_get_inbox, groups and encrypted chats included', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockSupabase.rpc).toHaveBeenCalledWith('msg_get_inbox', { p_limit: 100, p_before: null })
    const [c1, c2, g1] = result.current.conversations
    expect(c1).toMatchObject({ id: 'c1', isGroup: false, last_message: 'hello there', lastSenderId: 'me' })
    expect(c2).toMatchObject({ id: 'c2', isEncrypted: true, last_message: ENCRYPTED_PREVIEW, unreadCount: 3 })
    expect(g1).toMatchObject({ id: 'g1', isGroup: true, title: 'Mumbai Flood', last_message: 'Attachment' })
    expect(result.current.unreadCount).toBe(4)
  })

  it('subscribes to the messaging schema, not the old social tables', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const on = mockSupabase.channel.mock.results[0].value.on
    const schemas = on.mock.calls.map(([, filter]) => filter.schema)
    expect(schemas.length).toBeGreaterThan(0)
    expect(new Set(schemas)).toEqual(new Set(['messaging']))
  })

  it('fetchThread returns messages oldest-first with read state from participants', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    rpcReturns({
      msg_get_conversation: {
        id: 'c1', kind: 'direct', e2ee: false,
        participants: [
          { user_id: 'me', last_read_message_id: 2 },
          { user_id: 'u1', last_read_message_id: 1 },
        ],
      },
      // newest-first from the server
      msg_get_messages: [
        { id: 3, conversation_id: 'c1', sender_id: 'u1', kind: 'text', body: 'new from them', created_at: '2026-10-29T10:03:00Z' },
        { id: 2, conversation_id: 'c1', sender_id: 'me', kind: 'text', body: 'mine, unseen', created_at: '2026-10-29T10:02:00Z' },
        { id: 1, conversation_id: 'c1', sender_id: 'me', kind: 'text', body: 'mine, seen', created_at: '2026-10-29T10:01:00Z' },
      ],
    })

    let thread
    await act(async () => { thread = await result.current.fetchThread('c1') })

    expect(thread.messages.map(m => m.id)).toEqual([1, 2, 3])
    expect(thread.messages.map(m => m.read)).toEqual([true, false, false])
    expect(mockSupabase.rpc).toHaveBeenCalledWith('msg_mark_read', { p_conversation_id: 'c1', p_message_id: null })
  })

  it('keeps encrypted bodies out and turns system notices into text', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    rpcReturns({
      msg_get_conversation: { id: 'c2', kind: 'direct', e2ee: true, participants: [] },
      msg_get_messages: [
        { id: 6, conversation_id: 'c2', sender_id: 'u2', kind: 'e2ee', body: null, ciphertext: 'xx', created_at: '2026-10-29T10:01:00Z' },
        { id: 5, conversation_id: 'c2', sender_id: null, kind: 'system', body: 'e2ee:identity_changed', created_at: '2026-10-29T10:00:00Z' },
      ],
    })

    let thread
    await act(async () => { thread = await result.current.fetchThread('c2') })

    expect(thread.conversation.isEncrypted).toBe(true)
    expect(thread.messages[0]).toMatchObject({ kind: 'system', body: 'Security code changed' })
    expect(thread.messages[1]).toMatchObject({ kind: 'e2ee', encrypted: true, body: '' })
  })

  it('sends through msg_send', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.sendMessage('c1', 'hi') })

    expect(mockSupabase.rpc).toHaveBeenCalledWith('msg_send', {
      p_conversation_id: 'c1', p_body: 'hi', p_attachments: [], p_reply_to_id: null,
    })
  })

  it('refuses to send plain text into an encrypted chat', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    rpcReturns({ msg_get_conversation: { id: 'c2', kind: 'direct', e2ee: true, participants: [] } })
    await act(async () => { await result.current.fetchThread('c2') })
    mockSupabase.rpc.mockClear()

    let res
    await act(async () => { res = await result.current.sendMessage('c2', 'hi') })

    expect(res.error.message).toMatch(/end-to-end encrypted/)
    expect(mockSupabase.rpc).not.toHaveBeenCalledWith('msg_send', expect.anything())
  })

  it('markConversationRead clears that chat\'s unread count', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.markConversationRead('c2') })

    expect(result.current.conversations.find(c => c.id === 'c2').unreadCount).toBe(0)
    expect(result.current.unreadCount).toBe(1)
  })

  it('getOrCreateConversation uses msg_get_or_create_direct', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    rpcReturns({ msg_get_or_create_direct: 'c9' })

    let conv
    await act(async () => { conv = await result.current.getOrCreateConversation('u9') })

    expect(mockSupabase.rpc).toHaveBeenCalledWith('msg_get_or_create_direct', { p_other_user_id: 'u9' })
    expect(conv).toMatchObject({ id: 'c9', isGroup: false })
  })
})

describe('conversationName', () => {
  it('uses the title, else up to three other members, else "Group"', () => {
    expect(conversationName({ isGroup: true, title: ' Mumbai Flood ' }, 'me')).toBe('Mumbai Flood')
    expect(conversationName({
      isGroup: true,
      participants: [
        { user_id: 'me', profile: { username: 'me' } },
        { user_id: 'a', profile: { username: 'ann' } },
        { user_id: 'b', profile: { username: 'bo' } },
      ],
    }, 'me')).toBe('ann, bo')
    expect(conversationName({ isGroup: true, participants: [] }, 'me')).toBe('Group')
    expect(conversationName({ isGroup: false, otherUser: { username: 'sagnik' } }, 'me')).toBe('sagnik')
  })
})
