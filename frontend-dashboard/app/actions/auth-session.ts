"use server";

import { cookies } from "next/headers";

const ADMIN_TOKEN_COOKIE = "adminToken";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

export async function setAdminSessionCookie(token: string): Promise<void> {
    if (!token) {
        throw new Error("Missing token for session cookie");
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_TOKEN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: ONE_WEEK_SECONDS,
    });
}

export async function clearAdminSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_TOKEN_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0),
    });
}