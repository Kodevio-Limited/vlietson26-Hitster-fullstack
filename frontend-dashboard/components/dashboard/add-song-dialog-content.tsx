"use client";

import { useAppForm } from "@/components/form/form-context";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";

const spotifyTrackIdSchema = z
    .string()
    .min(1, "Spotify track ID is required")
    .refine(
        (val) => {
            const trackId = extractSpotifyTrackId(val);
            return trackId !== null && trackId.length > 0;
        },
        {
            message: "Invalid Spotify track URL or ID",
        },
    );

function extractSpotifyTrackId(input: string): string | null {
    const patterns = [/\/track\/([a-zA-Z0-9]+)/, /^([a-zA-Z0-9]+)$/];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
}

const addSongSchema = z.object({
    name: z.string().min(1, "Song name is required"),
    artist: z.string().min(1, "Artist is required"),
    releaseYear: z
        .string()
        .min(1, "Release year is required")
        .refine((val) => !isNaN(Number(val)) && Number(val) > 1900 && Number(val) <= new Date().getFullYear(), {
            message: "Enter a valid year",
        }),
    spotifyTrackId: spotifyTrackIdSchema,
});

type AddSongFormValues = z.infer<typeof addSongSchema>;

type AddSongDialogContentProps = {
    onSongAdded?: (payload: { name: string; artist: string; releaseYear: number; spotifyTrackId: string }) => Promise<void>;
};

export function AddSongDialogContent({ onSongAdded }: AddSongDialogContentProps) {
    const form = useAppForm({
        defaultValues: {
            name: "",
            artist: "",
            releaseYear: "",
            spotifyTrackId: "",
        } satisfies AddSongFormValues,
        validators: {
            onChange: addSongSchema,
        },
        onSubmit: async ({ value }) => {
            if (!onSongAdded) {
                return;
            }

            const trackId = extractSpotifyTrackId(value.spotifyTrackId);
            if (!trackId) {
                return;
            }

            try {
                await onSongAdded({
                    name: value.name,
                    artist: value.artist,
                    releaseYear: Number(value.releaseYear),
                    spotifyTrackId: trackId,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to add song";
                toast.error(message);
            }
        },
    });

    return (
        <DialogContent className="dashboard-dialog">
            <DialogHeader>
                <DialogTitle>Add New Song</DialogTitle>
                <DialogDescription>Fill in the details for the new song.</DialogDescription>
            </DialogHeader>

            <form
                className="grid gap-6"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                }}
            >
                <div className="grid grid-cols-2 gap-4">
                    <form.AppField name="name">
                        {(field) => <field.FormInput label="Song Name" placeholder="Enter song name" />}
                    </form.AppField>
                    <form.AppField name="artist">
                        {(field) => <field.FormInput label="Artist" placeholder="Enter artist name" />}
                    </form.AppField>
                </div>

                <form.AppField name="releaseYear">
                    {(field) => <field.FormInput label="Release Year" placeholder="Enter release year" />}
                </form.AppField>

                <form.AppField name="spotifyTrackId">
                    {(field) => <field.FormInput label="Spotify Track ID" placeholder="08mG3YpYpYpYpYpYpYpYpY" />}
                </form.AppField>

                <div className="grid grid-cols-2 gap-4">
                    <DialogClose asChild>
                        <Button variant="outline" type="button" className="w-full rounded-md">
                            Cancel
                        </Button>
                    </DialogClose>

                    <form.AppForm>
                        <form.FormSubmit label="Add Song" className="w-full rounded-md" />
                    </form.AppForm>
                </div>
            </form>
        </DialogContent>
    );
}
