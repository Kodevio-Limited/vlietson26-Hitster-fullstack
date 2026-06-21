/**
 * TanStack Query mutation hooks for mapping writes.
 *
 * Mapping mutations affect:
 *   - The mappings list (and any view that derives from it, like the
 *     dashboard's "active cards" / "unmapped songs" counts).
 *   - The song view (a song that just got mapped should refresh so
 *     `isActive` is correct).
 *   - The QR code list (a QR that just got mapped should refresh).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
    createMapping,
    deleteMapping,
    updateMapping,
} from "@/lib/api/admin-dashboard";
import { queryKeys } from "@/lib/queries/query-keys";

export function useCreateMapping() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { songId: string; qrCodeId: string }) =>
            createMapping(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.mappings.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.qrCodes.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.batch.dashboard({}) });
        },
    });
}

export function useUpdateMapping() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { id: string; songId: string; qrCodeId: string }) =>
            updateMapping(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.mappings.all });
        },
    });
}

export function useDeleteMapping() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteMapping(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.mappings.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.batch.dashboard({}) });
        },
    });
}
