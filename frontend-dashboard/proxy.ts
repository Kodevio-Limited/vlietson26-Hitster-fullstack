import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes under /admin that do NOT require an adminToken cookie.
// Anything else under /admin is treated as protected. Use exact path
// matches to avoid accidentally letting /admin/signin-foo slip through.
const PUBLIC_ADMIN_PATHS = new Set<string>([
    "/admin/signin",
    "/admin/forgot-password",
    "/admin/verification",
    "/admin/reset-password",
]);

function isProtectedAdminPath(pathname: string): boolean {
    if (!pathname.startsWith("/admin")) return false;
    // Treat the dashboard root as protected; compare only the first
    // segment after /admin against the public set.
    if (pathname === "/admin" || pathname === "/admin/") return true;
    const rest = pathname.slice("/admin".length).replace(/^\/+/, "");
    const firstSegment = rest.split("/")[0] ?? "";
    return !PUBLIC_ADMIN_PATHS.has(`/admin/${firstSegment}`);
}

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (process.env.NODE_ENV !== "production") {
        console.log(`[Proxy] Path: ${pathname}`);
    }

    const isProtected = isProtectedAdminPath(pathname);
    const hasAdminToken = request.cookies.has("adminToken");

    if (process.env.NODE_ENV !== "production") {
        console.log(`[Proxy] Protected: ${isProtected}, HasToken: ${hasAdminToken}`);
    }

    if (isProtected && !hasAdminToken) {
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
