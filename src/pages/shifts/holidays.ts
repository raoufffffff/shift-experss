

export type HolidayIconKey =
  | 'fireworks' | 'egg' | 'flower' | 'dove' | 'cloud' | 'flame'
  | 'flag' | 'sun' | 'blossom' | 'medal' | 'tree';

export interface Holiday {
   date: string;
   name: string;
  icon: HolidayIconKey;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

 function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

 function addDaysKey(year: number, month: number, day: number, add: number): string {
  const dt = new Date(Date.UTC(year, month - 1, day + add));
  return toKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

const cache = new Map<number, Holiday[]>();

export function getFrenchHolidays(year: number): Holiday[] {
  const cached = cache.get(year);
  if (cached) return cached;

  const easter = getEasterSunday(year);
  const list: Holiday[] = [
    { date: toKey(year, 1, 1), name: "Jour de l'An", icon: 'fireworks' },
    { date: addDaysKey(year, easter.month, easter.day, 1), name: 'Lundi de Pâques', icon: 'egg' },
    { date: toKey(year, 5, 1), name: 'Fête du Travail', icon: 'flower' },
    { date: toKey(year, 5, 8), name: 'Victoire 1945', icon: 'dove' },
    { date: addDaysKey(year, easter.month, easter.day, 39), name: 'Ascension', icon: 'cloud' },
    { date: addDaysKey(year, easter.month, easter.day, 50), name: 'Lundi de Pentecôte', icon: 'flame' },
    { date: toKey(year, 7, 14), name: 'Fête nationale', icon: 'flag' },
    { date: toKey(year, 8, 15), name: 'Assomption', icon: 'sun' },
    { date: toKey(year, 11, 1), name: 'Toussaint', icon: 'blossom' },
    { date: toKey(year, 11, 11), name: 'Armistice 1918', icon: 'medal' },
    { date: toKey(year, 12, 25), name: 'Noël', icon: 'tree' },
  ].sort((a, b) => a.date.localeCompare(b.date));

  cache.set(year, list);
  return list;
}

 export function dateToKey(date: Date): string {
  return toKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

 export function getHoliday(date: Date | string): Holiday | null {
  const key = typeof date === 'string' ? date.slice(0, 10) : dateToKey(date);
  const year = Number(key.slice(0, 4));
  if (!year) return null;
  return getFrenchHolidays(year).find((h) => h.date === key) ?? null;
}

 export function getHolidaysInRange(start: Date, end: Date): Holiday[] {
  const startKey = dateToKey(start);
  const endKey = dateToKey(end);
  const out: Holiday[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    for (const h of getFrenchHolidays(y)) {
      if (h.date >= startKey && h.date <= endKey) out.push(h);
    }
  }
  return out;
}