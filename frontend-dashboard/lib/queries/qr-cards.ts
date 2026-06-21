/**
 * TanStack Query hooks for physical QR card reads.
 *
 * The dashboard uses `available` count as a stat. The qr-mapping page
 * uses the same data to drive the card-inventory list.
 */

import { queryOptions } from "@tanstack/react-query";

import { fetchAvailableQrCardsCount } from "@/lib/api/admin-dashboard";
import { queryKeys } from "./query-keys";

export const qrCardQueries = {
    available: () =>
        queryOptions({
            queryKey: queryKeys.qrCards.available(),
            queryFn: () => fetchAvailableQrCardsCount(),
            // The card count is the cheapest endpoint we have but the
            // least likely to change in the time the admin is on the
            // dashboard. Keep it fresh for 2 minutes.
            staleTime: 2 * 60_000,
        }),
};
