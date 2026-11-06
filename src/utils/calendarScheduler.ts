import type { TaskItem } from '../types/task';
import type { CalendarEvent, TimeSlot, ScheduledTaskBlock, RestBlock, DayScheduleResult } from '../types/calendar';

export interface ScheduleOptions {
  targetDate: Date;
  workStartHour?: number;   // 默认 08:00
  workEndHour?: number;     // 默认 22:00
  bufferMinutes?: number;   // 固定事件后弹性缓冲时间，默认 10 分钟
  taskRestMinutes?: number; // 任务间歇休息时间，默认 10 分钟
  lunchStartHour?: number;  // 默认 12.0
  lunchEndHour?: number;    // 默认 13.0
  dinnerStartHour?: number; // 默认 18.0
  dinnerEndHour?: number;   // 默认 19.0
  minChunkMinutes?: number; // 允许拆分的最小单块时长，默认 30 分钟
  allowSplit?: boolean;     // 是否允许拆分长任务 (用户选择：允许)
}

/**
 * 自动排程引擎：结合订阅日历既定事件、生理用餐保护区与四象限矩阵待办，自动生成张弛有度的时间块排程
 */
export function generateDaySchedule(
  tasks: TaskItem[],
  fixedEvents: CalendarEvent[],
  options: ScheduleOptions
): DayScheduleResult {
  const {
    targetDate,
    workStartHour = 8.0,
    workEndHour = 22.0,
    bufferMinutes = 10,
    taskRestMinutes = 10,
    lunchStartHour = 12.0,
    lunchEndHour = 13.0,
    dinnerStartHour = 18.0,
    dinnerEndHour = 19.0,
    minChunkMinutes = 30,
    allowSplit = true,
  } = options;

  // 1. 构造当天的工作时间区间
  const dayStart = new Date(targetDate);
  dayStart.setHours(Math.floor(workStartHour), (workStartHour % 1) * 60, 0, 0);

  const dayEnd = new Date(targetDate);
  dayEnd.setHours(Math.floor(workEndHour), (workEndHour % 1) * 60, 0, 0);

  // 2. 提取并规范化当天的固定日历日程（过滤全天事件，并限制在工作时间内）
  const dayFixedEvents = fixedEvents
    .filter((e) => !e.isAllDay)
    .map((e) => {
      const clippedStart = new Date(Math.max(e.start.getTime(), dayStart.getTime()));
      const clippedEnd = new Date(Math.min(e.end.getTime(), dayEnd.getTime()));
      return {
        ...e,
        start: clippedStart,
        end: clippedEnd,
      };
    })
    .filter((e) => e.start < e.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // 3. 构造午餐保护区 (12:00 ~ 13:00) 与晚餐保护区 (18:00 ~ 19:00)，自适应避让拖堂或超长课程
  const baseLunchStart = new Date(targetDate);
  baseLunchStart.setHours(Math.floor(lunchStartHour), (lunchStartHour % 1) * 60, 0, 0);
  const baseLunchEnd = new Date(targetDate);
  baseLunchEnd.setHours(Math.floor(lunchEndHour), (lunchEndHour % 1) * 60, 0, 0);

  let actualLunchStart = new Date(baseLunchStart);
  for (const ev of dayFixedEvents) {
    if (ev.start < baseLunchEnd && ev.end > actualLunchStart) {
      if (ev.end.getTime() > actualLunchStart.getTime()) {
        actualLunchStart = new Date(ev.end.getTime() + 5 * 60 * 1000);
      }
    }
  }
  const actualLunchEnd = new Date(actualLunchStart.getTime() + (lunchEndHour - lunchStartHour) * 3600 * 1000);

  const baseDinnerStart = new Date(targetDate);
  baseDinnerStart.setHours(Math.floor(dinnerStartHour), (dinnerStartHour % 1) * 60, 0, 0);
  const baseDinnerEnd = new Date(targetDate);
  baseDinnerEnd.setHours(Math.floor(dinnerEndHour), (dinnerEndHour % 1) * 60, 0, 0);

  let actualDinnerStart = new Date(baseDinnerStart);
  for (const ev of dayFixedEvents) {
    if (ev.start < baseDinnerEnd && ev.end > actualDinnerStart) {
      if (ev.end.getTime() > actualDinnerStart.getTime()) {
        actualDinnerStart = new Date(ev.end.getTime() + 5 * 60 * 1000);
      }
    }
  }
  const actualDinnerEnd = new Date(actualDinnerStart.getTime() + (dinnerEndHour - dinnerStartHour) * 3600 * 1000);

  const restBlocks: RestBlock[] = [
    {
      id: `rest-lunch-${targetDate.getTime()}`,
      type: 'lunch',
      title: 'Break Time',
      start: actualLunchStart,
      end: actualLunchEnd,
      durationMinutes: Math.round((actualLunchEnd.getTime() - actualLunchStart.getTime()) / 60000),
    },
    {
      id: `rest-dinner-${targetDate.getTime()}`,
      type: 'dinner',
      title: 'Break Time',
      start: actualDinnerStart,
      end: actualDinnerEnd,
      durationMinutes: Math.round((actualDinnerEnd.getTime() - actualDinnerStart.getTime()) / 60000),
    },
  ];

  // 合并固定日程与用餐保护区为不可动/忙碌区间
  const allBusyEntities: { start: Date; end: Date }[] = [
    ...dayFixedEvents.map((e) => ({ start: e.start, end: e.end })),
    { start: actualLunchStart, end: actualLunchEnd },
    { start: actualDinnerStart, end: actualDinnerEnd },
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  const mergedBusyIntervals: { start: Date; end: Date }[] = [];
  for (const entity of allBusyEntities) {
    if (mergedBusyIntervals.length === 0) {
      mergedBusyIntervals.push({ start: new Date(entity.start), end: new Date(entity.end) });
    } else {
      const last = mergedBusyIntervals[mergedBusyIntervals.length - 1];
      if (entity.start.getTime() <= last.end.getTime() + bufferMinutes * 60 * 1000) {
        if (entity.end.getTime() > last.end.getTime()) {
          last.end = new Date(entity.end);
        }
      } else {
        mergedBusyIntervals.push({ start: new Date(entity.start), end: new Date(entity.end) });
      }
    }
  }

  // 4. 区间求逆算法 (Interval Inversion)：从工作时间中扣除忙碌与用餐区间，提取纯粹的可用专注工作槽
  const freeSlots: TimeSlot[] = [];
  let currentCursor = new Date(dayStart);

  for (const busy of mergedBusyIntervals) {
    if (busy.start.getTime() > currentCursor.getTime()) {
      const durationMin = Math.round((busy.start.getTime() - currentCursor.getTime()) / (1000 * 60));
      if (durationMin >= 15) { // 忽略少于 15 分钟的微型碎片缝隙
        freeSlots.push({
          start: new Date(currentCursor),
          end: new Date(busy.start),
          durationMinutes: durationMin,
        });
      }
    }
    if (busy.end.getTime() > currentCursor.getTime()) {
      currentCursor = new Date(busy.end.getTime() + bufferMinutes * 60 * 1000);
    }
  }

  // 最后一个忙碌日程之后到当天结束的空闲槽
  if (currentCursor.getTime() < dayEnd.getTime()) {
    const durationMin = Math.round((dayEnd.getTime() - currentCursor.getTime()) / (1000 * 60));
    if (durationMin >= 15) {
      freeSlots.push({
        start: new Date(currentCursor),
        end: new Date(dayEnd),
        durationMinutes: durationMin,
      });
    }
  }

  // 5. 矩阵待办任务排序（重要度与紧迫度权重优先）
  const candidateTasks = tasks
    .filter((t) => !t.isCompleted)
    .sort((a, b) => {
      const scoreA = a.importance * 1.5 + a.urgency;
      const scoreB = b.importance * 1.5 + b.urgency;
      return scoreB - scoreA;
    });

  const scheduledTasks: ScheduledTaskBlock[] = [];
  const unscheduledTasks: { taskId: string; title: string; remainingMinutes: number; reason: string }[] = [];

  // 工作空闲槽队列副本
  const workingFreeSlots: TimeSlot[] = freeSlots.map((s) => ({
    start: new Date(s.start),
    end: new Date(s.end),
    durationMinutes: s.durationMinutes,
  }));

  // 6. 贪心装箱排程，并自动在任务间插入 10 分钟间歇休息
  for (const task of candidateTasks) {
    let remainingMinutes = task.estimatedMinutes && task.estimatedMinutes > 0 ? task.estimatedMinutes : 45;
    const originalMinutes = remainingMinutes;
    const partsAllocated: { start: Date; end: Date; duration: number }[] = [];

    for (let i = 0; i < workingFreeSlots.length; i++) {
      const slot = workingFreeSlots[i];
      if (slot.durationMinutes < 15 || remainingMinutes <= 0) continue;

      if (slot.durationMinutes >= remainingMinutes) {
        // 整个任务可完全容纳
        const blockStart = new Date(slot.start);
        const blockEnd = new Date(blockStart.getTime() + remainingMinutes * 60 * 1000);
        partsAllocated.push({
          start: blockStart,
          end: blockEnd,
          duration: remainingMinutes,
        });

        // 任务完成后预留 10 分钟休息
        const breakEnd = new Date(blockEnd.getTime() + taskRestMinutes * 60 * 1000);
        if (breakEnd.getTime() <= slot.end.getTime()) {
          restBlocks.push({
            id: `break-${task.id}-p${partsAllocated.length}-${blockEnd.getTime()}`,
            type: 'break',
            title: 'Break Time',
            start: new Date(blockEnd),
            end: new Date(breakEnd),
            durationMinutes: taskRestMinutes,
          });
          slot.start = new Date(breakEnd);
        } else {
          slot.start = new Date(blockEnd);
        }

        slot.durationMinutes = Math.max(0, Math.round((slot.end.getTime() - slot.start.getTime()) / (1000 * 60)));
        remainingMinutes = 0;
        break;
      } else if (allowSplit && slot.durationMinutes >= minChunkMinutes) {
        // 允许拆分：将当前可用空闲槽填满
        const allocateMin = slot.durationMinutes;
        const blockStart = new Date(slot.start);
        const blockEnd = new Date(slot.end);
        partsAllocated.push({
          start: blockStart,
          end: blockEnd,
          duration: allocateMin,
        });

        remainingMinutes -= allocateMin;
        slot.durationMinutes = 0;
        slot.start = new Date(slot.end);
      }
    }

    if (partsAllocated.length > 0) {
      const totalParts = partsAllocated.length;
      partsAllocated.forEach((p, idx) => {
        scheduledTasks.push({
          id: `sched-${task.id}-p${idx + 1}-${Date.now()}`,
          taskId: task.id,
          title: totalParts > 1 ? `${task.title} (Part ${idx + 1}/${totalParts})` : task.title,
          start: p.start,
          end: p.end,
          durationMinutes: p.duration,
          partIndex: idx + 1,
          totalParts,
          isSplit: totalParts > 1,
          quadrant: task.quadrant,
          importance: task.importance,
          urgency: task.urgency,
          isCompleted: task.isCompleted,
        });
      });
    }

    if (remainingMinutes > 0) {
      unscheduledTasks.push({
        taskId: task.id,
        title: task.title,
        remainingMinutes,
        reason: originalMinutes === remainingMinutes ? '当天已无足够专注空闲时间段' : `部分未排满（剩余 ${remainingMinutes}m）`,
      });
    }
  }

  // 统计当天指标（先合并相邻的 Break Time）
  const mergedRestBlocks = mergeAdjacentRestBlocks(restBlocks);
  const totalBusyMinutes = dayFixedEvents.reduce((acc, ev) => acc + Math.round((ev.end.getTime() - ev.start.getTime()) / 60000), 0);
  const totalScheduledMinutes = scheduledTasks.reduce((acc, st) => acc + st.durationMinutes, 0);
  const totalRestMinutes = mergedRestBlocks.reduce((acc, rb) => acc + rb.durationMinutes, 0);
  const remainingFreeMinutes = workingFreeSlots.reduce((acc, s) => acc + (s.durationMinutes > 0 ? s.durationMinutes : 0), 0);

  return {
    dateStr: targetDate.toISOString().split('T')[0],
    fixedEvents: dayFixedEvents,
    scheduledTasks: scheduledTasks.sort((a, b) => a.start.getTime() - b.start.getTime()),
    restBlocks: mergedRestBlocks,
    freeSlots: workingFreeSlots.filter((s) => s.durationMinutes >= 15),
    unscheduledTasks,
    stats: {
      totalBusyMinutes,
      totalScheduledMinutes,
      totalRestMinutes,
      totalFreeMinutes: remainingFreeMinutes,
    },
  };
}

/**
 * 合并时间上相邻（首尾相接）或重叠的 Break Time，避免连续出现碎片化卡片
 */
export function mergeAdjacentRestBlocks(blocks: RestBlock[]): RestBlock[] {
  if (blocks.length <= 1) return blocks;

  const sorted = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: RestBlock[] = [];

  for (const block of sorted) {
    if (merged.length === 0) {
      merged.push({ ...block });
    } else {
      const prev = merged[merged.length - 1];
      // 如果当前 block 的起始时间小于等于上一个 block 的结束时间（相邻或重叠）
      if (block.start.getTime() <= prev.end.getTime()) {
        if (block.end.getTime() > prev.end.getTime()) {
          prev.end = new Date(block.end);
          prev.durationMinutes = Math.round((prev.end.getTime() - prev.start.getTime()) / 60000);
        }
      } else {
        merged.push({ ...block });
      }
    }
  }

  return merged;
}
