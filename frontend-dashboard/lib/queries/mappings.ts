/**
 * TanStack Query hooks for mapping reads.
 *
 * Mirrors the pattern in `lib/queries/songs.ts` — `queryOptions` factories
 * keyed on a hierarchical key so mutations can invalidate everything
 * under `queryKeys.mappings.all` in one call.
 */

import { queryOptions } from "@tanstack/react-query";

import { fetchMappings } from "@/lib/api/admin-dashboard";
import { queryKeys, type MappingListParams } from "./query-keys";

export const mappingQueries = {
    list: (params: MappingListParams = {}) =>
        queryOptions({
            queryKey: queryKeys.mappings.list(params),
            queryFn: () => fetchMappings(params),
            staleTime: 30_000,
        }),
};
