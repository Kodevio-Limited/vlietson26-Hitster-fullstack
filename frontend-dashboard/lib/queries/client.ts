import { QueryClient } from "@tanstack/react-query";

/**
 * Create a QueryClient with sensible defaults for the admin dashboard.
 *
 * The factory function is important: callers must wrap the construction
 * in `useState(() => makeQueryClient())` so the client is created once
 * per component lifecycle, not on every render. This is the standard
 * pattern from the TanStack Query docs.
 *
 * Defaults:
 * - staleTime 30s — most admin views don't need to refetch on focus.
 * - gcTime 5min  — keep recently-visited pages warm in cache.
 * - refetchOnWindowFocus false — admin pages are not "live" dashboards.
 * - retry 1      — the backend already logs errors; a second attempt
 *                   is usually pointless for a 4xx and just delays the
 *                   error UI.
 * - placeholderData: keepPreviousData — pagination feels instant
 *                   because the previous page stays visible while the
 *                   next one loads.
 */
export function makeQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                gcTime: 5 * 60_000,
                refetchOnWindowFocus: false,
                retry: 1,
                placeholderData: <T>(previousData: T) => previousData,
            },
            mutations: {
                retry: 0,
            },
        },
    });
}
