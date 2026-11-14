import { useState, useEffect } from 'react';
import { useTasks } from './hooks/useTasks';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MatrixBoard } from './components/Matrix/MatrixBoard';
import { DayScheduleView } from './components/Calendar/DayScheduleView';
import { TaskModal } from './components/Dialogs/TaskModal';
import { WizardModal } from './components/Dialogs/WizardModal';
import { StatsModal } from './components/Dialogs/StatsModal';
import { BackupModal } from './components/Dialogs/BackupModal';
import type { TaskItem } from './types/task';
import type { CalendarEvent } from './types/calendar';
import { fetchIcsFeed, parseIcsText } from './utils/calendarParser';
import { PanelLeftOpen } from 'lucide-react';

export function App() {
  const {
    tasks,
    filteredTasks,
    calendarTasks,
    allTags,
    filterOptions,
    setFilterOptions,
    stats,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    toggleCalendarTaskComplete,
    clearAllTasks,
    importTasks,
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
      } catch (_) {}
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
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('em_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('em_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // 当前主视图：'matrix' (象限坐标看板) | 'calendar' (日程时间轴排程)
  const [activeView, setActiveView] = useState<'matrix' | 'calendar'>('matrix');

  // 侧边栏折叠状态
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 外部日历订阅状态
  const [subscriptionUrl, setSubscriptionUrl] = useState<string>(() => {
    return localStorage.getItem('em_calendar_subscription_url') || '';
  });
  const [fixedEvents, setFixedEvents] = useState<CalendarEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 同步并拉取日历数据
  const syncCalendarWithUrl = async (url: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setSubscriptionUrl('');
      setFixedEvents([]);
      localStorage.removeItem('em_calendar_subscription_url');
      localStorage.removeItem('em_calendar_events_cache');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    try {
      const icsData = await fetchIcsFeed(cleanUrl);
      const events = parseIcsText(icsData);
      setFixedEvents(events);
      setSubscriptionUrl(cleanUrl);
      localStorage.setItem('em_calendar_subscription_url', cleanUrl);

      // 本地序列化缓存
      const serializable = events.map((e) => ({
        ...e,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
      }));
      localStorage.setItem('em_calendar_events_cache', JSON.stringify(serializable));
    } catch (err: any) {
      console.error('Calendar sync error:', err);
      setSyncError(err.message || '拉取或解析日历数据失败，请检查链接或网络');
    } finally {
      setIsSyncing(false);
    }
  };

  // 初始加载日历缓存与自动同步
  useEffect(() => {
    const cached = localStorage.getItem('em_calendar_events_cache');
    if (cached) {
      try {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          setFixedEvents(
            list.map((e) => ({
              ...e,
              start: new Date(e.start),
              end: new Date(e.end),
            }))
          );
        }
      } catch (e) {
        console.warn('Failed to parse cached calendar events', e);
      }
    }

    const savedUrl = localStorage.getItem('em_calendar_subscription_url');
    if (savedUrl) {
      syncCalendarWithUrl(savedUrl);
    }
  }, []);

  // 弹窗状态控制
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [defaultImportance, setDefaultImportance] = useState<number>(7);
  const [defaultUrgency, setDefaultUrgency] = useState<number>(7);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

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
        setDefaultUrgency(7);
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

  const handleOpenNewTaskWithCoordinates = (importance: number, urgency: number) => {
    setEditingTask(null);
    setDefaultImportance(importance);
    setDefaultUrgency(urgency);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (data: {
    title: string;
    description?: string;
    importance: number;
    urgency: number;
    useAutoUrgency?: boolean;
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 左侧选项工具栏 */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        filterOptions={filterOptions}
        onFilterChange={(newFilters) => setFilterOptions((prev) => ({ ...prev, ...newFilters }))}
        allTags={allTags}
        stats={stats}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenNewTask={() => handleOpenNewTaskWithCoordinates(7, 7)}
        onOpenWizard={() => setIsWizardOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
      />

      {/* 右侧主视窗 */}
      <main className="flex-1 flex flex-col h-full min-w-0 p-3 md:p-4 overflow-hidden">
        {/* 移动端/折叠时的顶部轻量展开条 */}
        {isSidebarCollapsed && (
          <div className="md:hidden flex items-center justify-between pb-2 mb-1 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
            <span className="text-xs font-bold">
              {activeView === 'matrix' ? '四象限坐标看板' : '日历日程排程'}
            </span>
            <div className="w-5" />
          </div>
        )}

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
            tasks={calendarTasks}
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
        defaultUrgency={defaultUrgency}
        allExistingTags={allTags}
      />

      <WizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onConfirmTask={(data) => addTask(data)}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        tasks={tasks}
        onImport={importTasks}
        onClearAll={clearAllTasks}
      />
    </div>
  );
}

export default App;
