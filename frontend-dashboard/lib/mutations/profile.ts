/**
 * TanStack Query mutation hooks for the profile + security panels.
 *
 * These were raw `apiClient.post` calls in `settings/page.tsx`. They
 * are still raw axios calls under the hood (no public endpoint to wrap
 * in `queryOptions`), but routing them through `useMutation` gives the
 * UI free loading state, error surfacing, and success callbacks.
 *
 * `useUpdateProfile` does NOT invalidate any query keys — the user
 * object lives in localStorage and is broadcast via a custom
 * `user-updated` window event. The mutation just needs to call the
 * endpoint, update localStorage, and fire the event.
 */

import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

export type UpdateProfilePayload = {
    name: string;
    email: string;
    imageUrl?: string;
};

export type UpdateProfileResponse = {
    displayName?: string;
    email?: string;
    imageUrl?: string;
};

export function useUpdateProfile() {
    return useMutation<UpdateProfileResponse, Error, UpdateProfilePayload>({
        mutationFn: async (payload) => {
            // The endpoint returns the updated user object directly
            // (not wrapped in `{ success, data }`).
            const { data } = await apiClient.post<UpdateProfileResponse>(
                "/auth/update-profile",
                payload,
            );
            return data;
        },
    });
}

export function useChangePassword() {
    return useMutation<
        void,
        Error,
        { currentPassword: string; newPassword: string }
    >({
        mutationFn: async ({ currentPassword, newPassword }) => {
            await apiClient.post("/auth/change-password", {
                currentPassword,
                newPassword,
            });
        },
    });
}
