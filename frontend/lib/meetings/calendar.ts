export interface CalendarDay {
  date: Date;
  key: string;
  inMonth: boolean;
}

export function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const first = startOfMonth(year, month);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayOffset);
  gridStart.setHours(0, 0, 0, 0);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      key: dayKey(date),
      inMonth: date.getMonth() === month,
    };
  });
}

export function monthVisibleRange(year: number, month: number) {
  const days = buildMonthGrid(year, month);
  const from = startOfDay(days[0].date);
  const to = startOfDay(days[days.length - 1].date);
  to.setDate(to.getDate() + 1);
  return { from, to };
}

export function isSameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}

export function formatMonthYear(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function formatDayLong(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatDurationCompact(
  start: string | Date,
  end: string | Date,
) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const minutes = Math.round((endTime - startTime) / 60000);
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function toDateInput(date: Date) {
  return dayKey(date);
}

export function toTimeInput(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function combineDateTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) return null;
  const combined = new Date(`${dateValue}T${timeValue}:00`);
  if (Number.isNaN(combined.getTime())) return null;
  return combined;
}

export function groupByDay<T extends { startAt: string }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(new Date(item.startAt));
    const existing = map.get(key);
    if (existing) existing.push(item);
    else map.set(key, [item]);
  }
  for (const value of map.values()) {
    value.sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }
  return map;
}
