export type QuadrantId = 'q1' | 'q2' | 'q3' | 'q4';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  // 核心二维量化分值：0 ~ 10
  importance: number;         // 重要度评分 (0 ~ 10)
  urgency: number;            // 紧迫度评分 (0 ~ 10)
  useAutoUrgency?: boolean;   // 是否启用基于截止期迫近算法自动计算紧迫度 (默认 true)
  isImportant: boolean;       // importance >= 5
  isUrgent: boolean;          // urgency >= 5
  quadrant: QuadrantId;       // 自动计算派生
  isCompleted: boolean;       // 是否完成
  dueDate?: string | null;    // 截止日期 (YYYY-MM-DD)
  tags: string[];             // 自定义标签
  estimatedMinutes?: number;  // 预计耗时 (分钟)
  createdAt: string;          // ISO 字符串
  completedAt?: string | null;// 完成时间
  algorithmStatusText?: string;// 算法给出的时间迫近描述
}

export interface QuadrantMeta {
  id: QuadrantId;
  name: string;
  englishName: string;
  action: string;
  shortAction: string;
  description: string;
  themeColor: {
    badgeBg: string;
    badgeText: string;
    border: string;
    cardBorderHover: string;
    bgTint: string;
    accentDot: string;
    headerBg: string;
    headerText: string;
  };
}

export type FilterStatus = 'all' | 'pending' | 'completed';

export interface TaskFilterOptions {
  searchQuery: string;
  tag: string | null;
  status: FilterStatus;
}

/**
 * 根据重要度 (0-10) 与 紧迫度 (0-10) 严格自动计算所属象限
 * 传统管理学排布规则：
 * - 象限 I (左上): 重要 >= 5 且 紧迫 >= 5 (Do First · 立即做)
 * - 象限 II (右上): 重要 >= 5 且 紧迫 < 5 (Schedule · 计划做)
 * - 象限 III (左下): 重要 < 5 且 紧迫 >= 5 (Delegate · 授权做)
 * - 象限 IV (右下): 重要 < 5 且 紧迫 < 5 (Eliminate · 尽量不做)
 */
export function calculateQuadrant(importance: number, urgency: number): QuadrantId {
  const isImportant = importance >= 5;
  const isUrgent = urgency >= 5;
  if (isImportant && isUrgent) return 'q1';
  if (isImportant && !isUrgent) return 'q2';
  if (!isImportant && isUrgent) return 'q3';
  return 'q4';
}
