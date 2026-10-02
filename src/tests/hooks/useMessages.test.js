import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRpc, mockFrom, mockSupabase, mockUser } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockSupabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
  mockUser: {
    id: 'user-1',
  },
}))

vi.mock('../../api/supabase', () => ({
  supabase: mockSupabase,

  identityDb: {
    rpc: mockRpc,
  },

  socialDb: {
    rpc: mockRpc,
    from: mockFrom,
  },
}))


vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}))

import { useMessages } from '../../hooks/social/useMessages'

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })

    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })

    mockRpc.mockImplementation((rpcName) => {
      switch (rpcName) {
        case 'msg_get_inbox':
          return Promise.resolve({
            data: [
              {
                conversation_id: 'conversation-1',
                other_user_id: 'user-2',
                unread_count: 2,
              },
            ],
            error: null,
          })

        case 'profile_get_by_ids':
          return Promise.resolve({
            data: [
              {
                id: 'user-2',
                username: 'john',
                role: 'public',
              },
            ],
            error: null,
          })

        case 'msg_get_or_create_direct':
          return Promise.resolve({
            data: 'conversation-1',
            error: null,
          })

        case 'msg_get_messages':
          return Promise.resolve({
            data: [
              {
                id: 1,
                conversation_id: 'conversation-1',
                sender_id: 'user-2',
                body: 'Hello',
              },
              {
                id: 2,
                conversation_id: 'conversation-1',
                sender_id: 'user-1',
                body: 'Hi',
              },
            ],
            error: null,
          })

        case 'msg_mark_read':
          return Promise.resolve({
            data: null,
            error: null,
          })

        case 'msg_get_conversation':
          return Promise.resolve({
            data: {
              id: 'conversation-1',
              participants: [
                {
                  user_id: 'user-1',
                },
                {
                  user_id: 'user-2',
                },
              ],
            },
            error: null,
          })

        case 'msg_send':
          return Promise.resolve({
            data: {
              id: 123,
              conversation_id: 'conversation-1',
              sender_id: 'user-1',
              body: 'Test message',
            },
            error: null,
          })

        default:
          return Promise.resolve({
            data: null,
            error: null,
          })
      }
    })
  })

  it('fetches conversations using msg_get_inbox and profile_get_by_ids', async () => {
    const { result } = renderHook(() => useMessages())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockRpc).toHaveBeenCalledWith('msg_get_inbox', {
      p_limit: 30,
      p_before: null,
    })

    expect(mockRpc).toHaveBeenCalledWith('profile_get_by_ids', {
      p_ids: ['user-2'],
    })

    expect(result.current.conversations).toEqual([
      {
        conversation_id: 'conversation-1',
        other_user_id: 'user-2',
        unread_count: 2,
        other_user: {
          id: 'user-2',
          username: 'john',
          role: 'public',
        },
      },
    ])

    expect(result.current.unreadCount).toBe(2)
    expect(result.current.loading).toBe(false)
  })

  it('creates or gets a direct conversation using msg_get_or_create_direct', async () => {
    const { result } = renderHook(() => useMessages())

    let conversationId

    await act(async () => {
      conversationId = await result.current.getOrCreateConversation('user-2')
    })

    expect(mockRpc).toHaveBeenCalledWith(
      'msg_get_or_create_direct',
      {
        p_other_user_id: 'user-2',
      }
    )

    expect(conversationId).toBe('conversation-1')
  })

  it('fetches messages and marks the latest message as read', async () => {
    const { result } = renderHook(() => useMessages())

    await act(async () => {
      await result.current.fetchMessages('conversation-1')
    })

    expect(mockRpc).toHaveBeenCalledWith('msg_get_messages', {
      p_conversation_id: 'conversation-1',
      p_before_id: null,
      p_limit: 50,
    })

    expect(result.current.messages).toEqual([
      {
        id: 2,
        conversation_id: 'conversation-1',
        sender_id: 'user-1',
        body: 'Hi',
      },
      {
        id: 1,
        conversation_id: 'conversation-1',
        sender_id: 'user-2',
        body: 'Hello',
      },
    ])

    expect(mockRpc).toHaveBeenCalledWith('msg_mark_read', {
      p_conversation_id: 'conversation-1',
      p_message_id: 1,
    })
  })

  it('sends a message using msg_send and gets the other participant through msg_get_conversation', async () => {
    const { result } = renderHook(() => useMessages())

    let response

    await act(async () => {
      response = await result.current.sendMessage(
        'conversation-1',
        'Test message'
      )
    })

    expect(mockRpc).toHaveBeenCalledWith('msg_send', {
      p_conversation_id: 'conversation-1',
      p_body: 'Test message',
      p_attachments: [],
      p_reply_to_id: null,
    })

    expect(mockRpc).toHaveBeenCalledWith('msg_get_conversation', {
      p_conversation_id: 'conversation-1',
    })

    expect(mockFrom).toHaveBeenCalledWith('notifications')

    expect(response).toEqual({
      data: {
        id: 123,
        conversation_id: 'conversation-1',
        sender_id: 'user-1',
        body: 'Test message',
      },
      error: null,
    })
  })

  it('returns an error when msg_send fails', async () => {
    mockRpc.mockImplementation((rpcName) => {
      if (rpcName === 'msg_send') {
        return Promise.resolve({
          data: null,
          error: {
            message: 'Failed to send message',
          },
        })
      }

      return Promise.resolve({
        data: [],
        error: null,
      })
    })

    const { result } = renderHook(() => useMessages())

    let response

    await act(async () => {
      response = await result.current.sendMessage(
        'conversation-1',
        'Test message'
      )
    })

    expect(response.error).toEqual({
      message: 'Failed to send message',
    })

    expect(mockFrom).not.toHaveBeenCalled()
  })
})