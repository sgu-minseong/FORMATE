export function getTodayDateInput() {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

export function getDateInputFromValue(value) {
  if (!value) return getTodayDateInput();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getTodayDateInput();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

export function addDaysToDateInput(dateInput, days) {
  const date = new Date(`${dateInput || getTodayDateInput()}T00:00:00`);
  date.setDate(date.getDate() + days);
  return getDateInputFromValue(date);
}

export function formatDisplayDate(dateInput) {
  if (!dateInput) return "-";
  const date = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateInput;
  return date.toLocaleDateString("ko-KR");
}

export function formatDisplayTimestampDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR");
}

export function getLatestTimestamp(currentValue, nextValue) {
  const currentTime = Date.parse(currentValue);
  const nextTime = Date.parse(nextValue);
  if (Number.isNaN(nextTime)) return currentValue ?? null;
  return Number.isNaN(currentTime) || nextTime >= currentTime ? nextValue : currentValue;
}

export function formatDisplayDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRecentSaveTime(value) {
  if (!value) return "";
  const savedAt = new Date(value);
  if (Number.isNaN(savedAt.getTime())) return "";
  return Date.now() - savedAt.getTime() < 60_000 ? "방금 저장됨" : formatDisplayDateTime(value);
}
