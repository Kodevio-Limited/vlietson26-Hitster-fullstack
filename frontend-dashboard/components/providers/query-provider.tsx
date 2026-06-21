"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

import { makeQueryClient } from "@/lib/queries/client";

/**
 * Wraps the app in a `QueryClientProvider`.
 *
 * The QueryClient is created lazily inside `useState` so that:
 *   1. A new client is only created once per mount of this provider
 *      (not on every render), and
 *   2. On the server, every request gets its own client (Next.js will
 *      re-instantiate the provider per request during SSR).
 *
 * The devtools are loaded only in development to keep the production
 * bundle clean.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => makeQueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === "development" ? (
                <ReactQueryDevtools initialIsOpen={false} />
            ) : null}
        </QueryClientProvider>
    );
}
