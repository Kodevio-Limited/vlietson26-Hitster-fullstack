"use client";

import { batchQueries } from "@/lib/queries/batch";
import { qrCardQueries } from "@/lib/queries/qr-cards";
import { CircleHelp, Library, Music2, QrCode } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

type StatCardData = {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
};

type SongRowData = {
    title: string;
    artist: string;
    year: string;
};

const fallbackRecentSongs: SongRowData[] = [];

function StatCard({ title, value, icon: Icon }: StatCardData) {
    return (
        <article className="h-41 rounded-[10px] border border-[#dadada] bg-white px-8 py-5.75">
            <div className="flex size-12.5 items-center justify-center rounded-full bg-[#f5f5f5]">
                <Icon className="size-5 text-[#333333]" />
            </div>

            <p className="mt-3.5 text-[16px] leading-6 text-[#666666]">{title}</p>
            <p className="text-[24px] font-semibold leading-normal text-[#333333]">{value}</p>
        </article>
    );
}

function SongRow({ title, artist, year }: SongRowData) {
    const safeYear = year && year !== "undefined" ? year : "-";

    return (
        <article className="flex h-27.5 items-center justify-between rounded-[10px] bg-white px-5 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-3">
                <div className="flex size-15 items-center justify-center rounded-[10px] bg-[#f5f5f5]">
                    <Music2 className="size-5 text-[#333333]" />
                </div>

                <div className="leading-none">
                    <p className="text-[20px] font-medium leading-8 text-[#333333]">{title}</p>
                    <p className="mt-1 text-[16px] leading-6 text-[#666666]">{artist}</p>
                </div>
            </div>

            <p className="text-[20px] font-medium leading-normal text-[#333333]">{safeYear}</p>
        </article>
    );
}

export function SkeletonStatCard() {
    return (
        <article className="h-41 rounded-[10px] border border-[#dadada] bg-white px-8 py-5.75">
            <Skeleton className="size-12.5 rounded-full" />
            <Skeleton className="mt-3.5 h-4 w-24" />
            <Skeleton className="mt-2 h-6 w-16" />
        </article>
    );
}

export function SkeletonSongRow() {
    return (
        <article className="flex h-27.5 items-center justify-between rounded-[10px] bg-white px-5 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-3">
                <Skeleton className="size-15 rounded-[10px]" />
                <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>
            <Skeleton className="h-6 w-12" />
        </article>
    );
}

export default function Dashboard() {
    // Both queries run in parallel; `useQuery` dedupes if they're hit
    // from multiple components. The previous version used a manual
    // useEffect + isMounted flag — Query handles that for us.
    const dashboardQuery = useQuery(batchQueries.dashboard({ songLimit: 1 }));
    const availableCardsQuery = useQuery(qrCardQueries.available());

    const isLoading = dashboardQuery.isPending || availableCardsQuery.isPending;

    // Derive the stat cards and the recent-songs list from the batch
    // payload. If the batch is still loading we get `null` and render
    // the skeletons instead.
    const { stats, recentSongs } = useMemo(() => {
        const batch = dashboardQuery.data?.data;
        if (!batch) {
            return { stats: null, recentSongs: fallbackRecentSongs };
        }

        const totalSongs = batch.songs.total;
        const activeMappingSongIds = new Set(
            batch.mappings.data.filter((m) => m.isActive).map((m) => m.songId),
        );
        const unmappedSongs = Math.max(totalSongs - activeMappingSongIds.size, 0);

        const stats = {
            totalSongs,
            activeCards: availableCardsQuery.data ?? 0,
            unmappedSongs,
            collections: batch.mappings.total,
        };

        const recentSongs: SongRowData[] = batch.songs.items.map((song) => ({
            title: song.name,
            artist: song.artist,
            year:
                song.releaseYear !== undefined && song.releaseYear !== null
                    ? String(song.releaseYear)
                    : "-",
        }));

        return { stats, recentSongs };
    }, [dashboardQuery.data, availableCardsQuery.data]);

    const statCards: StatCardData[] = useMemo(
        () => [
            { title: "Total Songs", value: String(stats?.totalSongs ?? 0), icon: Music2 },
            { title: "Active Cards", value: String(stats?.activeCards ?? 0), icon: QrCode },
            { title: "Unmapped Songs", value: String(stats?.unmappedSongs ?? 0), icon: CircleHelp },
            { title: "Collections", value: String(stats?.collections ?? 0), icon: Library },
        ],
        [stats]
    );

    return (
        <section className="mx-auto w-full pb-10">
            <div className="grid grid-cols-1 gap-4.25 md:grid-cols-2 xl:grid-cols-4">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                        <SkeletonStatCard key={index} />
                    ))
                ) : (
                    statCards.map((card) => (
                        <StatCard key={card.title} {...card} />
                    ))
                )}
            </div>

            <div className="mt-7.5 rounded-[20px] border border-[#dadada]">
                <header className="border-b border-[#dadada] px-4 py-3">
                    <h2 className="text-[32px] font-semibold leading-normal text-[#333333]">Recent Songs</h2>
                </header>

                <div className="space-y-5 p-4 md:p-8">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                            <SkeletonSongRow key={index} />
                        ))
                    ) : recentSongs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No songs yet.</p>
                    ) : (
                        recentSongs.map((song, index) => (
                            <SongRow key={`${song.title}-${index}`} {...song} />
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
