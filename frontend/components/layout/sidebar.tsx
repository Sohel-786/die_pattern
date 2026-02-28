"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Building2,
  MapPin,
  Users,
  Layers,
  FileText,
  ShoppingCart,
  ArrowLeftRight,
  ClipboardCheck,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  LogOut,
  FolderOpen,
  Briefcase,
  ArrowUpRight
} from "lucide-react";
import { Role, UserPermission } from "@/types";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAppSettings, useCurrentUserPermissions, useCompany } from "@/hooks/use-settings";
import { useLogout } from "@/hooks/use-auth-mutations";

import { useLocationContext } from "@/contexts/location-context";

interface SidebarProps {
  userRole: Role;
  currentUser?: any;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  sidebarWidth: number;
}

const SidebarText = ({ show, children, className = "" }: { show: boolean; children: React.ReactNode; className?: string }) => (
  <AnimatePresence>
    {show && (
      <motion.span
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -5 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`whitespace-nowrap ml-3 ${className}`}
      >
        {children}
      </motion.span>
    )}
  </AnimatePresence>
);

export function Sidebar({ userRole, expanded, onExpandChange, sidebarWidth }: SidebarProps) {
  const pathname = usePathname();
  const { data: appSettings } = useAppSettings();
  const { data: permissions } = useCurrentUserPermissions();
  const { selected, allowedAccess, getAllPairs } = useLocationContext();
  const { data: currentCompany } = useCompany(selected?.companyId);
  const pairs = getAllPairs(allowedAccess);
  const currentPair = selected
    ? pairs.find((p) => p.companyId === selected.companyId && p.locationId === selected.locationId)
    : null;

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    master: true,
    indent: false,
    order: false,
    transaction: true,
    qc: false,
    report: false
  });
  const [isHovered, setIsHovered] = useState(false);

  const HOVER_EXPANDED_WIDTH = 256;
  const showFullSidebar = expanded || isHovered;
  const currentWidth = expanded ? sidebarWidth : isHovered ? HOVER_EXPANDED_WIDTH : sidebarWidth;

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const logoutMutation = useLogout();
  const handleLogout = () => logoutMutation.mutate();

  const portalLabel = userRole === Role.ADMIN ? "Admin" : userRole === Role.MANAGER ? "Manager" : "User";

  const linkClass = (href: string, iconOnly = false) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    const base = "flex items-center gap-2 rounded-md transition-all text-sm cursor-pointer overflow-hidden " +
      (isActive ? "bg-primary-50 text-primary-600 font-medium shadow-sm" : "text-secondary-600 hover:bg-secondary-50 hover:text-primary-600");
    return iconOnly ? `${base} justify-center px-2 py-2.5` : `${base} px-4 py-2.5`;
  };

  const sectionHeaderClass = "flex items-center justify-between w-full px-3 py-1.5 rounded-md text-secondary-700 hover:bg-secondary-50 transition-all text-sm font-medium overflow-hidden";

  const renderMenuItem = (href: string, label: string, icon: any) => {
    const Icon = icon;
    return (
      <Link href={href} key={href}>
        <motion.div whileHover={showFullSidebar ? { x: 2 } : {}} className={linkClass(href, !showFullSidebar)}>
          <Icon className="w-5 h-5 shrink-0" />
          <SidebarText show={showFullSidebar} className="-ml-1">{label}</SidebarText>
        </motion.div>
      </Link>
    );
  };

  const renderSubMenuItem = (href: string, label: string, icon: any) => {
    const Icon = icon;
    return (
      <Link href={href} key={href}>
        <motion.div whileHover={{ x: 2 }} className={linkClass(href, false)}>
          <Icon className="w-5 h-5 shrink-0" />
          <SidebarText show={showFullSidebar} className="-ml-1">{label}</SidebarText>
        </motion.div>
      </Link>
    );
  };

  return (
    <aside
      className="h-screen fixed left-0 top-0 flex flex-col bg-white border-r border-secondary-200 shadow-lg z-50 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ width: currentWidth }}
      onMouseEnter={() => !expanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`shrink-0 border-b border-secondary-200 bg-gradient-to-r from-primary-600 to-primary-700 flex transition-all duration-300 ${showFullSidebar ? "min-h-[5.5rem] px-4 py-3 items-center gap-3" : "min-h-[3.5rem] px-2 py-2 items-center justify-center"}`}>
        {showFullSidebar ? (
          <>
            <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 overflow-hidden">
              <SidebarText
                show={showFullSidebar}
                className="!ml-0 text-base font-bold text-white/90 truncate leading-tight block"
              >
                {currentCompany?.name || currentPair?.companyName || "Aira Euro"}
              </SidebarText>
              <SidebarText
                show={showFullSidebar}
                className="!ml-0 text-sm font-semibold text-white truncate leading-tight block"
              >
                {appSettings?.softwareName || "Pattern Management"}
              </SidebarText>
              <SidebarText
                show={showFullSidebar}
                className="!ml-0 text-xs text-white/90 leading-tight block"
              >
                {portalLabel}
              </SidebarText>
            </div>
            <button
              type="button"
              onClick={() => onExpandChange(!expanded)}
              className="shrink-0 p-1.5 rounded-md hover:bg-white/20 text-white transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onExpandChange(true)}
            className="shrink-0 p-2 rounded-md hover:bg-white/20 text-white transition-colors"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 scrollbar-hide">
        <div className="space-y-0.5">
          {permissions?.viewDashboard && renderMenuItem("/dashboard", "Dashboard", LayoutDashboard)}

          {/* Master Entry */}
          {permissions?.viewMaster && (
            <div className="pt-1">
              {showFullSidebar ? (
                <>
                  <button onClick={() => toggleMenu('master')} className={sectionHeaderClass}>
                    <div className="flex items-center gap-1">
                      <FolderOpen className="w-4 h-4 text-secondary-500" />
                      <SidebarText show={showFullSidebar} className="-ml-1">Master Entry</SidebarText>
                    </div>
                    {openMenus.master ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {openMenus.master && (
                    <div className="pl-1 mt-0.5 space-y-0.5">
                      {permissions?.manageCompany && renderSubMenuItem("/companies", "Company Master", Building2)}
                      {permissions?.manageLocation && renderSubMenuItem("/locations", "Location Master", MapPin)}
                      {permissions?.manageParty && renderSubMenuItem("/parties", "Party Master", Users)}
                      {renderSubMenuItem("/masters", "Other Masters", Layers)}
                      {permissions?.manageItem && renderSubMenuItem("/items", "Item Entry", Package)}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  {permissions?.manageItem && renderMenuItem("/items", "Items", Package)}
                </div>
              )}
            </div>
          )}

          {/* Transactions Section: PI, PO, Inward, Job Work, Outward, QC as separate options */}
          {(permissions?.viewPI || permissions?.viewPO || permissions?.viewInward || permissions?.viewQC || permissions?.viewMovement) && (
            <div className={`pt-1 ${showFullSidebar ? "border-t border-secondary-100 mt-1" : ""}`}>
              {showFullSidebar ? (
                <>
                  <button onClick={() => toggleMenu('transaction')} className={sectionHeaderClass}>
                    <div className="flex items-center gap-1">
                      <ArrowLeftRight className="w-4 h-4 text-secondary-500" />
                      <SidebarText show={showFullSidebar} className="-ml-1">Transactions</SidebarText>
                    </div>
                    {openMenus.transaction ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {openMenus.transaction && (
                    <div className="pl-1 mt-0.5 space-y-0.5">
                      {permissions?.viewPI && renderSubMenuItem("/purchase-indents", "Purchase Indent (PI)", FileText)}
                      {permissions?.viewPO && renderSubMenuItem("/purchase-orders", "Purchase Order (PO)", ShoppingCart)}
                      {permissions?.viewInward && renderSubMenuItem("/inwards", "Inward", ArrowLeftRight)}
                      {permissions?.viewQC && renderSubMenuItem("/quality-control", "QC", ClipboardCheck)}
                      {permissions?.viewMovement && renderSubMenuItem("/job-works", "Job Work", Briefcase)}
                      {permissions?.viewMovement && renderSubMenuItem("/movements/outward", "Outward", ArrowUpRight)}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  {permissions?.viewPI && renderMenuItem("/purchase-indents", "PI", FileText)}
                  {permissions?.viewPO && renderMenuItem("/purchase-orders", "PO", ShoppingCart)}
                  {permissions?.viewInward && renderMenuItem("/inwards", "Inward", ArrowLeftRight)}
                  {permissions?.viewQC && renderMenuItem("/quality-control", "QC", ClipboardCheck)}
                  {permissions?.viewMovement && renderMenuItem("/job-works", "Job Work", Briefcase)}
                  {permissions?.viewMovement && renderMenuItem("/movements/outward", "Outward", ArrowUpRight)}
                </div>
              )}
            </div>
          )}


          {/* Reports & Settings */}
          <div className={`pt-1 ${showFullSidebar ? "border-t border-secondary-100 mt-1" : ""} space-y-0.5`}>
            {permissions?.viewReports && renderMenuItem("/reports", "Reports", BarChart3)}
            {permissions?.accessSettings && renderMenuItem("/settings", "Settings", Settings)}
          </div>
        </div>
      </nav>

      <div className="shrink-0 p-2 border-t border-secondary-200 bg-secondary-50">
        <Button variant="ghost" size="sm" className={`w-full hover:bg-red-50 hover:text-red-600 ${!showFullSidebar ? "justify-center px-2" : "justify-start"}`} onClick={handleLogout}>
          <LogOut className="w-5 h-5 shrink-0" />
          <SidebarText show={showFullSidebar} className="-ml-1 text-red-600">Logout</SidebarText>
        </Button>
      </div>
    </aside>
  );
}
