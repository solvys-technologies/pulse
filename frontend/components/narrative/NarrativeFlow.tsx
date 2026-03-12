// [claude-code 2026-03-11] T3e: NarrativeFlow — added Coming Soon overlay
import { useState, useCallback } from 'react';
import { useNarrative } from '../../contexts/NarrativeContext';
import { NarrativeToolbar } from './NarrativeToolbar';
import NarrativeWeekView from './NarrativeWeekView';
import NarrativeMonthView from './NarrativeMonthView';
import { NarrativeCanvasView } from './NarrativeCanvasView';
import { TimelineScrubber } from './TimelineScrubber';
import { NarrativeSaveModal } from './NarrativeSaveModal';
import { RiskFlowImportModal } from './RiskFlowImportModal';

export function NarrativeFlow() {
  const { state, snapshot, dispatch } = useNarrative();
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleSave = useCallback(() => {
    setSaveModalOpen(true);
  }, []);

  const handleConfirmSave = useCallback(() => {
    dispatch({ type: 'TAKE_SNAPSHOT' });
    setSaveModalOpen(false);
  }, [dispatch]);

  const handleImportCatalysts = useCallback((catalysts: any[]) => {
    dispatch({ type: 'IMPORT_CATALYSTS', catalysts });
  }, [dispatch]);

  const handleUndo = useCallback(() => {
    if (snapshot) {
      dispatch({ type: 'RESTORE_SNAPSHOT' });
    }
  }, [snapshot, dispatch]);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--pulse-bg)' }}>
      <NarrativeToolbar
        state={state}
        dispatch={dispatch}
        onSave={handleSave}
        onUndo={handleUndo}
        hasSnapshot={!!snapshot}
        onImport={() => setImportModalOpen(true)}
      />

      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Coming Soon overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(5, 4, 2, 0.92)' }}>
          <div className="text-center space-y-3">
            <div className="text-[var(--pulse-accent)] text-lg font-semibold tracking-wide">
              NarrativeFlow
            </div>
            <div className="text-zinc-500 text-sm">Coming Soon</div>
            <div className="w-16 h-px mx-auto" style={{ backgroundColor: 'rgba(199, 159, 74, 0.3)' }} />
            <p className="text-zinc-600 text-xs max-w-xs leading-relaxed">
              Track macro narratives, thesis threads, and catalyst timelines in a visual canvas.
            </p>
          </div>
        </div>
        {state.zoomLevel === 'week' && <NarrativeWeekView />}
        {state.zoomLevel === 'month' && <NarrativeMonthView />}
        {(state.zoomLevel === 'quarter' || state.zoomLevel === 'year') && (
          <NarrativeCanvasView
            zoomLevel={state.zoomLevel}
            catalysts={state.catalysts}
            lanes={state.lanes}
            ropes={state.ropes}
            currentWeekStart={state.currentWeekStart}
            heatmapEnabled={state.heatmapEnabled}
            dispatch={dispatch}
          />
        )}
      </div>

      <TimelineScrubber
        state={state}
        catalysts={state.catalysts}
        dispatch={dispatch}
      />

      <NarrativeSaveModal
        open={saveModalOpen}
        onConfirm={handleConfirmSave}
        onCancel={() => setSaveModalOpen(false)}
      />

      <RiskFlowImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportCatalysts}
        lanes={state.lanes}
      />
    </div>
  );
}
