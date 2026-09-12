// M1: Pages + Blocks data access (native SQLite). Additive — does not touch notes.
import { getDb } from "./database";
import { Block, BlockType, Page } from "./pages-types";
import { defaultContent, serializeBlockContent } from "@/src/lib/blocks";
import { genId, nowIso } from "../lib/id";

const PAGE_COLS =
  "id,parentPageId,title,icon,cover,orderIndex,isFavorite,isArchived,isDeleted,createdAt,updatedAt,deletedAt";
const BLOCK_COLS =
  "id,pageId,parentBlockId,type,content,depth,orderIndex,createdAt,updatedAt";

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

// ---------- Pages ----------

export async function createPage(
  parentPageId: string | null = null,
  partial: Partial<Page> = {},
): Promise<Page> {
  const db = await getDb();
  const ts = nowIso();
  const maxRow = await db.getFirstAsync<{ m: number }>(
    `SELECT COALESCE(MAX(orderIndex),-1) AS m FROM pages WHERE ${
      parentPageId ? "parentPageId = ?" : "parentPageId IS NULL"
    } AND isDeleted = 0`,
    parentPageId ? [parentPageId] : [],
  );
  const page: Page = {
    id: genId("page"),
    parentPageId: parentPageId ?? null,
    title: partial.title ?? "",
    icon: partial.icon ?? "\uD83D\uDCC4",
    cover: partial.cover ?? null,
    orderIndex: (maxRow?.m ?? -1) + 1,
    isFavorite: partial.isFavorite ?? 0,
    isArchived: partial.isArchived ?? 0,
    isDeleted: 0,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
  await db.runAsync(
    `INSERT INTO pages (${PAGE_COLS}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      page.id,
      page.parentPageId,
      page.title,
      page.icon,
      page.cover,
      page.orderIndex,
      page.isFavorite,
      page.isArchived,
      page.isDeleted,
      page.createdAt,
      page.updatedAt,
      page.deletedAt,
    ],
  );
  return page;
}

export async function getPage(id: string): Promise<Page | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Page>(`SELECT * FROM pages WHERE id = ?`, [
    id,
  ]);
  return row ?? null;
}

export async function updatePage(
  id: string,
  fields: Partial<Page>,
): Promise<void> {
  const db = await getDb();
  const keys = Object.keys(fields).filter((k) => PAGE_UPDATABLE.has(k));
  if (!keys.length) return;
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as any)[k]);
  await db.runAsync(`UPDATE pages SET ${setClause}, updatedAt = ? WHERE id = ?`, [
    ...values,
    nowIso(),
    id,
  ]);
}

export async function listChildPages(
  parentPageId: string | null,
  opts: { includeArchived?: boolean } = {},
): Promise<Page[]> {
  const db = await getDb();
  const where = [
    parentPageId ? "parentPageId = ?" : "parentPageId IS NULL",
    "isDeleted = 0",
  ];
  if (!opts.includeArchived) where.push("isArchived = 0");
  return db.getAllAsync<Page>(
    `SELECT * FROM pages WHERE ${where.join(
      " AND ",
    )} ORDER BY orderIndex ASC, createdAt ASC`,
    parentPageId ? [parentPageId] : [],
  );
}

export async function listAllPages(
  includeDeleted = false,
): Promise<Page[]> {
  const db = await getDb();
  return db.getAllAsync<Page>(
    `SELECT * FROM pages ${
      includeDeleted ? "" : "WHERE isDeleted = 0"
    } ORDER BY orderIndex ASC, createdAt ASC`,
  );
}

export async function listFavoritePages(): Promise<Page[]> {
  const db = await getDb();
  return db.getAllAsync<Page>(
    `SELECT * FROM pages WHERE isFavorite = 1 AND isDeleted = 0 ORDER BY updatedAt DESC`,
  );
}

export async function listTrashedPages(): Promise<Page[]> {
  const db = await getDb();
  return db.getAllAsync<Page>(
    `SELECT * FROM pages WHERE isDeleted = 1 ORDER BY deletedAt DESC`,
  );
}

export async function childCount(pageId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM pages WHERE parentPageId = ? AND isDeleted = 0`,
    [pageId],
  );
  return row?.c ?? 0;
}

export async function getBreadcrumb(id: string): Promise<Page[]> {
  const chain: Page[] = [];
  const seen = new Set<string>();
  let currentId: string | null = id;
  let guard = 0;
  while (currentId && guard < 100) {
    if (seen.has(currentId)) break; // cycle guard
    seen.add(currentId);
    const p: Page | null = await getPage(currentId);
    if (!p) break;
    chain.unshift(p);
    currentId = p.parentPageId;
    guard += 1;
  }
  return chain;
}

// True if `ancestorId` is an ancestor of (or equal to) `nodeId`.
export async function isAncestor(
  ancestorId: string,
  nodeId: string,
): Promise<boolean> {
  let currentId: string | null = nodeId;
  const seen = new Set<string>();
  let guard = 0;
  while (currentId && guard < 200) {
    if (currentId === ancestorId) return true;
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const p: Page | null = await getPage(currentId);
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
  const db = await getDb();
  const maxRow = await db.getFirstAsync<{ m: number }>(
    `SELECT COALESCE(MAX(orderIndex),-1) AS m FROM pages WHERE ${
      newParentId ? "parentPageId = ?" : "parentPageId IS NULL"
    } AND isDeleted = 0`,
    newParentId ? [newParentId] : [],
  );
  await db.runAsync(
    `UPDATE pages SET parentPageId = ?, orderIndex = ?, updatedAt = ? WHERE id = ?`,
    [newParentId, (maxRow?.m ?? -1) + 1, nowIso(), id],
  );
}

export async function reorderPages(
  parentPageId: string | null,
  orderedIds: string[],
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(`UPDATE pages SET orderIndex = ? WHERE id = ?`, [
        i,
        orderedIds[i],
      ]);
    }
  });
}

// Collect a page + all its (non-deleted) descendants.
async function collectSubtreeIds(rootId: string): Promise<string[]> {
  const db = await getDb();
  const ids: string[] = [rootId];
  const queue: string[] = [rootId];
  let guard = 0;
  while (queue.length && guard < 100000) {
    const parent = queue.shift()!;
    const children = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM pages WHERE parentPageId = ? AND isDeleted = 0`,
      [parent],
    );
    for (const ch of children) {
      ids.push(ch.id);
      queue.push(ch.id);
    }
    guard += 1;
  }
  return ids;
}

// Delete a page and ALL its children (soft delete).
export async function deletePageCascade(id: string): Promise<void> {
  const db = await getDb();
  const ids = await collectSubtreeIds(id);
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    for (const pid of ids) {
      await db.runAsync(
        `UPDATE pages SET isDeleted = 1, deletedAt = ?, updatedAt = ? WHERE id = ?`,
        [ts, ts, pid],
      );
    }
  });
}

// Delete only this page; move its direct children up to this page's parent.
export async function deletePageReparent(id: string): Promise<void> {
  const db = await getDb();
  const page = await getPage(id);
  if (!page) return;
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE pages SET parentPageId = ?, updatedAt = ? WHERE parentPageId = ? AND isDeleted = 0`,
      [page.parentPageId, ts, id],
    );
    await db.runAsync(
      `UPDATE pages SET isDeleted = 1, deletedAt = ?, updatedAt = ? WHERE id = ?`,
      [ts, ts, id],
    );
  });
}

export async function restorePage(id: string): Promise<void> {
  const db = await getDb();
  const page = await getPage(id);
  if (!page) return;
  // Restore original hierarchy where possible; otherwise fall back to root.
  let parentOk = false;
  if (page.parentPageId) {
    const parent = await getPage(page.parentPageId);
    parentOk = !!parent && parent.isDeleted === 0;
  }
  await db.runAsync(
    `UPDATE pages SET isDeleted = 0, deletedAt = NULL, parentPageId = ?, updatedAt = ? WHERE id = ?`,
    [parentOk ? page.parentPageId : null, nowIso(), id],
  );
}

export async function permanentlyDeletePage(id: string): Promise<void> {
  const db = await getDb();
  const ids = await collectSubtreeIdsIncludingDeleted(id);
  await db.withTransactionAsync(async () => {
    for (const pid of ids) {
      await db.runAsync(`DELETE FROM blocks WHERE pageId = ?`, [pid]);
      await db.runAsync(`DELETE FROM pages WHERE id = ?`, [pid]);
    }
  });
}

async function collectSubtreeIdsIncludingDeleted(rootId: string): Promise<string[]> {
  const db = await getDb();
  const ids: string[] = [rootId];
  const queue: string[] = [rootId];
  let guard = 0;
  while (queue.length && guard < 100000) {
    const parent = queue.shift()!;
    const children = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM pages WHERE parentPageId = ?`,
      [parent],
    );
    for (const ch of children) {
      ids.push(ch.id);
      queue.push(ch.id);
    }
    guard += 1;
  }
  return ids;
}

// Deep-clone a page subtree with fresh IDs. Returns the new root page id.
export async function duplicatePage(id: string): Promise<string | null> {
  const db = await getDb();
  const root = await getPage(id);
  if (!root) return null;
  const subtreeIds = await collectSubtreeIds(id);
  const idMap = new Map<string, string>();
  for (const oldId of subtreeIds) idMap.set(oldId, genId("page"));

  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    for (const oldId of subtreeIds) {
      const p = await db.getFirstAsync<Page>(`SELECT * FROM pages WHERE id = ?`, [
        oldId,
      ]);
      if (!p) continue;
      const newId = idMap.get(oldId)!;
      const newParent =
        oldId === id
          ? p.parentPageId
          : idMap.get(p.parentPageId ?? "") ?? p.parentPageId;
      const title = oldId === id ? `${p.title || "Untitled"} (copy)` : p.title;
      await db.runAsync(
        `INSERT INTO pages (${PAGE_COLS}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          newId,
          newParent,
          title,
          p.icon,
          p.cover,
          p.orderIndex,
          0,
          p.isArchived,
          0,
          ts,
          ts,
          null,
        ],
      );
      const blocks = await db.getAllAsync<Block>(
        `SELECT * FROM blocks WHERE pageId = ? ORDER BY orderIndex ASC`,
        [oldId],
      );
      const blockIdMap = new Map<string, string>();
      for (const b of blocks) blockIdMap.set(b.id, genId("blk"));
      for (const b of blocks) {
        await db.runAsync(
          `INSERT INTO blocks (${BLOCK_COLS}) VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            blockIdMap.get(b.id)!,
            newId,
            b.parentBlockId ? blockIdMap.get(b.parentBlockId) ?? null : null,
            b.type,
            b.content,
            b.depth,
            b.orderIndex,
            ts,
            ts,
          ],
        );
      }
    }
  });
  return idMap.get(id) ?? null;
}

export async function searchPages(q: string): Promise<Page[]> {
  const db = await getDb();
  const like = `%${q.trim()}%`;
  return db.getAllAsync<Page>(
    `SELECT * FROM pages WHERE isDeleted = 0 AND title LIKE ? ORDER BY updatedAt DESC LIMIT 100`,
    [like],
  );
}

export async function pageStats(): Promise<{ pages: number; blocks: number }> {
  const db = await getDb();
  const p = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM pages WHERE isDeleted = 0`,
  );
  const b = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM blocks`,
  );
  return { pages: p?.c ?? 0, blocks: b?.c ?? 0 };
}

// ---------- Blocks ----------

export async function getBlocks(pageId: string): Promise<Block[]> {
  const db = await getDb();
  return db.getAllAsync<Block>(
    `SELECT * FROM blocks WHERE pageId = ? ORDER BY orderIndex ASC`,
    [pageId],
  );
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

// Atomic replace of all blocks for a page (used by autosave + undo/redo).
export async function replacePageBlocks(
  pageId: string,
  blocks: Block[],
): Promise<void> {
  const db = await getDb();
  const ts = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM blocks WHERE pageId = ?`, [pageId]);
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      await db.runAsync(
        `INSERT INTO blocks (${BLOCK_COLS}) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          b.id,
          pageId,
          b.parentBlockId ?? null,
          b.type,
          b.content,
          b.depth ?? 0,
          i,
          b.createdAt ?? ts,
          ts,
        ],
      );
    }
    await db.runAsync(`UPDATE pages SET updatedAt = ? WHERE id = ?`, [
      ts,
      pageId,
    ]);
  });
}
