import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Auth temporarily disabled for development
// We will re-enable after Phase 2 is complete
export async function middleware(req: NextRequest) {
  // Allow all access for now
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}