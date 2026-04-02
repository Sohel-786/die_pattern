'use client';

import { User } from '@/types';
import { Avatar } from '@/components/ui/avatar';
import { useAppSettings, useCurrentUserPermissions, useCompany } from '@/hooks/use-settings';
import { useSoftwareProfileDraft } from '@/contexts/software-profile-draft-context';
import { useLocationContext } from '@/contexts/location-context';
import { LogOut, Building2, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { useLogout } from '@/hooks/use-auth-mutations';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';

// API_BASE removed: root-relative paths should be used for assets to work in both Dev (proxied) and Prod (IIS)

interface HeaderProps {
  user: User;
  isNavExpanded: boolean;
  onNavExpandChange: (expanded: boolean) => void;
}

export function Header({ user, isNavExpanded, onNavExpandChange }: HeaderProps) {
  const { data: appSettings } = useAppSettings();
  const { data: permissions } = useCurrentUserPermissions();
  const { selected, allowedAccess, getAllPairs } = useLocationContext();

  // Fetch the latest company details to ensure reactive logo updates from Company Master
  const { data: currentCompany, isLoading: isCompanyLoading } = useCompany(selected?.companyId);

  const pairs = getAllPairs(allowedAccess);
  const currentPair = selected
    ? pairs.find((p) => p.companyId === selected.companyId && p.locationId === selected.locationId)
    : null;

  // Prioritize the fresh company logo from the API once loaded. 
  // Fallback to currentPair.companyLogo only during the initial load of the Company query.
  const logoPath = !isCompanyLoading && currentCompany !== undefined
    ? currentCompany.logoUrl
    : currentPair?.companyLogo;

  const logoUrl = logoPath 
    ? (logoPath.startsWith("http") || logoPath.startsWith("blob:") ? logoPath : (logoPath.startsWith("/") ? logoPath : `/${logoPath}`))
    : null;
  const hasLogo = Boolean(logoUrl);
  const hasMultipleLocations = pairs.length > 1;

  const isHorizontal = permissions?.navigationLayout === 'HORIZONTAL';

  const logoutMutation = useLogout();
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const openSwitchLocation = () => {
    window.dispatchEvent(new CustomEvent('openOrgDialog'));
  };

  return (
    <header
      className={`bg-white dark:bg-card border-b border-secondary-200 dark:border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-sm transition-colors duration-300 ${isHorizontal
        ? 'h-16 py-2'
        : hasLogo ? 'min-h-[5rem] py-3' : 'h-16 py-3'
        }`}
    >
      <div className="flex items-center min-w-0 shrink-0">
        {hasLogo ? (
          <div className="flex items-center shrink-0 mr-5 bg-transparent">
            <img
              src={logoUrl!}
              alt=""
              className={isHorizontal
                ? "max-w-[85px] max-h-[52px] w-auto h-auto object-contain object-center"
                : "max-w-[110px] max-h-[72px] w-auto h-auto object-contain object-center"
              }
            />
          </div>
        ) : (
          <div className={`flex items-center justify-center shrink-0 text-primary-600 mr-5 ${isHorizontal ? 'w-[48px] h-[48px]' : 'w-[70px] h-[70px]'
            }`}>
            <Building2 className={isHorizontal ? "h-6 w-6" : "h-9 w-9"} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 min-w-0 flex-1 justify-end">
        {currentPair && (
          hasMultipleLocations ? (
            <button
              type="button"
              onClick={openSwitchLocation}
              className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 px-4 py-2.5 rounded-xl border border-secondary-200 dark:border-border bg-gradient-to-b from-secondary-50/80 to-white dark:from-secondary-900/50 dark:to-card text-left min-w-0 shadow-sm transition-all duration-200 hover:border-primary-200 dark:hover:border-primary-700/40 hover:from-primary-50/50 dark:hover:from-primary-900/20 hover:to-white dark:hover:to-card cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 focus:border-primary-300 dark:focus:border-primary-700/50"
              title="Switch company or location"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700 shrink-0">
                  <Building2 className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-sm font-semibold text-secondary-900 dark:text-white truncate max-w-[120px] sm:max-w-[180px]" title={currentPair.companyName}>
                    {currentPair.companyName}
                  </span>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-secondary-200 dark:bg-secondary-800" aria-hidden />
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700 shrink-0">
                  <MapPin className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-sm font-semibold text-secondary-900 dark:text-white truncate max-w-[120px] sm:max-w-[160px]" title={currentPair.locationName}>
                    {currentPair.locationName}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-secondary-400 dark:text-secondary-500 self-center sm:self-auto" aria-hidden />
            </button>
          ) : (
            <div
              className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 px-4 py-2.5 rounded-xl border border-secondary-200 dark:border-border bg-gradient-to-b from-secondary-50/80 to-white dark:from-secondary-900/50 dark:to-card text-left min-w-0 shadow-sm"
              title="Current context"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700 shrink-0">
                  <Building2 className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-sm font-semibold text-secondary-900 dark:text-white truncate max-w-[120px] sm:max-w-[180px]" title={currentPair.companyName}>
                    {currentPair.companyName}
                  </span>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-secondary-200 dark:bg-secondary-800" aria-hidden />
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700 shrink-0">
                  <MapPin className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-sm font-semibold text-secondary-900 dark:text-white truncate max-w-[120px] sm:max-w-[160px]" title={currentPair.locationName}>
                    {currentPair.locationName}
                  </span>
                </div>
              </div>
            </div>
          )
        )}
        <ThemeToggle />
        {isHorizontal && (
          <button
            onClick={() => onNavExpandChange(!isNavExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-muted hover:text-primary-600 dark:hover:text-primary-400 transition-all font-medium border border-secondary-200 dark:border-border shadow-sm"
          >
            {isNavExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span className="text-sm">Hide</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span className="text-sm">Show</span>
              </>
            )}
          </button>
        )}
        <div className="flex items-center gap-3">
          <Avatar user={user} size={isHorizontal ? "sm" : "md"} showName={false} />
          <div className="flex flex-col justify-center min-w-0">
            <span className={`font-semibold text-secondary-900 dark:text-white truncate ${isHorizontal ? 'text-xs' : 'text-sm'
              }`}>
              {user.firstName} {user.lastName}
            </span>
            <span className={`text-secondary-500 dark:text-secondary-400 truncate ${isHorizontal ? 'text-[10px]' : 'text-xs'
              }`}>
              {user.username}
            </span>
          </div>
        </div>
        {isHorizontal && (
          <div className="border-l border-secondary-200 dark:border-border pl-4 ml-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-secondary-600 dark:text-secondary-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 px-3 h-9 rounded-lg transition-all duration-200 font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
