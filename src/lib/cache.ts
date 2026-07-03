import { Product } from './supabase';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const TTL_MS = 30_000;

let productsCache: CacheEntry<Product[]> | null = null;
let settingsCache: CacheEntry<unknown> | null = null;

export const getCachedProducts = (): Product[] | null => {
  if (!productsCache) return null;
  if (Date.now() > productsCache.expiresAt) {
    productsCache = null;
    return null;
  }
  return productsCache.data;
};

export const setCachedProducts = (data: Product[]): void => {
  productsCache = { data, expiresAt: Date.now() + TTL_MS };
};

export const invalidateProductsCache = (): void => {
  productsCache = null;
};

export const getCachedSettings = <T>(): T | null => {
  if (!settingsCache) return null;
  if (Date.now() > settingsCache.expiresAt) {
    settingsCache = null;
    return null;
  }
  return settingsCache.data as T;
};

export const setCachedSettings = <T>(data: T): void => {
  settingsCache = { data, expiresAt: Date.now() + TTL_MS };
};

export const invalidateSettingsCache = (): void => {
  settingsCache = null;
};
