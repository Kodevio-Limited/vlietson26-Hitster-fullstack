"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    useBulkImportSongs,
    useCreateSong,
    useDeleteSong,
    useRegenerateSongQr,
    useUpdateSong,
} from "@/lib/mutations/songs";
import { songQueries } from "@/lib/queries/songs";
import { exportSongsCsv } from "@/lib/api/admin-dashboard";
import { ChevronDown, Download, Loader2, Plus, Search, Upload } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

import dynamic from "next/dynamic";
import { DataTable } from "@/components/ui/data-table";

const AddSongDialogContent = dynamic(() => import("@/components/dashboard/add-song-dialog-content").then((m) => m.AddSongDialogContent));
const DeleteSongDialogContent = dynamic(() => import("@/components/dashboard/delete-song-dialog-content").then((m) => m.DeleteSongDialogContent));
const EditSongDialogContent = dynamic(() => import("@/components/dashboard/edit-song-dialog-content").then((m) => m.EditSongDialogContent));

type UiSong = {
    id: string;
    songName: string;
    ArtistName: string;
    releaseYear: string;
    spotifyId: string;
};

// Map the table column IDs to the API's sortBy field names. Keeping
// the mapping colocated with the page so it's easy to update when
// columns are added.
const SORT_BY_MAP: Record<string, string> = {
    songName: "name",
    ArtistName: "artist",
    spotifyId: "spotifyTrackId",
};

// `useSearchParams` requires a Suspense boundary when used inside a
// client component that's prerendered (Next.js 16 default). We split
// the page into a thin default export and the actual content; the
// content is rendered inside `<Suspense>` at the bottom of the file.
export default function SongsPage() {
    return (
        <Suspense fallback={<SkeletonTable />}>
            <SongsPageContent />
        </Suspense>
    );
}

function SongsPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    // Read all paginated/filter state from the URL so deep links work
    // (fixes the "?page=3 loads page 1" bug noted in the deferred-work
    // section of CLAUDE.md).
    const page = Number(searchParams.get("page") ?? "1") || 1;
    const q = searchParams.get("q") ?? "";
    const sortId = searchParams.get("sort") ?? undefined;
    const sortDir = (searchParams.get("order") ?? undefined) as "ASC" | "DESC" | undefined;
    const limit = 10;

    const sortBy = sortId ? SORT_BY_MAP[sortId] : undefined;
    const sortOrder = sortBy ? sortDir : undefined;

    // The search input is bound to local state for typing responsiveness.
    // We keep it in sync with the URL so browser back/forward works.
    const [searchInput, setSearchInput] = useState(q);
    useEffect(() => {
        setSearchInput(q);
    }, [q]);

    const setUrlParams = useCallback(
        (updates: Record<string, string | null | undefined>) => {
            const params = new URLSearchParams(searchParams.toString());
            for (const [key, value] of Object.entries(updates)) {
                if (value === null || value === undefined || value === "") {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            }
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams],
    );

    const handleSearchChange = (value: string) => {
        setSearchInput(value);
        setUrlParams({ q: value, page: null });
    };

    // The single query that drives the table. The query key includes
    // every URL-derived input, so navigating or pasting a URL with new
    // params just works — Query picks it up.
    const songsQuery = useQuery(
        songQueries.list({
            q: q || undefined,
            page,
            limit,
            sortBy,
            sortOrder,
        }),
    );

    const songs = useMemo<UiSong[]>(
        () =>
            (songsQuery.data?.items ?? []).map((song) => ({
                id: song.id,
                songName: song.name,
                ArtistName: song.artist,
                releaseYear: String(song.releaseYear),
                spotifyId: song.spotifyTrackId,
            })),
        [songsQuery.data],
    );

    const totalPages = songsQuery.data?.totalPages ?? 1;
    // Show the SkeletonTable during any fetch — both the initial load
    // (`isPending`, no data yet) and page/sort/search changes
    // (`isFetching` with existing data). The DataTable's own internal
    // "Loading data..." row is no longer used; we prefer the full-page
    // skeleton so the loading experience is consistent.
    const isLoading = songsQuery.isPending || songsQuery.isFetching;

    const [editingSong, setEditingSong] = useState<UiSong | null>(null);
    const [deletingSong, setDeletingSong] = useState<UiSong | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const sorting: SortingState = sortId
        ? [{ id: sortId, desc: sortDir === "DESC" }]
        : [];

    const handleSortingChange = (next: SortingState) => {
        if (next.length === 0) {
            setUrlParams({ sort: null, order: null, page: null });
            return;
        }
        const first = next[0];
        setUrlParams({
            sort: first.id,
            order: first.desc ? "DESC" : "ASC",
            page: null,
        });
    };

    // --- Mutations ---

    const createSong = useCreateSong();
    const updateSong = useUpdateSong();
    const deleteSong = useDeleteSong();
    const bulkImport = useBulkImportSongs();
    const regenerateQr = useRegenerateSongQr();

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

            const result = await bulkImport.mutateAsync(uniqueUrls);
            toast.success(`Bulk import completed. Successful: ${result.successful}, Failed: ${result.failed}`, { id: toastId });

            setUrlParams({ page: null });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to bulk import songs";
            toast.error(message, { id: toastId });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleExportCsv = async () => {
        const toastId = toast.loading("Generating CSV export...");
        try {
            await exportSongsCsv();
            toast.success("CSV Export successful!", { id: toastId });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to export CSV";
            toast.error(message, { id: toastId });
        }
    };

    const handleAddSong = async (payload: { spotifyUrl: string }) => {
        // The AddSongDialog awaits this and surfaces server errors in
        // its own onError path. We use `mutateAsync` so the dialog's
        // try/catch sees a real Promise.
        try {
            await createSong.mutateAsync(payload);
            setIsAddDialogOpen(false);
            setUrlParams({ page: null });
            toast.success("Song successfully added!");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to add song");
        }
    };

    const handleEditSong = (song: UiSong) => {
        setDeletingSong(null);
        setEditingSong(song);
    };

    const handleDeleteSong = (song: UiSong) => {
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
            await updateSong.mutateAsync({
                id: payload.id,
                payload: {
                    name: payload.name,
                    artist: payload.artist,
                    releaseYear: payload.releaseYear,
                    spotifyTrackId: payload.spotifyTrackId,
                },
            });
            setEditingSong(null);
            toast.success("Song successfully updated!");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update song");
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingSong) return;
        const id = deletingSong.id;
        try {
            await deleteSong.mutateAsync(id);
            setDeletingSong(null);
            toast.success("Song successfully deleted!");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete song");
        }
    };

    const handleRegenerateQr = (song: UiSong) => {
        // `mutate` is fine here — no dialog is waiting on the result,
        // and the loading toast serves as the loading indicator.
        const loadingToast = toast.loading(`Regenerating QR for ${song.songName}...`);
        regenerateQr.mutate(song.id, {
            onSuccess: () => {
                toast.dismiss(loadingToast);
                toast.success("QR Code successfully regenerated!");
            },
            onError: (error) => {
                toast.dismiss(loadingToast);
                toast.error(error.message || "Failed to regenerate QR code");
            },
        });
    };

    const handleDownloadQr = async (song: UiSong) => {
        const loadingToast = toast.loading(`Preparing QR for ${song.songName}...`);
        try {
            // Use the existing query to get a cached result if available.
            // `fetchQuery` returns the cached value (if fresh) or fetches
            // if missing/stale.
            const qr = await queryClient.fetchQuery(songQueries.qr(song.id));
            toast.dismiss(loadingToast);

            if (!qr || !qr.imageUrl) {
                toast.error("No QR Code image found for this song.");
                return;
            }

            const link = document.createElement("a");
            link.href = qr.imageUrl;
            link.download = `QR_${song.songName.replace(/\s+/g, "_")}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            toast.dismiss(loadingToast);
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
                                <DropdownMenuItem onClick={() => handleEditSong(song)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem>Disable</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void handleDownloadQr(song)}>Download QR</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRegenerateQr(song)}>Regenerate QR</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => handleDeleteSong(song)}>
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers are stable, sorting/page is intentionally excluded
        [],
    );

    return (
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => setIsAddDialogOpen(open)}>
            <section className="w-full space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="dashboard-page-header lg:shrink-0">
                        <h1 className="dashboard-page-title">Songs</h1>
                        <p className="dashboard-page-subtitle">Manage your game contents and system configuration.</p>
                    </div>

                    <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:pl-8">
                        <div className="relative w-full lg:w-96 xl:w-116">
                            <Input
                                type="search"
                                placeholder="Search"
                                value={searchInput}
                                onChange={(event) => handleSearchChange(event.target.value)}
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
                                {isImporting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                                Bulk Upload
                            </Button>
                            <Button
                                variant="outline"
                                className="h-11.5 rounded-[5px] px-3 text-[16px] font-medium"
                                onClick={() => void handleExportCsv()}
                            >
                                <Download className="mr-2 size-4" />
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
                </div>

                <div className="space-y-3 md:hidden">
                    {isLoading ? <SkeletonTable /> : null}
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
                                        <DropdownMenuItem onClick={() => handleEditSong(song)}>Edit</DropdownMenuItem>
                                        <DropdownMenuItem>Disable</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => void handleDownloadQr(song)}>Download QR</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleRegenerateQr(song)}>Regenerate QR</DropdownMenuItem>
                                        <DropdownMenuItem variant="destructive" onClick={() => handleDeleteSong(song)}>
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="hidden md:block">
                    {isLoading ? (
                        <SkeletonTable />
                    ) : (
                        <DataTable
                            columns={columns}
                            data={songs}
                            pageCount={totalPages}
                            pagination={{ pageIndex: page - 1, pageSize: limit }}
                            onPaginationChange={(newPagination) => {
                                setUrlParams({ page: String(newPagination.pageIndex + 1) });
                            }}
                            sorting={sorting}
                            onSortingChange={handleSortingChange}
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
