import React from 'react';
import type { TaskFilterOptions } from '../../types/task';
import {
  Plus,
  Search,
  X,
  Sun,
  Moon,
  Tag as TagIcon,
  LayoutGrid,
  CalendarDays,
  Power
} from 'lucide-react';

interface TopBarProps {
  activeView: 'matrix' | 'calendar';
  onSelectView: (view: 'matrix' | 'calendar') => void;
  filterOptions: TaskFilterOptions;
  onFilterChange: (filters: Partial<TaskFilterOptions>) => void;
  allTags: string[];
  taskCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenNewTask: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onSelectView,
  filterOptions,
  onFilterChange,
  allTags,
  taskCount,
  isDark,
  onToggleTheme,
  onOpenNewTask,
}) => {
  const [isExiting, setIsExiting] = React.useState(false);

  const handleExitApp = async () => {
    if (window.confirm('确定要退出四象限应用并停止后台服务吗？')) {
      setIsExiting(true);
      try {
        await fetch('/api/shutdown', { method: 'POST' });
      } catch {}
      window.close();
    }
  };

  return (
    <header className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="px-3 md:px-4 h-12 flex items-center justify-between gap-3">
        {/* 左侧：品牌 + 视图切换 + 待办计数 */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white font-bold text-[11px]">
              EM
            </div>
            <span className="hidden sm:inline text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              四象限矩阵
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* 扁平化视图切换 */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => onSelectView('matrix')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeView === 'matrix'
                  ? 'bg-white text-indigo-600 dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>象限坐标</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectView('calendar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeView === 'calendar'
                  ? 'bg-white text-indigo-600 dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>日程排程</span>
            </button>
          </div>

          <span className="hidden lg:inline text-[11px] text-slate-400 font-mono">
            {taskCount} 项待办
          </span>
        </div>

        {/* 右侧：搜索 + 新建 + 主题 + 退出 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-36 sm:w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={filterOptions.searchQuery}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              placeholder="搜索任务或标签..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
            />
            {filterOptions.searchQuery && (
              <button
                type="button"
                onClick={() => onFilterChange({ searchQuery: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
            title="新建事项 (按 N)"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">新建事项</span>
            <kbd className="hidden md:inline px-1 rounded text-[10px] bg-indigo-700/70 text-indigo-100 font-mono">
              N
            </kbd>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? '切换浅色模式' : '切换深色模式'}
          >
            {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-500" />}
            <span className="hidden sm:inline">{isDark ? '浅色' : '深色'}</span>
          </button>

          <button
            type="button"
            onClick={handleExitApp}
            disabled={isExiting}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
            title="退出应用并关闭后台服务"
          >
            <Power className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isExiting ? '退出中' : '退出'}</span>
          </button>
        </div>
      </div>

      {/* 标签扁平过滤条（仅在存在标签时展示） */}
      {allTags.length > 0 && (
        <div className="px-3 md:px-4 py-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <TagIcon className="h-3 w-3" />
            标签:
          </span>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onFilterChange({ tag: filterOptions.tag === tag ? null : tag })}
              className={`text-[11px] px-2 py-0.5 rounded-md transition-colors shrink-0 ${
                filterOptions.tag === tag
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              #{tag}
            </button>
          ))}
          {filterOptions.tag && (
            <button
              type="button"
              onClick={() => onFilterChange({ tag: null })}
              className="text-[11px] text-indigo-600 hover:underline dark:text-indigo-400 ml-1 shrink-0"
            >
              清除
            </button>
          )}
        </div>
      )}
    </header>
  );
};
