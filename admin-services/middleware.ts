// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Redirect root path to overview
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/overview', request.url));
  }
  
  // Get the response for all other paths
  const response = NextResponse.next();

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Allow requests from the orchestration service domain
    const orchestrationServiceUrl = process.env.ORCHESTRATION_SERVICE_URL || 'http://localhost:9000';
    const orchestrationDomain = new URL(orchestrationServiceUrl).origin;
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  return response;
}

// Update the matcher to include both the root path and API routes
export const config = {
  matcher: ['/', '/api/:path*'],
};