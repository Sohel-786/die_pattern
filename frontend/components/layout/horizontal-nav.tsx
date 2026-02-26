"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2,
  MapPin,
  Users,
  Layers,
  Package,
  FileText,
  ShoppingCart,
  ArrowDownLeft,
  ClipboardCheck,
  BarChart3,
  LayoutDashboard,
  Settings,
  Briefcase,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUserPermissions } from "@/hooks/use-settings";

const navigationSections = {
  dashboard: [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      getColor: (active: boolean) => active ? "text-blue-600" : "text-blue-500",
      permission: "viewDashboard",
    },
  ],
  masterEntries: [
    {
      href: "/companies",
      label: "Company",
      icon: Building2,
      getColor: (active: boolean) => active ? "text-violet-600" : "text-violet-500",
      permission: "manageCompany",
    },
    {
      href: "/locations",
      label: "Location",
      icon: MapPin,
      getColor: (active: boolean) => active ? "text-emerald-600" : "text-emerald-500",
      permission: "manageLocation",
    },
    {
      href: "/parties",
      label: "Parties",
      icon: Users,
      getColor: (active: boolean) => active ? "text-orange-600" : "text-orange-500",
      permission: "manageParty",
    },
    {
      href: "/masters",
      label: "Masters",
      icon: Layers,
      getColor: (active: boolean) => active ? "text-teal-600" : "text-teal-500",
      permission: "viewMaster",
    },
    {
      href: "/items",
      label: "Items",
      icon: Package,
      getColor: (active: boolean) => active ? "text-indigo-600" : "text-indigo-500",
      permission: "manageItem",
    },
  ],
  transactionEntries: [
    {
      href: "/purchase-indents",
      label: "PI",
      icon: FileText,
      getColor: (active: boolean) => active ? "text-amber-600" : "text-amber-500",
      permission: "viewPI",
    },
    {
      href: "/purchase-orders",
      label: "PO",
      icon: ShoppingCart,
      getColor: (active: boolean) => active ? "text-rose-600" : "text-rose-500",
      permission: "viewPO",
    },
    {
      href: "/inwards",
      label: "Inward",
      icon: ArrowDownLeft,
      getColor: (active: boolean) => active ? "text-green-600" : "text-green-500",
      permission: "viewInward",
    },
    {
      href: "/quality-control",
      label: "QC",
      icon: ClipboardCheck,
      getColor: (active: boolean) => active ? "text-purple-600" : "text-purple-500",
      permission: "viewQC",
    },
    {
      href: "/job-works",
      label: "Job Work",
      icon: Briefcase,
      getColor: (active: boolean) => active ? "text-teal-600" : "text-teal-500",
      permission: "viewMovement",
    },
    {
      href: "/movements/outward",
      label: "Outward",
      icon: ArrowUpRight,
      getColor: (active: boolean) => active ? "text-cyan-600" : "text-cyan-500",
      permission: "viewMovement",
    },
  ],
  qcEntries: [],
  other: [
    {
      href: "/reports",
      label: "Reports",
      icon: BarChart3,
      getColor: (active: boolean) => active ? "text-amber-600" : "text-amber-500",
      permission: "viewReports",
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      getColor: (active: boolean) => active ? "text-slate-600" : "text-slate-500",
      permission: "accessSettings",
    },
  ],
};

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  getColor: (active: boolean) => string;
  permission: string;
}

interface HorizontalNavProps {
  isExpanded: boolean;
}

export function HorizontalNav({ isExpanded }: HorizontalNavProps) {
  const pathname = usePathname();
  const { data: permissions } = useCurrentUserPermissions();

  const filterItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!permissions) return false;
      const key = item.permission as keyof typeof permissions;
      return !!permissions[key];
    });
  };

  const visibleDashboard = filterItems(navigationSections.dashboard);
  const visibleMasterEntries = filterItems(navigationSections.masterEntries);
  const visibleTransactions = filterItems(navigationSections.transactionEntries);
  const visibleQC = filterItems(navigationSections.qcEntries);
  const visibleOther = filterItems(navigationSections.other);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <Link key={item.href} href={item.href}>
        <div
          className={cn(
            "flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all duration-500 min-w-[80px] group cursor-pointer relative",
            "border-[1.5px]",
            isActive
              ? "bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] scale-105 -translate-y-1.5 border-primary-600"
              : "border-primary-600/20 hover:border-primary-600/40 hover:bg-white hover:shadow-2xl hover:-translate-y-1 active:scale-95",
          )}
        >
          <div className={cn("transition-all duration-500 flex items-center justify-center", isActive ? "scale-110" : "group-hover:scale-110")}>
            <Icon
              className={cn("w-7 h-7 transition-colors duration-300", item.getColor(isActive))}
              strokeWidth={1.5}
            />
          </div>
          <span className={cn(
            "text-[10px] uppercase font-extrabold text-center whitespace-nowrap transition-colors tracking-widest",
            isActive ? "text-primary-700" : "text-secondary-400 group-hover:text-primary-600",
          )}>
            {item.label}
          </span>
          {isActive && (
            <motion.div
              layoutId="activeTabIndicatorDP"
              className="absolute -bottom-1.5 inset-x-0 mx-auto w-10 h-1 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 shadow-[0_2px_10px_rgba(59,130,246,0.3)]"
              transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
            />
          )}
        </div>
      </Link>
    );
  };

  const renderDivider = () => <div className="self-stretch w-px bg-secondary-200 mx-1 my-3" />;

  const renderSectionLabel = (label: string) => (
    <h3 className="text-[10px] font-bold text-primary-600 uppercase tracking-widest px-3 mb-1">{label}</h3>
  );

  return (
    <nav className="w-full bg-white border-b border-secondary-200 shadow-sm sticky top-14 z-30">
      <div className={cn(
        "transition-all duration-300 ease-in-out px-4",
        isExpanded
          ? "max-h-[400px] opacity-100 translate-y-0 py-3"
          : "max-h-0 opacity-0 -translate-y-4 overflow-hidden py-0",
      )}>
        <div className="overflow-x-auto pb-2 scrollbar-hide pl-2 pr-2">
          <div className="flex items-end gap-3 min-w-max">

            {/* Dashboard */}
            {visibleDashboard.length > 0 && (
              <div className="flex items-center gap-3">
                {visibleDashboard.map(renderNavItem)}
                {(visibleMasterEntries.length > 0 || visibleTransactions.length > 0 || visibleQC.length > 0 || visibleOther.length > 0) && renderDivider()}
              </div>
            )}

            {/* Masters */}
            {visibleMasterEntries.length > 0 && (
              <div className="flex flex-col items-center gap-1">
                {renderSectionLabel("Master Entry")}
                <div className="flex items-center gap-3">
                  <div className="flex gap-3">{visibleMasterEntries.map(renderNavItem)}</div>
                  {(visibleTransactions.length > 0 || visibleQC.length > 0 || visibleOther.length > 0) && renderDivider()}
                </div>
              </div>
            )}

            {/* Transactions */}
            {visibleTransactions.length > 0 && (
              <div className="flex flex-col items-center gap-1">
                {renderSectionLabel("Transactions")}
                <div className="flex items-center gap-3">
                  <div className="flex gap-3">{visibleTransactions.map(renderNavItem)}</div>
                  {(visibleQC.length > 0 || visibleOther.length > 0) && renderDivider()}
                </div>
              </div>
            )}

            {/* QC */}
            {visibleQC.length > 0 && (
              <div className="flex flex-col items-center gap-1">
                {renderSectionLabel("Quality")}
                <div className="flex items-center gap-3">
                  <div className="flex gap-3">{visibleQC.map(renderNavItem)}</div>
                  {visibleOther.length > 0 && renderDivider()}
                </div>
              </div>
            )}

            {/* Other */}
            {visibleOther.length > 0 && (
              <div className="flex gap-3">{visibleOther.map(renderNavItem)}</div>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
}
