import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { ThemeProvider, useTheme } from '../../hooks/useTheme'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn(key => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = val }),
    removeItem: vi.fn(key => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const wrapper = ({ children }) => React.createElement(ThemeProvider, null, children)

describe('useTheme', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to dark when system prefers dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('dark')
  })

  it('defaults to light when system prefers light', () => {
    window.matchMedia.mockImplementation(query => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('light')
  })

  it('reads saved preference from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('light')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('light')
  })

  it('toggleTheme switches dark to light', () => {
    localStorageMock.getItem.mockReturnValue('dark')
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => { result.current.toggleTheme() })
    expect(result.current.theme).toBe('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('mint_theme', 'light')
  })

  it('toggleTheme switches light to dark', () => {
    localStorageMock.getItem.mockReturnValue('light')
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => { result.current.toggleTheme() })
    expect(result.current.theme).toBe('dark')
  })

  it('sets data-theme attribute on html element', () => {
    localStorageMock.getItem.mockReturnValue('light')
    renderHook(() => useTheme(), { wrapper })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('followSystem removes localStorage preference', () => {
    localStorageMock.getItem.mockReturnValue('light')
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => { result.current.followSystem() })
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('mint_theme')
  })
})
