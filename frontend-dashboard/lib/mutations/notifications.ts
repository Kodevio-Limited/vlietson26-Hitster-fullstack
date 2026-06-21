/**
 * TanStack Query mutation hooks for notification writes.
 *
 * `markAllRead` invalidates the notifications list so the panel
 * re-fetches and the unread count drops to zero.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { markAllNotificationsRead } from "@/lib/api/admin-dashboard";
import { queryKeys } from "@/lib/queries/query-keys";

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => markAllNotificationsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });
}
