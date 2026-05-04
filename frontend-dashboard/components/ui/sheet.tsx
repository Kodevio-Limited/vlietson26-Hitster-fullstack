"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SheetContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
    const context = React.useContext(SheetContext);
    if (!context) {
        throw new Error("Sheet components must be used within <Sheet />");
    }

    return context;
}

function Sheet({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);

    return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>;
}

function SheetTrigger({ render }: { render: React.ReactElement<{ onClick?: React.MouseEventHandler<HTMLElement> }> }) {
    const { setOpen } = useSheetContext();

    return React.cloneElement(render, {
        onClick: (event: React.MouseEvent<HTMLElement>) => {
            render.props.onClick?.(event);
            setOpen(true);
        },
    });
}

function SheetContent({ side = "right", className, children }: { side?: "left" | "right"; className?: string; children: React.ReactNode }) {
    const { open, setOpen } = useSheetContext();

    if (!open) {
        return null;
    }

    const positionClass = side === "left" ? "left-0" : "right-0";

    return (
        <div className="fixed inset-0 z-50">
            <button type="button" aria-label="Close sheet" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <aside className={cn("absolute top-0 h-full w-full max-w-sm bg-background shadow-2xl", positionClass, className)}>{children}</aside>
        </div>
    );
}

export { Sheet, SheetContent, SheetTrigger };