import type { QuadrantId, QuadrantMeta } from '../types/task';

export const QUADRANTS_CONFIG: Record<QuadrantId, QuadrantMeta> = {
  q1: {
    id: 'q1',
    name: '重要且紧急',
    shortAction: '立即执行',
    themeColor: {
      border: 'border-rose-200/80 dark:border-rose-900/40',
      accentDot: 'bg-rose-500',
      headerBg: 'bg-rose-100/60 dark:bg-rose-900/30',
    },
  },
  q2: {
    id: 'q2',
    name: '重要不紧急',
    shortAction: '专注投入',
    themeColor: {
      border: 'border-blue-200/80 dark:border-blue-900/40',
      accentDot: 'bg-blue-500',
      headerBg: 'bg-blue-100/60 dark:bg-blue-900/30',
    },
  },
  q3: {
    id: 'q3',
    name: '紧急不重要',
    shortAction: '快速委派',
    themeColor: {
      border: 'border-amber-200/80 dark:border-amber-900/40',
      accentDot: 'bg-amber-500',
      headerBg: 'bg-amber-100/60 dark:bg-amber-900/30',
    },
  },
  q4: {
    id: 'q4',
    name: '不重要不紧急',
    shortAction: '精简剔除',
    themeColor: {
      border: 'border-slate-200 dark:border-slate-800',
      accentDot: 'bg-slate-400',
      headerBg: 'bg-slate-100/60 dark:bg-slate-800/40',
    },
  },
};
