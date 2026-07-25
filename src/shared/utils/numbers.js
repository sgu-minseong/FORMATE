export function toNumberOrZero(value) {
  const numberValue = Number(`${value ?? ""}`.replaceAll(",", ""));
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function toNullableNumber(value) {
  if (`${value ?? ""}`.trim() === "") return null;
  const numberValue = Number(`${value ?? ""}`.replaceAll(",", ""));
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function toNonNegativeNumberOrZero(value) {
  return Math.max(0, toNumberOrZero(value));
}

export function hasNumericInput(value) {
  if (`${value ?? ""}`.trim() === "") return false;
  return Number.isFinite(Number(`${value ?? ""}`.replaceAll(",", "")));
}

export function stripNumberInputFormatting(value) {
  return `${value ?? ""}`.replaceAll(",", "").replace(/[^\d.]/g, "");
}

export function formatMoneyInputValue(value) {
  const raw = stripNumberInputFormatting(value);
  if (raw === "") return "";
  const [integerPart, ...decimalParts] = raw.split(".");
  const integerValue = integerPart === "" ? "0" : integerPart;
  const formattedInteger = Number(integerValue).toLocaleString("ko-KR");
  if (!decimalParts.length) return formattedInteger;
  return `${formattedInteger}.${decimalParts.join("").slice(0, 2)}`;
}

export function isEmptyOrZeroDisplayValue(value) {
  const raw = stripNumberInputFormatting(value);
  if (raw === "") return true;
  const numericValue = Number(raw);
  return Number.isFinite(numericValue) && numericValue === 0;
}
