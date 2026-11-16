import { useMemo, useState, useEffect } from 'react';
import { calculateQuadrant, formatLocalDate, isTaskLastDay } from '../types/task';
import type { TaskItem, TaskFilterOptions } from '../types/task';
import { useLocalStorage } from './useLocalStorage';
import { calculateDynamicUrgency } from '../utils/priorityAlgorithm';

const STORAGE_KEY = 'eisenhower_matrix_user_tasks';

function resolveTaskMetrics(
  task: Pick<TaskItem, 'importance' | 'urgency' | 'dueDate' | 'estimatedMinutes' | 'createdAt' | 'isImportant'>,
  now: Date
) {
  const rawImportance =
    typeof task.importance === 'number' && !Number.isNaN(task.importance)
      ? task.importance
      : task.isImportant
      ? 8
      : 5;
  const importance = Math.max(0, Math.min(10, rawImportance));
  const dueDate =
    task.dueDate || formatLocalDate(task.createdAt ? new Date(task.createdAt) : now);
  const result = calculateDynamicUrgency({
    dueDate,
    estimatedMinutes: task.estimatedMinutes,
    fallbackUrgency: task.urgency,
    currentTime: now,
  });

  return {
    importance,
    dueDate,
    urgency: result.urgency,
    quadrant: calculateQuadrant(importance, result.urgency),
    algorithmStatusText: result.statusText,
  };
}

export function useTasks() {
  const [tasks, setTasks] = useLocalStorage<TaskItem[]>(STORAGE_KEY, []);

  // 定时刷新动态紧迫度（每 60 秒自动更新一次时间衰减，且在每次打开/切回窗口时立即自动更新紧急度）
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // 每次打开应用或切回页面时，清理历史已完成任务并根据截止日期重算紧迫度
  useEffect(() => {
    const recalculateAllTasksUrgency = () => {
      const now = new Date();
      setCurrentTime(now);
      setTasks((prev) => {
        if (!prev || prev.length === 0) return prev;
        let hasChanged = prev.some((task) => task.isCompleted);
        const activeTasks = prev.filter((task) => !task.isCompleted);

        const nextTasks = activeTasks.map((task) => {
          const metrics = resolveTaskMetrics(task, now);
          if (
            task.importance !== metrics.importance ||
            task.urgency !== metrics.urgency ||
            task.quadrant !== metrics.quadrant ||
            task.dueDate !== metrics.dueDate ||
            task.algorithmStatusText !== metrics.algorithmStatusText
          ) {
            hasChanged = true;
            return {
              ...task,
              ...metrics,
            };
          }
          return task;
        });
        return hasChanged ? nextTasks : prev;
      });
    };

    // 初次打开时立即执行一次更新
    recalculateAllTasksUrgency();

    const timer = setInterval(recalculateAllTasksUrgency, 60000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        recalculateAllTasksUrgency();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [setTasks]);

  const [filterOptions, setFilterOptions] = useState<TaskFilterOptions>({
    searchQuery: '',
    tag: null,
  });

  // 动态解析任务：始终通过“截止期迫近与松弛度算法”自动计算紧迫度与所属象限
  const resolvedTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.isCompleted)
      .map((task) => ({
        ...task,
        ...resolveTaskMetrics(task, currentTime),
      }));
  }, [tasks, currentTime]);

  // 添加新任务（紧迫度完全由截止日期自动计算）
  const addTask = (data: {
    title: string;
    description?: string;
    importance: number;
    dueDate?: string | null;
    tags?: string[];
    estimatedMinutes?: number;
  }) => {
    const now = new Date();
    const metrics = resolveTaskMetrics(
      {
        importance: data.importance,
        urgency: 5,
        dueDate: data.dueDate || formatLocalDate(now),
        estimatedMinutes: data.estimatedMinutes,
        createdAt: now.toISOString(),
      },
      now
    );

    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      ...metrics,
      completedDates: [],
      tags: data.tags?.map((t) => t.trim()).filter(Boolean) || [],
      estimatedMinutes: data.estimatedMinutes,
      createdAt: now.toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  };

  // 更新任务（紧迫度完全根据截止日期与预计耗时自动重算）
  const updateTask = (id: string, updates: Partial<Omit<TaskItem, 'id' | 'createdAt'>>) => {
    const now = new Date();
    setTasks((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const merged = {
          ...item,
          ...updates,
          dueDate: (updates.dueDate !== undefined ? updates.dueDate : item.dueDate) || formatLocalDate(now),
        };
        return {
          ...merged,
          ...resolveTaskMetrics(merged, now),
        };
      })
    );
  };

  // 完成任务即永久移除
  const toggleComplete = (id: string) => {
    setTasks((prev) => prev.filter((item) => item.id !== id));
  };

  // 日历视图勾选完成：默认仅标记当天 (targetDateStr) 目标完成；
  // 除非那一天是任务的最后一天（即设置了 dueDate 且 targetDateStr >= dueDate），才直接完成并永久移除该任务
  const toggleCalendarTaskComplete = (id: string, targetDateStr: string) => {
    setTasks((prev) =>
      prev.flatMap((item) => {
        if (item.id !== id) return [item];
        const prevDates = Array.isArray(item.completedDates) ? item.completedDates : [];
        const isDoneOnTargetDate = prevDates.includes(targetDateStr);
        const isLastDay = isTaskLastDay(item, targetDateStr);

        if (!isDoneOnTargetDate) {
          if (isLastDay) {
            // 那一天是任务的最后一天：任务完成，永久移除
            return [];
          }
          // 不是最后一天：仅标记当天目标完成，整体仍保留
          return [
            {
              ...item,
              completedDates: [...prevDates, targetDateStr],
            },
          ];
        } else {
          // 取消当天的完成勾选
          return [
            {
              ...item,
              completedDates: prevDates.filter((d) => d !== targetDateStr),
            },
          ];
        }
      })
    );
  };

  // 删除任务
  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((item) => item.id !== id));
  };

  // 提取所有唯一标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    resolvedTasks.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [resolvedTasks]);

  // 根据当前搜索与标签条件过滤任务
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

      return true;
    });
  }, [resolvedTasks, filterOptions]);

  return {
    totalCount: resolvedTasks.length,
    filteredTasks,
    allTags,
    filterOptions,
    setFilterOptions,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    toggleCalendarTaskComplete,
  };
}
