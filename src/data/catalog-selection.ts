import { builtInCatalogVersion, builtInPlays } from "./seeds";
import type { Catalog } from "./repository";
export function selectCatalog(cached: Catalog | null): Catalog {
  if (cached && cached.contentVersion >= builtInCatalogVersion) return cached;
  return {
    schemaVersion: 1,
    contentVersion: builtInCatalogVersion,
    plays: builtInPlays,
  };
}
