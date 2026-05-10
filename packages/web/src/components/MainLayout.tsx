/* Shared app shell with navigation, theme toggle, and extension sync bridge. */
import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ExtensionTaskSync } from './ExtensionTaskSync'

const navigation = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Vision Cards', to: '/vision-cards' },
  { label: 'Block Preview', to: '/preview-block' },
]

export default function MainLayout() {
  const { signOut } = useAuth()
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = window.localStorage.getItem('focusgate-theme')
    return stored === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    window.localStorage.setItem('focusgate-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="min-h-screen bg-[color:var(--surface)] text-[color:var(--text)]">
      <ExtensionTaskSync />
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface-2)]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-[color:var(--muted)]">FocusGate</p>
              <p className="text-sm text-[color:var(--text)]">Distraction blocking with daily focus.</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2" aria-label="Primary navigation">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[color:var(--accent)] text-white shadow-[0_12px_30px_rgba(139,92,246,0.22)]'
                      : 'text-[color:var(--text)] hover:bg-[color:var(--surface-3)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--button-secondary-bg)] px-4 py-2 text-sm font-semibold text-[color:var(--button-secondary-text)] transition hover:bg-[color:var(--button-secondary-hover)]"
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>

            <button
              type="button"
              onClick={signOut}
              className="rounded-full bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(139,92,246,0.2)] transition hover:brightness-110"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 rounded-[32px] border border-[color:var(--border)] bg-[color:var(--card)]/92 p-6 glass-panel-dark theme-shadow">
          <p className="text-sm text-[color:var(--muted)]">
            Use the extension icon to configure app blocking. Your daily tasks and vision cards live here in the FocusGate app.
          </p>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
