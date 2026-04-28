import { setAdminSessionCookie, clearAdminSessionCookie } from "@/app/actions/auth-session";
import { apiClient } from "./client";

export async function getSpotifyAuthUrl(): Promise<string> {
    const response = await apiClient.get<{ url: string }>("/auth/spotify/url");
    return response.data.url;
}

export async function loginWithSpotify(code: string): Promise<{ jwtToken: string; user: any }> {
    const response = await apiClient.post<{ jwtToken: string; user: any }>("/auth/spotify/login", { code });
    
    // Save token to localStorage and cookies
    if (response.data.jwtToken) {
        localStorage.setItem("adminToken", response.data.jwtToken);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        
        // Set cookie for middleware via Server Action
        await setAdminSessionCookie(response.data.jwtToken);
    }
    
    return response.data;
}

export async function logout(): Promise<void> {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("user");
    await clearAdminSessionCookie();
}
