
// Redirecting to Signin Page as its a Dashboard and we want to make sure only authenticated users can access it.

import { redirect } from "next/navigation";

export default function Home() {
    redirect("/admin/signin");
}