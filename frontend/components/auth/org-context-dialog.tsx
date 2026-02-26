"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, MapPin } from "lucide-react";
import { CompanyLocationAccess, SelectedOrgContext } from "@/contexts/location-context";

type Props = {
  open: boolean;
  onClose?: () => void;
  access: CompanyLocationAccess[];
  onSelect: (sel: SelectedOrgContext) => void;
  closeDisabled?: boolean;
};

export function OrgContextDialog({ open, onClose, access, onSelect, closeDisabled = true }: Props) {
  const companies = useMemo(
    () =>
      (access || [])
        .map((c) => ({ id: c.companyId, name: c.companyName, locations: c.locations || [] }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [access],
  );

  const hasMultipleCompanies = companies.length > 1;

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    // Default selection when dialog opens
    if (companies.length === 1) {
      const c = companies[0];
      setCompanyId(c.id);
      if (c.locations.length === 1) setLocationId(c.locations[0].id);
      else setLocationId(null);
    } else {
      setCompanyId(null);
      setLocationId(null);
    }
  }, [open, companies]);

  const availableLocations = useMemo(() => {
    const c = companies.find((x) => x.id === companyId);
    return (c?.locations || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, companyId]);

  useEffect(() => {
    // reset location if company changes
    setLocationId(null);
  }, [companyId]);

  const canConfirm = companyId != null && locationId != null;

  const title = hasMultipleCompanies ? "Select Company & Location" : "Select Location";

  return (
    <Dialog
      isOpen={open}
      onClose={onClose || (() => {})}
      title={title}
      size="md"
      closeOnBackdropClick={!closeDisabled}
      closeButtonDisabled={closeDisabled}
    >
      <div className="space-y-5">
        <div className="text-sm text-secondary-600">
          Choose where you want to work. All masters, transactions, and reports will be scoped to this location.
        </div>

        {hasMultipleCompanies && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-secondary-500" /> Company
            </label>
            <select
              className="w-full h-11 rounded-lg border border-secondary-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              value={companyId ?? ""}
              onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="" disabled>
                Select company...
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-secondary-500" /> Location
          </label>
          <select
            className="w-full h-11 rounded-lg border border-secondary-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 disabled:bg-secondary-50"
            value={locationId ?? ""}
            onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : null)}
            disabled={companyId == null}
          >
            <option value="" disabled>
              {companyId == null ? "Select company first..." : "Select location..."}
            </option>
            {availableLocations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {onClose && !closeDisabled && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button disabled={!canConfirm} onClick={() => onSelect({ companyId: companyId!, locationId: locationId! })}>
            Continue
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

