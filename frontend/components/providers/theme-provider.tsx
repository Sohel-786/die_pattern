"use client";

import { useEffect } from "react";
import api from "@/lib/api";
import { applyPrimaryColor } from "@/lib/theme";

/**
 * Fetches app settings and applies primary color to the document.
 * Ensures all primary-* shades across the app derive from Settings > Software.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initial fetch of theme-related data is handled by the page or other components
    // and context-based theme application below.

    // Context-based theme application
    const updateTheme = () => {
      const selRaw = localStorage.getItem("selectedOrgContext");
      if (selRaw) {
        try {
          const sel = JSON.parse(selRaw);
          if (sel?.companyId) {
            api.get(`/companies/${sel.companyId}`).then(res => {
              const color = res.data?.data?.themeColor;
              applyPrimaryColor(color || "#0d6efd");
            }).catch(() => {
              applyPrimaryColor("#0d6efd");
            });
            return;
          }
        } catch { }
      }
      applyPrimaryColor("#0d6efd");
    };

    updateTheme();
    window.addEventListener("orgContextChanged", updateTheme);
    return () => window.removeEventListener("orgContextChanged", updateTheme);
  }, []);

  return <>{children}</>;
}
