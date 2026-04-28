"use client";

import { useAppForm } from "@/components/form/form-context";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";

type SongRecord = {
    id: string;
    songName: string;
    ArtistName: string;
    releaseYear: string;
    spotifyId: string;
};

type EditSongDialogContentProps = {
    song: SongRecord;
    errorMessage?: string;
    onSave: (payload: { id: string; name: string; artist: string; releaseYear: number; spotifyTrackId: string }) => Promise<void>;
};

type EditSongFormValues = {
    name: string;
    artist: string;
    releaseYear: string;
    spotifyTrackId: string;
};

export function EditSongDialogContent({ song, errorMessage, onSave }: EditSongDialogContentProps) {
    const [localError, setLocalError] = useState("");

    useEffect(() => {
        setLocalError("");
    }, [song.id]);

    const form = useAppForm({
        defaultValues: {
            name: song.songName,
            artist: song.ArtistName,
            releaseYear: song.releaseYear,
            spotifyTrackId: song.spotifyId,
        } satisfies EditSongFormValues,
        onSubmit: async ({ value }) => {
            const releaseYear = Number.parseInt(value.releaseYear, 10);
            if (Number.isNaN(releaseYear)) {
                setLocalError("Release year must be a number.");
                return;
            }

            setLocalError("");
            await onSave({
                id: song.id,
                name: value.name,
                artist: value.artist,
                releaseYear,
                spotifyTrackId: value.spotifyTrackId,
            });
        },
    });

    const message = errorMessage || localError;

    return (
        <DialogContent className="dashboard-dialog">
            <DialogHeader>
                <DialogTitle>Edit Song</DialogTitle>
                <DialogDescription>Update the saved song details.</DialogDescription>
            </DialogHeader>

            {message ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{message}</p> : null}

            <form
                className="grid gap-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.handleSubmit();
                }}
            >
                <div className="grid grid-cols-2 gap-4">
                    <form.AppField name="name">{(field) => <field.FormInput label="Song Name" placeholder="Enter song name" />}</form.AppField>
                    <form.AppField name="artist">{(field) => <field.FormInput label="Artist" placeholder="Enter artist name" />}</form.AppField>
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
                        <form.FormSubmit label="Save Changes" className="w-full rounded-md" />
                    </form.AppForm>
                </div>
            </form>
        </DialogContent>
    );
}
