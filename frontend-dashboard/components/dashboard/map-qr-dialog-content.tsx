"use client";

import { useAppForm } from "@/components/form/form-context";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Download, X } from "lucide-react";

type MapQrFormValues = {
    qrCodeIdentifier: string;
    songId: string;
    spotifyTrackId: string;
};

type MapQrDialogContentProps = {
    songs: Array<{ id: string; label: string }>;
    qrCodes: Array<{ id: string; identifier: string }>;
    errorMessage?: string;
    generatedQr?: {
        identifier: string;
        imageUrl: string;
        redirectUrl: string;
        spotifyTrackId: string;
    } | null;
    onCreateMapping?: (payload: { songId: string; qrCodeIdentifier: string; spotifyTrackId?: string }) => Promise<void>;
};

export function MapQrDialogContent({ songs, qrCodes, errorMessage, generatedQr, onCreateMapping }: MapQrDialogContentProps) {
    const form = useAppForm({
        defaultValues: {
            qrCodeIdentifier: qrCodes[0]?.identifier ?? "Card_002",
            songId: songs[0]?.id ?? "",
            spotifyTrackId: "",
        } satisfies MapQrFormValues,
        onSubmit: async ({ value }) => {
            if (!onCreateMapping || !value.songId || !value.qrCodeIdentifier) {
                return;
            }

            await onCreateMapping({
                songId: value.songId,
                qrCodeIdentifier: value.qrCodeIdentifier,
                spotifyTrackId: value.spotifyTrackId || undefined,
            });
        },
    });

    return (
        <DialogContent className="dashboard-dialog" hideClose>
            <DialogHeader>
                <div className="flex items-center justify-between px-3 py-2">
                    <DialogTitle className="text-[24px] leading-normal font-semibold text-black">Map QR Code</DialogTitle>
                    <DialogClose asChild>
                        <button type="button" className="text-black" aria-label="Close modal">
                            <X className="size-7" />
                        </button>
                    </DialogClose>
                </div>
                <DialogDescription className="sr-only">Create a QR code to song mapping.</DialogDescription>
            </DialogHeader>

            {errorMessage ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p> : null}

            <p className="text-xs leading-normal text-muted-foreground">If the QR identifier is new, enter a real Spotify Track ID so the backend can generate the code.</p>

            {generatedQr ? (
                <div className="grid gap-3 rounded-[12px] border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-foreground">Generated QR Code</p>
                            <p className="text-xs text-muted-foreground">{generatedQr.identifier}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Track ID: {generatedQr.spotifyTrackId}</p>
                    </div>

                    <div className="flex justify-center rounded-[10px] bg-white p-3">
                        <img src={generatedQr.imageUrl} alt={`QR code for ${generatedQr.identifier}`} className="max-h-56 w-full max-w-56 object-contain" />
                    </div>

                    <div className="flex items-center gap-3">
                        <a href={generatedQr.imageUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                            Open QR image
                        </a>
                        <button
                            type="button"
                            className="flex items-center gap-1 text-xs text-green-600 underline"
                            onClick={() => {
                                const link = document.createElement("a");
                                link.href = generatedQr.imageUrl;
                                link.download = `QR_${generatedQr.identifier}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                        >
                            <Download className="size-3" />
                            Download
                        </button>
                    </div>
                </div>
            ) : null}

            <form
                className="grid gap-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                }}
            >
                <form.AppField name="qrCodeIdentifier">
                    {(field) => <field.FormInput label="QR Code Identifier" placeholder="Card_002" />}
                </form.AppField>

                <form.AppField name="songId">
                    {(field) => (
                        <Field>
                            <FieldLabel htmlFor={field.name}>Select Song</FieldLabel>
                            <NativeSelect
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                                className="h-12 w-full rounded-[5px] border-[#dadada] px-2 text-[12px] text-[#666666]"
                            >
                                {songs.length === 0 ? <option value="">No songs available</option> : null}
                                {songs.map((song) => (
                                    <option key={song.id} value={song.id}>
                                        {song.label}
                                    </option>
                                ))}
                            </NativeSelect>
                        </Field>
                    )}
                </form.AppField>

                <form.AppField name="spotifyTrackId">
                    {(field) => <field.FormInput label="Spotify Track ID (for new QR)" placeholder="0BmG3YpYpYpYpYpYpYpYpYpYpY" />}
                </form.AppField>

                <div className="grid grid-cols-2 gap-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" className="w-full rounded-md">
                            Cancel
                        </Button>
                    </DialogClose>

                    <form.AppForm>
                        <form.FormSubmit label="Create Mapping" className="w-full rounded-md" />
                    </form.AppForm>
                </div>
            </form>
        </DialogContent>
    );
}
