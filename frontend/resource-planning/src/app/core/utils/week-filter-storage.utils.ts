const TO_WEEK_STORAGE_KEY = 'resourcePlanning.weekTo';

export function loadStoredToWeek(fallbackWeek: number): number {
  try {
    const raw = localStorage.getItem(TO_WEEK_STORAGE_KEY);
    if (!raw) return fallbackWeek;

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 53) return fallbackWeek;

    return parsed;
  } catch {
    return fallbackWeek;
  }
}

export function saveStoredToWeek(week: number): void {
  if (!Number.isInteger(week) || week < 1 || week > 53) return;

  try {
    localStorage.setItem(TO_WEEK_STORAGE_KEY, week.toString());
  } catch {
  }
}
