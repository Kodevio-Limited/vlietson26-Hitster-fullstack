"use client";

import { useAppForm } from "@/components/form/form-context";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";

const addSongSchema = z.object({
    spotifyUrl: z.string().min(1, "Spotify URL is required").url("Must be a valid URL"),
});

type AddSongFormValues = z.infer<typeof addSongSchema>;

type AddSongDialogContentProps = {
    onSongAdded?: (payload: { spotifyUrl: string }) => Promise<void>;
};

export function AddSongDialogContent({ onSongAdded }: AddSongDialogContentProps) {
    const form = useAppForm({
        defaultValues: {
            spotifyUrl: "",
        } satisfies AddSongFormValues,
        validators: {
            onChange: addSongSchema,
        },
        onSubmit: async ({ value }) => {
            if (!onSongAdded) {
                return;
            }

            try {
                await onSongAdded({
                    spotifyUrl: value.spotifyUrl,
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
                <form.AppField name="spotifyUrl">
                    {(field) => <field.FormInput label="Spotify URL" placeholder="https://open.spotify.com/track/..." />}
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
