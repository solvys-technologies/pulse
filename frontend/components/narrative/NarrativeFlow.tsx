// [claude-code 2026-03-06] NarrativeFlow — unified shell wiring all 4 tracks
import { useState, useCallback } from 'react';
import { useNarrative } from '../../contexts/NarrativeContext';
import { NarrativeToolbar } from './NarrativeToolbar';
import NarrativeWeekView from './NarrativeWeekView';
import NarrativeMonthView from './NarrativeMonthView';
import { NarrativeCanvasView } from './NarrativeCanvasView';
import { TimelineScrubber } from './TimelineScrubber';
import { NarrativeSaveModal } from './NarrativeSaveModal';

export function NarrativeFlow() {
  const { state, snapshot, dispatch } = useNarrative();
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const handleSave = useCallback(() => {
    setSaveModalOpen(true);
  }, []);

  const handleConfirmSave = useCallback(() => {
    dispatch({ type: 'TAKE_SNAPSHOT' });
    setSaveModalOpen(false);
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
      />

      <div className="flex-1 min-h-0 relative overflow-hidden">
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
    </div>
  );
}
