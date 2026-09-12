// M1: Recursive Pages + Block editor data model.
// These tables are ADDITIVE — they never touch the existing notes/folders/labels.

export type BlockType =
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "numbered"
  | "checklist"
  | "quote"
  | "divider"
  | "code"
  | "callout"
  | "toggle"
  | "image";

export interface Page {
  id: string;
  parentPageId: string | null;
  title: string;
  icon: string;
  cover: string | null;
  orderIndex: number;
  isFavorite: number;
  isArchived: number;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Block {
  id: string;
  pageId: string;
  parentBlockId: string | null;
  type: BlockType;
  content: string; // JSON-serialized BlockContent
  depth: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageTreeNode extends Page {
  children: PageTreeNode[];
  childCount: number;
}
