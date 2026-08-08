import { useSyncExternalStore } from "react";

export const FAVORITE_PYEONG_STORAGE_KEY = "formate.favoritePyeong";

const EMPTY_PYEONGS = Object.freeze([]);
const listeners = new Set();
let cachedStorageValue = null;
let cachedPyeongs = EMPTY_PYEONGS;

export function normalizeFavoritePyeongs(values = []) {
  return [...new Set((values ?? [])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 90))]
    .sort((a, b) => a - b);
}

export function readFavoritePyeongs() {
  if (typeof window === "undefined") return EMPTY_PYEONGS;
  const storageValue = window.localStorage.getItem(FAVORITE_PYEONG_STORAGE_KEY) ?? "[]";
  if (storageValue === cachedStorageValue) return cachedPyeongs;

  try {
    const parsed = JSON.parse(storageValue);
    cachedPyeongs = Array.isArray(parsed) ? normalizeFavoritePyeongs(parsed) : EMPTY_PYEONGS;
  } catch {
    cachedPyeongs = EMPTY_PYEONGS;
  }
  cachedStorageValue = storageValue;
  return cachedPyeongs;
}

export function writeFavoritePyeongs(values = []) {
  const next = normalizeFavoritePyeongs(values);
  if (typeof window !== "undefined") {
    cachedStorageValue = JSON.stringify(next);
    cachedPyeongs = next;
    window.localStorage.setItem(FAVORITE_PYEONG_STORAGE_KEY, cachedStorageValue);
    listeners.forEach((listener) => listener());
  }
  return next;
}

export function toggleFavoritePyeong(pyeong) {
  const value = Number(pyeong);
  const current = readFavoritePyeongs();
  return writeFavoritePyeongs(current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value]);
}

function subscribeFavoritePyeongs(listener) {
  listeners.add(listener);
  const handleStorage = (event) => {
    if (event.key !== FAVORITE_PYEONG_STORAGE_KEY) return;
    cachedStorageValue = null;
    listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", handleStorage);
  };
}

export function useFavoritePyeongs() {
  return useSyncExternalStore(subscribeFavoritePyeongs, readFavoritePyeongs, () => EMPTY_PYEONGS);
}
