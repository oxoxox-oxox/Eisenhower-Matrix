# 艾森豪威尔四象限时间管理矩阵 (Eisenhower Matrix)

一个基于现代 Web 技术构建的直观、高效、自适应的四象限时间管理与效能复盘看板。

> **核心原则**：不依赖手动拖拽，而是**严格根据任务的「重要程度」与「紧迫程度」两个维度自动分流落位**，杜绝随意放置，引导用户科学决策。

---

## 🌟 核心特性

- 🎯 **真实十字交叉直角坐标系 (True Cartesian Matrix Board)**
  - 采用真正的**二维直角坐标系底板**，横轴（紧迫度 0~10）与纵轴（重要度 0~10）在中心 (5, 5) 十字相交。
  - **象限传统管理学排布**：
    - **象限 I (左上)**：重要度 ≥ 5 且 紧迫度 ≥ 5 (Do First · 立即做)
    - **象限 II (右上)**：重要度 ≥ 5 且 紧迫度 < 5 (Schedule · 计划做)
    - **象限 III (左下)**：重要度 < 5 且 紧迫度 ≥ 5 (Delegate · 授权做)
    - **象限 IV (右下)**：重要度 < 5 且 紧迫度 < 5 (Eliminate · 尽量不做)
  - **连续度量与二维精准落位**：根据任务设定的分值 (0~10)，卡片自动精准渲染在坐标系的相对位置上；点击坐标系空白处可根据鼠标点击的坐标快速落位创建事项。
  - 打开即为空白纯净看板，无任何多余占位数据干扰。

- 📐 **极简纯净侧边栏布局**
  - **选项收纳于侧边栏**：新建任务、搜索、状态过滤、智能向导、效能复盘及数据备份统一收纳在左侧，支持折叠展开；
  - **主页为纯净全屏坐标矩阵**：主区域撑满屏幕，大方、直观、干净。

- 📅 **日历订阅结合与时间块自动排程 (Calendar Auto-Scheduling & Time Blocking)**
  - **支持 WebCal / ICS 订阅**：可填入 Google Calendar、Outlook、Apple 日历、飞书等外部日历订阅链接，通过内置代理无缝获取并解析日程事件。
  - **当日时间轴视图 (Day Schedule View)**：提供 08:30 ~ 21:00 精确时间轴网格，灰色呈现不可动的外部会议与日程。
  - **空闲区间装箱与长任务拆分**：自动提取空闲时间窗，根据四象限综合权重（Q1 危机/Q2 黄金深度工作优先）自动将待办填入合适空档；耗时超过空闲段的长任务支持自动切分为多段（Part 1/2）分流完成。

- ⚡ **动态截止期迫近与最小松弛度算法 (Least Laxity First & Time-Decay Algorithm)**
  - 接入实时调度算法模型：结合截止日期与预计耗时，计算剩余松弛时间（$\text{Slack} = T_{\text{remaining}} - T_{\text{effort}}$）。
  - **动态紧迫度自动流转**：随着截止日期临近，任务在横轴上自右向左平滑加速移动；当剩余时间已不足以完成耗时或已逾期时，紧迫度自动飙升至 9.8~10.0 分。
  - 支持算法全自动托管与手动微调模式自由切换。

- 🧙 **智能决策向导 (Smart Decision Wizard)**
  - 针对犹豫不决的事项，通过价值反思与时间敏感度两步问答，自动计算推荐象限并一键收纳。

- 📊 **四象限精力与效能复盘 (Efficiency Analytics)**
  - 统计各象限事项分布与百分比占比；
  - 根据管理学经验给出效能诊断建议（如预警 Q1 救火过多、激励 Q2 黄金专注度达到 60%+）。

- 💾 **离线优先与数据备份**
  - 基于 `LocalStorage` 实现完全离线可用，即开即用；
  - 支持一键导出为标准 JSON 备份或 Markdown 待办清单（可直接粘贴至 Obsidian、Notion 或周报）；
  - 支持文件导入与文本粘贴还原。

- 🌓 **现代视觉与暗黑模式**
  - 完美适配系统主题，支持一键切换白天/黑夜模式；
  - 全局快捷键支持：按键盘 `N` 键随时呼出新建任务弹窗。

---

## 🛠️ 技术栈

- **框架**：React 19 + TypeScript
- **构建工具**：Vite 8
- **样式**：Tailwind CSS v4
- **图标**：Lucide React

---

## 🚀 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 启动本地开发服务

```bash
npm run dev
```

启动后在浏览器打开 `http://localhost:5173` 即可体验。

### 3. 构建生产包

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
├── src/
│   ├── main.tsx
│   ├── App.tsx                   # 主入口容器与全局快捷键/主题控制
│   ├── types/
│   │   └── task.ts               # 数据模型定义与 calculateQuadrant 计算函数
│   ├── constants/
│   │   └── quadrants.ts          # 四象限配置与初始示例数据
│   ├── hooks/
│   │   ├── useLocalStorage.ts    # 本地数据持久化 Hook
│   │   └── useTasks.ts           # 任务 CRUD、自动分流与统计 Hook
│   └── components/
│       ├── Common/
│       │   └── Header.tsx        # 品牌头、筛选栏、搜索与操作入口
│       ├── Matrix/
│       │   ├── MatrixBoard.tsx   # 四象限网格主面板 (含 XY 坐标轴指示)
│       │   ├── QuadrantColumn.tsx# 单个象限容器与快速录入栏
│       │   └── TaskCard.tsx      # 任务卡片与属性快捷切换按钮
│       └── Dialogs/
│           ├── TaskModal.tsx     # 新建/编辑任务表单 (含实时象限推导指示)
│           ├── WizardModal.tsx   # 智能归类决策向导
│           ├── StatsModal.tsx    # 效能复盘统计看板
│           └── BackupModal.tsx   # 数据导入、导出与 Markdown 清单生成
├── PROJECT_PLAN.md               # 规划文档
└── README.md                     # 说明文档
```
