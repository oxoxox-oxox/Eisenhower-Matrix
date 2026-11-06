import type { QuadrantId } from './task';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  isAllDay: boolean;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface ScheduledTaskBlock {
  id: string;
  taskId: string;
  title: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  partIndex?: number;
  totalParts?: number;
  isSplit: boolean;
  quadrant: QuadrantId;
  importance: number;
  urgency: number;
  isCompleted: boolean;
}

export interface RestBlock {
  id: string;
  type: 'lunch' | 'dinner' | 'break';
  title: string;
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface DayScheduleResult {
  dateStr: string; // YYYY-MM-DD
  fixedEvents: CalendarEvent[];
  scheduledTasks: ScheduledTaskBlock[];
  restBlocks: RestBlock[];
  freeSlots: TimeSlot[];
  unscheduledTasks: {
    taskId: string;
    title: string;
    remainingMinutes: number;
    reason: string;
  }[];
  stats: {
    totalBusyMinutes: number;
    totalScheduledMinutes: number;
    totalRestMinutes: number;
    totalFreeMinutes: number;
  };
}
