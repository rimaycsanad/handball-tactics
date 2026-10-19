import type { Catalog } from "./repository";
import { newPlay } from "./new-play";
export const builtInCatalogVersion = 5;
export const emptySelection = newPlay();
emptySelection.title = "Taktikatár megnyitása…";
export const publicFallback: Catalog = {
  schemaVersion: 1,
  contentVersion: builtInCatalogVersion,
  audience: "public",
  plays: [],
};
// The app bundle contains no tactics. Public documents are fetched under Firestore rules.
// Legacy caches have no audience and are deliberately ignored.
export function selectCatalog(cached: Catalog | null, uid?: string): Catalog {
  if (!cached || cached.contentVersion < builtInCatalogVersion)
    return publicFallback;
  if (uid && cached.audience === uid) return cached;
  if (cached.audience === "public")
    return {
      ...cached,
      plays: cached.plays.filter((p) => !p.requiresAuth).slice(0, 5),
    };
  return publicFallback;
}
