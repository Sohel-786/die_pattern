'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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


