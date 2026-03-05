import { useState, useCallback, useEffect, useRef } from 'react';
import { Newspaper, Settings, LogOut, Sparkles, LayoutDashboard, MessagesSquare, NotebookText, CalendarDays, GripVertical, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { getSidebarOrder, setSidebarOrder, type NavTabId } from '../../lib/layoutOrderStorage';

type NavTab = 'feed' | 'analysis' | 'news' | 'executive' | 'chatroom' | 'notion' | 'econ' | 'settings';

interface NavSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLogout: () => void;
  topStepXEnabled?: boolean;
  onOverlayVisibilityChange?: (visible: boolean) => void;
  onEditModeChange?: (editing: boolean) => void;
}

const NAV_ITEMS_MAP: Record<NavTabId, { id: NavTab; icon: typeof LayoutDashboard; label: string; description: string }> = {
  executive: { id: 'executive', icon: LayoutDashboard, label: 'Dashboard', description: 'KPIs, calendar, The Tape' },
  analysis: { id: 'analysis', icon: Sparkles, label: 'Analysis', description: 'AI-powered trade analysis' },
  news: { id: 'news', icon: Newspaper, label: 'RiskFlow', description: 'Market news & events' },
  econ: { id: 'econ', icon: CalendarDays, label: 'Calendar', description: 'Economic calendar' },
  chatroom: { id: 'chatroom', icon: MessagesSquare, label: 'Board Room', description: 'Multi-agent boardroom' },
  notion: { id: 'notion', icon: NotebookText, label: 'Research', description: 'Notion research corpus' },
};

// Icon size: original was w-6 h-6 (24px). 35% smaller = ~15.6px → w-4 h-4 (16px)
// Button size: original was w-12 h-12 (48px). 35% smaller = ~31px → w-8 h-8 (32px)
// Sidebar collapsed width: original w-16 (64px). 35% smaller = ~42px → w-11 (44px)

export function NavSidebar({
  activeTab,
  onTabChange,
  onLogout,
  topStepXEnabled = false,
  onOverlayVisibilityChange,
  onEditModeChange,
}: NavSidebarProps) {
  const [hovered, setHovered] = useState(false);
  const [manualExpand, setManualExpand] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [order, setOrder] = useState<NavTabId[]>(() => getSidebarOrder());

  const expanded = hovered || manualExpand;

  const handleMouseEnter = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setHovered(true), 3000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHovered(false);
    setManualExpand(false);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setOrder(getSidebarOrder());
  }, []);

  useEffect(() => {
    onOverlayVisibilityChange?.(topStepXEnabled && expanded);
  }, [onOverlayVisibilityChange, topStepXEnabled, expanded]);

  useEffect(() => {
    onEditModeChange?.(editMode);
  }, [editMode, onEditModeChange]);

  useEffect(() => {
    return () => onEditModeChange?.(false);
  }, [onEditModeChange]);

  const handleDragStart = useCallback((e: React.DragEvent, id: NavTabId) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: NavTabId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') as NavTabId | '';
    if (!sourceId || sourceId === targetId) return;
    setOrder((prev) => {
      const next = [...prev];
      const si = next.indexOf(sourceId);
      const ti = next.indexOf(targetId);
      if (si === -1 || ti === -1) return prev;
      next.splice(si, 1);
      next.splice(ti, 0, sourceId);
      setSidebarOrder(next);
      return next;
    });
  }, []);

  const orderedItems = order
    .filter((id): id is NavTabId => id in NAV_ITEMS_MAP)
    .map((tabId) => ({
      tabId,
      icon: NAV_ITEMS_MAP[tabId].icon,
      label: NAV_ITEMS_MAP[tabId].label,
      description: NAV_ITEMS_MAP[tabId].description,
    }));

  const sidebarContent = (
    <div
      className={`h-full bg-[#0a0a00] border-r border-[#D4AF37]/20 flex flex-col py-3 transition-all duration-200 ease-out ${
        expanded ? 'w-48' : 'w-11'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Expand/collapse toggle */}
      <div className="px-1.5 mb-1">
        <button
          type="button"
          onClick={() => setManualExpand((v) => !v)}
          className="w-full flex items-center justify-center py-1 rounded-md text-[#D4AF37]/50 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <ChevronsLeft className="w-3.5 h-3.5" /> : <ChevronsRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="px-2 mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
              editMode
                ? 'border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10'
                : 'border-zinc-700 text-zinc-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30'
            }`}
            title={editMode ? 'Finish reordering' : 'Enable drag reorder'}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      )}
      <div className="flex-1 space-y-1 px-1.5">
        {orderedItems.map(({ tabId, icon: Icon, label, description }) => {
          const isActive = activeTab === tabId;
          return (
            <div
              key={tabId}
              draggable={expanded && editMode}
              onDragStart={editMode ? (e) => handleDragStart(e, tabId) : undefined}
              onDragOver={editMode ? handleDragOver : undefined}
              onDrop={editMode ? (e) => handleDrop(e, tabId) : undefined}
              className={`flex items-center gap-1 rounded-md transition-colors ${expanded ? 'group' : ''}`}
            >
              {expanded && editMode && (
                <div
                  className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-0.5 text-gray-500 hover:text-[#D4AF37]"
                  title="Drag to reorder"
                >
                  <GripVertical className="w-3 h-3" />
                </div>
              )}
              <button
                onClick={() => onTabChange(tabId)}
                className={`flex-1 w-full flex items-center gap-2.5 rounded-md transition-colors min-w-0 ${
                  expanded ? 'px-2 py-1.5' : 'justify-center py-1.5 px-0'
                } ${
                  isActive
                    ? 'bg-[#D4AF37] text-black'
                    : 'text-[#D4AF37]/60 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10'
                }`}
                title={expanded ? undefined : label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {expanded && (
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
            </div>
          );
        })}
      </div>

      <div className="space-y-1 px-1.5">
        <button
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center gap-2.5 rounded-md transition-colors ${
            expanded ? 'px-2 py-1.5' : 'justify-center py-1.5'
          } ${
            activeTab === 'settings'
              ? 'bg-[#D4AF37] text-black'
              : 'text-[#D4AF37]/60 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10'
          }`}
          title={expanded ? undefined : 'Settings'}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {expanded && (
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
            expanded ? 'px-2 py-1.5' : 'justify-center py-1.5'
          }`}
          title={expanded ? undefined : 'Logout'}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {expanded && <span className="text-[11px] font-semibold">Logout</span>}
        </button>
      </div>
    </div>
  );

  // When TopStepX is enabled, sidebar floats over content on hover
  if (topStepXEnabled) {
    return (
      <div
        className="fixed left-0 top-[56px] bottom-0 z-50"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Hover trigger strip when collapsed */}
        {!expanded && (
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-transparent" />
        )}
        <div className={`h-full transition-transform duration-200 ${expanded ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </div>
      </div>
    );
  }

  // Normal sidebar
  return sidebarContent;
}
