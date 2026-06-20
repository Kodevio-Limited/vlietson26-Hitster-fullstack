"use client";

import { AddSongDialogContent } from "@/components/dashboard/add-song-dialog-content";
import { DeleteSongDialogContent } from "@/components/dashboard/delete-song-dialog-content";
import { EditSongDialogContent } from "@/components/dashboard/edit-song-dialog-content";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { importSong, deleteSong, fetchSongs, updateSong, regenerateSongQr, getSongQrCode, importBulkSongs, exportSongsCsv } from "@/lib/api/admin-dashboard";
import { ChevronDown, Download, Loader2, Plus, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonTable() {
  return (
    <div className="flex w-full flex-col gap-4 py-4">
      <Skeleton className="h-10 w-full rounded-md" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="flex items-center gap-4" key={index}>
          <Skeleton className="h-12 flex-1 rounded-md" />
        </div>
      ))}
    </div>
  );
}

type UiSong = {
    id: string;
    songName: string;
    ArtistName: string;
    releaseYear: string;
    spotifyId: string;
};


export default function SongsPage() {
    const [songs, setSongs] = useState<UiSong[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [query, setQuery] = useState("");
    const [editingSong, setEditingSong] = useState<UiSong | null>(null);
    const [deletingSong, setDeletingSong] = useState<UiSong | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);

    const limit = 10;

    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const toastId = toast.loading("Parsing CSV and importing songs...");

        try {
            const text = await file.text();
            const urlRegex = /https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/g;
            const matches = text.match(urlRegex) || [];
            
            const uniqueUrls = Array.from(new Set(matches));

            if (uniqueUrls.length === 0) {
                toast.error("No valid Spotify URLs found in the CSV.", { id: toastId });
                return;
            }

            toast.loading(`Found ${uniqueUrls.length} valid Spotify URLs. Importing...`, { id: toastId });

            const result = await importBulkSongs(uniqueUrls);
            toast.success(`Bulk import completed. Successful: ${result.successful}, Failed: ${result.failed}`, { id: toastId });
            
            setPage(1);
            await loadSongs(1, query, sorting);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to bulk import songs";
            toast.error(message, { id: toastId });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleExportCsv = async () => {
        try {
            const toastId = toast.loading("Generating CSV export...");
            await exportSongsCsv();
            toast.success("CSV Export successful!", { id: toastId });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to export CSV";
            toast.error(message);
        }
    };

    const loadSongs = async (activePage: number, activeQuery: string, activeSorting: SortingState) => {
        setIsLoading(true);
        const sortBy = activeSorting.length > 0 ? activeSorting[0].id : undefined;
        const sortOrder = activeSorting.length > 0 ? (activeSorting[0].desc ? 'DESC' : 'ASC') : undefined;

        let mappedSortBy = sortBy;
        if (sortBy === 'songName') mappedSortBy = 'name';
        if (sortBy === 'ArtistName') mappedSortBy = 'artist';
        if (sortBy === 'spotifyId') mappedSortBy = 'spotifyTrackId';

        const response = await fetchSongs({ 
            q: activeQuery || undefined, 
            page: activePage, 
            limit,
            sortBy: mappedSortBy,
            sortOrder,
        });

        setSongs(
            response.items.map((song) => ({
                id: song.id,
                songName: song.name,
                ArtistName: song.artist,
                releaseYear: String(song.releaseYear),
                spotifyId: song.spotifyTrackId,
            })),
        );
        setTotalPages(response.totalPages || 1);
        setIsLoading(false);
    };

    useEffect(() => {
        let isMounted = true;

        const run = async () => {
            try {
                await loadSongs(page, query, sorting);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                const message = error instanceof Error ? error.message : "Failed to load songs";
                toast.error(message);
                setSongs([]);
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
    }, [page, query, sorting]);



    const handleAddSong = async (payload: { spotifyUrl: string }) => {
        try {
            await importSong(payload.spotifyUrl);
            setIsAddDialogOpen(false);
            setPage(1);
            await loadSongs(1, query, sorting);
            toast.success("Song successfully added!");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to add song";
            toast.error(message);
        }
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
            await loadSongs(page, query, sorting);
            setEditingSong(null);
            toast.success("Song successfully updated!");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update song";
            toast.error(message);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingSong) {
            return;
        }

        try {
            await deleteSong(deletingSong.id);
            await loadSongs(page, query, sorting);
            setDeletingSong(null);
            toast.success("Song successfully deleted!");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to delete song";
            toast.error(message);
        }
    };

    const handleRegenerateQr = async (song: UiSong) => {
        try {
            const loadingToast = toast.loading(`Regenerating QR for ${song.songName}...`);
            await regenerateSongQr(song.id);
            toast.dismiss(loadingToast);
            toast.success("QR Code successfully regenerated!");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to regenerate QR code";
            toast.error(message);
        }
    };

    const handleDownloadQr = async (song: UiSong) => {
        try {
            const loadingToast = toast.loading(`Preparing QR for ${song.songName}...`);
            const qrCode = await getSongQrCode(song.id);
            toast.dismiss(loadingToast);

            if (!qrCode || !qrCode.imageUrl) {
                 toast.error("No QR Code image found for this song.");
                 return;
            }

            const link = document.createElement('a');
            link.href = qrCode.imageUrl;
            link.download = `QR_${song.songName.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to download QR code";
            toast.error(message);
        }
    };

    const columns: ColumnDef<UiSong>[] = useMemo(
        () => [
            {
                accessorKey: "songName",
                header: "Song Name",
            },
            {
                accessorKey: "ArtistName",
                header: "Artist Name",
            },
            {
                accessorKey: "releaseYear",
                header: "Release Year",
            },
            {
                accessorKey: "spotifyId",
                header: "Spotify ID",
            },
            {
                id: "actions",
                enableSorting: false,
                header: "Action",
                cell: ({ row }) => {
                    const song = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" className="h-9 px-2 text-[16px]">
                                    Action
                                    <ChevronDown className="size-4" data-icon="inline-end" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="start" className="w-40">
                                <DropdownMenuItem onClick={() => void handleEditSong(song)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem>Disable</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void handleDownloadQr(song)}>Download QR</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void handleRegenerateQr(song)}>Regenerate QR</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => void handleDeleteSong(song)}>
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        []
    );

    return (
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => setIsAddDialogOpen(open)}>
            <section className="w-full space-y-6">
                <div className="dashboard-page-header">
                    <h1 className="dashboard-page-title">Songs</h1>
                    <p className="dashboard-page-subtitle">Manage your game contents and system configuration.</p>
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

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input 
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={(e) => void handleFileUpload(e)} 
                            disabled={isImporting}
                        />
                        <Button 
                            variant="outline" 
                            className="h-11.5 rounded-[5px] px-3 text-[16px] font-medium" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                        >
                            {isImporting ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
                            Bulk Upload
                        </Button>
                        <Button 
                            variant="outline" 
                            className="h-11.5 rounded-[5px] px-3 text-[16px] font-medium" 
                            onClick={() => void handleExportCsv()}
                        >
                            <Download data-icon="inline-start" />
                            Export CSV
                        </Button>
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
                </div>

                <div className="space-y-3 md:hidden">
                    {isLoading && songs.length === 0 ? (
                        <SkeletonTable />
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
                                        <DropdownMenuItem onClick={() => void handleDownloadQr(song)}>Download QR</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => void handleRegenerateQr(song)}>Regenerate QR</DropdownMenuItem>
                                        <DropdownMenuItem variant="destructive" onClick={() => void handleDeleteSong(song)}>
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="hidden md:block">
                    {isLoading && songs.length === 0 ? (
                        <SkeletonTable />
                    ) : (
                        <DataTable 
                            columns={columns} 
                            data={songs} 
                            pageCount={totalPages} 
                            pagination={{ pageIndex: page - 1, pageSize: limit }}
                            onPaginationChange={(newPagination) => {
                                setPage(newPagination.pageIndex + 1);
                            }}
                            sorting={sorting}
                            onSortingChange={(newSorting) => {
                                setSorting(newSorting);
                                setPage(1);
                            }}
                        />
                    )}
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
