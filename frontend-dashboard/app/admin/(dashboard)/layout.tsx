"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { clearAdminSessionCookie, logoutRedirect } from "@/app/actions/auth-session";
import { logout } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import { LayoutGrid, LogOut, Menu, QrCode, Settings, Music2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";


function SidebarNav() { // This component is used in both the mobile sheet and the desktop sidebar, so it needs to be self-contained.
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { label: "Dashboard", href: "/admin", icon: LayoutGrid },
        { label: "Songs", href: "/admin/songs", icon: Music2 },
        { label: "QR Mapping", href: "/admin/qr-mapping", icon: QrCode },
        { label: "Settings", href: "/admin/settings", icon: Settings },
    ];

    return (
        <nav className="flex flex-col items-center gap-2 px-3 py-6">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex h-14 w-full max-w-56.25 items-center gap-2 rounded-[20px] px-4 text-[20px] font-medium leading-7 transition-colors",
                            isActive ? "bg-[#333333] text-white" : "text-[#333333] hover:bg-[#f5f5f5]"
                        )}>
                        <Icon className="size-6" />
                        {item.label}
                    </Link>
                );
            })}

            <button
                type="button"
                onClick={async () => {
                    // 1. Clear LocalStorage first (Client-side)
                    logout();
                    
                    // 2. Clear Cookie via Server Action
                    await clearAdminSessionCookie();
                    
                    // 3. Redirect via Server Action to ensure middleware sync
                    await logoutRedirect();
                }}
                className="mt-2 flex h-14 w-full max-w-56.25 items-center gap-2 rounded-[20px] px-4 text-left text-[20px] font-medium leading-7 text-[#b91c1c] transition-colors hover:bg-[#fef2f2]"
            >
                <LogOut className="size-6" />
                Logout
            </button>
        </nav>
    );
}



// Admin Dashboard Layout
export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const [user, setUser] = useState<{ displayName?: string; imageUrl?: string; email?: string } | null>(null);
    const logoImage = "/logo_hitster.png";

    useEffect(() => {
        const syncUser = () => {
            const storedUser = localStorage.getItem("user");
            setUser(storedUser ? JSON.parse(storedUser) : null);
        };

        syncUser();

        const handleUserUpdated = () => {
            syncUser();
        };

        window.addEventListener("user-updated", handleUserUpdated);
        window.addEventListener("storage", handleUserUpdated);

        return () => {
            window.removeEventListener("user-updated", handleUserUpdated);
            window.removeEventListener("storage", handleUserUpdated);
        };
    }, []);

    const displayName = user?.displayName || "Admin User";
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center border-b border-border bg-background shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)]">
                <div className="flex items-center justify-between w-full px-6">
                    <div className="flex items-center gap-3">
                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <Sheet>
                                <SheetTrigger
                                    render={
                                        <button
                                            className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-muted"
                                            aria-label="Open menu"
                                        >
                                            <Menu className="h-5 w-5" />
                                        </button>
                                    }
                                ></SheetTrigger>
                                <SheetContent side="left" className="w-[calc(100vw-1rem)] max-w-72 p-0">
                                    <div className="border-b px-4 py-5">
                                        <Image src={logoImage} alt="Logo" width={52} height={52} unoptimized />
                                    </div>
                                    <SidebarNav />
                                </SheetContent>
                            </Sheet>
                        </div>

                        <Image src={logoImage} alt="Logo" width={52} height={52} unoptimized />
                    </div>

                    <Link href="/admin/settings?tab=profile&focus=image" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Avatar className="size-12">
                            <AvatarImage src={user?.imageUrl || "/user_avater.png"} alt={displayName} />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-[20px] font-semibold leading-normal text-[#333333]">{displayName}</span>
                    </Link>
                </div>
            </header>

            {/* Body */}
            <div className="flex pt-20">
                {/* Desktop Sidebar */}
                <aside className="fixed left-0 top-20 hidden h-[calc(100vh-80px)] w-63.25 border-r border-border bg-background md:block">
                    <SidebarNav />
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 md:ml-63.25 md:px-7.5 md:pt-10">{children}</main>
            </div>
        </div>
    );
}