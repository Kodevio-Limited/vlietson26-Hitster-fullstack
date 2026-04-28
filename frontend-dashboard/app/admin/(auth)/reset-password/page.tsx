"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { apiClient } from "@/lib/api/client";

export default function ResetPassword() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");

    useEffect(() => {
        const storedEmail = localStorage.getItem("reset_email");
        const storedToken = localStorage.getItem("reset_token");
        if (!storedEmail || !storedToken) {
            router.push("/admin/forgot-password");
        } else {
            setEmail(storedEmail);
            setToken(storedToken);
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await apiClient.post("/auth/reset-password", { 
                email, 
                token, 
                newPassword 
            });
            
            // Cleanup
            localStorage.removeItem("reset_email");
            localStorage.removeItem("reset_token");
            
            alert("Password reset successful! Please login.");
            router.push("/admin/signin");
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f8f8f8] p-4">
            <div className="w-full max-w-[450px] rounded-xl border border-border bg-white p-8 shadow-sm">
                <div className="mb-8 flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold text-[#333333]">Reset Password</h1>
                    <p className="mt-2 text-sm text-[#666666]">
                        We've sent a verification code to your registered email address. 
                        Please enter it both below to confirm your identity and continue.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                            <Input 
                                id="new-password" 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Enter your password" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="h-12 border-border focus-visible:ring-0 focus-visible:border-[#333333] pr-10"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <div className="relative">
                            <Input 
                                id="confirm-password" 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Enter your password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="h-12 border-border focus-visible:ring-0 focus-visible:border-[#333333] pr-10"
                            />
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="h-12 w-full bg-black text-white hover:bg-black/90 mt-4"
                    >
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Submit"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
