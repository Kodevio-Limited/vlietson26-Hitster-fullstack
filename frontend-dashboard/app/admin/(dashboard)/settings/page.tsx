"use client";

import { useAppForm } from "@/components/form/form-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Shield, UserRound, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { fetchNotifications, markAllNotificationsRead, NotificationDto } from "@/lib/api/admin-dashboard";

type SettingsTab = "profile" | "security" | "notification";

const profileImage = "https://www.figma.com/api/mcp/asset/60d1da0a-fae3-4799-9636-5998faafceeb";

const settingsNav = [
    { key: "profile", label: "Profile", icon: UserRound },
    { key: "security", label: "Security", icon: Shield },
    { key: "notification", label: "Notification", icon: Bell },
] as const satisfies ReadonlyArray<{ key: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }>;

function SettingsNav({ activeTab, onSelect }: { activeTab: SettingsTab; onSelect: (tab: SettingsTab) => void }) {
    return (
        <aside className="w-full rounded-[10px] border border-(--dashboard-border) bg-(--dashboard-surface) p-4 shadow-(--dashboard-card-shadow) lg:sticky lg:top-24">
            <nav className="mx-auto flex w-full max-w-56.25 flex-col gap-2.5">
                {settingsNav.map((item) => {
                    const isActive = activeTab === item.key;
                    const Icon = item.icon;

                    return (
                        <Button
                            key={item.key}
                            size="sm"
                            variant={isActive ? "default" : "ghost"}
                            className="h-12 w-full justify-start rounded-[20px] px-4 text-[16px] font-medium"
                            onClick={() => onSelect(item.key)}
                        >
                            <Icon />
                            <span>{item.label}</span>
                        </Button>
                    );
                })}
            </nav>
        </aside>
    );
}

function ProfilePanel({ user, onUpdate, focusImage }: { user: any; onUpdate: (user: any) => void; focusImage?: boolean }) {
    const imageRef = useRef<HTMLDivElement>(null);
    const form = useAppForm({
        defaultValues: { name: user?.displayName || "", email: user?.email || "", imageUrl: user?.imageUrl || "" },
    });

    useEffect(() => {
        if (user) {
            form.reset();
        }
    }, [user, form]);

    // Auto-scroll and highlight the profile image when navigated from header avatar
    useEffect(() => {
        if (focusImage && imageRef.current) {
            imageRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
            imageRef.current.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded-full");
            // Pulse effect: remove highlight after animation
            const timer = setTimeout(() => {
                imageRef.current?.classList.remove("ring-2", "ring-primary", "ring-offset-2");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [focusImage]);

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleProfileSubmit = async () => {
        setIsLoading(true);
        setMessage(null);
        try {
            const values = form.state.values;
            console.log("[ProfilePanel] Submitting values:", values);
            const response = await apiClient.post("/auth/update-profile", values);
            const updatedUser = response.data;
            
            // Update localStorage
            localStorage.setItem("user", JSON.stringify(updatedUser));
            window.dispatchEvent(new Event("user-updated"));
            
            // Notify parent
            onUpdate(updatedUser);
            
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err: any) {
            console.error("[ProfilePanel] Update failed:", err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to update profile';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            form.setFieldValue("imageUrl", base64String);
        };
        reader.readAsDataURL(file);
    };

    return (
        <section className="dashboard-card min-w-0 overflow-hidden">
            <div className="border-b border-border px-6 py-4">
                <h2 className="text-xl font-semibold">Profile Setting</h2>
            </div>

            {message && (
                <div className={`mx-6 mt-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6 p-6">
                <div className="flex items-center gap-3">
                    <div ref={imageRef} className="relative group cursor-pointer transition-all duration-300" onClick={() => document.getElementById('profile-upload')?.click()}>
                        <Avatar className="size-20 border-2 border-transparent group-hover:border-primary transition-all">
                            <AvatarImage src={form.state.values.imageUrl || user?.imageUrl || profileImage} alt={user?.displayName || "User"} />
                            <AvatarFallback>{user?.displayName?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-white font-medium">Change</span>
                        </div>
                        <input
                            id="profile-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </div>

                    <div className="space-y-1">
                        <p className="text-xl font-medium text-foreground">{user?.displayName || "Admin User"}</p>
                        <p>{user?.email || "No email set"}</p>
                    </div>
                </div>

                <form
                    className="grid gap-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleProfileSubmit();
                    }}
                >
                    <div className="grid gap-6 lg:grid-cols-2">
                        <form.AppField name="name">
                            {(field) => <field.FormInput type="text" label="Name" placeholder="Enter your name" />}
                        </form.AppField>
                        <form.AppField name="email">
                            {(field) => <field.FormInput type="email" label="Email" placeholder="Enter your email" />}
                        </form.AppField>
                    </div>

                    <form.AppForm>
                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={isLoading} className="h-12 w-88.5 rounded-[5px]">
                                {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : "Save Changes"}
                            </Button>
                        </div>
                    </form.AppForm>
                </form>
            </div>
        </section>
    );
}

function SecurityPanel() {
    const form = useAppForm({
        defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSecuritySubmit = async () => {
        const values = form.state.values;
        if (values.newPassword !== values.confirmNewPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setIsLoading(true);
        setMessage(null);
        try {
            await apiClient.post("/auth/change-password", {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword
            });
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            form.reset();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="dashboard-card min-w-0 overflow-hidden">
            <div className="border-b border-border px-6 py-4">
                <h2 className="text-xl font-semibold">Security</h2>
            </div>

            {message && (
                <div className={`mx-6 mt-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                    {message.text}
                </div>
            )}

            <form
                className="grid gap-4 p-6 pt-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSecuritySubmit();
                }}
            >
                <form.AppField name="currentPassword">
                    {(field) => <field.FormInput type="password" label="Current Password" placeholder="Enter current password" />}
                </form.AppField>
                <form.AppField name="newPassword">
                    {(field) => <field.FormInput type="password" label="New Password" placeholder="Enter new password" />}
                </form.AppField>
                <form.AppField name="confirmNewPassword">
                    {(field) => <field.FormInput type="password" label="Confirm New Password" placeholder="Confirm new password" />}
                </form.AppField>
                <form.AppForm>
                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={isLoading} className="h-12 w-88.5 rounded-[5px]">
                            {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>
                </form.AppForm>
            </form>
        </section>
    );
}

function NotificationPanel() {
    const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(true);
    const [contentAlertsEnabled, setContentAlertsEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [items, setItems] = useState<NotificationDto[]>([]);

    const filteredItems = useMemo(
        () =>
            items.filter((item) => {
                if (item.category === "security" && !securityAlertsEnabled) {
                    return false;
                }
                if (item.category === "content" && !contentAlertsEnabled) {
                    return false;
                }
                return true;
            }),
        [items, securityAlertsEnabled, contentAlertsEnabled]
    );

    const loadNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetchNotifications(12);
            setItems(response.data);
            setUnreadCount(response.unreadCount);
        } catch {
            setItems([]);
            setUnreadCount(0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadNotifications();
    }, [loadNotifications]);

    const handleMarkAllRead = async () => {
        await markAllNotificationsRead();
        await loadNotifications();
    };

    return (
        <section className="dashboard-card min-w-0 overflow-hidden">
            <div className="border-b border-border px-6 py-4">
                <h2 className="text-xl font-semibold">Notification</h2>
            </div>

            <div className="space-y-4 p-6 pt-4">
                <div className="rounded-[10px] border border-border bg-muted/10 p-4">
                    <p className="text-base font-semibold">Implemented notification features</p>
                    <div className="mt-3 space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-3 py-2">
                            <div>
                                <p className="font-medium">Security alerts</p>
                                <p className="mt-1 text-muted-foreground">Notifies when password or account email changes.</p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={securityAlertsEnabled}
                                onClick={() => setSecurityAlertsEnabled((value) => !value)}
                                className="relative h-7 w-12.5 rounded-full bg-primary"
                            >
                                <span
                                    className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-background transition-all ${securityAlertsEnabled ? "right-1" : "left-1"}`}
                                />
                            </button>
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-3 py-2">
                            <div>
                                <p className="font-medium">Content activity alerts</p>
                                <p className="mt-1 text-muted-foreground">Notifies when songs and QR mappings are created or deleted.</p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={contentAlertsEnabled}
                                onClick={() => setContentAlertsEnabled((value) => !value)}
                                className="relative h-7 w-12.5 rounded-full bg-primary"
                            >
                                <span
                                    className={`absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-background transition-all ${contentAlertsEnabled ? "right-1" : "left-1"}`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-3 rounded-[10px] border border-border bg-muted/10 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-base font-semibold">Recent activity notifications</p>
                            <p className="text-xs text-muted-foreground">Security and content activity events from your admin actions.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" disabled={isLoading} onClick={() => void loadNotifications()}>
                                Refresh
                            </Button>
                            <Button type="button" variant="outline" size="sm" disabled={isLoading || unreadCount === 0} onClick={() => void handleMarkAllRead()}>
                                Mark all read {unreadCount > 0 ? `(${unreadCount})` : ""}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {isLoading ? (
                            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Loading notifications...
                            </p>
                        ) : null}

                        {!isLoading && filteredItems.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No notifications yet.</p>
                        ) : null}

                        {filteredItems.map((item) => (
                            <div key={item.id} className="rounded-md border border-border bg-background px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium">{item.title}</p>
                                    <span className={`text-[11px] uppercase ${item.isRead ? "text-muted-foreground" : "text-blue-600"}`}>
                                        {item.isRead ? "read" : "new"}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

import { Suspense } from "react";

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center p-8"><Loader2 className="size-8 animate-spin text-primary" /></div>}>
            <SettingsPageContent />
        </Suspense>
    );
}

function SettingsPageContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab") as SettingsTab | null;
    const focusImage = searchParams.get("focus") === "image";

    const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam || "profile");
    const [user, setUser] = useState<any>(null);

    // Sync tab when URL search params change (e.g. clicking header avatar from another page)
    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const panel = useMemo(() => {
        if (activeTab === "security") return <SecurityPanel />;
        if (activeTab === "notification") return <NotificationPanel />;
        return <ProfilePanel user={user} onUpdate={setUser} focusImage={focusImage} />;
    }, [activeTab, user]);

    return (
        <section className="w-full space-y-6">
            <div className="dashboard-page-header">
                <h1 className="dashboard-page-title">Settings</h1>
                <p className="dashboard-page-subtitle">Customize your experience and account details.</p>
            </div>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
                <SettingsNav activeTab={activeTab} onSelect={setActiveTab} />
                {panel}
            </div>
        </section>
    );
}
