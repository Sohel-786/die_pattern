"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Building2,
  Shield,
  Users,
  Upload,
  Save,
  Loader2,
  X,
  Trash2,
  AlertTriangle,
  LayoutDashboard,
  Database,
  Truck,
  BarChart3,
  FileText,
  ShoppingCart
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Role } from "@/types";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useAppSettings,
  useUpdateAppSettings,
  useUploadCompanyLogo,
  useUserPermissions,
  useUpdateUserPermissions,
  useCurrentUserPermissions,
  useCompaniesActive,
  useLocationsActive,
  useUserLocationAccess,
  useUpdateUserLocationAccess,
  type CompanyLocationAccessItem,
} from "@/hooks/use-settings";
import { useUsers, useCreateUser, useUpdateUser } from "@/hooks/use-users";
// Removed useDivisions import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, UserPermission } from "@/types";
import { Plus, Edit2, Search, Eye, EyeOff, MapPin } from "lucide-react";
import { applyPrimaryColor } from "@/lib/theme";
import { useSoftwareProfileDraft } from "@/contexts/software-profile-draft-context";
import {
  AVATAR_OPTIONS,
  DEFAULT_AVATAR_PATH,
  AVATAR_PRESETS_PATH,
} from "@/lib/avatar-options";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Stable empty array for location access so useEffect dependency does not change every render when query is disabled. */
const EMPTY_LOCATION_ACCESS: CompanyLocationAccessItem[] = [];

const tabs = [
  { id: "software", label: "Software", icon: Building2 },
  { id: "users", label: "User Management", icon: Users },
  { id: "access", label: "Access", icon: Shield },
] as const;

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z
    .string()
    .refine((val) => !val || val.length === 0 || val.length >= 1, {
      message: "Password cannot be empty",
    })
    .optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.nativeEnum(Role),
  isActive: z.boolean().optional(),
  avatar: z.string().nullable().optional(),
  mobileNumber: z.string().optional().nullable(),
  companyId: z.number().optional(),
  locationId: z.number().optional(),
}).superRefine((data, ctx) => {
  const isMandatory = data.role === Role.USER || data.role === Role.MANAGER;
  const mobile = data.mobileNumber?.trim();

  // Mandatory check for User/Manager
  if (isMandatory && (!mobile || mobile.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Mobile number is mandatory for User and Manager",
      path: ["mobileNumber"],
    });
    return;
  }

  // Regex check for Indian Phone Number if provided
  if (mobile && mobile.length > 0) {
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(mobile)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid 10-digit Indian mobile number",
        path: ["mobileNumber"],
      });
    }
  }
});
type UserForm = z.infer<typeof userSchema>;

const permissionLabels: Record<string, string> = {
  viewDashboard: "View Dashboard",

  viewMaster: "View Master Data",
  manageItem: "Manage Items",
  manageItemType: "Manage Item Types",
  manageMaterial: "Manage Materials",
  manageItemStatus: "Manage Item Statuses",
  manageOwnerType: "Manage Owner Types",
  manageParty: "Manage Parties",
  manageLocation: "Manage Locations",
  manageCompany: "Manage Companies",

  viewPI: "View PI",
  createPI: "Create PI",
  editPI: "Edit PI",
  approvePI: "Approve PI",

  viewPO: "View PO",
  createPO: "Create PO",
  editPO: "Edit PO",
  approvePO: "Approve PO",

  viewInward: "View Inwards",
  createInward: "Create Inwards",
  editInward: "Edit Inwards",

  viewQC: "View QC",
  createQC: "Add QC",
  editQC: "Edit QC",
  approveQC: "Approve QC",

  viewMovement: "View Movements",
  createMovement: "Create Movements",

  manageChanges: "Manage Changes",
  revertChanges: "Revert Changes",
  viewReports: "View Reports",
  manageUsers: "Manage Users",
  accessSettings: "Access Settings",
};

const permissionKeys = Object.keys(
  permissionLabels,
) as (keyof typeof permissionLabels)[];

function permissionsFlagsEqual(
  a: UserPermission | null | undefined,
  b: UserPermission | null | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (!a || !b) return false;

  for (const key of Object.keys(permissionLabels)) {
    if ((a as any)[key] !== (b as any)[key]) return false;
  }

  const aNav = a.navigationLayout || "SIDEBAR";
  const bNav = b.navigationLayout || "SIDEBAR";
  if (aNav !== bNav) return false;

  return true;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  const profileDraftContext = useSoftwareProfileDraft();
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["id"]>("software");

  // Software (company profile) – all fields are draft until Save
  const { data: appSettings, isLoading: settingsLoading } = useAppSettings();
  const updateSettings = useUpdateAppSettings();
  const [softwareName, setSoftwareName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0d6efd");

  // Access
  // Access
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { data: userPermissionsData, isLoading: permissionsLoading } = useUserPermissions(selectedUserId || undefined);
  const updateUserPermissionsMutation = useUpdateUserPermissions();
  const [localPermissions, setLocalPermissions] = useState<UserPermission | null>(null);

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const resetSystem = useMutation({
    mutationFn: async () => {
      const res = await api.post("/settings/reset-system");
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "System reset successfully");
      setIsResetDialogOpen(false);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to reset system");
    },
  });

  // Users
  const { data: users } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: companies = [] } = useCompaniesActive();
  const { data: locations = [] } = useLocationsActive();
  const { data: userLocationAccessData } = useUserLocationAccess(selectedUserId ?? null);
  const userLocationAccess = userLocationAccessData ?? EMPTY_LOCATION_ACCESS;
  const updateLocationAccess = useUpdateUserLocationAccess(selectedUserId ?? 0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      role: Role.USER,
      isActive: true,
      avatar: null as string | null,
    },
  });

  // Admin-only (or anyone with accessSettings permission)
  const {
    data: currentUserPermissions,
    isLoading: currentUserPermissionsLoading,
  } = useCurrentUserPermissions();

  useEffect(() => {
    if (
      !userLoading &&
      !currentUserPermissionsLoading &&
      currentUser &&
      currentUserPermissions
    ) {
      if (
        currentUser.role !== Role.ADMIN &&
        !currentUserPermissions.accessSettings
      ) {
        router.push("/dashboard");
      }
    }
  }, [
    currentUser,
    currentUserPermissions,
    userLoading,
    currentUserPermissionsLoading,
    router,
  ]);

  const softwareSyncedFromServer = useRef(false);
  useEffect(() => {
    if (appSettings) {
      setSoftwareName(appSettings.softwareName || "");
      setPrimaryColor(appSettings.primaryColor || "#0d6efd");
      softwareSyncedFromServer.current = true;
    }
  }, [appSettings]);

  // Live draft in Sidebar/UI – set when on Settings page (depend on setDraft only, not whole context, to avoid loop when setDraft updates context)
  const setDraft = profileDraftContext?.setDraft;
  useEffect(() => {
    if (!setDraft) return;
    setDraft({
      softwareName,
      primaryColor,
    });
  }, [
    setDraft,
    softwareName,
    primaryColor,
  ]);

  // Clear draft when leaving Settings page
  useEffect(() => {
    return () => {
      setDraft?.(null);
    };
  }, [setDraft]);

  // Live primary color – reflect in UI without saving
  useEffect(() => {
    applyPrimaryColor(primaryColor || undefined);
  }, [primaryColor]);

  useEffect(() => {
    if (userPermissionsData && userPermissionsData.permissions) {
      setLocalPermissions(JSON.parse(JSON.stringify(userPermissionsData.permissions)));
    } else {
      setLocalPermissions(null);
    }
  }, [userPermissionsData]);

  const savedCompanyName = appSettings?.companyName ?? "";
  const savedSoftwareName = appSettings?.softwareName ?? "";
  const savedPrimaryColor = appSettings?.primaryColor ?? "#0d6efd";
  const hasUnsavedSoftware =
    softwareSyncedFromServer.current &&
    (softwareName !== savedSoftwareName ||
      primaryColor !== savedPrimaryColor);
  const hasUnsavedPermissions =
    userPermissionsData != null &&
    localPermissions != null &&
    (!permissionsFlagsEqual(localPermissions, userPermissionsData.permissions));

  const revertSoftware = useCallback(() => {
    setSoftwareName(savedSoftwareName);
    setPrimaryColor(savedPrimaryColor);
    applyPrimaryColor(savedPrimaryColor || undefined);
    setDraft?.(null);
  }, [savedSoftwareName, savedPrimaryColor, setDraft]);

  const [localLocationAccess, setLocalLocationAccess] = useState<{ companyId: number; companyName: string; locationId: number; locationName: string }[]>([]);
  const [locationAccessAddCompanyId, setLocationAccessAddCompanyId] = useState<number | "">("");
  const [locationAccessAddLocationId, setLocationAccessAddLocationId] = useState<number | "">("");

  useEffect(() => {
    if (!isUserFormOpen) {
      reset({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        role: Role.USER,
        isActive: true,
        avatar: null,
        companyId: undefined,
        locationId: undefined,
      });
    }
  }, [isUserFormOpen, reset]);

  useEffect(() => {
    const flat = (userLocationAccess as CompanyLocationAccessItem[]).flatMap((c) =>
      (c.locations || []).map((l) => ({
        companyId: c.companyId,
        companyName: c.companyName,
        locationId: l.id,
        locationName: l.name,
      }))
    );
    setLocalLocationAccess(flat);
  }, [selectedUserId, userLocationAccess]);

  const initialLocationAccessFlat = useMemo(() => {
    return (userLocationAccess as CompanyLocationAccessItem[]).flatMap((c) =>
      (c.locations || []).map((l) => ({
        companyId: c.companyId,
        companyName: c.companyName,
        locationId: l.id,
        locationName: l.name,
      }))
    );
  }, [selectedUserId, userLocationAccess]);

  const hasUnsavedLocationAccess =
    selectedUserId != null &&
    JSON.stringify(
      [...localLocationAccess].sort((a, b) => a.companyId - b.companyId || a.locationId - b.locationId)
    ) !==
    JSON.stringify(
      [...initialLocationAccessFlat].sort((a, b) => a.companyId - b.companyId || a.locationId - b.locationId)
    );

  const hasUnsavedAccessChanges = hasUnsavedPermissions || hasUnsavedLocationAccess;

  const revertPermissions = useCallback(() => {
    if (userPermissionsData) {
      setLocalPermissions(JSON.parse(JSON.stringify(userPermissionsData.permissions)));
    }
    setLocalLocationAccess(initialLocationAccessFlat);
  }, [userPermissionsData, initialLocationAccessFlat]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (
    currentUser &&
    currentUser.role !== Role.ADMIN &&
    (!currentUserPermissions || !currentUserPermissions.accessSettings)
  ) {
    return null;
  }

  const handleSaveSoftware = () => {
    updateSettings.mutate(
      {
        softwareName: softwareName || undefined,
        primaryColor: primaryColor || undefined,
      },
      {
        onSuccess: () => {
          applyPrimaryColor(primaryColor || undefined);
          setDraft?.(null);
        },
      },
    );
  };

  const handlePermissionChange = (
    key: keyof UserPermission,
    value: any,
  ) => {
    if (!localPermissions) return;
    setLocalPermissions((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleSavePermissions = () => {
    if (!selectedUserId) return;
    const saveLocationAccess = () => {
      updateLocationAccess.mutate(
        localLocationAccess.map((a) => ({ companyId: a.companyId, locationId: a.locationId })),
        { onError: () => { } }
      );
    };
    if (localPermissions) {
      updateUserPermissionsMutation.mutate(
        { userId: selectedUserId, permissions: localPermissions },
        {
          onSuccess: () => {
            if (hasUnsavedLocationAccess) saveLocationAccess();
          },
        }
      );
    } else if (hasUnsavedLocationAccess) {
      saveLocationAccess();
    }
  };

  const handleOpenUserForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      const companyId = user.defaultCompanyId ?? user.companyId ?? undefined;
      const locationId = user.defaultLocationId ?? user.locationId ?? undefined;
      reset({
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar ?? null,
        mobileNumber: user.mobileNumber || "",
        password: "",
        companyId,
        locationId,
      });
    } else {
      setEditingUser(null);
      reset({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        role: Role.USER,
        isActive: true,
        avatar: null,
        companyId: undefined,
        locationId: undefined,
      });
    }
    setIsUserFormOpen(true);
  };

  const handleCloseUserForm = () => {
    setIsUserFormOpen(false);
    setEditingUser(null);
    setShowPassword(false);
  };

  const onSubmitUser = (data: UserForm) => {
    if (editingUser) {
      const updateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        role: data.role,
        isActive: data.isActive,
        avatar: data.avatar ?? null,
        mobileNumber: data.mobileNumber,
        companyId: data.companyId,
        locationId: data.locationId,
      };
      if (data.password) updateData.password = data.password;
      updateUser.mutate(
        { id: editingUser.id, data: updateData },
        { onSuccess: handleCloseUserForm },
      );
    } else {
      if (!data.password) return;
      const companyId = data.companyId ?? 0;
      const locationId = data.locationId ?? 0;
      if (!companyId || !locationId) {
        toast.error("Please select Company and Location for the user.");
        return;
      }
      createUser.mutate(
        {
          username: data.username,
          password: data.password!,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          isActive: data.isActive ?? false,
          avatar: data.avatar ?? null,
          mobileNumber: data.mobileNumber,
          companyId,
          locationId,
        },
        { onSuccess: handleCloseUserForm },
      );
    }
  };

  const filteredUsers =
    users?.filter(
      (u) =>
        u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header with section tabs */}
        <div className="border-b border-secondary-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-xl shrink-0">
                <Settings className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-black">Settings</h1>
                <p className="text-secondary-600 mt-0.5">
                  Software profile, access control, and user management
                </p>
              </div>
            </div>
            <nav className="flex gap-1 p-1 bg-secondary-100 rounded-lg w-fit">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                      ? "bg-white text-primary-600 shadow-sm"
                      : "text-secondary-700 hover:text-black"
                      }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <main className="min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === "software" && (
              <motion.div
                key="software"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader className="border-b border-secondary-100">
                    <CardTitle className="text-xl text-black">
                      Software Profile
                    </CardTitle>
                    <p className="text-sm text-secondary-600 font-normal mt-1">
                      Branding, software name, and primary color used across the
                      application
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <Label htmlFor="softwareName" className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">
                            Software Designation
                          </Label>
                          <Input
                            id="softwareName"
                            value={softwareName}
                            onChange={(e) => setSoftwareName(e.target.value)}
                            placeholder="e.g. Die & Pattern System"
                            className="h-12 px-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-slate-950 transition-all font-medium"
                          />
                          <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-tight ml-1">The name displayed in browser tabs and UI headers.</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="primaryColor" className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">
                            Corporate Theme Color
                          </Label>
                          <div className="flex gap-3">
                            <div className="relative shrink-0">
                              <input
                                type="color"
                                id="primaryColor"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer p-1 bg-white"
                              />
                            </div>
                            <div className="flex-1 relative">
                              <Input
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="h-12 px-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-slate-950 transition-all font-mono text-sm uppercase"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-tight ml-1">Primary accent color used for buttons, links, and highlights.</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={revertSoftware}
                        disabled={
                          !hasUnsavedSoftware || updateSettings.isPending
                        }
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveSoftware}
                        disabled={
                          updateSettings.isPending ||
                          !hasUnsavedSoftware
                        }
                        className="gap-2"
                      >
                        {updateSettings.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {currentUser?.role === Role.ADMIN && (
                  <Card className="border-red-100 shadow-sm overflow-hidden mt-6 bg-red-50/10">
                    <CardHeader className="bg-red-50/50 border-b border-red-100/50">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <CardTitle className="text-lg font-bold">Factory Reset & Security</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-1.5">
                          <h4 className="text-base font-bold text-secondary-900 uppercase tracking-tight">
                            Critical: System Factory Reset
                          </h4>
                          <p className="text-sm text-secondary-600 max-w-2xl leading-relaxed">
                            Permanently delete all master entries (Parties, Items), transactional
                            records (PI, PO, Inwards, QC), and non-admin user accounts.
                            Only your <span className="font-bold text-black underline decoration-red-500/30">Admin account</span>,
                            one <span className="font-bold text-black underline decoration-red-500/30">Company</span>, and
                            one <span className="font-bold text-black underline decoration-red-500/30">Location</span> will be preserved.
                          </p>
                          <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 pt-1 uppercase tracking-wider">
                            <Trash2 className="w-3 h-3" /> This action is irreversible and permanent.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          className="h-12 px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200 gap-2 shrink-0 transition-all active:scale-95"
                          onClick={() => setIsResetDialogOpen(true)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Perform Reset
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Dialog
                  isOpen={isResetDialogOpen}
                  onClose={() => setIsResetDialogOpen(false)}
                  title="Critical: Full System Reset"
                  size="sm"
                >
                  <div className="space-y-6 pt-2">
                    <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex items-start gap-4">
                      <div className="p-2.5 bg-red-100 rounded-xl text-red-600 shadow-sm">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-black text-red-900 uppercase tracking-wide">Warning: Irrecoverable Deletion</p>
                        <ul className="space-y-1.5">
                          {[
                            "All Transactional History (Inwards, QC, Orders)",
                            "All Master Records (Parties, Items, Materials)",
                            "All Users except Primary Admin",
                            "All Organization Settings outside Baseline"
                          ].map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs font-semibold text-red-800/80">
                              <div className="w-1 h-1 rounded-full bg-red-400" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-orange-50 border border-orange-100/50">
                      <p className="text-[11px] font-bold text-orange-800 uppercase tracking-tight text-center">
                        System baseline (Standard Statuses & Categories) will be restored.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsResetDialogOpen(false)}
                        className="flex-1 h-12 rounded-xl font-bold text-secondary-600 hover:bg-secondary-100"
                        disabled={resetSystem.isPending}
                      >
                        Abort
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => resetSystem.mutate()}
                        className="flex-1 h-12 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-100"
                        disabled={resetSystem.isPending}
                      >
                        {resetSystem.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          "Yes, Wipe Data"
                        )}
                      </Button>
                    </div>
                  </div>
                </Dialog>
              </motion.div>
            )}

            {activeTab === "access" && (
              <motion.div
                key="access"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader className="border-b border-secondary-100">
                    <CardTitle className="text-xl">Access & Permissions</CardTitle>
                    <p className="text-sm text-secondary-600 font-normal mt-1">
                      Manage user-specific permissions. Permissions are granular and override role defaults.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="max-w-md">
                      <Label>Select User to Manage</Label>
                      <select
                        className="mt-1 w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        value={selectedUserId ?? ""}
                        onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">-- Select a User --</option>
                        {users?.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.username}) - {u.role}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedUserId && permissionsLoading && (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                      </div>
                    )}
                    {selectedUserId && !permissionsLoading && localPermissions && (() => {
                      const managedUser = users?.find(u => u.id === selectedUserId);
                      const isManagedUserAdmin = managedUser?.role === Role.ADMIN;
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-secondary-200">
                              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-secondary-100 pb-3 pt-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-primary-100/50 rounded-lg text-primary-600">
                                    <LayoutDashboard className="w-5 h-5" />
                                  </div>
                                  <CardTitle className="text-base font-semibold text-primary-900">System & Navigation</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0 divide-y divide-secondary-100">
                                <label className="flex items-center justify-between p-4 hover:bg-secondary-50/50 cursor-pointer group">
                                  <div>
                                    <p className="text-sm font-medium text-primary-900 group-hover:text-primary-700 transition-colors">Dashboard Access</p>
                                    <p className="text-xs text-secondary-500 mt-0.5">View dashboard statistics.</p>
                                  </div>
                                  <input type="checkbox" checked={localPermissions.viewDashboard} onChange={(e) => handlePermissionChange("viewDashboard", e.target.checked)} className="w-5 h-5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer" />
                                </label>
                                <label className="flex items-center justify-between p-4 hover:bg-secondary-50/50 cursor-pointer group">
                                  <div>
                                    <p className="text-sm font-medium text-primary-900 group-hover:text-primary-700 transition-colors">Access Settings</p>
                                    <p className="text-xs text-secondary-500 mt-0.5">Manage system configuration.</p>
                                  </div>
                                  <input type="checkbox" checked={localPermissions.accessSettings} onChange={(e) => handlePermissionChange("accessSettings", e.target.checked)} disabled={localPermissions.accessSettings && (currentUser?.id === selectedUserId || isManagedUserAdmin)} className="w-5 h-5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                                </label>
                                <label className="flex items-center justify-between p-4 hover:bg-secondary-50/50 cursor-pointer group">
                                  <div>
                                    <p className="text-sm font-medium text-primary-900 group-hover:text-primary-700 transition-colors">Manage Users</p>
                                    <p className="text-xs text-secondary-500 mt-0.5">Create and manage accounts.</p>
                                  </div>
                                  <input type="checkbox" checked={localPermissions.manageUsers} onChange={(e) => handlePermissionChange("manageUsers", e.target.checked)} className="w-5 h-5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer" />
                                </label>
                                <div className="p-4 hover:bg-secondary-50/50 transition-colors">
                                  <div className="mb-2">
                                    <p className="text-sm font-medium text-primary-900">Navigation Layout</p>
                                    <p className="text-xs text-secondary-500 mt-0.5">Preferred menu style.</p>
                                  </div>
                                  <select value={(localPermissions as any).navigationLayout || "SIDEBAR"} onChange={(e) => handlePermissionChange("navigationLayout" as any, e.target.value)} className="w-full text-sm rounded-md border border-secondary-300 py-2 px-3 focus:ring-primary-500 focus:border-primary-500 bg-white">
                                    <option value="SIDEBAR">Vertical Sidebar</option>
                                    <option value="HORIZONTAL">Horizontal Header</option>
                                  </select>
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-secondary-200 border-t-4 border-t-orange-500">
                              <CardHeader className="bg-gradient-to-r from-orange-50/30 to-white border-b border-secondary-100 pb-3 pt-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-orange-100/50 rounded-lg text-orange-600">
                                    <Database className="w-5 h-5" />
                                  </div>
                                  <CardTitle className="text-base font-semibold text-primary-900">Master Data</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0 divide-y divide-secondary-100">
                                <label className="flex items-center justify-between p-4 hover:bg-secondary-50/50 cursor-pointer">
                                  <div>
                                    <p className="text-sm font-medium text-primary-900">View Master Data</p>
                                    <p className="text-xs text-secondary-500">Global browse access.</p>
                                  </div>
                                  <input type="checkbox" checked={(localPermissions as any).viewMaster} onChange={(e) => handlePermissionChange("viewMaster" as any, e.target.checked)} className="w-5 h-5 rounded border-secondary-300 text-orange-600 focus:ring-orange-500" />
                                </label>
                                <div className="p-4 bg-orange-50/20">
                                  <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-3">Management Permissions</p>
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                    {[{ key: "manageItem", label: "Items" }, { key: "manageItemType", label: "Item Types" }, { key: "manageMaterial", label: "Materials" }, { key: "manageItemStatus", label: "Item Statuses" }, { key: "manageOwnerType", label: "Owner Types" }, { key: "manageParty", label: "Parties" }, { key: "manageLocation", label: "Locations" }, { key: "manageCompany", label: "Companies" }].map(item => (
                                      <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={(localPermissions as any)[item.key]} onChange={(e) => handlePermissionChange(item.key as any, e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-orange-600 focus:ring-orange-500" />
                                        <span className="text-xs font-medium text-secondary-700 group-hover:text-primary-900 transition-colors uppercase tracking-tight">{item.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-secondary-200 border-t-4 border-t-blue-500">
                              <CardHeader className="bg-gradient-to-r from-blue-50/30 to-white border-b border-secondary-100 pb-3 pt-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-blue-100/50 rounded-lg text-blue-600">
                                    <Truck className="w-5 h-5" />
                                  </div>
                                  <CardTitle className="text-base font-semibold text-primary-900">Operations</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0 divide-y divide-secondary-100">
                                <div className="p-4 space-y-3">
                                  <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2">Movements & Inward</p>
                                  <div className="grid grid-cols-2 gap-4">
                                    {["viewMovement", "createMovement"].map(k => (
                                      <label key={k} className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" checked={(localPermissions as any)[k]} onChange={(e) => handlePermissionChange(k as any, e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-xs font-medium text-secondary-700 uppercase tracking-tight">{k.replace("view", "View ").replace("create", "Create ")}</span>
                                      </label>
                                    ))}
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 mt-2">
                                    {["viewInward", "createInward", "editInward"].map(k => (
                                      <label key={k} className="flex flex-col items-center gap-1 p-2 rounded border border-secondary-100 bg-secondary-50/30 cursor-pointer">
                                        <input type="checkbox" checked={(localPermissions as any)[k]} onChange={(e) => handlePermissionChange(k as any, e.target.checked)} className="w-3.5 h-3.5 rounded border-secondary-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-[9px] font-bold text-secondary-500 uppercase">{k.replace("Inward", "").replace("view", "View").replace("create", "Add").replace("edit", "Edit")}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="p-4 space-y-3 bg-emerald-50/10">
                                  <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2">Quality Control</p>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    {[{ key: "viewQC", label: "View QC" }, { key: "createQC", label: "Add Result" }, { key: "editQC", label: "Edit QC" }, { key: "approveQC", label: "Approve QC" }].map(item => (
                                      <label key={item.key} className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" checked={(localPermissions as any)[item.key]} onChange={(e) => handlePermissionChange(item.key as any, e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-emerald-600 focus:ring-emerald-500" />
                                        <span className="text-xs font-medium text-secondary-700 uppercase tracking-tight">{item.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-secondary-200 border-t-4 border-t-indigo-500">
                              <CardHeader className="bg-gradient-to-r from-indigo-50/30 to-white border-b border-secondary-100 pb-3 pt-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-600">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <CardTitle className="text-base font-semibold text-primary-900">Purchasing</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0 divide-y divide-secondary-100">
                                <div className="p-4 space-y-2">
                                  <p className="text-xs font-black text-secondary-400 uppercase tracking-tighter mb-2">Purchase Indents</p>
                                  <div className="grid grid-cols-4 gap-2">
                                    {["viewPI", "createPI", "editPI", "approvePI"].map(k => (
                                      <label key={k} className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-secondary-100 bg-secondary-50/30 cursor-pointer hover:bg-white transition-colors">
                                        <input type="checkbox" checked={(localPermissions as any)[k]} onChange={(e) => handlePermissionChange(k as any, e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-indigo-600 focus:ring-indigo-500" />
                                        <span className="text-[9px] font-bold text-secondary-500 uppercase">{k.replace("PI", "").replace("view", "View").replace("create", "Add").replace("edit", "Edit").replace("approve", "Appr")}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="p-4 space-y-2">
                                  <p className="text-xs font-black text-secondary-400 uppercase tracking-tighter mb-2">Purchase Orders</p>
                                  <div className="grid grid-cols-4 gap-2">
                                    {["viewPO", "createPO", "editPO", "approvePO"].map(k => (
                                      <label key={k} className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-secondary-100 bg-secondary-50/30 cursor-pointer hover:bg-white transition-colors">
                                        <input type="checkbox" checked={(localPermissions as any)[k]} onChange={(e) => handlePermissionChange(k as any, e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-indigo-600 focus:ring-indigo-500" />
                                        <span className="text-[9px] font-bold text-secondary-500 uppercase">{k.replace("PO", "").replace("view", "View").replace("create", "Add").replace("edit", "Edit").replace("approve", "Appr")}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-secondary-200 border-t-4 border-t-rose-500">
                              <CardHeader className="bg-gradient-to-r from-rose-50/30 to-white border-b border-secondary-100 pb-3 pt-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-rose-100/50 rounded-lg text-rose-600">
                                    <Shield className="w-5 h-5" />
                                  </div>
                                  <CardTitle className="text-base font-semibold text-primary-900">Data Control</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0 divide-y divide-secondary-100">
                                <label className="flex items-center justify-between p-4 hover:bg-secondary-50/50 cursor-pointer group">
                                  <div>
                                    <p className="text-sm font-medium text-primary-900 group-hover:text-primary-700 transition-colors">Manage Pattern Changes</p>
                                    <p className="text-xs text-secondary-500 mt-0.5">Edit protected pattern fields.</p>
                                  </div>
                                  <input type="checkbox" checked={localPermissions.manageChanges} onChange={(e) => handlePermissionChange("manageChanges", e.target.checked)} className="w-5 h-5 rounded border-secondary-300 text-rose-600 focus:ring-rose-500" />
                                </label>
                                <label className="flex items-center justify-between p-4 hover:bg-secondary-50/50 cursor-pointer group">
                                  <div>
                                    <p className="text-sm font-medium text-primary-900 group-hover:text-primary-700 transition-colors">Revert Changes</p>
                                    <p className="text-xs text-secondary-500 mt-0.5">Undo history movements.</p>
                                  </div>
                                  <input type="checkbox" checked={localPermissions.revertChanges} onChange={(e) => handlePermissionChange("revertChanges", e.target.checked)} className="w-5 h-5 rounded border-secondary-300 text-rose-600 focus:ring-rose-500" />
                                </label>
                              </CardContent>
                            </Card>
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-secondary-200 border-t-4 border-t-purple-500">
                              <CardHeader className="bg-gradient-to-r from-purple-50/30 to-white border-b border-secondary-100 pb-3 pt-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-purple-100/50 rounded-lg text-purple-600">
                                      <BarChart3 className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-base font-semibold text-primary-900">Reports & Analytics</CardTitle>
                                  </div>
                                  <label className="flex items-center justify-between bg-white border border-secondary-200 px-3 py-1.5 rounded-full hover:bg-secondary-50 transition-colors shadow-sm cursor-pointer">
                                    <span className="text-xs font-medium text-secondary-700 mr-2">Enable Reports</span>
                                    <input type="checkbox" checked={localPermissions.viewReports} onChange={(e) => handlePermissionChange("viewReports", e.target.checked)} className="w-4 h-4 rounded-full border-secondary-300 text-purple-600 focus:ring-purple-500" />
                                  </label>
                                </div>
                              </CardHeader>
                            </Card>
                          </div>
                          <Card className="shadow-sm border-secondary-200 border-t-4 border-t-emerald-500">
                            <CardHeader className="bg-gradient-to-r from-emerald-50/30 to-white border-b border-secondary-100 pb-3 pt-4">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-600">
                                  <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                  <CardTitle className="text-base font-semibold text-primary-900">Company & Location Access</CardTitle>
                                  <p className="text-xs text-secondary-500 mt-0.5">Assign companies and locations this user can access. Admin role still sees all.</p>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                              <div className="flex flex-wrap gap-2">
                                {localLocationAccess.map((a) => (
                                  <span
                                    key={`${a.companyId}-${a.locationId}`}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1.5 text-sm font-medium"
                                  >
                                    {a.companyName} – {a.locationName}
                                    <button
                                      type="button"
                                      onClick={() => setLocalLocationAccess((prev) => prev.filter((x) => !(x.companyId === a.companyId && x.locationId === a.locationId)))}
                                      className="rounded-full p-0.5 hover:bg-emerald-200/80 transition-colors"
                                      aria-label="Remove"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                ))}
                                {localLocationAccess.length === 0 && (
                                  <span className="text-sm text-secondary-500 italic">No company or location assigned yet.</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-secondary-100">
                                <div className="min-w-[140px]">
                                  <Label className="text-xs">Company</Label>
                                  <select
                                    value={locationAccessAddCompanyId}
                                    onChange={(e) => {
                                      setLocationAccessAddCompanyId(e.target.value ? Number(e.target.value) : "");
                                      setLocationAccessAddLocationId("");
                                    }}
                                    className="mt-1 w-full rounded-md border border-secondary-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                  >
                                    <option value="">Select</option>
                                    {companies?.map((c) => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="min-w-[140px]">
                                  <Label className="text-xs">Location</Label>
                                  <select
                                    value={locationAccessAddLocationId}
                                    onChange={(e) => setLocationAccessAddLocationId(e.target.value ? Number(e.target.value) : "")}
                                    className="mt-1 w-full rounded-md border border-secondary-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    disabled={!locationAccessAddCompanyId}
                                  >
                                    <option value="">Select</option>
                                    {locations
                                      ?.filter((l) => l.companyId === Number(locationAccessAddCompanyId))
                                      .map((l) => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                      ))}
                                  </select>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    const cid = locationAccessAddCompanyId === "" ? null : Number(locationAccessAddCompanyId);
                                    const lid = locationAccessAddLocationId === "" ? null : Number(locationAccessAddLocationId);
                                    if (cid == null || lid == null) return;
                                    const company = companies?.find((c) => c.id === cid);
                                    const location = locations?.find((l) => l.id === lid);
                                    if (!company || !location) return;
                                    if (localLocationAccess.some((a) => a.companyId === cid && a.locationId === lid)) return;
                                    setLocalLocationAccess((prev) => [...prev, { companyId: cid, companyName: company.name, locationId: lid, locationName: location.name }]);
                                    setLocationAccessAddCompanyId("");
                                    setLocationAccessAddLocationId("");
                                  }}
                                  disabled={!locationAccessAddCompanyId || !locationAccessAddLocationId}
                                >
                                  Add
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                          <div className="flex justify-end gap-2 pt-6 border-t border-secondary-100">
                            <Button type="button" variant="outline" onClick={revertPermissions} disabled={!hasUnsavedAccessChanges || updateUserPermissionsMutation.isPending || updateLocationAccess.isPending} className="gap-2">
                              <X className="w-4 h-4" /> Cancel
                            </Button>
                            <Button onClick={handleSavePermissions} disabled={updateUserPermissionsMutation.isPending || updateLocationAccess.isPending || !hasUnsavedAccessChanges} className="gap-2">
                              {(updateUserPermissionsMutation.isPending || updateLocationAccess.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Save Permissions
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                    {!selectedUserId && (
                      <div className="text-center py-12 text-secondary-500 italic">
                        Select a user above to view and manage their permissions.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "users" && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader className="border-b border-secondary-100 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-xl">User Management</CardTitle>
                      <p className="text-sm text-secondary-600 font-normal mt-1">
                        Create, update, and activate or deactivate user accounts
                      </p>
                    </div>
                    <Button
                      onClick={() => handleOpenUserForm()}
                      className="gap-2 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add user
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                      <Input
                        placeholder="Search by name or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="border border-secondary-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-primary-100 border-b border-primary-200">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-primary-900 text-sm">
                              Name
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-primary-900 text-sm">
                              Username
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-primary-900 text-sm">
                              Mobile No.
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-primary-900 text-sm">
                              Role
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-primary-900 text-sm">
                              Status
                            </th>
                            <th className="text-right py-3 px-4 font-semibold text-primary-900 text-sm">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u) => (
                            <tr
                              key={u.id}
                              className="border-b border-secondary-100 hover:bg-secondary-50/50"
                            >
                              <td className="py-3 px-4">
                                {u.firstName} {u.lastName}
                                {currentUser && u.id === currentUser.id && (
                                  <span className="ml-2 text-xs text-blue-600">
                                    (You)
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono text-sm">
                                {u.username}
                              </td>
                              <td className="py-3 px-4 text-sm text-secondary-600">
                                {u.mobileNumber || "—"}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${u.role === Role.ADMIN
                                    ? "bg-amber-100 text-amber-800"
                                    : u.role === Role.MANAGER
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-blue-100 text-blue-700"
                                    }`}
                                >
                                  {u.role === Role.ADMIN
                                    ? "Admin"
                                    : u.role === Role.MANAGER
                                      ? "Manager"
                                      : "User"}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {currentUser && u.id === currentUser.id ? (
                                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                    Active (You)
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateUser.mutate({
                                        id: u.id,
                                        data: { isActive: !u.isActive },
                                      })
                                    }
                                    disabled={updateUser.isPending}
                                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium transition-colors ${u.isActive
                                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                                      : "bg-red-100 text-red-700 hover:bg-red-200"
                                      }`}
                                  >
                                    {u.isActive ? "Active" : "Inactive"} — click
                                    to toggle
                                  </button>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenUserForm(u)}
                                    className="hover:bg-primary-50"
                                    title="Edit Profile"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredUsers.length === 0 && (
                        <div className="text-center py-12 text-secondary-500">
                          {searchTerm
                            ? "No users match your search."
                            : "No users yet. Add your first user."}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </motion.div>

      {/* User form dialog – matches Master entries UI */}
      <Dialog
        isOpen={isUserFormOpen}
        onClose={handleCloseUserForm}
        title={editingUser ? "Edit User" : "Add User"}
        size="lg"
      >
        <form
          key={editingUser ? `edit-${editingUser.id}` : "add"}
          onSubmit={handleSubmit(onSubmitUser)}
          className="flex flex-col overflow-hidden"
        >
          <div className="overflow-y-auto p-6 space-y-6">
            {/* Profile Basics Row */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">First Name <span className="text-rose-500">*</span></Label>
                <Input
                  {...register("firstName")}
                  className="h-12 px-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-slate-950 transition-all font-medium"
                  placeholder="e.g. Rahul"
                />
                {errors.firstName && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tighter">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Last Name <span className="text-rose-500">*</span></Label>
                <Input
                  {...register("lastName")}
                  className="h-12 px-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-slate-950 transition-all font-medium"
                  placeholder="e.g. Sharma"
                />
                {errors.lastName && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tighter">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Login Credentials Row */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Username <span className="text-rose-500">*</span></Label>
                <div className="relative group">
                  <Input
                    {...register("username")}
                    className="h-12 px-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-slate-950 transition-all font-medium bg-slate-50/50 group-focus-within:bg-white"
                    placeholder="rahul.s"
                  />
                </div>
                {errors.username && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tighter">{errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Password {editingUser ? "(Optional)" : "*"}</Label>
                <div className="relative group">
                  <Input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className="h-12 pl-4 pr-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-slate-950 transition-all font-medium"
                    placeholder={editingUser ? "Keep existing" : "••••••••"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tighter">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Contact & Role Row */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Contact Protocol {watch("role") !== Role.ADMIN ? "*" : ""}</Label>
                <Input
                  {...register("mobileNumber")}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    e.target.value = value;
                    register("mobileNumber").onChange(e);
                  }}
                  className="h-12 px-4 rounded-xl border-slate-200 focus:ring-2 focus:ring-slate-950 transition-all font-medium"
                  placeholder="10-digit mobile"
                />
                {errors.mobileNumber && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tighter">{errors.mobileNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Role <span className="text-rose-500">*</span></Label>
                <select
                  {...register("role")}
                  className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-slate-950 transition-all appearance-none outline-none"
                >
                  <option value={Role.USER}>User</option>
                  <option value={Role.MANAGER}>Manager</option>
                  <option value={Role.ADMIN}>Admin</option>
                </select>
              </div>
            </div>

            {/* Organization Context Row */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Primary Company <span className="text-rose-500">*</span></Label>
                <select
                  className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-slate-950 transition-all appearance-none outline-none"
                  value={watch("companyId") ?? ""}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : undefined;
                    setValue("companyId", v);
                    setValue("locationId", undefined);
                  }}
                >
                  <option value="">Select Company Context</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.companyId && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tighter">{errors.companyId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Assigned Location <span className="text-rose-500">*</span></Label>
                <select
                  className="h-12 w-full px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-slate-950 transition-all appearance-none outline-none disabled:bg-slate-50/50 disabled:text-slate-400"
                  value={watch("locationId") ?? ""}
                  onChange={(e) => setValue("locationId", e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!watch("companyId")}
                >
                  <option value="">{watch("companyId") ? "Select Operational Site" : "Awaiting Company..."}</option>
                  {locations
                    .filter((l) => l.companyId === watch("companyId"))
                    .map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>
                {errors.locationId && (
                  <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tighter">{errors.locationId.message}</p>
                )}
              </div>
            </div>

            {/* Identity Row: Avatar & Status */}
            <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1">Profile Identity</Label>
                <div className="flex flex-row flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setValue("avatar", null, { shouldValidate: true })}
                    className={cn(
                      "relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-95",
                      !watch("avatar") ? "border-slate-950 ring-2 ring-slate-950/20 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={DEFAULT_AVATAR_PATH} alt="Def" className="w-full h-full object-cover" />
                  </button>
                  {AVATAR_OPTIONS.map((filename) => {
                    const isSelected = watch("avatar") === filename;
                    return (
                      <button
                        key={filename}
                        type="button"
                        onClick={() => setValue("avatar", filename, { shouldValidate: true })}
                        className={cn(
                          "relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-95",
                          isSelected ? "border-slate-950 ring-2 ring-slate-950/20 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        <img src={`${AVATAR_PRESETS_PATH}/${filename}`} alt="" className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mr-1">Account Activation</Label>
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    {...register("isActive")}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-slate-950 shadow-inner"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-secondary-100">
            <Button
              type="submit"
              disabled={createUser.isPending || updateUser.isPending}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold h-11"
            >
              {createUser.isPending || updateUser.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save
                </div>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseUserForm}
              className="flex-1 border-secondary-300 text-secondary-700 font-bold h-11"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
