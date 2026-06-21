/**
 * TanStack Query hooks for the notifications feed.
 *
 * The notification panel wants a periodic refresh so newly-emitted
 * notifications appear without a manual reload. We use `refetchInterval`
 * here rather than the global default.
 */

import { queryOptions } from "@tanstack/react-query";

import { fetchNotifications } from "@/lib/api/admin-dashboard";
import { queryKeys } from "./query-keys";

export const notificationQueries = {
    list: (limit = 12) =>
        queryOptions({
            queryKey: queryKeys.notifications.list(limit),
            queryFn: () => fetchNotifications(limit),
            // 30s baseline + `refetchInterval` together means: refetch
            // every 60s while the panel is open, but don't refetch on
            // focus changes (the global default handles that).
            staleTime: 30_000,
            refetchInterval: 60_000,
            refetchIntervalInBackground: false,
        }),
};
