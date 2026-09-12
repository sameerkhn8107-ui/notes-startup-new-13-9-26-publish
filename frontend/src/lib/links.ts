// Parse [[Page Links]] and @Mentions from block/text content. Pure & offline.
export interface LinkToken {
  kind: "link" | "mention";
  title: string;
  raw: string;
}

const LINK_RE = /\[\[([^\]]+)\]\]/g;
const MENTION_RE = /(^|\s)@([A-Za-z0-9][\w \-]{0,60}?)(?=$|[\s.,;!?])/g;

export function extractLinks(text: string | null | undefined): LinkToken[] {
  if (!text) return [];
  const out: LinkToken[] = [];
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text))) {
    const title = m[1].trim();
    if (title) out.push({ kind: "link", title, raw: m[0] });
  }
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text))) {
    const title = m[2].trim();
    if (title) out.push({ kind: "mention", title, raw: `@${title}` });
  }
  return out;
}

// Detect an in-progress trigger at the end of the currently edited text:
//   "... [[que"  -> { type:'link', query:'que' }
//   "... @que"   -> { type:'mention', query:'que' }
export function detectTrigger(
  text: string,
): { type: "link" | "mention"; query: string } | null {
  if (!text) return null;
  const linkIdx = text.lastIndexOf("[[");
  if (linkIdx >= 0) {
    const after = text.slice(linkIdx + 2);
    if (!after.includes("]]")) return { type: "link", query: after };
  }
  const at = text.lastIndexOf("@");
  if (at >= 0) {
    const before = at === 0 ? " " : text[at - 1];
    const after = text.slice(at + 1);
    if (/\s/.test(before) === false && at !== 0) {
      // @ must follow whitespace or be at start
    } else if (!/[\n]/.test(after) && after.length <= 60) {
      return { type: "mention", query: after };
    }
  }
  return null;
}

export function applyTrigger(
  text: string,
  type: "link" | "mention",
  title: string,
): string {
  if (type === "link") {
    const idx = text.lastIndexOf("[[");
    return text.slice(0, idx) + `[[${title}]] `;
  }
  const idx = text.lastIndexOf("@");
  return text.slice(0, idx) + `@${title} `;
}
