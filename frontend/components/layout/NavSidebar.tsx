import { useState } from 'react';
import { Activity, Newspaper, Settings, LogOut, Sparkles, LayoutDashboard, MessagesSquare, NotebookText } from 'lucide-react';

type NavTab = 'feed' | 'analysis' | 'news' | 'executive' | 'chatroom' | 'notion' | 'settings';

interface NavSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLogout: () => void;
  topStepXEnabled?: boolean;
}

const NAV_ITEMS: { id: NavTab; icon: typeof Activity; label: string; description: string }[] = [
  { id: 'executive', icon: LayoutDashboard, label: 'Dashboard', description: 'KPIs, calendar, action tape' },
  { id: 'feed', icon: Activity, label: 'The Tape', description: 'RiskFlow analytics feed' },
  { id: 'analysis', icon: Sparkles, label: 'Analysis', description: 'AI-powered trade analysis' },
  { id: 'news', icon: Newspaper, label: 'RiskFlow', description: 'Market news & events' },
  { id: 'chatroom', icon: MessagesSquare, label: 'Board Room', description: 'Multi-agent boardroom' },
  { id: 'notion', icon: NotebookText, label: 'Research', description: 'Notion research corpus' },
];

// Icon size: original was w-6 h-6 (24px). 35% smaller = ~15.6px → w-4 h-4 (16px)
// Button size: original was w-12 h-12 (48px). 35% smaller = ~31px → w-8 h-8 (32px)
// Sidebar collapsed width: original w-16 (64px). 35% smaller = ~42px → w-11 (44px)

export function NavSidebar({ activeTab, onTabChange, onLogout, topStepXEnabled = false }: NavSidebarProps) {
  const [hovered, setHovered] = useState(false);

  const sidebarContent = (
    <div
      className={`h-full bg-[#0a0a00] border-r border-[#D4AF37]/20 flex flex-col py-3 transition-all duration-200 ease-out ${
        hovered ? 'w-48' : 'w-11'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex-1 space-y-1 px-1.5">
        {NAV_ITEMS.map(({ id, icon: Icon, label, description }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-2.5 rounded-md transition-colors ${
                hovered ? 'px-2 py-1.5' : 'justify-center py-1.5'
              } ${
                isActive
                  ? 'bg-[#D4AF37] text-black'
                  : 'text-[#D4AF37]/60 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10'
              }`}
              title={hovered ? undefined : label}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {hovered && (
                <div className="min-w-0 text-left">
                  <div className={`text-[11px] font-semibold truncate ${isActive ? 'text-black' : ''}`}>
                    {label}
                  </div>
                  <div className={`text-[9px] truncate ${isActive ? 'text-black/60' : 'text-gray-500'}`}>
                    {description}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-1 px-1.5">
        <button
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center gap-2.5 rounded-md transition-colors ${
            hovered ? 'px-2 py-1.5' : 'justify-center py-1.5'
          } ${
            activeTab === 'settings'
              ? 'bg-[#D4AF37] text-black'
              : 'text-[#D4AF37]/60 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10'
          }`}
          title={hovered ? undefined : 'Settings'}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {hovered && (
            <div className="min-w-0 text-left">
              <div className={`text-[11px] font-semibold truncate ${activeTab === 'settings' ? 'text-black' : ''}`}>
                Settings
              </div>
              <div className={`text-[9px] truncate ${activeTab === 'settings' ? 'text-black/60' : 'text-gray-500'}`}>
                Preferences & configuration
              </div>
            </div>
          )}
        </button>
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-2.5 rounded-md text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors ${
            hovered ? 'px-2 py-1.5' : 'justify-center py-1.5'
          }`}
          title={hovered ? undefined : 'Logout'}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {hovered && <span className="text-[11px] font-semibold">Logout</span>}
        </button>
      </div>
    </div>
  );

  // When TopStepX is enabled, sidebar floats over content on hover
  if (topStepXEnabled) {
    return (
      <div
        className="fixed left-0 top-[70px] bottom-0 z-50"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Hover trigger strip when collapsed */}
        {!hovered && (
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-transparent" />
        )}
        <div className={`h-full transition-transform duration-200 ${hovered ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </div>
      </div>
    );
  }

  // Normal sidebar
  return sidebarContent;
}
