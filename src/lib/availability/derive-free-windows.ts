export interface TimeBlock {
  startAt: Date;
  endAt: Date;
}

interface DeriveOptions {
  minFreeMinutes?: number;
}

export function isBusyCalendarSource(source: string): boolean {
  if (!source) return false;
  return (
    source === "ics" ||
    source === "ics_upload" ||
    source === "calendar_busy_upload" ||
    source.startsWith("subscription:") ||
    source.startsWith("calendar_busy_subscription:")
  );
}

function normalizeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  return blocks
    .filter(
      (block) =>
        block.startAt instanceof Date &&
        block.endAt instanceof Date &&
        block.endAt > block.startAt,
    )
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

function mergeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  const normalized = normalizeBlocks(blocks);
  if (normalized.length === 0) return [];

  const merged: TimeBlock[] = [];
  for (const block of normalized) {
    const last = merged[merged.length - 1];
    if (!last || block.startAt > last.endAt) {
      merged.push({ startAt: block.startAt, endAt: block.endAt });
      continue;
    }
    if (block.endAt > last.endAt) {
      last.endAt = block.endAt;
    }
  }
  return merged;
}

export function subtractBusyFromAvailability(
  availabilityBlocks: TimeBlock[],
  busyBlocks: TimeBlock[],
  options?: DeriveOptions,
): TimeBlock[] {
  const minFreeMinutes = options?.minFreeMinutes ?? 30;
  const minFreeMs = minFreeMinutes * 60_000;
  const availability = normalizeBlocks(availabilityBlocks);
  const busy = mergeBlocks(busyBlocks);

  if (availability.length === 0) return [];
  if (busy.length === 0) return availability;

  const free: TimeBlock[] = [];
  let busyIndex = 0;

  for (const slot of availability) {
    while (busyIndex < busy.length && busy[busyIndex]!.endAt <= slot.startAt) {
      busyIndex += 1;
    }

    let cursor = slot.startAt;
    let cursorBusyIndex = busyIndex;

    while (
      cursorBusyIndex < busy.length &&
      busy[cursorBusyIndex]!.startAt < slot.endAt
    ) {
      const currentBusy = busy[cursorBusyIndex]!;
      if (currentBusy.startAt > cursor) {
        const freeEnd = currentBusy.startAt < slot.endAt ? currentBusy.startAt : slot.endAt;
        if (freeEnd.getTime() - cursor.getTime() >= minFreeMs) {
          free.push({
            startAt: new Date(cursor),
            endAt: new Date(freeEnd),
          });
        }
      }

      if (currentBusy.endAt > cursor) {
        cursor = currentBusy.endAt;
      }
      if (cursor >= slot.endAt) break;
      cursorBusyIndex += 1;
    }

    if (cursor < slot.endAt && slot.endAt.getTime() - cursor.getTime() >= minFreeMs) {
      free.push({
        startAt: new Date(cursor),
        endAt: new Date(slot.endAt),
      });
    }
  }

  return free;
}
