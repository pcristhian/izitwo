"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardContent from "./dashboardContent";

export default function Dashboard() {
    const router = useRouter();

    useEffect(() => {
        const isLoggedIn = sessionStorage.getItem("isLoggedIn");

        if (!isLoggedIn) {
            router.replace("/components/loginForm"); // reemplaza la ruta en lugar de push
        }
    }, [router]);

    return (
        <>
            <DashboardContent />
        </>
    );
}
