import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login']
// Rutas de desarrollo (previews sin auth) — accesibles SOLO fuera de producción.
const DEV_PUBLIC_PATHS = process.env.NODE_ENV !== 'production' ? ['/dev'] : []

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = [...PUBLIC_PATHS, ...DEV_PUBLIC_PATHS].some(p => pathname.startsWith(p))
  const isAsset = pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')

  if (isAsset) return NextResponse.next()

  const response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const isDevPath = DEV_PUBLIC_PATHS.some(p => pathname.startsWith(p))
  if (user && isPublic && !isDevPath) {
    return NextResponse.redirect(new URL('/partidos', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
