// Pure helpers for the block editor — shared by native & web, no platform deps.
import { Block, BlockType } from "@/src/db/pages-types";

export interface BlockContent {
  text?: string;
  checked?: boolean;
  language?: string;
  emoji?: string;
  collapsed?: boolean;
  image?: string; // base64 data URI
}

export function parseBlockContent(raw: string | null | undefined): BlockContent {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as BlockContent) : {};
  } catch {
    return {};
  }
}

export function serializeBlockContent(c: BlockContent): string {
  try {
    return JSON.stringify(c ?? {});
  } catch {
    return "{}";
  }
}

const TEXTUAL: BlockType[] = [
  "text",
  "h1",
  "h2",
  "h3",
  "bullet",
  "numbered",
  "checklist",
  "quote",
  "code",
  "callout",
  "toggle",
];

export function isTextual(t: BlockType): boolean {
  return TEXTUAL.includes(t);
}

export function defaultContent(t: BlockType): BlockContent {
  switch (t) {
    case "checklist":
      return { text: "", checked: false };
    case "callout":
      return { text: "", emoji: "\uD83D\uDCA1" };
    case "toggle":
      return { text: "", collapsed: false };
    case "code":
      return { text: "", language: "plain" };
    case "image":
      return { image: "" };
    case "divider":
      return {};
    default:
      return { text: "" };
  }
}

export function blockPlaceholder(t: BlockType): string {
  switch (t) {
    case "h1":
      return "Heading 1";
    case "h2":
      return "Heading 2";
    case "h3":
      return "Heading 3";
    case "bullet":
      return "List item";
    case "numbered":
      return "List item";
    case "checklist":
      return "To-do";
    case "quote":
      return "Quote";
    case "code":
      return "Code";
    case "callout":
      return "Callout";
    case "toggle":
      return "Toggle";
    default:
      return "Type something\u2026";
  }
}

export interface BlockDef {
  type: BlockType;
  label: string;
  icon: string; // MaterialCommunityIcons name
  group: string;
  desc: string;
}

export const BLOCK_DEFS: BlockDef[] = [
  { type: "text", label: "Text", icon: "format-text", group: "Basic", desc: "Plain paragraph" },
  { type: "h1", label: "Heading 1", icon: "format-header-1", group: "Basic", desc: "Large section heading" },
  { type: "h2", label: "Heading 2", icon: "format-header-2", group: "Basic", desc: "Medium heading" },
  { type: "h3", label: "Heading 3", icon: "format-header-3", group: "Basic", desc: "Small heading" },
  { type: "bullet", label: "Bulleted list", icon: "format-list-bulleted", group: "Lists", desc: "Simple bullet list" },
  { type: "numbered", label: "Numbered list", icon: "format-list-numbered", group: "Lists", desc: "Ordered list" },
  { type: "checklist", label: "To-do list", icon: "checkbox-marked-outline", group: "Lists", desc: "Track tasks" },
  { type: "toggle", label: "Toggle", icon: "chevron-right", group: "Lists", desc: "Collapsible section" },
  { type: "quote", label: "Quote", icon: "format-quote-close", group: "Basic", desc: "Capture a quote" },
  { type: "callout", label: "Callout", icon: "lightbulb-on-outline", group: "Basic", desc: "Highlight info" },
  { type: "code", label: "Code", icon: "code-tags", group: "Basic", desc: "Code snippet" },
  { type: "divider", label: "Divider", icon: "minus", group: "Basic", desc: "Visual separator" },
  { type: "image", label: "Image", icon: "image-outline", group: "Media", desc: "Embed an image" },
];

// Compute the list of blocks that should be VISIBLE, honoring collapsed toggles.
// Any block deeper than a collapsed toggle is hidden until depth returns to <= toggle depth.
export function visibleBlocks(blocks: Block[]): Block[] {
  const out: Block[] = [];
  let hideDepth = Infinity;
  for (const b of blocks) {
    if (b.depth > hideDepth) continue;
    if (b.depth <= hideDepth) hideDepth = Infinity;
    out.push(b);
    if (b.type === "toggle" && parseBlockContent(b.content).collapsed) {
      hideDepth = b.depth;
    }
  }
  return out;
}

// Numbered-list display index for a given block, counting consecutive numbered
// siblings at the same depth immediately preceding it in the full ordered list.
export function numberedIndex(blocks: Block[], target: Block): number {
  let count = 0;
  for (const b of blocks) {
    if (b.id === target.id) break;
    if (b.type === "numbered" && b.depth === target.depth) count += 1;
    else if (b.depth <= target.depth && b.type !== "numbered") count = 0;
  }
  return count + 1;
}

// Convert page blocks to a plain-text/markdown-ish string (for search & export reuse).
export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      const c = parseBlockContent(b.content);
      if (b.type === "divider") return "---";
      if (b.type === "image") return "[image]";
      return c.text ?? "";
    })
    .filter(Boolean)
    .join("\n");
}
