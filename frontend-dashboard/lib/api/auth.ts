import { setAdminSessionCookie, clearAdminSessionCookie, loginRedirect } from "@/app/actions/auth-session";
import { apiClient } from "./client";

export async function getSpotifyAuthUrl(): Promise<string> {
    const response = await apiClient.get<{ url: string }>("/auth/spotify/url");
    return response.data.url;
}

export async function loginWithSpotify(code: string): Promise<{ jwtToken: string; user: unknown }> {
    const response = await apiClient.post<{ jwtToken: string; user: unknown }>("/auth/spotify/login", { code });
    
    // Save token to localStorage and cookies
    if (response.data.jwtToken) {
        // 1. Client-side storage
        localStorage.setItem("adminToken", response.data.jwtToken);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        
        // 2. Server-side cookie
        await setAdminSessionCookie(response.data.jwtToken);

        // 3. Server-side redirect to sync cookie with middleware
        await loginRedirect();
    }
    
    return response.data;
}

export async function logout(): Promise<void> {
    // Clear the httpOnly cookie FIRST. If the Server Action throws (transient
    // outage, network error), rethrow so callers can branch — silently
    // swallowing the error left the Bearer JWT in localStorage as a
    // valid auth credential until expiry, even after the user "logged out".
    // Only clear localStorage once the cookie is gone, so a failed cookie
    // clear leaves the client state intact and the user can retry.
    await clearAdminSessionCookie();

    localStorage.removeItem("adminToken");
    localStorage.removeItem("user");

    // The component (dashboard layout) handles its own redirect; doing it
    // here would conflict with Next.js Server Action redirect semantics.
}
