function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function isValidDate(date: Date) {
  return Number.isFinite(date.getTime());
}

export function addDaysByRetentionPolicy(date: Date, retentionDays: number) {
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  return new Date(date.getTime() + retentionMs);
}

export function formatLocalDateTimeToMinute(date: Date) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

