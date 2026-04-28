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
        
        // Set cookie for middleware
        document.cookie = `adminToken=${response.data.jwtToken}; path=/; max-age=604800; SameSite=Lax`;
    }
    
    return response.data;
}

export function logout(): void {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("user");
}
