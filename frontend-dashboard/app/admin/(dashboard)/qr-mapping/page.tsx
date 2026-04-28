"use client";

import { MapQrDialogContent } from "@/components/dashboard/map-qr-dialog-content";
import { DeleteMappingDialogContent } from "@/components/dashboard/delete-mapping-dialog-content";
import { QrMappingCard } from "@/components/dashboard/qr-mapping-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createMapping, createQrCode, deleteMapping, fetchMappings, fetchQrCodeById, fetchQrCodes, fetchSongs, updateMapping } from "@/lib/api/admin-dashboard";
import { Download, Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MappingCardData = {
    id: string;
    qrCodeBackendId?: string;
    qrCodeId: string;
    songTitle: string;
    artist: string;
    songId?: string;
    qrImageUrl?: string;
    qrRedirectUrl?: string;
};

type SongOption = {
    id: string;
    label: string;
};

type QrCodeOption = {
    id: string;
    identifier: string;
};

type GeneratedQrPreview = {
    identifier: string;
    imageUrl: string;
    redirectUrl: string;
    spotifyTrackId: string;
};

type QrPreview = {
    title: string;
    imageUrl: string;
    redirectUrl?: string;
};

export default function QrMappingPage() {
    const [mappings, setMappings] = useState<MappingCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [songs, setSongs] = useState<SongOption[]>([]);
    const [qrCodes, setQrCodes] = useState<QrCodeOption[]>([]);
    const [errorText, setErrorText] = useState("");
    const [dialogError, setDialogError] = useState("");
    const [deletingMapping, setDeletingMapping] = useState<MappingCardData | null>(null);
    const [generatedQr, setGeneratedQr] = useState<GeneratedQrPreview | null>(null);
    const [previewQr, setPreviewQr] = useState<QrPreview | null>(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage] = useState(8);

    const loadMappings = async (page = currentPage) => {
        setIsLoading(true);
        try {
            const response = await fetchMappings({ page, limit: itemsPerPage });
            setMappings(
                response.data.map((mapping) => ({
                    id: mapping.id,
                    qrCodeBackendId: mapping.qrCode?.id,
                    qrCodeId: mapping.qrCode?.identifier ?? mapping.qrCodeId,
                    songTitle: mapping.song?.name ?? "Unknown song",
                    artist: mapping.song?.artist ?? "Unknown artist",
                    songId: mapping.song?.id,
                    qrImageUrl: mapping.qrCode?.imageUrl,
                    qrRedirectUrl: mapping.qrCode?.redirectUrl,
                }))
            );
            setTotalItems(response.total);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadPageData = async () => {
            setIsLoading(true);
            try {
                const [mappingsResponse, songsResponse, qrCodesResponse] = await Promise.all([
                    fetchMappings({ page: currentPage, limit: itemsPerPage }),
                    fetchSongs({ page: 1, limit: 100 }),
                    fetchQrCodes(),
                ]);

                if (!isMounted) {
                    return;
                }

                setMappings(
                    mappingsResponse.data.map((mapping) => ({
                        id: mapping.id,
                        qrCodeBackendId: mapping.qrCode?.id,
                        qrCodeId: mapping.qrCode?.identifier ?? mapping.qrCodeId,
                        songTitle: mapping.song?.name ?? "Unknown song",
                        artist: mapping.song?.artist ?? "Unknown artist",
                        songId: mapping.song?.id,
                        qrImageUrl: mapping.qrCode?.imageUrl,
                        qrRedirectUrl: mapping.qrCode?.redirectUrl,
                    }))
                );
                setTotalItems(mappingsResponse.total);
                setSongs(songsResponse.items.map((song) => ({ id: song.id, label: `${song.name} - ${song.artist}` })));
                setQrCodes(qrCodesResponse.map((qrCode) => ({ id: qrCode.id, identifier: qrCode.identifier })));
                setErrorText("");
            } catch {
                if (!isMounted) {
                    return;
                }

                setMappings([]);
                setErrorText("Could not load QR mappings from API");
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void loadPageData();

        return () => {
            isMounted = false;
        };
    }, []);

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageButtons = useMemo(() => {
        if (totalPages <= 3) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }
        const start = Math.min(Math.max(currentPage - 1, 1), Math.max(totalPages - 2, 1));
        return [start, start + 1, start + 2].filter(p => p <= totalPages);
    }, [currentPage, totalPages]);

    const handleCreateMapping = async (payload: { songId: string; qrCodeIdentifier: string; spotifyTrackId?: string }) => {
        try {
            setDialogError("");
            setGeneratedQr(null);
            let selectedQrCode = qrCodes.find((qrCode) => qrCode.identifier === payload.qrCodeIdentifier);

            if (!selectedQrCode) {
                if (!payload.spotifyTrackId) {
                    throw new Error("Enter a Spotify track ID for new QR code");
                }

                const createdQr = await createQrCode({
                    identifier: payload.qrCodeIdentifier,
                    spotifyTrackId: payload.spotifyTrackId,
                });

                setGeneratedQr({
                    identifier: createdQr.identifier,
                    imageUrl: createdQr.imageUrl,
                    redirectUrl: createdQr.redirectUrl,
                    spotifyTrackId: payload.spotifyTrackId,
                });
                setPreviewQr({
                    title: createdQr.identifier,
                    imageUrl: createdQr.imageUrl,
                    redirectUrl: createdQr.redirectUrl,
                });

                const qrCodesResponse = await fetchQrCodes();
                const normalized = qrCodesResponse.map((qrCode) => ({ id: qrCode.id, identifier: qrCode.identifier }));
                setQrCodes(normalized);
                selectedQrCode = normalized.find((qrCode) => qrCode.identifier === payload.qrCodeIdentifier);

                if (!selectedQrCode) {
                    throw new Error("QR code generation failed");
                }
            }

            const existing = mappings.find((mapping) => mapping.qrCodeBackendId === selectedQrCode.id);

            if (existing) {
                await updateMapping({ id: existing.id, songId: payload.songId, qrCodeId: selectedQrCode.id });
            } else {
                await createMapping({ songId: payload.songId, qrCodeId: selectedQrCode.id });
            }

            await loadMappings(1);
            setCurrentPage(1);
            setSuccessMessage("Mapping successfully created!");
            setTimeout(() => setSuccessMessage(""), 5000);
            setErrorText("");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create mapping";
            setDialogError(message);
        }
    };

    const handleDeleteMapping = async (mappingId: string) => {
        await deleteMapping(mappingId);
        await loadMappings();
        setErrorText("");
    };

    const handleShowQr = async (mapping: MappingCardData) => {
        try {
            setErrorText("");
            let imageUrl = mapping.qrImageUrl;
            let redirectUrl = mapping.qrRedirectUrl;

            // If image is not in the list (optimized fetch), get it now
            if (!imageUrl && mapping.qrCodeBackendId) {
                const qrInfo = await fetchQrCodeById(mapping.qrCodeBackendId);
                imageUrl = qrInfo.imageUrl;
                redirectUrl = qrInfo.redirectUrl;
            }

            if (!imageUrl) {
                setErrorText("QR image is not available for this mapping yet.");
                return;
            }

            setPreviewQr({
                title: mapping.qrCodeId,
                imageUrl: imageUrl,
                redirectUrl: redirectUrl,
            });
        } catch {
            setErrorText("Failed to load QR image details.");
        }
    };

    const handleDownload = (imageUrl: string, filename: string) => {
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog>
            <section className="w-full pb-10">
                <div className="dashboard-page-header">
                    <h1 className="dashboard-page-title">QR Cards</h1>
                    <p className="dashboard-page-subtitle">Manage your game content and system configuration.</p>
                    {isLoading ? (
                        <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Loading mappings...
                        </p>
                    ) : null}
                    {errorText ? <p className="mt-2 text-sm text-red-600">{errorText}</p> : null}
                    {successMessage ? <p className="mt-2 text-sm font-medium text-green-600">{successMessage}</p> : null}
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="dashboard-section-title">QR Code to Song Mappings</p>

                    <DialogTrigger asChild>
                        <Button
                            className="h-11.5 rounded-[5px] bg-black px-3 text-[16px] leading-normal font-medium text-white hover:bg-black/95"
                            onClick={() => setDialogError("")}
                        >
                            <Plus className="size-6" />
                            Map New Card
                        </Button>
                    </DialogTrigger>
                </div>

                <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {isLoading && mappings.length === 0 ? (
                        <div className="col-span-full rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin" />
                                Fetching QR mappings...
                            </span>
                        </div>
                    ) : null}
                    {mappings.map((mapping) => (
                        <QrMappingCard
                            key={mapping.id}
                            qrCodeId={mapping.qrCodeId}
                            songTitle={mapping.songTitle}
                            artist={mapping.artist}
                            qrImageUrl={mapping.qrImageUrl}
                            onDelete={() => {
                                setDialogError("");
                                setDeletingMapping(mapping);
                            }}
                            onShowQr={() => handleShowQr(mapping)}
                        />
                    ))}
                </div>

                <div className="mt-6 flex flex-col gap-4 px-2 text-(--dashboard-muted) sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[12px] leading-normal">
                        Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} out of {totalItems}
                    </p>

                    <div className="flex items-center gap-2 text-[14px] leading-normal">
                        <button
                            type="button"
                            className="px-1 py-1 disabled:opacity-50"
                            disabled={currentPage === 1}
                            onClick={() => {
                                const newPage = currentPage - 1;
                                setCurrentPage(newPage);
                                void loadMappings(newPage);
                            }}
                        >
                            Previous
                        </button>
                        {pageButtons.map((pageNumber) => (
                            <button
                                key={pageNumber}
                                type="button"
                                className={pageNumber === currentPage ? "h-6 w-6 bg-[#333333] text-white" : "h-6 w-6"}
                                onClick={() => {
                                    setCurrentPage(pageNumber);
                                    void loadMappings(pageNumber);
                                }}
                            >
                                {pageNumber}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="px-1 py-1 disabled:opacity-50"
                            disabled={currentPage === totalPages}
                            onClick={() => {
                                const newPage = currentPage + 1;
                                setCurrentPage(newPage);
                                void loadMappings(newPage);
                            }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>

            <MapQrDialogContent
                songs={songs}
                qrCodes={qrCodes}
                errorMessage={dialogError}
                generatedQr={generatedQr}
                onCreateMapping={handleCreateMapping}
            />

            <Dialog
                open={Boolean(deletingMapping)}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingMapping(null);
                        setDialogError("");
                    }
                }}
            >
                {deletingMapping ? (
                    <DeleteMappingDialogContent
                        qrCodeId={deletingMapping.qrCodeId}
                        errorMessage={dialogError}
                        onConfirm={async () => {
                            try {
                                setDialogError("");
                                await handleDeleteMapping(deletingMapping.id);
                                setDeletingMapping(null);
                                setSuccessMessage("Mapping successfully deleted!");
                                setTimeout(() => setSuccessMessage(""), 5000);
                            } catch {
                                setDialogError("Failed to delete mapping");
                            }
                        }}
                    />
                ) : null}
            </Dialog>

            <Dialog
                open={Boolean(previewQr)}
                onOpenChange={(open) => {
                    if (!open) {
                        setPreviewQr(null);
                    }
                }}
            >
                <DialogContent className="dashboard-dialog max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-[24px] leading-normal font-semibold text-black">QR Preview</DialogTitle>
                        <DialogDescription>Generated QR code image preview.</DialogDescription>
                    </DialogHeader>

                    {previewQr ? (
                        <div className="grid gap-4">
                            <div>
                                <p className="text-sm font-medium text-foreground">{previewQr.title}</p>
                                <p className="text-xs text-muted-foreground">The QR image is rendered below as a base64 preview.</p>
                            </div>

                            <div className="flex justify-center rounded-[10px] border border-border bg-white p-4">
                                <img src={previewQr.imageUrl} alt={`QR preview for ${previewQr.title}`} className="max-h-[420px] w-full max-w-[420px] object-contain" />
                            </div>

                                {previewQr.redirectUrl ? (
                                    <a href={previewQr.redirectUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                                        Open redirect target
                                    </a>
                                ) : null}

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full gap-2 rounded-md"
                                    onClick={() => handleDownload(previewQr.imageUrl, `QR_${previewQr.title}`)}
                                >
                                    <Download className="size-4" />
                                    Download QR Code
                                </Button>
                            </div>
                        ) : null}
                    </DialogContent>
                </Dialog>
        </Dialog>
    );
}
