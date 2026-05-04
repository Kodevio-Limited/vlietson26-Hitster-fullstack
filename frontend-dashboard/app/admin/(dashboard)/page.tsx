"use client";

import { fetchAvailableQrCardsCount, fetchMappings, fetchRecentSongs, fetchSongs } from "@/lib/api/admin-dashboard";
import { CircleHelp, Library, Loader2, Music2, QrCode } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

export default function Dashboard() {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSongs: 0,
        activeCards: 0,
        unmappedSongs: 0,
        collections: 0,
    });
    const [recentSongs, setRecentSongs] = useState<SongRowData[]>(fallbackRecentSongs);

    useEffect(() => {
        let isMounted = true;

        const loadDashboardData = async () => {
            setIsLoading(true);
            try {
                const [songsPage, cardsCount, mappings, recentSongsResponse] = await Promise.all([
                    fetchSongs({ page: 1, limit: 1 }),
                    fetchAvailableQrCardsCount(),
                    fetchMappings(),
                    fetchRecentSongs(4),
                ]);

                if (!isMounted) {
                    return;
                }

                const activeMappingSongIds = new Set(mappings.data.filter((mapping) => mapping.isActive).map((mapping) => mapping.songId));
                const unmappedSongs = Math.max(songsPage.total - activeMappingSongIds.size, 0);

                setStats({
                    totalSongs: songsPage.total,
                    activeCards: cardsCount,
                    unmappedSongs,
                    collections: mappings.total,
                });

                setRecentSongs(
                    recentSongsResponse.map((song) => ({
                        title: song.name,
                        artist: song.artist,
                        year: song.releaseYear !== undefined && song.releaseYear !== null ? String(song.releaseYear) : "-",
                    }))
                );
            } catch {
                if (!isMounted) {
                    return;
                }

                setStats({
                    totalSongs: 0,
                    activeCards: 0,
                    unmappedSongs: 0,
                    collections: 0,
                });
                setRecentSongs([]);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void loadDashboardData();

        return () => {
            isMounted = false;
        };
    }, []);

    const statCards: StatCardData[] = useMemo(
        () => [
            { title: "Total Songs", value: String(stats.totalSongs), icon: Music2 },
            { title: "Active Cards", value: String(stats.activeCards), icon: QrCode },
            { title: "Unmapped Songs", value: String(stats.unmappedSongs), icon: CircleHelp },
            { title: "Collections", value: String(stats.collections), icon: Library },
        ],
        [stats]
    );

    return (
        <section className="mx-auto w-full pb-10">
            {isLoading ? (
                <p className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading dashboard data...
                </p>
            ) : null}
            <div className="grid grid-cols-1 gap-4.25 md:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => (
                    <StatCard key={card.title} {...card} />
                ))}
            </div>

            <div className="mt-7.5 rounded-[20px] border border-[#dadada]">
                <header className="border-b border-[#dadada] px-4 py-3">
                    <h2 className="text-[32px] font-semibold leading-normal text-[#333333]">Recent Songs</h2>
                </header>

                <div className="space-y-5 p-4 md:p-8">
                    {isLoading && recentSongs.length === 0 ? (
                        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Fetching recent songs...
                        </p>
                    ) : null}
                    {recentSongs.map((song, index) => (
                        <SongRow key={`${song.title}-${index}`} {...song} />
                    ))}
                </div>
            </div>
        </section>
    );
}
