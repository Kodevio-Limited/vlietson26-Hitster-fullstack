/**
 * TanStack Query mutation hooks for song writes.
 *
 * Each mutation invalidates the relevant query keys on success so the
 * UI updates automatically:
 *   - create / update / delete → `queryKeys.songs.all` (wipes list, recent, detail)
 *   - bulk import              → same
 *   - QR regenerate            → only the specific song's detail
 *
 * Pattern reference: tanstack-integration-best-practices
 * (flow-mutations-invalidation).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
    deleteSong,
    importBulkSongs,
    importSong,
    regenerateSongQr,
    updateSong,
} from "@/lib/api/admin-dashboard";
import { queryKeys } from "@/lib/queries/query-keys";

export function useCreateSong() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { spotifyUrl: string }) => importSong(payload.spotifyUrl),
        onSuccess: () => {
            // Any list/recent view of songs is now stale.
            queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
        },
    });
}

export function useBulkImportSongs() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (urls: string[]) => importBulkSongs(urls),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
        },
    });
}

export function useUpdateSong() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: string;
            payload: Partial<{
                name: string;
                artist: string;
                releaseYear: number;
                spotifyTrackId: string;
            }>;
        }) => updateSong(id, payload),
        onSuccess: (_data, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
            // The detail cache for this specific song is now wrong.
            queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(id) });
        },
    });
}

export function useDeleteSong() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteSong(id),
        onSuccess: () => {
            // The deleted song's mapping (if any) and any mapping view
            // that referenced it should also refresh.
            queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.mappings.all });
        },
    });
}

export function useRegenerateSongQr() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (songId: string) => regenerateSongQr(songId),
        onSuccess: (_data, songId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(songId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.qrCodes.all });
        },
    });
}
