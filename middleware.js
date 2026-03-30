import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes, and public pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/deactivated') ||
    pathname === '/login' ||
    pathname === '/' ||
    pathname.startsWith('/cst/') ||
    pathname.startsWith('/agent/') ||
    pathname.startsWith('/supplier/')
  ) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('token')?.value;
  
  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded) {
        const userId = decoded.userId || decoded.id;
        
        // Check user status from database
        const result = await executeQuery(
          'SELECT id, name, status FROM employee_profile WHERE id = ?',
          [userId]
        );

        if (result.length > 0) {
          const user = result[0];
          const isActive = Number(user.status) === 1;

          // If user is deactivated, redirect to deactivated page
          if (!isActive) {
            console.log(`🚫 Middleware: User ${user.name} (ID: ${user.id}) is deactivated - blocking access`);
            
            // Create response that clears cookies and redirects
            const response = NextResponse.redirect(new URL('/deactivated', request.url));
            
            // Clear all authentication cookies
            response.cookies.delete('token');
            response.cookies.delete('user');
            
            return response;
          }
        }
      }
    } catch (error) {
      console.error('Middleware auth error:', error);
      // Continue without blocking on token verification error
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
