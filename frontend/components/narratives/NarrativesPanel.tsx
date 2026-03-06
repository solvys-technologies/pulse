// [claude-code 2026-03-06] Narratives panel — full tab view with list/web toggle
import { useState } from 'react';
import { NarrativesList } from './NarrativesList';
import { NarrativesWeb } from './NarrativesWeb';

export function NarrativesPanel() {
  const [view, setView] = useState<'list' | 'web'>('list');

  if (view === 'web') {
    return <NarrativesWeb onCollapse={() => setView('list')} />;
  }

  return <NarrativesList onExpandToWeb={() => setView('web')} />;
}
