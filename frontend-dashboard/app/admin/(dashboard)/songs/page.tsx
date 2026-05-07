"use client";

import { AddSongDialogContent } from "@/components/dashboard/add-song-dialog-content";
import { DeleteSongDialogContent } from "@/components/dashboard/delete-song-dialog-content";
import { EditSongDialogContent } from "@/components/dashboard/edit-song-dialog-content";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createSong, deleteSong, fetchSongs, updateSong } from "@/lib/api/admin-dashboard";
import { ChevronDown, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type UiSong = {
    id: string;
    songName: string;
    ArtistName: string;
    releaseYear: string;
    spotifyId: string;
};

const fallbackSongs: UiSong[] = [];

export default function SongsPage() {
    const [songs, setSongs] = useState<UiSong[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [query, setQuery] = useState("");
    const [errorText, setErrorText] = useState("");
    const [editingSong, setEditingSong] = useState<UiSong | null>(null);
    const [deletingSong, setDeletingSong] = useState<UiSong | null>(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const limit = 10;

    const loadSongs = async (activePage: number, activeQuery: string) => {
        setIsLoading(true);
        const response = await fetchSongs({ q: activeQuery || undefined, page: activePage, limit });

        setSongs(
            response.items.map((song) => ({
                id: song.id,
                songName: song.name,
                ArtistName: song.artist,
                releaseYear: String(song.releaseYear),
                spotifyId: song.spotifyTrackId,
            })),
        );
        setTotal(response.total);
        setTotalPages(response.totalPages || 1);
        setIsLoading(false);
    };

    useEffect(() => {
        let isMounted = true;

        const run = async () => {
            try {
                await loadSongs(page, query);
                if (isMounted) {
                    setErrorText("");
                }
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                const message = error instanceof Error ? error.message : "Failed to load songs";
                setErrorText(message);
                setSongs([]);
                setTotal(0);
                setTotalPages(1);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void run();

        return () => {
            isMounted = false;
        };
    }, [page, query]);

    const pageButtons = useMemo(() => {
        if (totalPages <= 3) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        const start = Math.min(Math.max(page - 1, 1), totalPages - 2);
        return [start, start + 1, start + 2];
    }, [page, totalPages]);

    const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);

    const handleAddSong = async (payload: { name: string; artist: string; releaseYear: number; spotifyTrackId: string }) => {
        await createSong(payload);
        setIsAddDialogOpen(false);
        setPage(1);
        await loadSongs(1, query);
        setSuccessMessage("Song successfully added!");
        setTimeout(() => setSuccessMessage(""), 5000);
    };

    const handleEditSong = async (song: UiSong) => {
        setDeletingSong(null);
        setEditingSong(song);
    };

    const handleDeleteSong = async (song: UiSong) => {
        setEditingSong(null);
        setDeletingSong(song);
    };

    const handleConfirmEdit = async (payload: {
        id: string;
        name: string;
        artist: string;
        releaseYear: number;
        spotifyTrackId: string;
    }) => {
        try {
            await updateSong(payload.id, {
                name: payload.name,
                artist: payload.artist,
                releaseYear: payload.releaseYear,
                spotifyTrackId: payload.spotifyTrackId,
            });
            await loadSongs(page, query);
            setEditingSong(null);
            setErrorText("");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update song";
            setErrorText(message);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingSong) {
            return;
        }

        try {
            await deleteSong(deletingSong.id);
            await loadSongs(page, query);
            setDeletingSong(null);
            setSuccessMessage("Song successfully deleted!");
            setTimeout(() => setSuccessMessage(""), 5000);
            setErrorText("");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to delete song";
            setErrorText(message);
        }
    };

    return (
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => setIsAddDialogOpen(open)}>
            <section className="w-full space-y-6">
                <div className="dashboard-page-header">
                    <h1 className="dashboard-page-title">Songs</h1>
                    <p className="dashboard-page-subtitle">Manage your game contents and system configuration.</p>
                    {isLoading ? (
                        <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Loading songs...
                        </p>
                    ) : null}
                    {errorText ? <p className="mt-2 text-sm text-red-600">{errorText}</p> : null}
                    {successMessage ? <p className="mt-2 text-sm font-medium text-green-600">{successMessage}</p> : null}
                </div>

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:w-116">
                        <Input
                            type="search"
                            placeholder="Search"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                setPage(1);
                            }}
                        />
                        <Search className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    </div>

                    <DialogTrigger asChild>
                        <Button
                            className="h-11.5 rounded-[5px] bg-black px-3 text-[16px] font-medium text-white hover:bg-black/95"
                            onClick={() => setIsAddDialogOpen(true)}
                        >
                            <Plus className="size-6" />
                            Add New Song
                        </Button>
                    </DialogTrigger>
                </div>

                <div className="space-y-3 md:hidden">
                    {isLoading && songs.length === 0 ? (
                        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin" />
                                Fetching latest songs...
                            </span>
                        </div>
                    ) : null}
                    {songs.map((song) => (
                        <article key={`mobile-${song.id}`} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Song #{song.spotifyId}</p>
                                <h3 className="text-base font-semibold text-foreground">{song.songName}</h3>
                                <p className="break-all text-sm text-muted-foreground">{song.ArtistName}</p>
                            </div>
                            <div className="mt-3">
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
                                        Action
                                        <ChevronDown className="size-4" />
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent align="start" className="w-40">
                                        <DropdownMenuItem onClick={() => void handleEditSong(song)}>Edit</DropdownMenuItem>
                                        <DropdownMenuItem>Disable</DropdownMenuItem>
                                        <DropdownMenuItem variant="destructive" onClick={() => void handleDeleteSong(song)}>
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="hidden w-full overflow-x-auto md:block">
                    <div className="min-w-180">
                        <table className="w-full table-fixed border-collapse">
                            <thead>
                                <tr className="h-11.5 bg-primary">
                                    <th className="w-30 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground">
                                        Song Name
                                    </th>
                                    <th className="w-30 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground">
                                        Artist Name
                                    </th>
                                    <th className="w-15 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground">
                                        Release Year
                                    </th>
                                    <th className="w-30 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground">
                                        Spotify ID
                                    </th>
                                    <th className="w-10 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {isLoading && songs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="border border-border px-3 py-5 text-sm text-muted-foreground">
                                            <span className="inline-flex items-center gap-2">
                                                <Loader2 className="size-4 animate-spin" />
                                                Fetching latest songs...
                                            </span>
                                        </td>
                                    </tr>
                                ) : null}
                                {songs.map((song) => (
                                    <tr key={song.id} className="h-13">
                                        <td className="border border-border px-2 text-sm leading-6 font-normal text-muted-foreground lg:text-[16px]">
                                            {song.songName}
                                        </td>
                                        <td className="border border-border px-2 text-sm leading-6 font-normal text-muted-foreground lg:text-[16px]">
                                            {song.ArtistName}
                                        </td>
                                        <td className="border border-border px-2 text-sm leading-[1.2] font-normal text-muted-foreground lg:text-[16px]">
                                            {song.releaseYear}
                                        </td>
                                        <td className="border border-border px-2 text-sm leading-6 font-normal text-muted-foreground lg:text-[16px]">
                                            {song.spotifyId}
                                        </td>
                                        <td className="border border-border px-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="inline-flex h-9 items-center justify-center gap-1 rounded-[5px] bg-primary px-2 text-sm leading-[1.2] font-normal text-primary-foreground lg:text-[16px]">
                                                    Action
                                                    <ChevronDown className="size-4" />
                                                </DropdownMenuTrigger>

                                                <DropdownMenuContent align="start" className="w-40">
                                                    <DropdownMenuItem onClick={() => void handleEditSong(song)}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem>Disable</DropdownMenuItem>
                                                    <DropdownMenuItem variant="destructive" onClick={() => void handleDeleteSong(song)}>
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col gap-4 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p className="px-2 text-sm leading-6 font-medium">
                        Showing {startItem}-{endItem} out of {total}
                    </p>

                    <div className="flex items-center gap-2.5 px-2 py-1 text-sm leading-6 font-medium lg:text-[16px]">
                        <button
                            type="button"
                            className="cursor-pointer px-1 py-0.5"
                            onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </button>
                        {pageButtons.map((pageNumber) => (
                            <button
                                key={pageNumber}
                                type="button"
                                className={
                                    pageNumber === page ? "h-6 w-6 bg-primary px-1 py-0.5 text-primary-foreground" : "h-6 w-6 px-1 py-0.5"
                                }
                                onClick={() => setPage(pageNumber)}
                            >
                                {pageNumber}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="cursor-pointer px-1 py-0.5"
                            onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
                            disabled={page >= totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>

                <AddSongDialogContent onSongAdded={handleAddSong} />

                <Dialog
                    open={Boolean(editingSong)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditingSong(null);
                        }
                    }}
                >
                    {editingSong ? <EditSongDialogContent song={editingSong} onSave={handleConfirmEdit} /> : null}
                </Dialog>

                <Dialog
                    open={Boolean(deletingSong)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeletingSong(null);
                        }
                    }}
                >
                    {deletingSong ? <DeleteSongDialogContent songName={deletingSong.songName} onConfirm={handleConfirmDelete} /> : null}
                </Dialog>
            </section>
        </Dialog>
    );
}
