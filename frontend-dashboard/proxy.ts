import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Proxy] Path: ${pathname}`);

  // Define protected and public routes
  const isProtectedRoute = pathname.startsWith("/admin") && 
    !pathname.startsWith("/admin/signin") && 
    !pathname.startsWith("/admin/forgot-password") && 
    !pathname.startsWith("/admin/verification") && 
    !pathname.startsWith("/admin/reset-password");

  const hasAdminToken = request.cookies.has("adminToken");
  console.log(`[Proxy] Protected: ${isProtectedRoute}, HasToken: ${hasAdminToken}`);

  if (isProtectedRoute && !hasAdminToken) {
    return NextResponse.redirect(new URL("/admin/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
  ],
};
