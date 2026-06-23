import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');

  // Allow auth and API routes through
  if (isAuthRoute || isApiRoute) return res;

  // Redirect to login if not authenticated
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json).*)'],
};
