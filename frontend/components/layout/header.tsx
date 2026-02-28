'use client';

import { User } from '@/types';
import { Avatar } from '@/components/ui/avatar';
import { useAppSettings, useCurrentUserPermissions, useCompany } from '@/hooks/use-settings';
import { useSoftwareProfileDraft } from '@/contexts/software-profile-draft-context';
import { useLocationContext } from '@/contexts/location-context';
import { LogOut, Building2, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { useLogout } from '@/hooks/use-auth-mutations';
import { Button } from '@/components/ui/button';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  const logoUrl = logoPath ? `${API_BASE}${logoPath}` : null;
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
      className={`bg-white border-b border-secondary-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-sm ${isHorizontal
        ? 'h-14 py-3'
        : hasLogo ? 'min-h-[6.5rem] py-6' : 'h-24 py-4'
        }`}
    >
      <div className="flex items-center min-w-0 shrink-0">
        {hasLogo ? (
          <div className="flex items-center shrink-0 mr-5 bg-transparent">
            <img
              src={logoUrl!}
              alt=""
              className={isHorizontal
                ? "max-w-[75px] max-h-[60px] w-auto h-auto object-contain object-center"
                : "max-w-[100px] max-h-[85px] w-auto h-auto object-contain object-center"
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
              className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 px-3 py-2 rounded-xl border border-secondary-200 bg-gradient-to-b from-secondary-50/80 to-white text-left min-w-0 shadow-sm transition-all duration-200 hover:border-primary-200 hover:from-primary-50/50 hover:to-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300"
              title="Switch company or location"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-secondary-100 shrink-0">
                  <Building2 className="h-4 w-4 text-primary-600" aria-hidden />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-secondary-500">Company</span>
                  <span className="text-sm font-semibold text-secondary-900 truncate max-w-[120px] sm:max-w-[180px]" title={currentPair.companyName}>
                    {currentPair.companyName}
                  </span>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-secondary-200" aria-hidden />
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-secondary-100 shrink-0">
                  <MapPin className="h-4 w-4 text-primary-600" aria-hidden />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-secondary-500">Location</span>
                  <span className="text-sm font-semibold text-secondary-900 truncate max-w-[120px] sm:max-w-[160px]" title={currentPair.locationName}>
                    {currentPair.locationName}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-secondary-400 self-center sm:self-auto" aria-hidden />
            </button>
          ) : (
            <div
              className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 px-3 py-2 rounded-xl border border-secondary-200 bg-gradient-to-b from-secondary-50/80 to-white text-left min-w-0 shadow-sm"
              title="Current context"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-secondary-100 shrink-0">
                  <Building2 className="h-4 w-4 text-primary-600" aria-hidden />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-secondary-500">Company</span>
                  <span className="text-sm font-semibold text-secondary-900 truncate max-w-[120px] sm:max-w-[180px]" title={currentPair.companyName}>
                    {currentPair.companyName}
                  </span>
                </div>
              </div>
              <div className="hidden sm:block w-px h-8 bg-secondary-200" aria-hidden />
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-secondary-100 shrink-0">
                  <MapPin className="h-4 w-4 text-primary-600" aria-hidden />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-secondary-500">Location</span>
                  <span className="text-sm font-semibold text-secondary-900 truncate max-w-[120px] sm:max-w-[160px]" title={currentPair.locationName}>
                    {currentPair.locationName}
                  </span>
                </div>
              </div>
            </div>
          )
        )}
        {isHorizontal && (
          <button
            onClick={() => onNavExpandChange(!isNavExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-secondary-600 hover:bg-secondary-50 hover:text-primary-600 transition-all font-medium border border-secondary-200 shadow-sm"
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
            <span className={`font-semibold text-secondary-900 truncate ${isHorizontal ? 'text-xs' : 'text-sm'
              }`}>
              {user.firstName} {user.lastName}
            </span>
            <span className={`text-secondary-500 truncate ${isHorizontal ? 'text-[10px]' : 'text-xs'
              }`}>
              {user.username}
            </span>
          </div>
        </div>
        {isHorizontal && (
          <div className="border-l border-secondary-200 pl-4 ml-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-secondary-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 px-3 h-9 rounded-lg transition-all duration-200 font-medium"
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
