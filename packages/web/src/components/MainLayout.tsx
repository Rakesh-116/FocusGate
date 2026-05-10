import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const navigation = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Vision Cards', to: '/vision-cards' },
  { label: 'Block Preview', to: '/preview-block' },
]

export default function MainLayout() {
  const { user, signOut } = useAuth()
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = window.localStorage.getItem('focusgate-theme')
    return stored === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    window.localStorage.setItem('focusgate-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="min-h-screen bg-[color:var(--surface)] text-[color:var(--text)]">
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface-2)]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_auto] items-center">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--muted)]">FocusGate</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-semibold transition shadow-sm ${isActive
                      ? 'bg-[color:var(--accent)] text-white shadow-[0_12px_40px_rgba(139,92,246,0.25)]'
                      : 'text-[color:var(--text)] hover:bg-[color:var(--surface)]/80'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] hover:bg-[color:var(--surface-3)]"
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface-3)]/85 p-6 shadow-soft glass-panel-dark">
          <p className="text-sm text-[color:var(--muted)]">
            Use the extension icon to configure app blocking. Your daily tasks and vision cards live here in the FocusGate app.
          </p>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
