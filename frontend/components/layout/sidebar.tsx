"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Building2,
    MapPin,
    Users,
    Settings,
    LogOut,
    ChevronDown,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
    Layers,
    ClipboardList,
    ShoppingCart,
    ArrowLeftRight,
    ShieldCheck,
    History,
    Tag,
    Hammer,
    UserCheck,
    Boxes
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SIDEBAR_WIDTH_EXPANDED = 280;
const SIDEBAR_WIDTH_COLLAPSED = 80;

interface NavLink {
    href: string;
    label: string;
    icon: any;
}

const masterEntries: NavLink[] = [
    { href: "/masters/companies", label: "Company", icon: Building2 },
    { href: "/masters/locations", label: "Location", icon: MapPin },
    { href: "/masters/parties", label: "Parties", icon: Users },
    { href: "/masters/types", label: "Item Types", icon: Layers },
    { href: "/masters/statuses", label: "Statuses", icon: Tag },
    { href: "/masters/materials", label: "Materials", icon: Hammer },
    { href: "/masters/owners", label: "Owner Types", icon: UserCheck },
    { href: "/patterns", label: "Die & Patterns", icon: Boxes },
];

const transactionEntries: NavLink[] = [
    { href: "/opening", label: "Opening Entry", icon: ClipboardList },
    { href: "/indent", label: "Purchase Indent", icon: ShoppingCart },
    { href: "/order", label: "Purchase Order", icon: ShoppingCart },
    { href: "/movement", label: "Movements", icon: ArrowLeftRight },
];

export function Sidebar({ expanded, onExpandChange }: { expanded: boolean; onExpandChange: (v: boolean) => void }) {
    const pathname = usePathname();
    const [masterOpen, setMasterOpen] = useState(true);
    const [transOpen, setTransOpen] = useState(true);

    const linkClass = (href: string) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
            isActive
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "text-secondary-600 hover:bg-secondary-100/50 hover:text-primary"
        );
    };

    const navItem = (item: NavLink) => (
        <Link key={item.href} href={item.href}>
            <motion.div
                whileHover={{ x: 4 }}
                className={cn(linkClass(item.href), !expanded && "justify-center px-0")}
            >
                <item.icon className="w-5 h-5 shrink-0" />
                {expanded && <span>{item.label}</span>}
            </motion.div>
        </Link>
    );

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 h-screen bg-white border-r border-secondary-100 z-50 transition-all duration-300 ease-in-out shadow-xl overflow-hidden flex flex-col",
                expanded ? "w-[280px]" : "w-[80px]"
            )}
        >
            {/* Brand */}
            <div className="h-20 flex items-center px-6 border-b border-secondary-100 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
                    <Settings className="w-6 h-6 animate-spin-slow" />
                </div>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-3 font-bold text-lg text-secondary-900 tracking-tight"
                    >
                        DPMS <span className="text-primary text-xs font-normal">v1.0</span>
                    </motion.div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 custom-scrollbar">
                <Link href="/dashboard">
                    <div className={cn(linkClass("/dashboard"), !expanded && "justify-center px-0")}>
                        <LayoutDashboard className="w-5 h-5 shrink-0" />
                        {expanded && <span>Dashboard</span>}
                    </div>
                </Link>

                {/* Masters */}
                <div className="pt-2">
                    {expanded ? (
                        <>
                            <button
                                onClick={() => setMasterOpen(!masterOpen)}
                                className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-secondary-400 uppercase tracking-wider hover:text-secondary-600 transition-colors"
                            >
                                Masters
                                {masterOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            <AnimatePresence>
                                {masterOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="space-y-1 mt-1 overflow-hidden"
                                    >
                                        {masterEntries.map(navItem)}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 pt-2 border-t border-secondary-50">
                            {masterEntries.map(item => (
                                <Link key={item.href} href={item.href} title={item.label}>
                                    <div className={cn(linkClass(item.href), "justify-center px-0 w-12 h-12")}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Transactions */}
                <div className="pt-2">
                    {expanded ? (
                        <>
                            <button
                                onClick={() => setTransOpen(!transOpen)}
                                className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-secondary-400 uppercase tracking-wider hover:text-secondary-600 transition-colors"
                            >
                                Transactions
                                {transOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            <AnimatePresence>
                                {transOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="space-y-1 mt-1 overflow-hidden"
                                    >
                                        {transactionEntries.map(navItem)}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 pt-2 border-t border-secondary-50">
                            {transactionEntries.map(item => (
                                <Link key={item.href} href={item.href} title={item.label}>
                                    <div className={cn(linkClass(item.href), "justify-center px-0 w-12 h-12")}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Global/Single Links */}
                <div className="pt-2 border-t border-secondary-100">
                    {navItem({ href: "/qc", label: "QC Approval", icon: ShieldCheck })}
                    {navItem({ href: "/history", label: "Change History", icon: History })}
                    {navItem({ href: "/settings", label: "Settings", icon: Settings })}
                </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-secondary-100 bg-secondary-50/50">
                <Button
                    variant="ghost"
                    className={cn("w-full text-red-500 hover:bg-red-50 hover:text-red-600", !expanded && "px-0 justify-center")}
                >
                    <LogOut className="w-5 h-5" />
                    {expanded && <span className="ml-3">Logout</span>}
                </Button>
                <button
                    onClick={() => onExpandChange(!expanded)}
                    className="mt-4 flex items-center justify-center w-full py-2 hover:bg-secondary-200/50 rounded-lg text-secondary-400"
                >
                    {expanded ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                </button>
            </div>
        </aside>
    );
}
