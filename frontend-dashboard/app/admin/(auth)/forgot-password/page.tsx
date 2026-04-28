"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";

export default function ForgotPassword() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);
        try {
            await apiClient.post("/auth/forgot-password", { email });
            // Store email for verification step
            localStorage.setItem("reset_email", email);
            router.push("/admin/verification");
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to send verification code");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f8f8f8] p-4">
            <div className="w-full max-w-[450px] rounded-xl border border-border bg-white p-8 shadow-sm">
                <div className="mb-6">
                    <Link href="/admin/signin" className="flex items-center text-sm font-medium text-[#666666] hover:text-[#333333]">
                        <ArrowLeft className="mr-2 size-4" />
                        Back to Login
                    </Link>
                </div>

                <div className="mb-8 flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold text-[#333333]">Forgot Password</h1>
                    <p className="mt-2 text-sm text-[#666666]">
                        Enter your registered email address and we will send you a verification code to reset your password.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder="Enter your email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-12 border-border focus-visible:ring-0 focus-visible:border-[#333333]"
                        />
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="h-12 w-full bg-black text-white hover:bg-black/90"
                    >
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Reset Password"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
