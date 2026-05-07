import axios from "axios";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

function getAuthToken(): string | undefined {
    const envToken = process.env.NEXT_PUBLIC_API_TOKEN;
    if (envToken) {
        return envToken;
    }

    if (typeof window !== "undefined") {
        const localToken = window.localStorage.getItem("adminToken");
        if (localToken) {
            return localToken;
        }
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
    (error) => {
        if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        }
        throw error;
    }
);
