/**
 * Centralized query keys for the admin dashboard.
 *
 * Keys are hierarchical so `invalidateQueries({ queryKey: queryKeys.songs.all })`
 * wipes every song query (list, detail, recent) in one call. The pattern
 * mirrors the recommendation in the tanstack-integration-best-practices
 * skill file (cache-invalidation-patterns).
 *
 * All factories return `as const` arrays so the TypeScript inference
 * carries the full key type through `queryOptions` and `useQuery`.
 */

import type {
    BatchDashboardParams,
    BatchQrMappingParams,
} from "@/lib/api/admin-dashboard";

export type { BatchDashboardParams, BatchQrMappingParams };

export type SongListParams = {
    q?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
};

export type MappingListParams = {
    page?: number;
    limit?: number;
};

export const queryKeys = {
    songs: {
        all: ["songs"] as const,
        list: (params: SongListParams) => ["songs", "list", params] as const,
        detail: (id: string) => ["songs", "detail", id] as const,
        recent: (limit: number) => ["songs", "recent", limit] as const,
    },
    mappings: {
        all: ["mappings"] as const,
        list: (params: MappingListParams) => ["mappings", "list", params] as const,
    },
    qrCodes: {
        all: ["qrCodes"] as const,
        list: () => ["qrCodes", "list"] as const,
        detail: (id: string) => ["qrCodes", "detail", id] as const,
    },
    qrCards: {
        all: ["qrCards"] as const,
        available: () => ["qrCards", "available"] as const,
    },
    batch: {
        dashboard: (params: BatchDashboardParams) =>
            ["batch", "dashboard", params] as const,
        qrMapping: (params: BatchQrMappingParams) =>
            ["batch", "qrMapping", params] as const,
    },
    notifications: {
        all: ["notifications"] as const,
        list: (limit: number) => ["notifications", "list", limit] as const,
    },
} as const;
