"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { setAdminSessionCookie } from "@/app/actions/auth-session";

export default function Signin() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    
    // Form states
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.post("/auth/login", { email, password });
            const { jwtToken, user } = response.data;
            
            localStorage.setItem("adminToken", jwtToken);
            localStorage.setItem("user", JSON.stringify(user));
            await setAdminSessionCookie(jwtToken);
            
            router.push("/admin");
        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid email or password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f8f8f8] p-4">
            <div className="w-full max-w-112.5 rounded-xl border border-border bg-white p-8 shadow-sm">
                <div className="mb-8 flex flex-col items-center">
                    <h1 className="text-2xl font-bold text-[#333333]">Login</h1>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailLogin} className="space-y-6">
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

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                        </div>
                        <div className="relative">
                            <Input 
                                id="password" 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Enter your password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="remember" />
                            <label
                                htmlFor="remember"
                                className="text-sm font-medium leading-none text-[#666666] peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Remember me
                            </label>
                        </div>
                        <Link 
                            href="/admin/forgot-password" 
                            className="text-sm font-medium text-[#0066FF] hover:underline"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="h-12 w-full bg-black text-white hover:bg-black/90"
                    >
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Login"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
