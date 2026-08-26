const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ShipmentScheduleInput = {
  dateReceived?: Date | string | null;
  calculatedEstimatedLoadingDate?: Date | string | null;
  estimatedLoadingDate?: Date | string | null;
  estimatedLoadingDateOverride?: Date | string | null;
};

export type ShipmentSchedule = {
  dateReceived: Date | null;
  calculatedEstimatedLoadingDate: Date | null;
  estimatedLoadingDateOverride: Date | null;
  effectiveEstimatedLoadingDate: Date | null;
  eta: Date | null;
  sortingCompleteDate: Date | null;
  collectionDate: Date | null;
  daysToLoading: number | null;
  transitDays: number | null;
  sortingDays: number | null;
  totalDaysToCollection: number | null;
  daysLeftToCollection: number | null;
  monthLabel: string | null;
};

export function parseDateOnly(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return normalizeDateOnly(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);

  if (!dateMatch) {
    const fallback = new Date(trimmed);

    return Number.isNaN(fallback.getTime())
      ? null
      : normalizeDateOnly(fallback);
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  return new Date(Date.UTC(year, month - 1, day));
}

export function normalizeDateOnly(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
}

export function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return normalizeDateOnly(result);
}

export function nextWeekdayOnOrAfter(value: Date, weekday: number): Date {
  const result = normalizeDateOnly(value);

  while (result.getUTCDay() !== weekday) {
    result.setUTCDate(result.getUTCDate() + 1);
  }

  return result;
}

export function differenceInDays(later: Date, earlier: Date): number {
  const normalizedLater = normalizeDateOnly(later);
  const normalizedEarlier = normalizeDateOnly(earlier);

  return Math.round(
    (normalizedLater.getTime() - normalizedEarlier.getTime()) / MS_PER_DAY
  );
}

export function formatDateOnly(value: Date | string | null | undefined): string {
  const date = parseDateOnly(value);

  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function formatMonthLabel(value: Date | string | null | undefined): string {
  const date = parseDateOnly(value);

  if (!date) {
    return "";
  }

  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDaysLeftLabel(daysLeft: number | null): string {
  if (daysLeft === null) {
    return "";
  }

  if (daysLeft > 0) {
    return `${daysLeft} DAYS LEFT`;
  }

  if (daysLeft === 0) {
    return "READY TODAY";
  }

  return `${Math.abs(daysLeft)} DAYS PAST COLLECTION`;
}

export function resolveShipmentSchedule(
  input: ShipmentScheduleInput
): ShipmentSchedule {
  const dateReceived = parseDateOnly(input.dateReceived);

  if (!dateReceived) {
    return {
      dateReceived: null,
      calculatedEstimatedLoadingDate: null,
      estimatedLoadingDateOverride: null,
      effectiveEstimatedLoadingDate: null,
      eta: null,
      sortingCompleteDate: null,
      collectionDate: null,
      daysToLoading: null,
      transitDays: null,
      sortingDays: null,
      totalDaysToCollection: null,
      daysLeftToCollection: null,
      monthLabel: null,
    };
  }

  const calculatedEstimatedLoadingDate =
    parseDateOnly(input.calculatedEstimatedLoadingDate) ??
    nextWeekdayOnOrAfter(addDays(dateReceived, 7), 6);

  const estimatedLoadingDateOverride =
    parseDateOnly(input.estimatedLoadingDateOverride);

  const storedEstimatedLoadingDate =
    parseDateOnly(input.estimatedLoadingDate);

  const effectiveEstimatedLoadingDate =
    estimatedLoadingDateOverride ??
    storedEstimatedLoadingDate ??
    calculatedEstimatedLoadingDate;

  const eta = addDays(effectiveEstimatedLoadingDate, 60);
  const sortingCompleteDate = addDays(eta, 7);
  const collectionDate = nextWeekdayOnOrAfter(sortingCompleteDate, 4);

  return {
    dateReceived,
    calculatedEstimatedLoadingDate,
    estimatedLoadingDateOverride,
    effectiveEstimatedLoadingDate,
    eta,
    sortingCompleteDate,
    collectionDate,
    daysToLoading: differenceInDays(effectiveEstimatedLoadingDate, dateReceived),
    transitDays: differenceInDays(eta, effectiveEstimatedLoadingDate),
    sortingDays: differenceInDays(sortingCompleteDate, eta),
    totalDaysToCollection: differenceInDays(collectionDate, dateReceived),
    daysLeftToCollection: differenceInDays(collectionDate, normalizeDateOnly(new Date())),
    monthLabel: formatMonthLabel(collectionDate),
  };
}
