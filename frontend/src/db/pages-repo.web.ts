// M1: Pages + Blocks data access (web, AsyncStorage-backed). Mirrors pages-repo.ts.
// Metro auto-prefers this file on web. Isolated store — never touches notes.webdb.
import { storage } from "@/src/utils/storage";
import { Block, BlockType, Page } from "./pages-types";
import { defaultContent, serializeBlockContent } from "@/src/lib/blocks";
import { genId, nowIso } from "../lib/id";

const KEY = "notes.workspace.v1";
const BACKUP_KEY = "notes.workspace.backup";
export const WORKSPACE_SCHEMA_VERSION = 1;

interface Store {
  schemaVersion: number;
  pages: Page[];
  blocks: Block[];
}

let cache: Store | null = null;
let loadPromise: Promise<Store> | null = null;

const empty = (): Store => ({
  schemaVersion: WORKSPACE_SCHEMA_VERSION,
  pages: [],
  blocks: [],
});

// Lightweight "migration": ensure structure + version, snapshot before any bump.
async function migrate(raw: any): Promise<Store> {
  if (!raw || typeof raw !== "object") return empty();
  const store: Store = { ...empty(), ...raw };
  if ((store.schemaVersion ?? 0) < WORKSPACE_SCHEMA_VERSION) {
    try {
      await storage.setItem(BACKUP_KEY, raw);
    } catch {
      // snapshot best-effort
    }
    store.schemaVersion = WORKSPACE_SCHEMA_VERSION;
  }
  return store;
}

async function load(): Promise<Store> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const raw = await storage.getItem<any>(KEY, null);
    cache = await migrate(raw);
    return cache;
  })();
  return loadPromise;
}

async function save(): Promise<void> {
  if (cache) await storage.setItem(KEY, cache as any);
}

// ---------- Pages ----------

export async function createPage(
  parentPageId: string | null = null,
  partial: Partial<Page> = {},
): Promise<Page> {
  const db = await load();
  const ts = nowIso();
  const siblings = db.pages.filter(
    (p) => p.parentPageId === (parentPageId ?? null) && !p.isDeleted,
  );
  const maxOrder = siblings.reduce((m, p) => Math.max(m, p.orderIndex), -1);
  const page: Page = {
    id: genId("page"),
    parentPageId: parentPageId ?? null,
    title: partial.title ?? "",
    icon: partial.icon ?? "\uD83D\uDCC4",
    cover: partial.cover ?? null,
    orderIndex: maxOrder + 1,
    isFavorite: partial.isFavorite ?? 0,
    isArchived: partial.isArchived ?? 0,
    isDeleted: 0,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
  db.pages.push(page);
  await save();
  return page;
}

export async function getPage(id: string): Promise<Page | null> {
  const db = await load();
  return db.pages.find((p) => p.id === id) ?? null;
}

const PAGE_UPDATABLE = new Set([
  "parentPageId",
  "title",
  "icon",
  "cover",
  "orderIndex",
  "isFavorite",
  "isArchived",
  "isDeleted",
  "deletedAt",
]);

export async function updatePage(
  id: string,
  fields: Partial<Page>,
): Promise<void> {
  const db = await load();
  const p = db.pages.find((x) => x.id === id);
  if (!p) return;
  for (const k of Object.keys(fields)) {
    if (PAGE_UPDATABLE.has(k)) (p as any)[k] = (fields as any)[k];
  }
  p.updatedAt = nowIso();
  await save();
}

export async function listChildPages(
  parentPageId: string | null,
  opts: { includeArchived?: boolean } = {},
): Promise<Page[]> {
  const db = await load();
  return db.pages
    .filter(
      (p) =>
        p.parentPageId === (parentPageId ?? null) &&
        !p.isDeleted &&
        (opts.includeArchived ? true : !p.isArchived),
    )
    .sort((a, b) => a.orderIndex - b.orderIndex || a.createdAt.localeCompare(b.createdAt));
}

export async function listAllPages(includeDeleted = false): Promise<Page[]> {
  const db = await load();
  return db.pages
    .filter((p) => (includeDeleted ? true : !p.isDeleted))
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex || a.createdAt.localeCompare(b.createdAt));
}

export async function listFavoritePages(): Promise<Page[]> {
  const db = await load();
  return db.pages
    .filter((p) => p.isFavorite && !p.isDeleted)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listTrashedPages(): Promise<Page[]> {
  const db = await load();
  return db.pages
    .filter((p) => p.isDeleted)
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

export async function childCount(pageId: string): Promise<number> {
  const db = await load();
  return db.pages.filter((p) => p.parentPageId === pageId && !p.isDeleted).length;
}

export async function getBreadcrumb(id: string): Promise<Page[]> {
  const db = await load();
  const chain: Page[] = [];
  const seen = new Set<string>();
  let currentId: string | null = id;
  let guard = 0;
  while (currentId && guard < 100) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const p = db.pages.find((x) => x.id === currentId);
    if (!p) break;
    chain.unshift(p);
    currentId = p.parentPageId;
    guard += 1;
  }
  return chain;
}

export async function isAncestor(
  ancestorId: string,
  nodeId: string,
): Promise<boolean> {
  const db = await load();
  let currentId: string | null = nodeId;
  const seen = new Set<string>();
  let guard = 0;
  while (currentId && guard < 200) {
    if (currentId === ancestorId) return true;
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const p = db.pages.find((x) => x.id === currentId);
    currentId = p?.parentPageId ?? null;
    guard += 1;
  }
  return false;
}

export async function movePage(
  id: string,
  newParentId: string | null,
): Promise<void> {
  if (newParentId === id) throw new Error("A page cannot be moved into itself.");
  if (newParentId && (await isAncestor(id, newParentId))) {
    throw new Error("Cannot move a page into one of its own sub-pages.");
  }
  const db = await load();
  const p = db.pages.find((x) => x.id === id);
  if (!p) return;
  const siblings = db.pages.filter(
    (x) => x.parentPageId === (newParentId ?? null) && !x.isDeleted && x.id !== id,
  );
  const maxOrder = siblings.reduce((m, s) => Math.max(m, s.orderIndex), -1);
  p.parentPageId = newParentId;
  p.orderIndex = maxOrder + 1;
  p.updatedAt = nowIso();
  await save();
}

export async function reorderPages(
  _parentPageId: string | null,
  orderedIds: string[],
): Promise<void> {
  const db = await load();
  orderedIds.forEach((pid, i) => {
    const p = db.pages.find((x) => x.id === pid);
    if (p) p.orderIndex = i;
  });
  await save();
}

function subtree(db: Store, rootId: string, includeDeleted: boolean): string[] {
  const ids: string[] = [rootId];
  const queue = [rootId];
  let guard = 0;
  while (queue.length && guard < 100000) {
    const parent = queue.shift()!;
    const kids = db.pages.filter(
      (p) => p.parentPageId === parent && (includeDeleted ? true : !p.isDeleted),
    );
    for (const k of kids) {
      ids.push(k.id);
      queue.push(k.id);
    }
    guard += 1;
  }
  return ids;
}

export async function deletePageCascade(id: string): Promise<void> {
  const db = await load();
  const ids = new Set(subtree(db, id, false));
  const ts = nowIso();
  for (const p of db.pages) {
    if (ids.has(p.id)) {
      p.isDeleted = 1;
      p.deletedAt = ts;
      p.updatedAt = ts;
    }
  }
  await save();
}

export async function deletePageReparent(id: string): Promise<void> {
  const db = await load();
  const page = db.pages.find((p) => p.id === id);
  if (!page) return;
  const ts = nowIso();
  for (const p of db.pages) {
    if (p.parentPageId === id && !p.isDeleted) {
      p.parentPageId = page.parentPageId;
      p.updatedAt = ts;
    }
  }
  page.isDeleted = 1;
  page.deletedAt = ts;
  page.updatedAt = ts;
  await save();
}

export async function restorePage(id: string): Promise<void> {
  const db = await load();
  const page = db.pages.find((p) => p.id === id);
  if (!page) return;
  let parentOk = false;
  if (page.parentPageId) {
    const parent = db.pages.find((p) => p.id === page.parentPageId);
    parentOk = !!parent && parent.isDeleted === 0;
  }
  page.isDeleted = 0;
  page.deletedAt = null;
  page.parentPageId = parentOk ? page.parentPageId : null;
  page.updatedAt = nowIso();
  await save();
}

export async function permanentlyDeletePage(id: string): Promise<void> {
  const db = await load();
  const ids = new Set(subtree(db, id, true));
  db.blocks = db.blocks.filter((b) => !ids.has(b.pageId));
  db.pages = db.pages.filter((p) => !ids.has(p.id));
  await save();
}

export async function duplicatePage(id: string): Promise<string | null> {
  const db = await load();
  const root = db.pages.find((p) => p.id === id);
  if (!root) return null;
  const subtreeIds = subtree(db, id, false);
  const idMap = new Map<string, string>();
  for (const oldId of subtreeIds) idMap.set(oldId, genId("page"));
  const ts = nowIso();
  for (const oldId of subtreeIds) {
    const p = db.pages.find((x) => x.id === oldId);
    if (!p) continue;
    const newId = idMap.get(oldId)!;
    const newParent =
      oldId === id ? p.parentPageId : idMap.get(p.parentPageId ?? "") ?? p.parentPageId;
    db.pages.push({
      ...p,
      id: newId,
      parentPageId: newParent,
      title: oldId === id ? `${p.title || "Untitled"} (copy)` : p.title,
      isFavorite: 0,
      isDeleted: 0,
      deletedAt: null,
      createdAt: ts,
      updatedAt: ts,
    });
    const blocks = db.blocks.filter((b) => b.pageId === oldId);
    const blockIdMap = new Map<string, string>();
    for (const b of blocks) blockIdMap.set(b.id, genId("blk"));
    for (const b of blocks) {
      db.blocks.push({
        ...b,
        id: blockIdMap.get(b.id)!,
        pageId: newId,
        parentBlockId: b.parentBlockId ? blockIdMap.get(b.parentBlockId) ?? null : null,
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }
  await save();
  return idMap.get(id) ?? null;
}

export async function searchPages(q: string): Promise<Page[]> {
  const db = await load();
  const query = q.trim().toLowerCase();
  return db.pages
    .filter((p) => !p.isDeleted && p.title.toLowerCase().includes(query))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 100);
}

export async function pageStats(): Promise<{ pages: number; blocks: number }> {
  const db = await load();
  return {
    pages: db.pages.filter((p) => !p.isDeleted).length,
    blocks: db.blocks.length,
  };
}

// ---------- Blocks ----------

export async function getBlocks(pageId: string): Promise<Block[]> {
  const db = await load();
  return db.blocks
    .filter((b) => b.pageId === pageId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function makeBlock(
  pageId: string,
  type: BlockType,
  orderIndex: number,
  depth = 0,
  parentBlockId: string | null = null,
): Block {
  const ts = nowIso();
  return {
    id: genId("blk"),
    pageId,
    parentBlockId,
    type,
    content: serializeBlockContent(defaultContent(type)),
    depth,
    orderIndex,
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function replacePageBlocks(
  pageId: string,
  blocks: Block[],
): Promise<void> {
  const db = await load();
  const ts = nowIso();
  db.blocks = db.blocks.filter((b) => b.pageId !== pageId);
  blocks.forEach((b, i) => {
    db.blocks.push({
      ...b,
      pageId,
      orderIndex: i,
      depth: b.depth ?? 0,
      parentBlockId: b.parentBlockId ?? null,
      createdAt: b.createdAt ?? ts,
      updatedAt: ts,
    });
  });
  const page = db.pages.find((p) => p.id === pageId);
  if (page) page.updatedAt = ts;
  await save();
}
