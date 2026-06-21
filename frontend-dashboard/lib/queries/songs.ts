/**
 * TanStack Query hooks for song reads.
 *
 * These wrap the plain `fetchX` functions in `lib/api/admin-dashboard.ts`
 * with `queryOptions`, so they can be consumed by `useQuery` /
 * `useSuspenseQuery` / `ensureQueryData` and shared across components
 * (the songs table and the dashboard's recent-songs both hit the same
 * `["songs"]` key prefix).
 *
 * Pattern reference: tanstack-query SKILL.md (queryOptions helper),
 * tanstack-integration-best-practices (flow-loader-query-pattern).
 */

import { queryOptions } from "@tanstack/react-query";

import {
    fetchRecentSongs,
    fetchSongs,
    getSongQrCode,
} from "@/lib/api/admin-dashboard";
import { queryKeys, type SongListParams } from "./query-keys";

export const songQueries = {
    list: (params: SongListParams = {}) =>
        queryOptions({
            queryKey: queryKeys.songs.list(params),
            queryFn: () => fetchSongs(params),
            // 30s default from the QueryClient covers this; explicit here
            // so it's visible at the call site.
            staleTime: 30_000,
        }),

    recent: (limit = 4) =>
        queryOptions({
            queryKey: queryKeys.songs.recent(limit),
            queryFn: () => fetchRecentSongs(limit),
            // Recent list changes only when a song is added/imported, so
            // a longer staleTime is appropriate. Mutations invalidate
            // this key explicitly.
            staleTime: 60_000,
        }),

    qr: (songId: string) =>
        queryOptions({
            queryKey: queryKeys.songs.detail(songId),
            queryFn: () => getSongQrCode(songId),
            // The QR for a single song is essentially static.
            staleTime: 5 * 60_000,
            enabled: !!songId,
        }),
};
