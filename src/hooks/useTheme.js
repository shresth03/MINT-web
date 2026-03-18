import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('mint_theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange(e) {
      // Only follow system if user hasn't manually set a preference
      if (!localStorage.getItem('mint_theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('mint_theme', next)
    // Trigger the animation
    document.documentElement.setAttribute('data-theme-transitioning', 'true')
    setTimeout(() => {
      document.documentElement.removeAttribute('data-theme-transitioning')
    }, 800)
  }

  function followSystem() {
    localStorage.removeItem('mint_theme')
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(isDark ? 'dark' : 'light')
  }

  return { theme, toggleTheme, followSystem }
}