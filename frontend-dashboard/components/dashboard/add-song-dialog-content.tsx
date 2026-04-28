"use client";

import { useAppForm } from "@/components/form/form-context";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AddSongFormValues = {
    name: string;
    artist: string;
    releaseYear: string;
    spotifyTrackId: string;
};

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
        onSubmit: async ({ value }) => {
            if (!onSongAdded) {
                return;
            }

            const releaseYear = Number.parseInt(value.releaseYear, 10);
            if (Number.isNaN(releaseYear)) {
                return;
            }

            await onSongAdded({
                name: value.name,
                artist: value.artist,
                releaseYear,
                spotifyTrackId: value.spotifyTrackId,
            });
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
                        <form.FormSubmit label="Add Song" className="w-full rounded-md" />
                    </form.AppForm>
                </div>
            </form>
        </DialogContent>
    );
}
