# 艾森豪威尔矩阵 (Eisenhower Matrix) 项目规划方案

> 本文档为 Eisenhower Matrix 项目的初步技术与功能实现规划，旨在构建一个直观、高效、现代化的四象限时间与任务管理系统。

---

## 一、 项目背景与核心理念

**艾森豪威尔法则（Eisenhower Matrix）** 又称“重要-紧急四象限法则”，通过两个维度（重要性与紧急性）将任务划分为四个象限，帮助用户摆脱“虚假忙碌”，聚焦于高价值事项：

```
                紧  急 (Urgent)                 不 紧 急 (Not Urgent)
          +-------------------------------+-------------------------------+
          |          Quadrant I           |          Quadrant II          |
重  要    |         【重要且紧急】        |        【重要但不紧急】       |
(Important|   核心策略：马上做 (Do First)   |   核心策略：计划做 (Schedule) |
          |   例：危机公关、紧急 Bug 修复  |   例：战略规划、技能提升、健康 |
          +-------------------------------+-------------------------------+
          |         Quadrant III          |          Quadrant IV          |
不 重 要  |        【紧急但不重要】       |       【不重要且不紧急】      |
(Not      |   核心策略：授权做 (Delegate) |   核心策略：尽量不做 (Eliminate)|
Important)|   例：突发琐事、无关紧要的打扰|   例：无意义刷视频、逃避性杂物 |
          +-------------------------------+-------------------------------+
```

---

## 二、 核心功能模块规划

### 1. 基础功能 (MVP 阶段)
- [ ] **四象限可视化看板**
  - 四个独立的色调区分象限视图（红色/预警、蓝色/专注、黄色/协调、灰色/归档）。
  - **基于属性自动归位（禁止手动跨象限拖拽）**：
    - 象限归属严格由「重要程度」与「紧迫程度」两个维度计算得出（规则化映射）。
    - 当任务的属性（重要/紧迫/截止时间）发生变更时，系统自动将其平滑迁移到对应象限。
  - 象限内支持自动智能排序（如按截止时间紧迫度、完成状态、创建时间排序）。
- [ ] **任务完整生命周期管理 (CRUD)**
  - 快速创建任务（支持便捷切换“重要/不重要”及“紧急/不紧急”标签）。
  - 标记任务完成 / 取消完成状态。
  - 编辑任务详情（标题、详细描述、重要度、紧迫度、截止日期、标签）。
  - 删除与归档任务。
- [ ] **数据本地持久化**
  - 基于浏览器的 `LocalStorage` / `IndexedDB` 存储，无后端依赖即可开箱即用，断网可用。

### 2. 增强交互体验 (Phase 2)
- [ ] **快速判定向导 (Decision Wizard)**
  - 针对犹豫不决的任务，提供两步快速问答（“这件事情是否影响核心目标？” -> “是否有明确紧迫的时间节点？”）自动落入对应象限。
- [ ] **过滤、筛选与搜索**
  - 关键字实时搜索。
  - 按截止日期筛选（今天、本周、已逾期）。
  - 自定义标签体系（工作、个人生活、学习、健康等）。
- [ ] **快捷键支持 (Keyboard First)**
  - 如 `N` 唤起新建任务，`Esc` 退出编辑，`1-4` 键快速分配象限等。
- [ ] **数据导入与导出**
  - 导出为标准 JSON 备份。
  - 导出为 Markdown / Todo 待办列表，便于汇报或个人日志同步。

### 3. 效率与复盘统计 (Phase 3)
- [ ] **时间精力分配雷达/饼图**
  - 统计用户在各个象限投入的时间与任务数量占比（理想状态是 Q2 占 60% 以上）。
- [ ] **专注模式 (Focus Mode)**
  - 针对 Q1 / Q2 中的某项具体任务，一键开启番茄钟（Pomodoro）专注计时。
- [ ] **夜间/暗黑模式 (Dark Mode)**
  - 支持跟随系统主题自动切换或手动切换。

---

## 三、 技术选型评估与建议

结合目前环境（已具备 Node.js v24+ 与 Python 3.14+），提供以下三种可选技术路线：

| 方案 | 技术栈 | 优势 | 适用场景 |
| :--- | :--- | :--- | :--- |
| **方案 A (强烈推荐)**<br>现代 Web SPA / PWA | **React 19 / 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons** | 开发体验极佳，UI 流畅现代，零服务端部署成本，轻量无冗余拖拽库，支持 PWA 离线安装 | **日常个人与轻量团队使用首选** |

---

## 四、 核心数据模型设计 (TypeScript 示例)

```typescript
export type QuadrantId = 'q1' | 'q2' | 'q3' | 'q4';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  // 核心判定维度：决定归属象限
  isImportant: boolean;       // 重要程度：true (重要) / false (不重要)
  isUrgent: boolean;          // 紧迫程度：true (紧急) / false (不紧急)
  
  // 派生计算属性（由 isImportant 和 isUrgent 自动得出，禁止用户随意脱离属性更改）:
  // q1: 重要且紧急 (isImportant && isUrgent)
  // q2: 重要不紧急 (isImportant && !isUrgent)
  // q3: 紧急不重要 (!isImportant && isUrgent)
  // q4: 不重要不紧急 (!isImportant && !isUrgent)
  quadrant: QuadrantId;
  
  isCompleted: boolean;       // 是否完成
  dueDate?: string | null;    // 截止日期 (ISO 格式)
  tags: string[];             // 自定义标签
  estimatedMinutes?: number;  // 预计耗时
  createdAt: string;
  completedAt?: string | null;
}

export interface QuadrantMeta {
  id: QuadrantId;
  name: string;               // 如：重要且紧急
  action: string;             // 如：立即执行 (Do First)
  badgeColor: string;
  borderColor: string;
  bgColor: string;
}
```

---

## 五、 项目工程结构规划 (以方案 A 为例)

```text
Eisenhower-Matrix/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   └── task.ts           # 核心数据模型定义
│   ├── components/
│   │   ├── Matrix/
│   │   │   ├── MatrixBoard.tsx     # 四象限大看板
│   │   │   ├── QuadrantColumn.tsx  # 单个象限容器
│   │   │   └── TaskCard.tsx        # 任务卡片（重要度/紧迫度徽标、快捷状态切换）
│   │   ├── Dialogs/
│   │   │   ├── TaskModal.tsx       # 新建/编辑任务弹窗（重要性与紧迫度选择）
│   │   │   └── WizardModal.tsx     # 象限智能引导向导
│   │   ├── Common/
│   │   │   ├── Header.tsx          # 顶部导航、搜索栏、暗黑模式切换
│   │   │   └── FilterBar.tsx       # 状态与标签过滤栏
│   │   └── Analytics/
│   │       └── StatsModal.tsx      # 四象限耗时与分布复盘图表
│   ├── hooks/
│   │   ├── useTasks.ts             # 任务增删改查、属性驱动自动归象限与排序逻辑
│   │   └── useLocalStorage.ts      # 数据持久化封装
│   └── constants/
│       └── quadrants.ts            # 四象限配置（文案、颜色、指导策略）
└── PROJECT_PLAN.md                 # 本规划文档
```

---

## 六、 推进实施步骤 (Milestones)

1. **里程碑 1：脚手架搭建与配置**
   - 初始化 Vite + React + TypeScript 项目环境。
   - 配置 Tailwind CSS 与基础图标/样式体系。
2. **里程碑 2：静态四象限布局与卡片设计**
   - 实现响应式四象限网格布局。
   - 编写精致的任务卡片（重要度/紧迫度状态徽标、截止时间、完成复选框）。
3. **里程碑 3：属性驱动自动分配逻辑与交互**
   - 实现任务创建与编辑弹窗（重点提供直观的「重要性」与「紧迫度」二选一或权重选择器）。
   - 实现基于重要/紧迫属性的**自动派生象限算法**与任务列表智能排序。
   - 任务在重要度或紧迫度改变时自动迁移象限的动态反馈。
4. **里程碑 4：任务 CRUD 与持久化**
   - 完善任务新增、编辑、删除与完成状态切换。
   - 接入 `localStorage` 自动持久化保存。
5. **里程碑 5：高级特性与打磨**
   - 关键字搜索、标签与状态筛选、数据可视化统计看板与导出/导入。
