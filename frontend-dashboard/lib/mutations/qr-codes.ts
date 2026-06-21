/**
 * TanStack Query mutation hooks for QR-code writes.
 *
 * Creating a new QR code invalidates the QR list and the dashboard
 * batch (so the "Active Cards" stat refreshes).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createQrCode } from "@/lib/api/admin-dashboard";
import { queryKeys } from "@/lib/queries/query-keys";

export function useCreateQrCode() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { identifier: string; spotifyTrackId: string }) =>
            createQrCode(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.qrCodes.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.batch.dashboard.all });
        },
    });
}
