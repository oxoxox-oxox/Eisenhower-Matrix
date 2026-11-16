import { useState, useEffect } from 'react';
import { useTasks } from './hooks/useTasks';
import { TopBar } from './components/Header/TopBar';
import { MatrixBoard } from './components/Matrix/MatrixBoard';
import { DayScheduleView } from './components/Calendar/DayScheduleView';
import { TaskModal } from './components/Dialogs/TaskModal';
import type { TaskItem } from './types/task';
import type { CalendarEvent } from './types/calendar';
import { fetchIcsFeed, parseIcsText } from './utils/calendarParser';

export function App() {
  const {
    totalCount,
    filteredTasks,
    allTags,
    filterOptions,
    setFilterOptions,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    toggleCalendarTaskComplete,
  } = useTasks();

  // 主题模式控制
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('em_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // 桌面应用模式：保持活跃心跳并在关窗时安全通知本地服务停机
  useEffect(() => {
    // 1. 每 3 秒发送一次活跃心跳（防止服务被看门狗回收）
    const heartbeatTimer = setInterval(() => {
      fetch('/api/heartbeat').catch(() => {});
    }, 3000);

    // 2. 关窗时发送立即停机信标（Beacon 请求在窗口销毁时依然可靠投递）
    const handleClose = () => {
      try {
        navigator.sendBeacon('/api/shutdown');
      } catch {}
    };

    window.addEventListener('beforeunload', handleClose);
    window.addEventListener('pagehide', handleClose);
    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('beforeunload', handleClose);
      window.removeEventListener('pagehide', handleClose);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    localStorage.setItem('em_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // 当前主视图：'matrix' (象限坐标看板) | 'calendar' (日程时间轴排程)
  const [activeView, setActiveView] = useState<'matrix' | 'calendar'>('matrix');

  // 外部日历订阅状态
  const [subscriptionUrl, setSubscriptionUrl] = useState<string>(() => {
    return localStorage.getItem('em_calendar_subscription_url') || '';
  });
  const [fixedEvents, setFixedEvents] = useState<CalendarEvent[]>(() => {
    const cached = localStorage.getItem('em_calendar_events_cache');
    if (!cached) return [];
    try {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        return list.map((e) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
        }));
      }
    } catch (e) {
      console.warn('Failed to parse cached calendar events', e);
    }
    return [];
  });
  const [isSyncing, setIsSyncing] = useState(() =>
    Boolean(localStorage.getItem('em_calendar_subscription_url')?.trim())
  );
  const [syncError, setSyncError] = useState<string | null>(null);

  const fetchAndCacheCalendarEvents = async (cleanUrl: string) => {
    const icsData = await fetchIcsFeed(cleanUrl);
    const events = parseIcsText(icsData);
    localStorage.setItem('em_calendar_subscription_url', cleanUrl);

    const serializable = events.map((e) => ({
      ...e,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
    }));
    localStorage.setItem('em_calendar_events_cache', JSON.stringify(serializable));
    return events;
  };

  // 同步并拉取日历数据
  const syncCalendarWithUrl = async (url: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setSubscriptionUrl('');
      setFixedEvents([]);
      setSyncError(null);
      localStorage.removeItem('em_calendar_subscription_url');
      localStorage.removeItem('em_calendar_events_cache');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    try {
      const events = await fetchAndCacheCalendarEvents(cleanUrl);
      setFixedEvents(events);
      setSubscriptionUrl(cleanUrl);
    } catch (err: any) {
      console.error('Calendar sync error:', err);
      setSyncError(err.message || '拉取或解析日历数据失败，请检查链接或网络');
    } finally {
      setIsSyncing(false);
    }
  };

  // 启动时若已绑定订阅链接，自动后台同步一次
  useEffect(() => {
    const savedUrl = localStorage.getItem('em_calendar_subscription_url')?.trim();
    if (!savedUrl) return;

    let cancelled = false;
    fetchAndCacheCalendarEvents(savedUrl)
      .then((events) => {
        if (!cancelled) {
          setFixedEvents(events);
          setSyncError(null);
        }
      })
      .catch((err: any) => {
        console.error('Calendar sync error:', err);
        if (!cancelled) {
          setSyncError(err.message || '拉取或解析日历数据失败，请检查链接或网络');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSyncing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 弹窗状态控制
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [defaultImportance, setDefaultImportance] = useState<number>(7);

  // 全局快捷键监听（按 N 键新建任务）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingTask(null);
        setDefaultImportance(7);
        setIsTaskModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleOpenNewTaskWithCoordinates = (importance: number) => {
    setEditingTask(null);
    setDefaultImportance(importance);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (data: {
    title: string;
    description?: string;
    importance: number;
    dueDate?: string | null;
    tags?: string[];
    estimatedMinutes?: number;
  }) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 顶部扁平工具栏 */}
      <TopBar
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        filterOptions={filterOptions}
        onFilterChange={(newFilters) => setFilterOptions((prev) => ({ ...prev, ...newFilters }))}
        allTags={allTags}
        taskCount={totalCount}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenNewTask={() => handleOpenNewTaskWithCoordinates(7)}
      />

      {/* 主视窗 */}
      <main className="flex-1 min-h-0 flex flex-col p-2.5 md:p-3.5 overflow-hidden">
        {/* 视图分流：象限坐标系看板 VS 日历日程排程 */}
        {activeView === 'matrix' ? (
          <MatrixBoard
            tasks={filteredTasks}
            onToggleComplete={toggleComplete}
            onEdit={handleEditTask}
            onDelete={deleteTask}
            onOpenCreateWithCoordinates={handleOpenNewTaskWithCoordinates}
          />
        ) : (
          <DayScheduleView
            tasks={filteredTasks}
            fixedEvents={fixedEvents}
            subscriptionUrl={subscriptionUrl}
            onUpdateSubscriptionUrl={syncCalendarWithUrl}
            onSyncCalendar={() => syncCalendarWithUrl(subscriptionUrl)}
            isSyncing={isSyncing}
            syncError={syncError}
            onToggleCompleteTask={toggleCalendarTaskComplete}
            onEditTask={handleEditTask}
          />
        )}
      </main>

      {/* 弹窗组件 */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
        defaultImportance={defaultImportance}
        allExistingTags={allTags}
      />
    </div>
  );
}

export default App;
