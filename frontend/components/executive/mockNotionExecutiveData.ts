export interface NotionDoc {
  id: string;
  title: string;
  updated: string;
  tags: string[];
  excerpt: string;
}

export const notionDocs: NotionDoc[] = [
  {
    id: 'memo-001',
    title: 'CPI Scenario Tree',
    updated: 'Updated 45m ago',
    tags: ['Macro', 'RiskFlow', 'Exec'],
    excerpt:
      'Scenario weighting favors a 0.2 beat; recommend trimming cyclicals pre-print.',
  },
  {
    id: 'memo-002',
    title: 'Energy Tape Review',
    updated: 'Updated 2h ago',
    tags: ['Energy', 'Options'],
    excerpt:
      'Options sweep in CL 86C aligns with inventory anomaly. Keep alerts on.',
  },
  {
    id: 'memo-003',
    title: 'AI Infra Pricing Matrix',
    updated: 'Updated 1d ago',
    tags: ['Research', 'Valuation'],
    excerpt:
      'Margin compression risk emerging in Q2 for hyperscale suppliers.',
  },
  {
    id: 'memo-004',
    title: 'RiskFlow Daily',
    updated: 'Updated 15m ago',
    tags: ['RiskFlow', 'Daily'],
    excerpt:
      'Defensive bias with volatility bands widened; watch 12:30 re-open.',
  },
  {
    id: 'memo-005',
    title: 'NTN Draft',
    updated: 'Updated 10m ago',
    tags: ['NTN', 'Executive'],
    excerpt:
      'Drafting executive brief with 3 action items and two caution flags.',
  },
];

