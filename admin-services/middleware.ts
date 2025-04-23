// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the response
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

// Specify which paths this middleware should run on
export const config = {
  matcher: '/api/:path*',
};
