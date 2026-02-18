"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { User } from "@/types";
import { Loader2 } from "lucide-react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarExpanded, setSidebarExpanded] = useState(true);

    useEffect(() => {
        const validateAndGetUser = async () => {
            if (pathname === "/login") {
                setLoading(false);
                return;
            }

            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch {
                    localStorage.removeItem("user");
                }
            }

            try {
                const response = await api.get("/auth/me");
                if (response.data) {
                    setUser(response.data);
                    localStorage.setItem("user", JSON.stringify(response.data));
                }
            } catch (err) {
                localStorage.removeItem("user");
                setUser(null);
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };

        validateAndGetUser();
    }, [router, pathname]);

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-secondary-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-secondary-500 font-medium animate-pulse">Initializing Security...</p>
                </div>
            </div>
        );
    }

    if (pathname === "/login" || !user) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-secondary-100/30">
            <Sidebar expanded={sidebarExpanded} onExpandChange={setSidebarExpanded} />
            <main
                className="transition-all duration-300 ease-in-out min-h-screen"
                style={{ paddingLeft: sidebarExpanded ? 280 : 80 }}
            >
                <header className="h-20 glass sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-secondary-900 capitalize">
                        {pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-bold text-secondary-900">
                                {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-secondary-500">{user.role}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {user.firstName[0]}
                            {user.lastName[0]}
                        </div>
                    </div>
                </header>
                <div className="p-8">
                    <div className="max-w-7xl mx-auto animate-fade-in">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
