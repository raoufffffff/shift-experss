export const toISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseISO = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso: string, n: number): string => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
/** Lundi de la semaine du jour donné. */
export const mondayOf = (iso: string): string => {
  const d = parseISO(iso);
  return addDays(iso, -((d.getDay() + 6) % 7));
};
export const todayISO = () => toISO(new Date());
export const fmtDay = (iso: string, o: Intl.DateTimeFormatOptions) => parseISO(iso).toLocaleDateString('fr-FR', o);
export const hoursOf = (start: string, end: string): number => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
};
