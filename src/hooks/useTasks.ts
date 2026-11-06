import { useMemo, useState, useEffect } from 'react';
import { calculateQuadrant } from '../types/task';
import type { TaskItem, QuadrantId, TaskFilterOptions } from '../types/task';
import { useLocalStorage } from './useLocalStorage';
import { calculateDynamicUrgency } from '../utils/priorityAlgorithm';

const STORAGE_KEY = 'eisenhower_matrix_user_tasks';

export function useTasks() {
  const [tasks, setTasks] = useLocalStorage<TaskItem[]>(STORAGE_KEY, []);

  // 定时刷新动态紧迫度（每 60 秒自动更新一次时间衰减）
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const [filterOptions, setFilterOptions] = useState<TaskFilterOptions>({
    searchQuery: '',
    tag: null,
    status: 'all',
  });

  // 动态解析任务：若配置了截止日期，通过“截止期迫近与松弛度算法”动态更新紧迫度与所属象限
  const resolvedTasks = useMemo(() => {
    return tasks.map((task) => {
      let effectiveUrgency = task.urgency;
      let algorithmStatusText: string | undefined;

      // 如果开启了自动动态算法，且拥有截止日期
      if (task.useAutoUrgency !== false && task.dueDate) {
        const result = calculateDynamicUrgency({
          dueDate: task.dueDate,
          estimatedMinutes: task.estimatedMinutes,
          fallbackUrgency: task.urgency,
          currentTime,
        });
        effectiveUrgency = result.urgency;
        algorithmStatusText = result.statusText;
      }

      const isImportant = task.importance >= 5;
      const isUrgent = effectiveUrgency >= 5;
      const quadrant = calculateQuadrant(task.importance, effectiveUrgency);

      return {
        ...task,
        urgency: effectiveUrgency,
        isImportant,
        isUrgent,
        quadrant,
        algorithmStatusText,
      };
    });
  }, [tasks, currentTime]);

  // 添加新任务
  const addTask = (data: {
    title: string;
    description?: string;
    importance: number;
    urgency: number;
    useAutoUrgency?: boolean;
    dueDate?: string | null;
    tags?: string[];
    estimatedMinutes?: number;
  }) => {
    const importance = Math.max(0, Math.min(10, Number(data.importance) || 5));
    let urgency = Math.max(0, Math.min(10, Number(data.urgency) || 5));
    const useAutoUrgency = data.useAutoUrgency ?? (data.dueDate ? true : false);

    // 如果指定了截止日期且启用了自动算法，使用算法计算初始紧迫度
    if (useAutoUrgency && data.dueDate) {
      const result = calculateDynamicUrgency({
        dueDate: data.dueDate,
        estimatedMinutes: data.estimatedMinutes,
        fallbackUrgency: urgency,
        currentTime: new Date(),
      });
      urgency = result.urgency;
    }

    const isImportant = importance >= 5;
    const isUrgent = urgency >= 5;
    const quadrant = calculateQuadrant(importance, urgency);

    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      importance,
      urgency,
      useAutoUrgency,
      isImportant,
      isUrgent,
      quadrant,
      isCompleted: false,
      dueDate: data.dueDate || null,
      tags: data.tags?.map((t) => t.trim()).filter(Boolean) || [],
      estimatedMinutes: data.estimatedMinutes,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  };

  // 更新任务
  const updateTask = (id: string, updates: Partial<Omit<TaskItem, 'id' | 'createdAt'>>) => {
    setTasks((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const nextImportance = updates.importance !== undefined 
          ? Math.max(0, Math.min(10, Number(updates.importance))) 
          : item.importance;

        let nextUrgency = updates.urgency !== undefined 
          ? Math.max(0, Math.min(10, Number(updates.urgency))) 
          : item.urgency;

        const nextUseAutoUrgency = updates.useAutoUrgency !== undefined
          ? updates.useAutoUrgency
          : item.useAutoUrgency;

        const nextDueDate = updates.dueDate !== undefined ? updates.dueDate : item.dueDate;
        const nextEstimatedMinutes = updates.estimatedMinutes !== undefined ? updates.estimatedMinutes : item.estimatedMinutes;

        // 如果启用算法计算
        if (nextUseAutoUrgency && nextDueDate) {
          const result = calculateDynamicUrgency({
            dueDate: nextDueDate,
            estimatedMinutes: nextEstimatedMinutes,
            fallbackUrgency: nextUrgency,
            currentTime: new Date(),
          });
          nextUrgency = result.urgency;
        }

        const nextIsImportant = nextImportance >= 5;
        const nextIsUrgent = nextUrgency >= 5;
        const nextQuadrant = calculateQuadrant(nextImportance, nextUrgency);

        return {
          ...item,
          ...updates,
          importance: nextImportance,
          urgency: nextUrgency,
          useAutoUrgency: nextUseAutoUrgency,
          isImportant: nextIsImportant,
          isUrgent: nextIsUrgent,
          quadrant: nextQuadrant,
        };
      })
    );
  };

  // 快捷切换完成状态
  const toggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextCompleted = !item.isCompleted;
        return {
          ...item,
          isCompleted: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : null,
        };
      })
    );
  };

  // 删除任务
  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((item) => item.id !== id));
  };

  // 清理已完成任务
  const clearCompleted = (quadrantId?: QuadrantId) => {
    setTasks((prev) =>
      prev.filter((item) => {
        if (!item.isCompleted) return true;
        if (quadrantId && item.quadrant !== quadrantId) return true;
        return false;
      })
    );
  };

  // 导入任务列表
  const importTasks = (newTasks: any[]) => {
    const sanitized: TaskItem[] = newTasks.map((t) => {
      const importance = typeof t.importance === 'number' 
        ? Math.max(0, Math.min(10, t.importance)) 
        : (t.isImportant ? 8 : 2);
      const urgency = typeof t.urgency === 'number' 
        ? Math.max(0, Math.min(10, t.urgency)) 
        : (t.isUrgent ? 8 : 2);
      
      return {
        id: t.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: String(t.title || '未命名任务'),
        description: t.description || undefined,
        importance,
        urgency,
        useAutoUrgency: t.useAutoUrgency ?? (t.dueDate ? true : false),
        isImportant: importance >= 5,
        isUrgent: urgency >= 5,
        quadrant: calculateQuadrant(importance, urgency),
        isCompleted: !!t.isCompleted,
        dueDate: t.dueDate || null,
        tags: Array.isArray(t.tags) ? t.tags : [],
        estimatedMinutes: t.estimatedMinutes,
        createdAt: t.createdAt || new Date().toISOString(),
        completedAt: t.completedAt || null,
      };
    });
    setTasks(sanitized);
  };

  // 清空所有任务
  const clearAllTasks = () => {
    setTasks([]);
  };

  // 提取所有唯一标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [tasks]);

  // 根据当前搜索与筛选条件过滤任务
  const filteredTasks = useMemo(() => {
    const query = filterOptions.searchQuery.trim().toLowerCase();

    return resolvedTasks.filter((task) => {
      if (query) {
        const titleMatch = task.title.toLowerCase().includes(query);
        const descMatch = task.description?.toLowerCase().includes(query) ?? false;
        const tagMatch = task.tags?.some((t) => t.toLowerCase().includes(query)) ?? false;
        if (!titleMatch && !descMatch && !tagMatch) return false;
      }

      if (filterOptions.tag && !task.tags?.includes(filterOptions.tag)) {
        return false;
      }

      if (filterOptions.status === 'pending' && task.isCompleted) return false;
      if (filterOptions.status === 'completed' && !task.isCompleted) return false;

      return true;
    });
  }, [resolvedTasks, filterOptions]);

  // 将过滤后的任务按象限分组
  const tasksByQuadrant = useMemo(() => {
    const grouped: Record<QuadrantId, TaskItem[]> = {
      q1: [],
      q2: [],
      q3: [],
      q4: [],
    };

    const sorted = [...filteredTasks].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      const scoreA = a.importance * 1.5 + a.urgency;
      const scoreB = b.importance * 1.5 + b.urgency;
      return scoreB - scoreA;
    });

    for (const task of sorted) {
      grouped[task.quadrant].push(task);
    }

    return grouped;
  }, [filteredTasks]);

  // 统计指标
  const stats = useMemo(() => {
    const total = resolvedTasks.length;
    const completed = resolvedTasks.filter((t) => t.isCompleted).length;
    const pending = total - completed;

    const breakdown: Record<QuadrantId, { total: number; completed: number; pending: number; percent: number }> = {
      q1: { total: 0, completed: 0, pending: 0, percent: 0 },
      q2: { total: 0, completed: 0, pending: 0, percent: 0 },
      q3: { total: 0, completed: 0, pending: 0, percent: 0 },
      q4: { total: 0, completed: 0, pending: 0, percent: 0 },
    };

    resolvedTasks.forEach((t) => {
      breakdown[t.quadrant].total += 1;
      if (t.isCompleted) breakdown[t.quadrant].completed += 1;
      else breakdown[t.quadrant].pending += 1;
    });

    if (total > 0) {
      (['q1', 'q2', 'q3', 'q4'] as QuadrantId[]).forEach((q) => {
        breakdown[q].percent = Math.round((breakdown[q].total / total) * 100);
      });
    }

    return {
      total,
      completed,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      breakdown,
    };
  }, [resolvedTasks]);

  return {
    tasks,
    filteredTasks,
    tasksByQuadrant,
    allTags,
    filterOptions,
    setFilterOptions,
    stats,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    clearCompleted,
    clearAllTasks,
    importTasks,
  };
}
