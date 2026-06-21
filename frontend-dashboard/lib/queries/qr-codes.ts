/**
 * TanStack Query hooks for QR-code reads.
 *
 * The list endpoint is small and used as a dropdown source from the
 * mapping dialog. The detail endpoint is what the mapping dialog
 * pre-fetches when the user picks a code.
 */

import { queryOptions } from "@tanstack/react-query";

import { fetchQrCodeById, fetchQrCodes } from "@/lib/api/admin-dashboard";
import { queryKeys } from "./query-keys";

export const qrCodeQueries = {
    list: () =>
        queryOptions({
            queryKey: queryKeys.qrCodes.list(),
            queryFn: () => fetchQrCodes(),
            // QR codes themselves are static; only their mappings change.
            staleTime: 5 * 60_000,
        }),

    detail: (id: string) =>
        queryOptions({
            queryKey: queryKeys.qrCodes.detail(id),
            queryFn: () => fetchQrCodeById(id),
            staleTime: 5 * 60_000,
            enabled: !!id,
        }),
};
