"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";

export default function Verification() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const storedEmail = localStorage.getItem("reset_email");
        if (!storedEmail) {
            router.push("/admin/forgot-password");
        } else {
            setEmail(storedEmail);
        }
    }, [router]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input if value is entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join("");
        if (code.length < 6) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.post("/auth/verify-otp", { email, code });
            localStorage.setItem("reset_token", response.data.token);
            router.push("/admin/reset-password");
        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid verification code");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setError(null);
        try {
            await apiClient.post("/auth/forgot-password", { email });
            alert("Verification code resent!");
        } catch (err: any) {
            setError("Failed to resend code");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f8f8f8] p-4">
            <div className="w-full max-w-[450px] rounded-xl border border-border bg-white p-8 shadow-sm">
                <div className="mb-8 flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold text-[#333333]">Verification</h1>
                    <p className="mt-2 text-sm text-[#666666]">
                        We've sent a verification code to your registered email address. 
                        Please enter the code below to confirm your identity and continue.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex justify-between gap-2">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => {inputRefs.current[index] = el;}}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="h-14 w-12 rounded-lg border border-border text-center text-xl font-bold focus:border-[#333333] focus:outline-none"
                            />
                        ))}
                    </div>

                    <div className="space-y-4">
                        <Button 
                            type="submit" 
                            disabled={isLoading || otp.join("").length < 6}
                            className="h-12 w-full bg-black text-white hover:bg-black/90"
                        >
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Reset Password"}
                        </Button>

                        <div className="text-center text-sm text-[#666666]">
                            Didn't receive the code? Check your spam or{" "}
                            <button 
                                type="button"
                                onClick={handleResend}
                                className="font-medium text-[#0066FF] hover:underline"
                            >
                                Resend code
                            </button> to try again.
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
