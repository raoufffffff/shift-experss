import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ReactNode } from 'react'

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: string
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'shift-express-theme',
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      storageKey={storageKey}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
