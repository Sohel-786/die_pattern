'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { HorizontalNav } from '@/components/layout/horizontal-nav';
import { User, UserPermission } from '@/types';
import { SoftwareProfileDraftProvider } from '@/contexts/software-profile-draft-context';
import { useCurrentUserPermissions } from '@/hooks/use-settings';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useLocationContext, CompanyLocationAccess } from "@/contexts/location-context";
import { OrgContextDialog } from "@/components/auth/org-context-dialog";

/** Query key prefixes that depend on current company/location; refetch when user switches location. */
const LOCATION_SCOPED_QUERY_KEYS: readonly string[] = [
  'parties', 'items', 'purchase-indents', 'purchase-orders', 'inwards', 'job-works',
  'movements', 'quality-control', 'issues', 'returns', 'dashboard-metrics', 'reports',
  'companies', 'locations', 'statuses', 'active-issues',
  'purchase-indent', 'purchase-order',
];

const SIDEBAR_WIDTH_EXPANDED = 256;
const SIDEBAR_WIDTH_COLLAPSED = 64;

// Map route prefixes to required permission keys in UserPermission
const ROUTE_PERMISSIONS: Record<string, keyof UserPermission> = {
  '/dashboard': 'viewDashboard',
  '/companies': 'manageCompany',
  '/locations': 'manageLocation',
  '/parties': 'manageParty',
  '/masters': 'viewMaster',
  '/items': 'manageItem',
  '/purchase-indents': 'viewPI',
  '/purchase-orders': 'viewPO',
  '/inwards': 'viewInward',
  '/movements': 'viewMovement',
  '/quality-control': 'viewQC',
  '/reports': 'viewReports',
  '/settings': 'accessSettings',
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
    pathname.startsWith('/quality-control') ||
    pathname.startsWith('/statuses') ||
    pathname.startsWith('/store-items');

  const { data: permissions, isLoading: permissionsLoading } = useCurrentUserPermissions(
    pathname !== '/login' && !loading && !!user
  );

  const isHorizontal = permissions?.navigationLayout === 'HORIZONTAL';

  useEffect(() => {
    const validateAndGetUser = async () => {
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
          const pairs = access.flatMap((c) =>
            (c.locations || []).map((l) => ({ companyId: c.companyId, locationId: l.id }))
          );
          if (pairs.length === 1) {
            setSelected({ companyId: pairs[0].companyId, locationId: pairs[0].locationId });
          }
        }
      } catch (err) {
        localStorage.removeItem('user');
        setUser(null);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    validateAndGetUser();
  }, [router, pathname]);

  // If backend rejects request due to missing/invalid org context, show selector
  useEffect(() => {
    const onOrgRequired = () => {
      if (pathname !== "/login") setOrgDialogOpen(true);
    };
    const onOpenOrgDialog = () => setOrgDialogOpen(true);
    window.addEventListener("orgContextRequired", onOrgRequired as any);
    window.addEventListener("openOrgDialog", onOpenOrgDialog);
    return () => {
      window.removeEventListener("orgContextRequired", onOrgRequired as any);
      window.removeEventListener("openOrgDialog", onOpenOrgDialog);
    };
  }, [pathname]);

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
      // auto-select single location access
      if (!isSelectedValid(selected, allowedAccess)) {
        setSelected({ companyId: only.companyId, locationId: only.locationId });
      }
      setOrgDialogOpen(false);
      return;
    }

    // multiple: require selection
    if (!isSelectedValid(selected, allowedAccess)) {
      clearSelected();
      setOrgDialogOpen(true);
    } else {
      setOrgDialogOpen(false);
    }
  }, [pathname, user, allowedAccess, selected, isSelectedValid, setSelected, clearSelected, getAllPairs]);

  if (loading || (permissionsLoading && pathname !== '/login')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading...</p>
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
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-6">
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
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-secondary-100 p-6">
          <h1 className="text-xl font-semibold text-gray-900">No location access</h1>
          <p className="mt-2 text-sm text-secondary-600">
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
      const permissionProp = ROUTE_PERMISSIONS[requiredPermissionKey];
      if (permissions[permissionProp] === false) {
        hasPermission = false;
      }
    }
  }

  if (!hasPermission) {
    return (
      <SoftwareProfileDraftProvider>
        <div className="min-h-screen bg-secondary-50">
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
              <div className="text-center max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-red-100">
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-6">You do not have permission to view this page.</p>
                <Button onClick={() => router.push('/dashboard')} variant="outline" className="w-full">Dashboard</Button>
              </div>
            </main>
          </div>
        </div>
      </SoftwareProfileDraftProvider>
    );
  }

  return (
    <SoftwareProfileDraftProvider>
      <div className="min-h-screen bg-secondary-50">
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


