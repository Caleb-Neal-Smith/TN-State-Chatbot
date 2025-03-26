// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Extract the pathname from the request URL
  const { pathname } = request.nextUrl;
  
  // Only redirect for the exact root path
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/overview', request.url));
  }
  
  // Continue with the request for all other paths
  return NextResponse.next();
}

// Only run this middleware on the homepage
export const config = {
  matcher: '/',
};