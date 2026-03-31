'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { HorizontalNav } from '@/components/layout/horizontal-nav';
import { User, UserPermission } from '@/types';
import { SoftwareProfileDraftProvider } from '@/contexts/software-profile-draft-context';
import { useCurrentUserPermissions } from '@/hooks/use-settings';
import { AccessDenied } from '@/components/ui/access-denied';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useLocationContext, CompanyLocationAccess } from "@/contexts/location-context";
import { OrgContextDialog } from "@/components/auth/org-context-dialog";

/** Query key prefixes that depend on current company/location; refetch when user switches location. */
const LOCATION_SCOPED_QUERY_KEYS: readonly string[] = [
  'parties', 'items', 'purchase-indents', 'purchase-orders', 'inwards', 'job-works',
  'quality-control', 'issues', 'returns', 'dashboard-metrics', 'reports',
  'companies', 'locations', 'statuses', 'active-issues',
  'purchase-indent', 'purchase-order',
];

const SIDEBAR_WIDTH_EXPANDED = 256;
const SIDEBAR_WIDTH_COLLAPSED = 64;

// Map route prefixes to required permission keys in UserPermission (order = priority for first allowed)
const ROUTE_PERMISSIONS_ORDERED: { route: string; permission: keyof UserPermission }[] = [
  { route: '/dashboard', permission: 'viewDashboard' },
  { route: '/companies', permission: 'manageCompany' },
  { route: '/locations', permission: 'manageLocation' },
  { route: '/parties', permission: 'manageParty' },
  { route: '/masters', permission: 'viewMaster' },
  { route: '/items', permission: 'manageItem' },
  { route: '/purchase-indents', permission: 'viewPI' },
  { route: '/purchase-orders', permission: 'viewPO' },
  { route: '/inwards', permission: 'viewInward' },
  { route: '/quality-control', permission: 'viewQC' },
  { route: '/job-works', permission: 'viewMovement' },
  { route: '/transfers', permission: 'viewTransfer' },
  { route: '/reports', permission: 'viewReports' },
  { route: '/settings', permission: 'accessSettings' },
];

const ROUTE_PERMISSIONS: Record<string, keyof UserPermission> = Object.fromEntries(
  ROUTE_PERMISSIONS_ORDERED.map(({ route, permission }) => [route, permission])
);

function canAccessOtherMasters(permissions: UserPermission | null | undefined): boolean {
  return !!(permissions?.manageItemType || permissions?.manageMaterial || permissions?.manageItemStatus || permissions?.manageOwnerType);
}

function getFirstAllowedRoute(permissions: UserPermission | null | undefined): string {
  if (!permissions) return '/dashboard';
  for (const { route, permission } of ROUTE_PERMISSIONS_ORDERED) {
    const allowed = route === '/masters' ? canAccessOtherMasters(permissions) : !!permissions[permission];
    if (allowed) return route;
  }
  return '/dashboard';
}

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/companies': 'Companies',
  '/locations': 'Locations',
  '/parties': 'Parties',
  '/masters': 'Masters',
  '/items': 'Items',
  '/purchase-indents': 'Purchase Indents',
  '/purchase-orders': 'Purchase Orders',
  '/inwards': 'Inwards',
  '/quality-control': 'QC',
  '/job-works': 'Job Works',
  '/transfers': 'Transfers',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [navExpanded, setNavExpanded] = useState(true);
  const sideWidth = sidebarExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;
  const queryClient = useQueryClient();
  const { allowedAccess, selected, setAllowedAccess, setSelected, clearSelected, isSelectedValid, getAllPairs } = useLocationContext();
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);

  // When current user updates their profile (name, avatar, username), refresh header without reload
  useEffect(() => {
    const onCurrentUserUpdated = (e: Event) => {
      const detail = (e as CustomEvent<User>).detail;
      if (detail) setUser(detail);
    };
    window.addEventListener('currentUserUpdated', onCurrentUserUpdated);
    return () => window.removeEventListener('currentUserUpdated', onCurrentUserUpdated);
  }, []);

  // When user switches company/location, invalidate all location-scoped data so current page refetches without reload
  useEffect(() => {
    const onOrgContextChanged = () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const firstKey = query.queryKey[0];
          return typeof firstKey === 'string' && LOCATION_SCOPED_QUERY_KEYS.includes(firstKey);
        },
      });
    };
    window.addEventListener('orgContextChanged', onOrgContextChanged);
    return () => window.removeEventListener('orgContextChanged', onOrgContextChanged);
  }, [queryClient]);

  const isFixedLayout = pathname.startsWith('/purchase-orders') ||
    pathname.startsWith('/purchase-indents') ||
    pathname.startsWith('/masters') ||
    pathname.startsWith('/companies') ||
    pathname.startsWith('/locations') ||
    pathname.startsWith('/parties') ||
    pathname.startsWith('/items') ||
    pathname.startsWith('/issues') ||
    pathname.startsWith('/inwards') ||
    pathname.startsWith('/returns') ||
    pathname.startsWith('/job-works') ||
    pathname.startsWith('/transfers') ||

    pathname.startsWith('/statuses') ||
    pathname.startsWith('/store-items');

  const { data: permissions, isLoading: permissionsLoading } = useCurrentUserPermissions(
    pathname !== '/login' && !loading && !!user
  );

  const isHorizontal = permissions?.navigationLayout === 'HORIZONTAL';

  const validateAndGetUser = useCallback(async () => {
    if (pathname === '/login') {
      setLoading(false);
      return;
    }

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }

    try {
      const response = await api.post('/auth/validate');
      if (response.data.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      // allowed location access can come as AllowedLocationAccess (Pascal) or allowedLocationAccess (camel)
      const rawAccess =
        response.data?.allowedLocationAccess ??
        response.data?.AllowedLocationAccess ??
        response.data?.data?.allowedLocationAccess ??
        response.data?.data?.AllowedLocationAccess ??
        [];
      if (Array.isArray(rawAccess)) {
        const access = rawAccess as CompanyLocationAccess[];
        setAllowedAccess(access);
      }
    } catch (err) {
      localStorage.removeItem('user');
      setUser(null);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [pathname, router, setAllowedAccess]);

  useEffect(() => {
    validateAndGetUser();
  }, [validateAndGetUser]);

  // If backend rejects request due to missing/invalid org context, show selector
  useEffect(() => {
    const onOrgRequired = () => {
      if (pathname !== "/login") setOrgDialogOpen(true);
    };
    const onOpenOrgDialog = () => setOrgDialogOpen(true);
    const onRefreshAccess = () => {
      validateAndGetUser();
    };
    window.addEventListener("orgContextRequired", onOrgRequired as any);
    window.addEventListener("openOrgDialog", onOpenOrgDialog);
    window.addEventListener("refreshLocationAccess", onRefreshAccess);
    return () => {
      window.removeEventListener("orgContextRequired", onOrgRequired as any);
      window.removeEventListener("openOrgDialog", onOpenOrgDialog);
      window.removeEventListener("refreshLocationAccess", onRefreshAccess);
    };
  }, [pathname, validateAndGetUser]);

  // Ensure we have a selected (company, location) context when needed.
  useEffect(() => {
    if (pathname === "/login") return;
    if (!user) return;
    if (!allowedAccess || allowedAccess.length === 0) return;

    const pairs = getAllPairs(allowedAccess);
    if (pairs.length === 0) {
      clearSelected();
      setOrgDialogOpen(true);
      return;
    }

    if (pairs.length === 1) {
      const only = pairs[0];
      if (!isSelectedValid(selected, allowedAccess)) {
        setSelected({ companyId: only.companyId, locationId: only.locationId });
      }
      setOrgDialogOpen(false);
      return;
    }

    // multiple: default to first pair so API always has headers; user can switch via header
    if (!isSelectedValid(selected, allowedAccess)) {
      setSelected({ companyId: pairs[0].companyId, locationId: pairs[0].locationId });
      setOrgDialogOpen(false);
    } else {
      setOrgDialogOpen(false);
    }
  }, [pathname, user, allowedAccess, selected, isSelectedValid, setSelected, clearSelected, getAllPairs]);

  if (loading || (permissionsLoading && pathname !== '/login')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (pathname === '/login' || !user) {
    return <>{children}</>;
  }

  const pairs = getAllPairs(allowedAccess);
  const needOrgSelection =
    allowedAccess &&
    allowedAccess.length > 0 &&
    (pairs.length > 1 ? !isSelectedValid(selected, allowedAccess) : false);

  // Require company/location selection before rendering app (so API calls get headers)
  if (needOrgSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <OrgContextDialog
          open
          access={allowedAccess}
          onSelect={(sel) => setSelected(sel)}
          closeDisabled
        />
      </div>
    );
  }

  // No access edge case: user exists but has no location access rows configured
  if (allowedAccess && allowedAccess.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card text-card-foreground rounded-2xl shadow-lg border border-border p-6">
          <h1 className="text-xl font-semibold text-foreground">No location access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have any company/location access configured. Please contact an admin.
          </p>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => (window.location.href = "/login")} variant="outline">
              Back to login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Permission Check
  let hasPermission = true;
  if (permissions) {
    const requiredPermissionKey = Object.keys(ROUTE_PERMISSIONS).find(route =>
      pathname === route || pathname.startsWith(`${route}/`)
    );

    if (requiredPermissionKey) {
      const allowed = requiredPermissionKey === '/masters'
        ? canAccessOtherMasters(permissions)
        : permissions[ROUTE_PERMISSIONS[requiredPermissionKey]] === true;
      if (!allowed) hasPermission = false;
    }
  }



  if (!hasPermission) {
    const firstAllowed = getFirstAllowedRoute(permissions);
    return (
      <SoftwareProfileDraftProvider>
        <div className="min-h-screen bg-background">
          {!isHorizontal && (
            <Sidebar
              userRole={user.role}
              currentUser={user}
              expanded={sidebarExpanded}
              onExpandChange={setSidebarExpanded}
              sidebarWidth={sideWidth}
            />
          )}
          <div
            className={cn(
              "transition-[margin] duration-200 ease-in-out flex flex-col",
              isFixedLayout ? "h-screen overflow-hidden" : "min-h-screen"
            )}
            style={{ marginLeft: isHorizontal ? 0 : sideWidth }}
          >
            <Header user={user} isNavExpanded={navExpanded} onNavExpandChange={setNavExpanded} />
            {isHorizontal && <HorizontalNav isExpanded={navExpanded} />}
            <main className={cn(
              "flex-1 flex items-center justify-center p-6",
              isFixedLayout ? "min-h-0 overflow-y-auto" : "overflow-visible"
            )}>
              <AccessDenied
                actionLabel={`Go to ${ROUTE_LABELS[firstAllowed] ?? 'Dashboard'}`}
                actionHref={firstAllowed}
              />
            </main>
          </div>
        </div>
      </SoftwareProfileDraftProvider>
    );
  }

  return (
    <SoftwareProfileDraftProvider>
      <div className="min-h-screen bg-background">
        <OrgContextDialog
          open={orgDialogOpen}
          access={allowedAccess}
          onSelect={(sel) => {
            setSelected(sel);
            setOrgDialogOpen(false);
          }}
          onClose={() => setOrgDialogOpen(false)}
          closeDisabled={false}
        />
        {!isHorizontal && (
          <Sidebar
            userRole={user.role}
            currentUser={user}
            expanded={sidebarExpanded}
            onExpandChange={setSidebarExpanded}
            sidebarWidth={sideWidth}
          />
        )}
        <div
          className={cn(
            "transition-[margin] duration-200 ease-in-out relative z-0 flex flex-col",
            isFixedLayout ? "h-screen overflow-hidden" : "min-h-screen"
          )}
          style={{ marginLeft: isHorizontal ? 0 : sideWidth }}
        >
          <Header user={user} isNavExpanded={navExpanded} onNavExpandChange={setNavExpanded} />
          {isHorizontal && <HorizontalNav isExpanded={navExpanded} />}
          <main className={cn(
            "flex-1 flex flex-col",
            isFixedLayout ? "min-h-0 overflow-y-auto" : "overflow-visible"
          )}>
            {children}
          </main>
        </div>
      </div>
    </SoftwareProfileDraftProvider>
  );
}


