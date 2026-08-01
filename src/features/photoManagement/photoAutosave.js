import {
  PRICE_TABLE_AUTOSAVE_DELAY_MS,
  createPriceTableAutosave,
} from "../priceTable/priceTableAutosave";

export const PHOTO_AUTOSAVE_DELAY_MS = PRICE_TABLE_AUTOSAVE_DELAY_MS;

export function createPhotoAutosave(options) {
  return createPriceTableAutosave({
    delay: PHOTO_AUTOSAVE_DELAY_MS,
    ...options,
  });
}

export async function runQueuedPhotoChanges(changes = [], onFailure = async () => {}) {
  const failures = [];

  for (const change of changes) {
    try {
      await change.execute();
    } catch (error) {
      failures.push({ change, error });
    }
  }

  if (!failures.length) return true;
  await onFailure(failures);
  throw failures[0].error;
}
