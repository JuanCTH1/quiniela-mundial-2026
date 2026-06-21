import type { Metadata } from 'next'
import './globals.css'
import { NavigationProgress } from '@/components/NavigationProgress'

export const metadata: Metadata = {
  title: 'Quiniela Overrated 2026',
  description: 'La quiniela privada del Mundial',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full" style={{ fontFamily: 'var(--font-sans)' }}>
        <NavigationProgress />
        <div className="g-blob-wrap" aria-hidden>
          <div className="g-blob g-blob-1" />
          <div className="g-blob g-blob-2" />
          <div className="g-blob g-blob-3" />
        </div>
        {children}
      </body>
    </html>
  )
}
