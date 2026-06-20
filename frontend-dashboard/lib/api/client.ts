import axios, { AxiosError } from "axios";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4002/api";

function getAuthToken(): string | undefined {
    // Read the token from localStorage only. Reading a build-time env
    // var first is a footgun: a single value baked into the bundle would
    // override every user's session. If you need a build-time fallback
    // for SSR, do it on the server (via the auth-session cookie) not
    // here.
    if (typeof window !== "undefined") {
        return window.localStorage.getItem("adminToken") ?? undefined;
    }
    return undefined;
}

export const apiClient = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Surface a 401 to the auth flow so the user gets redirected to
        // signin instead of seeing a broken UI.
        if (error.response?.status === 401 && typeof window !== "undefined") {
            // Clear local storage; the httpOnly cookie is cleared by the
            // server-action logout. We avoid calling that here because
            // it requires a Server Action round-trip from a client.
            window.localStorage.removeItem("adminToken");
            window.localStorage.removeItem("user");
            // Avoid an infinite loop if /auth/me itself returns 401.
            if (!window.location.pathname.startsWith("/admin/signin")) {
                window.location.href = "/admin/signin";
            }
        }

        // Reject with the original Axios error so callers can access
        // err.response?.data?.message etc. The previous version wrapped
        // everything in a plain Error and stripped the response, which
        // forced every UI to show a generic "Invalid email or password"
        // fallback regardless of the actual server message.
        return Promise.reject(error);
    }
);
