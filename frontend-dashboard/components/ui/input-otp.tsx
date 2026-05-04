"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type InputOTPContextValue = {
    value: string;
    maxLength: number;
    onChange: (value: string) => void;
};

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null);

function useInputOTPContext() {
    const context = React.useContext(InputOTPContext);
    if (!context) {
        throw new Error("InputOTP components must be used within <InputOTP />");
    }

    return context;
}

function InputOTP({ value, onChange, maxLength = 6, className, children, ...props }: React.ComponentProps<"div"> & {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
}) {
    return (
        <InputOTPContext.Provider value={{ value, maxLength, onChange }}>
            <div className={cn("relative inline-flex flex-col items-center gap-3", className)} {...props}>
                <input
                    aria-label="One-time password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={maxLength}
                    value={value}
                    onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, maxLength))}
                    className="absolute inset-0 h-full w-full opacity-0"
                />
                {children}
            </div>
        </InputOTPContext.Provider>
    );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
    return <div data-slot="input-otp-group" className={cn("flex items-center gap-2", className)} {...props} />;
}

function InputOTPSlot({ index, className, ...props }: React.ComponentProps<"div"> & { index: number }) {
    const { value } = useInputOTPContext();
    const character = value[index] ?? "";

    return (
        <div
            data-slot="input-otp-slot"
            className={cn("flex size-11 items-center justify-center rounded-md border border-input bg-background text-lg font-medium text-foreground shadow-xs", className)}
            {...props}
        >
            {character}
        </div>
    );
}

export { InputOTP, InputOTPGroup, InputOTPSlot };