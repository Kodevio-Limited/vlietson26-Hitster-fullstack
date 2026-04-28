import { setAdminSessionCookie, clearAdminSessionCookie, loginRedirect, logoutRedirect } from "@/app/actions/auth-session";
import { apiClient } from "./client";

export async function getSpotifyAuthUrl(): Promise<string> {
    const response = await apiClient.get<{ url: string }>("/auth/spotify/url");
    return response.data.url;
}

export async function loginWithSpotify(code: string): Promise<{ jwtToken: string; user: any }> {
    const response = await apiClient.post<{ jwtToken: string; user: any }>("/auth/spotify/login", { code });
    
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
    try {
        // 1. Client-side clear
        localStorage.removeItem("adminToken");
        localStorage.removeItem("user");

        // 2. Server-side clear cookie
        await clearAdminSessionCookie();
    } catch (error) {
        console.error("Logout error:", error);
    }
    // 3. Handled by the component to avoid Next.js Action redirect errors
}
