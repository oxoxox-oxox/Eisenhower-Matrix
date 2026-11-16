# 艾森豪威尔四象限时间管理矩阵 (Eisenhower Matrix)

一个基于现代 Web 技术构建的直观、简洁、自适应的四象限时间管理与日程排程看板。

> **核心原则**：不依赖手动拖拽，而是**严格根据任务的「重要程度」与「紧迫程度」两个维度自动分流落位**，杜绝随意放置，引导用户科学决策。

---

## 🌟 核心特性

- 🎯 **真实十字交叉直角坐标系 (True Cartesian Matrix Board)**
  - 采用二维直角坐标系底板，横轴（紧迫度 0~10）与纵轴（重要度 0~10）在中心 (5, 5) 十字相交。
  - **象限传统管理学排布**：
    - **象限 I (左上)**：重要度 ≥ 5 且 紧迫度 ≥ 5 (Do First · 立即做)
    - **象限 II (右上)**：重要度 ≥ 5 且 紧迫度 < 5 (Schedule · 计划做)
    - **象限 III (左下)**：重要度 < 5 且 紧迫度 ≥ 5 (Delegate · 授权做)
    - **象限 IV (右下)**：重要度 < 5 且 紧迫度 < 5 (Eliminate · 尽量不做)
  - 支持点击坐标系空白处按对应重要度快速新建事项，任务完成后即刻永久移除。

- 📐 **极简扁平顶栏布局**
  - 新建任务、视图切换（象限坐标 / 日程排程）、搜索、标签筛选、主题切换统一收纳在顶部扁平导航栏，主面板空间最大化。

- 📅 **日历订阅结合与时间块自动排程 (Calendar Auto-Scheduling)**
  - **支持 WebCal / ICS 订阅**：可填入 Google Calendar、Outlook、Apple 日历、飞书等外部日历订阅链接，通过内置反向代理无缝解析日程事件。
  - **当日时间轴视图 (Day Schedule View)**：自动提取空闲时间窗，结合生理节律与四象限优先级将待办排入合适时段，支持长任务节律拆分与跨日滚动顺延。

- ⚡ **动态截止期迫近与最小松弛度算法 (Least Laxity First)**
  - 结合截止日期与预计耗时自动计算剩余松弛时间并实时更新紧迫度。

- 🌓 **浅色 / 深色主题与离线持久化**
  - 基于 `LocalStorage` 本地持久化存储；支持浅色与深色模式自由切换及按 `N` 键快速新建任务。

---

## 🛠️ 技术栈

- **框架**：React 19 + TypeScript
- **构建工具**：Vite 8
- **样式**：Tailwind CSS v4
- **图标**：Lucide React
- **日历解析**：ical.js

---

## 🚀 快速启动

```bash
npm install
npm run dev
```

构建生产包：

```bash
npm run build
```

---

## 📂 项目结构

```text
Eisenhower-Matrix/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── scripts/                          # 桌面启动器与停机脚本
└── src/
    ├── main.tsx
    ├── index.css                     # Tailwind CSS v4 入口与主题变体配置
    ├── App.tsx                       # 主入口容器、视图切换、主题与快捷键控制
    ├── types/
    │   ├── task.ts                   # 任务与筛选类型定义及坐标计算函数
    │   └── calendar.ts               # 日历事件与排程数据结构定义
    ├── constants/
    │   └── quadrants.ts              # 四象限元数据配置
    ├── hooks/
    │   ├── useLocalStorage.ts        # 本地持久化 Hook
    │   └── useTasks.ts               # 任务 CRUD、动态紧迫度同步与过滤 Hook
    ├── utils/
    │   ├── priorityAlgorithm.ts      # 动态截止期迫近与最小松弛度算法
    │   ├── calendarParser.ts         # ICS / WebCal 日历订阅拉取与解析
    │   └── calendarScheduler.ts      # 当日智能排程与时间轴分栏算法
    └── components/
        ├── Header/TopBar.tsx         # 顶部扁平导航栏
        ├── Matrix/MatrixBoard.tsx    # 四象限直角坐标系看板
        ├── Calendar/DayScheduleView.tsx # 日程时间轴视图
        └── Dialogs/TaskModal.tsx     # 新建/编辑任务弹窗
```
