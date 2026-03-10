// [claude-code 2026-03-10] Agent plan — task list with expand/collapse via framer-motion
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

type TaskStatus = 'pending' | 'running' | 'done' | 'error';

interface PlanTask {
  id: string;
  label: string;
  status: TaskStatus;
  detail?: string;
}

interface AgentPlanProps {
  title?: string;
  tasks: PlanTask[];
  className?: string;
}

const STATUS_ICON: Record<TaskStatus, string> = {
  pending: '\u25CB', // ○
  running: '\u25D4', // ◔
  done: '\u2713',    // ✓
  error: '\u2717',   // ✗
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  pending: 'var(--pulse-muted)',
  running: 'var(--pulse-accent)',
  done: 'var(--pulse-bullish)',
  error: 'var(--pulse-bearish)',
};

export function AgentPlan({ title = 'Plan', tasks, className }: AgentPlanProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className={cn('rounded-lg border p-3', className)} style={{ borderColor: 'var(--pulse-accent)', opacity: 0.85 }}>
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--pulse-accent)' }}>
        {title}
      </h3>

      <ul className="space-y-1">
        {tasks.map((t) => {
          const open = expanded.has(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                className="flex items-center gap-2 w-full text-left text-sm py-1 px-1 rounded hover:bg-white/5 transition-colors"
                onClick={() => t.detail && toggle(t.id)}
                style={{ cursor: t.detail ? 'pointer' : 'default' }}
              >
                <span style={{ color: STATUS_COLOR[t.status] }}>{STATUS_ICON[t.status]}</span>
                <span style={{ color: 'var(--pulse-text)' }}>{t.label}</span>
              </button>

              <AnimatePresence>
                {open && t.detail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs pl-6 pb-1" style={{ color: 'var(--pulse-muted)' }}>
                      {t.detail}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
