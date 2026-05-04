import { apiClient } from "@/lib/api/client";

export type SongDto = {
    id: string;
    name: string;
    artist: string;
    releaseYear: number;
    spotifyTrackId: string;
    createdAt: string;
};

export type MappingDto = {
    id: string;
    songId: string;
    qrCodeId: string;
    isActive: boolean;
    song?: {
        id: string;
        name: string;
        artist: string;
    };
    qrCode?: {
        id: string;
        identifier: string;
        imageUrl?: string;
        redirectUrl?: string;
    };
};

type SongsResponse = {
    success: boolean;
    items: SongDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

type QrCardsResponse = {
    success: boolean;
    data: Array<{ id: string; cardId: string }>;
};

type QrCodesResponse = {
    success: boolean;
    data: Array<{ id: string; identifier: string; imageUrl?: string; redirectUrl?: string }>;
};

type QrInfoResponse = {
    success: boolean;
    data: {
        identifier: string;
        song: SongDto | null;
    };
};

type RecentSongsResponse = {
    success: boolean;
    data: SongDto[];
};

export type NotificationDto = {
    id: string;
    userId?: string;
    type: string;
    category: string;
    severity: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
};

type NotificationsResponse = {
    success: boolean;
    unreadCount: number;
    data: NotificationDto[];
};

export async function fetchSongs(params?: { q?: string; page?: number; limit?: number }): Promise<SongsResponse> {
    const response = await apiClient.get<SongsResponse>("/songs", {
        params: {
            q: params?.q,
            page: params?.page ?? 1,
            limit: params?.limit ?? 10,
        },
    });

    return response.data;
}

export async function fetchRecentSongs(limit = 4): Promise<SongDto[]> {
    const response = await apiClient.get<RecentSongsResponse>("/songs/recent", {
        params: { limit },
    });

    return response.data.data;
}

type MappingsResponse = {
    success: boolean;
    total: number;
    data: MappingDto[];
};

export async function fetchMappings(params?: { page?: number; limit?: number }): Promise<MappingsResponse> {
    const response = await apiClient.get<MappingsResponse>("/mappings", {
        params: {
            page: params?.page ?? 1,
            limit: params?.limit ?? 10,
        },
    });
    return response.data;
}

export async function fetchAvailableQrCardsCount(): Promise<number> {
    const response = await apiClient.get<QrCardsResponse>("/qr-cards/available");
    return response.data.data.length;
}

export async function fetchQrCodes(): Promise<Array<{ id: string; identifier: string; imageUrl?: string; redirectUrl?: string }>> {
    const response = await apiClient.get<QrCodesResponse>("/qr-codes");
    return response.data.data;
}

export async function fetchQrCodeById(id: string): Promise<QrCodeInfoDto> {
    const response = await apiClient.get<{ success: boolean; data: QrCodeInfoDto }>(`/qr-codes/${id}`);
    return response.data.data;
}

export type QrCodeInfoDto = {
    id: string;
    identifier: string;
    imageUrl?: string;
    redirectUrl?: string;
    isActive: boolean;
};

export async function createSong(payload: {
    name: string;
    artist: string;
    releaseYear: number;
    spotifyTrackId: string;
}): Promise<void> {
    await apiClient.post("/songs", payload);
}

export async function updateSong(
    id: string,
    payload: Partial<{ name: string; artist: string; releaseYear: number; spotifyTrackId: string }>
): Promise<void> {
    await apiClient.patch(`/songs/${id}`, payload);
}

export async function deleteSong(id: string): Promise<void> {
    await apiClient.delete(`/songs/${id}`);
}

export async function createMapping(payload: {
    songId: string;
    qrCodeId: string;
}): Promise<void> {
    await apiClient.post("/mappings", payload);
}

export async function updateMapping(payload: { id: string; songId: string; qrCodeId: string }): Promise<void> {
    await apiClient.patch(`/mappings/${payload.id}`, {
        songId: payload.songId,
        qrCodeId: payload.qrCodeId,
    });
}

export async function deleteMapping(id: string): Promise<void> {
    await apiClient.delete(`/mappings/${id}`);
}

export type GeneratedQrCode = {
    id: string;
    identifier: string;
    imageUrl: string;
    redirectUrl: string;
    code: string;
};

export async function createQrCode(payload: { identifier: string; spotifyTrackId: string }): Promise<GeneratedQrCode> {
    const response = await apiClient.post<{ success: boolean; data: GeneratedQrCode }>("/qr-codes", payload);
    return response.data.data;
}

export async function fetchQrInfoByIdentifier(identifier: string): Promise<QrInfoResponse["data"]> {
    const response = await apiClient.get<QrInfoResponse>(`/qr/info/${identifier}`);
    return response.data.data;
}

// Batch API endpoints for fetching multiple resources at once
type BatchDashboardResponse = {
    success: boolean;
    data: {
        songs: SongsResponse;
        mappings: MappingsResponse;
        qrCodes: QrCodesResponse;
    };
};

type BatchQrMappingResponse = {
    success: boolean;
    data: {
        mappings: MappingsResponse;
        songs: SongsResponse;
        qrCodes: QrCodesResponse;
    };
};

export async function fetchDashboardData(params?: {
    songPage?: number;
    songLimit?: number;
    mappingPage?: number;
    mappingLimit?: number;
}): Promise<BatchDashboardResponse> {
    const response = await apiClient.get<BatchDashboardResponse>("/batch/dashboard", {
        params: {
            songPage: params?.songPage ?? 1,
            songLimit: params?.songLimit ?? 10,
            mappingPage: params?.mappingPage ?? 1,
            mappingLimit: params?.mappingLimit ?? 10,
        },
    });
    return response.data;
}

export async function fetchQrMappingPageData(params?: {
    mappingPage?: number;
    mappingLimit?: number;
    songLimit?: number;
}): Promise<BatchQrMappingResponse> {
    const response = await apiClient.get<BatchQrMappingResponse>("/batch/qr-mapping", {
        params: {
            mappingPage: params?.mappingPage ?? 1,
            mappingLimit: params?.mappingLimit ?? 8,
            songLimit: params?.songLimit ?? 100,
        },
    });
    return response.data;
}

export async function fetchNotifications(limit = 20): Promise<NotificationsResponse> {
    const response = await apiClient.get<NotificationsResponse>("/notifications", {
        params: { limit },
    });
    return response.data;
}

export async function markAllNotificationsRead(): Promise<void> {
    await apiClient.post("/notifications/read-all");
}
