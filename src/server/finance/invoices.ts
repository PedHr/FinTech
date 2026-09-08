import { addMonths } from "date-fns";

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

function clampDay(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

export function dateOnly(value: string | Date) {
  if (value instanceof Date) return utcDate(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  return new Date(`${value}T00:00:00.000Z`);
}

export function invoiceCycleFor(dateValue: string | Date, closingDay: number, dueDay: number) {
  const purchase = dateOnly(dateValue);
  let closing = utcDate(
    purchase.getUTCFullYear(),
    purchase.getUTCMonth(),
    clampDay(purchase.getUTCFullYear(), purchase.getUTCMonth(), closingDay),
  );
  if (purchase.getTime() > closing.getTime()) closing = addMonths(closing, 1);

  const dueMonthOffset = dueDay <= closingDay ? 1 : 0;
  const dueBase = addMonths(closing, dueMonthOffset);
  const due = utcDate(
    dueBase.getUTCFullYear(),
    dueBase.getUTCMonth(),
    clampDay(dueBase.getUTCFullYear(), dueBase.getUTCMonth(), dueDay),
  );
  const referenceMonth = utcDate(due.getUTCFullYear(), due.getUTCMonth(), 1);
  return { closingDate: closing, dueDate: due, referenceMonth };
}
