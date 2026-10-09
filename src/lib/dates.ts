// Datum som "YYYY-MM-DD" i lokal tid. Det är formen Postgres date-kolumner
// läser och skriver, och den går att jämföra som sträng. toISOString() duger
// inte: den räknar om till UTC, så strax efter midnatt blir det gårdagen.

export type IsoDate = string;

export const toIsoDate = (date: Date): IsoDate => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Klockan 12 i stället för midnatt: ett sommartidsbyte flyttar då aldrig
// datumet till dagen innan när vi lägger till dagar.
export const fromIsoDate = (iso: IsoDate): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

export const today = (): IsoDate => toIsoDate(new Date());

export const addDays = (iso: IsoDate, days: number): IsoDate => {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

/** Veckans måndag. Samma svar som week_monday() i SQL. */
export const weekMonday = (iso: IsoDate): IsoDate => {
  const date = fromIsoDate(iso);
  // getDay: söndag = 0. ISO-veckan börjar på måndag.
  const offset = (date.getDay() + 6) % 7;
  return addDays(iso, -offset);
};

export const weekDays = (monday: IsoDate): IsoDate[] =>
  Array.from({ length: 7 }, (_, i) => addDays(monday, i));

/** ISO-veckonummer: veckan som innehåller årets första torsdag är vecka 1. */
export const isoWeek = (iso: IsoDate): number => {
  const thursday = fromIsoDate(addDays(weekMonday(iso), 3));
  const jan1 = new Date(thursday.getFullYear(), 0, 1, 12);
  const dayOfYear = Math.round((thursday.getTime() - jan1.getTime()) / 86400000);
  return Math.floor(dayOfYear / 7) + 1;
};

const WEEKDAY_SHORT = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];
const WEEKDAY_LONG = [
  "söndag",
  "måndag",
  "tisdag",
  "onsdag",
  "torsdag",
  "fredag",
  "lördag",
];
const MONTHS = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
];

export const weekdayShort = (iso: IsoDate) =>
  WEEKDAY_SHORT[fromIsoDate(iso).getDay()];

export const weekdayLong = (iso: IsoDate) =>
  WEEKDAY_LONG[fromIsoDate(iso).getDay()];

export const dayOfMonth = (iso: IsoDate) => fromIsoDate(iso).getDate();

/** "tisdag 19 aug" */
export const formatDayLong = (iso: IsoDate) => {
  const date = fromIsoDate(iso);
  return `${weekdayLong(iso)} ${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`;
};

/** "18–24 augusti", eller "29 sep – 5 okt" när veckan korsar en månad. */
export const formatWeekRange = (monday: IsoDate) => {
  const start = fromIsoDate(monday);
  const end = fromIsoDate(addDays(monday, 6));

  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]}`;
  }
  return `${start.getDate()} ${MONTHS[start.getMonth()].slice(0, 3)} – ${end.getDate()} ${MONTHS[end.getMonth()].slice(0, 3)}`;
};
