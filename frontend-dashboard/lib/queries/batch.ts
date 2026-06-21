/**
 * TanStack Query hooks for the batch endpoints (dashboard summary,
 * qr-mapping page data). These are the single-round-trip replacements
 * for what used to be 3-4 parallel axios calls.
 *
 * See `lib/api/admin-dashboard.ts` for the response shape.
 */

import { queryOptions } from "@tanstack/react-query";

import { fetchDashboardData, fetchQrMappingPageData } from "@/lib/api/admin-dashboard";
import { queryKeys, type BatchDashboardParams, type BatchQrMappingParams } from "./query-keys";

export const batchQueries = {
    dashboard: (params: BatchDashboardParams = {}) =>
        queryOptions({
            queryKey: queryKeys.batch.dashboard(params),
            queryFn: () => fetchDashboardData(params),
            // Dashboard is the landing page — keep it fresh for 30s so
            // bouncing back from /songs doesn't refetch everything.
            staleTime: 30_000,
        }),

    qrMapping: (params: BatchQrMappingParams = {}) =>
        queryOptions({
            queryKey: queryKeys.batch.qrMapping(params),
            queryFn: () => fetchQrMappingPageData(params),
            staleTime: 30_000,
        }),
};
