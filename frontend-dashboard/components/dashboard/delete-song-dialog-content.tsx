"use client";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type DeleteSongDialogContentProps = {
    songName: string;
    errorMessage?: string;
    onConfirm: () => Promise<void>;
};

export function DeleteSongDialogContent({ songName, errorMessage, onConfirm }: DeleteSongDialogContentProps) {
    return (
        <DialogContent className="dashboard-dialog">
            <DialogHeader>
                <DialogTitle>Delete Song</DialogTitle>
                <DialogDescription>Confirm that you want to remove this song from the dashboard.</DialogDescription>
            </DialogHeader>

            {errorMessage ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p> : null}

            <div className="rounded-[10px] border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm font-medium text-foreground">{songName}</p>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <DialogClose asChild>
                    <Button variant="outline" type="button" className="w-full rounded-md">
                        Cancel
                    </Button>
                </DialogClose>

                <Button
                    type="button"
                    className="w-full rounded-md bg-red-600 text-white hover:bg-red-700"
                    onClick={() => {
                        void onConfirm();
                    }}
                >
                    Delete Song
                </Button>
            </div>
        </DialogContent>
    );
}
