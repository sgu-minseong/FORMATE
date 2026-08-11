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
