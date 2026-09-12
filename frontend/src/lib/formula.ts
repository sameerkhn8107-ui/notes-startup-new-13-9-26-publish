// Safe, deterministic, sandboxed local formula engine.
// Supports: + - * / %, = != > < >= <=, IF/AND/OR/NOT,
// SUM/AVERAGE/MIN/MAX/COUNT/COUNTA/ROUND/ABS,
// DATE/TODAY/DATE_DIFF/DAYS_REMAINING, CONCAT/LENGTH/LOWER/UPPER,
// property references via prop("Name") or bare Name.
// Never throws to the caller: returns { error } on any problem.

export type FormulaResult = number | string | boolean | { error: string };

type Ctx = Record<string, any>; // propertyName(lower) -> value

interface Tok {
  t: "num" | "str" | "id" | "op" | "lp" | "rp" | "comma";
  v: string;
}

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const ops = [">=", "<=", "!=", "==", "=", ">", "<", "+", "-", "*", "/", "%"];
  while (i < src.length) {
    const ch = src[i];
    if (ch === " " || ch === "\t" || ch === "\n") {
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== quote) {
        s += src[j];
        j++;
      }
      toks.push({ t: "str", v: s });
      i = j + 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      let s = "";
      while (j < src.length && /[0-9.]/.test(src[j])) {
        s += src[j];
        j++;
      }
      toks.push({ t: "num", v: s });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      let s = "";
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) {
        s += src[j];
        j++;
      }
      toks.push({ t: "id", v: s });
      i = j;
      continue;
    }
    if (ch === "(") {
      toks.push({ t: "lp", v: ch });
      i++;
      continue;
    }
    if (ch === ")") {
      toks.push({ t: "rp", v: ch });
      i++;
      continue;
    }
    if (ch === ",") {
      toks.push({ t: "comma", v: ch });
      i++;
      continue;
    }
    let matched = false;
    for (const op of ops) {
      if (src.startsWith(op, i)) {
        toks.push({ t: "op", v: op === "==" ? "=" : op });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (!matched) throw new Error(`Unexpected '${ch}'`);
  }
  return toks;
}

function toNum(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v == null || v === "") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
function toStr(v: any): string {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function parseDate(v: any): Date {
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date(NaN) : d;
}

function callFn(name: string, args: any[]): any {
  const NAME = name.toUpperCase();
  const nums = args.map(toNum);
  switch (NAME) {
    case "IF":
      return args[0] ? args[1] : args[2];
    case "AND":
      return args.every(Boolean);
    case "OR":
      return args.some(Boolean);
    case "NOT":
      return !args[0];
    case "SUM":
      return nums.reduce((a, b) => a + b, 0);
    case "AVERAGE":
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case "MIN":
      return nums.length ? Math.min(...nums) : 0;
    case "MAX":
      return nums.length ? Math.max(...nums) : 0;
    case "COUNT":
      return args.filter((a) => typeof a === "number" || (a !== "" && a != null && !isNaN(Number(a)))).length;
    case "COUNTA":
      return args.filter((a) => a !== "" && a != null).length;
    case "ROUND":
      return Math.round(nums[0] * Math.pow(10, nums[1] ?? 0)) / Math.pow(10, nums[1] ?? 0);
    case "ABS":
      return Math.abs(nums[0]);
    case "CONCAT":
      return args.map(toStr).join("");
    case "LENGTH":
      return toStr(args[0]).length;
    case "LOWER":
      return toStr(args[0]).toLowerCase();
    case "UPPER":
      return toStr(args[0]).toUpperCase();
    case "TODAY":
      return new Date();
    case "DATE":
      return new Date(nums[0], (nums[1] ?? 1) - 1, nums[2] ?? 1);
    case "DATE_DIFF": {
      const a = parseDate(args[0]);
      const b = parseDate(args[1]);
      const unit = toStr(args[2] ?? "days").toLowerCase();
      const d = daysBetween(a, b);
      if (unit.startsWith("week")) return Math.round(d / 7);
      if (unit.startsWith("month")) return Math.round(d / 30);
      if (unit.startsWith("year")) return Math.round(d / 365);
      return d;
    }
    case "DAYS_REMAINING": {
      const target = parseDate(args[0]);
      return daysBetween(new Date(), target);
    }
    default:
      throw new Error(`Unknown function ${name}`);
  }
}

class Parser {
  toks: Tok[];
  pos = 0;
  ctx: Ctx;
  constructor(toks: Tok[], ctx: Ctx) {
    this.toks = toks;
    this.ctx = ctx;
  }
  peek(): Tok | undefined {
    return this.toks[this.pos];
  }
  next(): Tok {
    return this.toks[this.pos++];
  }
  expr(): any {
    return this.comparison();
  }
  comparison(): any {
    let left = this.additive();
    while (this.peek()?.t === "op" && ["=", "!=", ">", "<", ">=", "<="].includes(this.peek()!.v)) {
      const op = this.next().v;
      const right = this.additive();
      const ln = typeof left === "number" || typeof right === "number";
      const a = ln ? toNum(left) : left;
      const b = ln ? toNum(right) : right;
      switch (op) {
        case "=": left = a === b; break;
        case "!=": left = a !== b; break;
        case ">": left = toNum(a) > toNum(b); break;
        case "<": left = toNum(a) < toNum(b); break;
        case ">=": left = toNum(a) >= toNum(b); break;
        case "<=": left = toNum(a) <= toNum(b); break;
      }
    }
    return left;
  }
  additive(): any {
    let left = this.multiplicative();
    while (this.peek()?.t === "op" && ["+", "-"].includes(this.peek()!.v)) {
      const op = this.next().v;
      const right = this.multiplicative();
      if (op === "+" && (typeof left === "string" || typeof right === "string")) {
        left = toStr(left) + toStr(right);
      } else {
        left = op === "+" ? toNum(left) + toNum(right) : toNum(left) - toNum(right);
      }
    }
    return left;
  }
  multiplicative(): any {
    let left = this.unary();
    while (this.peek()?.t === "op" && ["*", "/", "%"].includes(this.peek()!.v)) {
      const op = this.next().v;
      const right = this.unary();
      const a = toNum(left);
      const b = toNum(right);
      left = op === "*" ? a * b : op === "/" ? (b === 0 ? 0 : a / b) : b === 0 ? 0 : a % b;
    }
    return left;
  }
  unary(): any {
    const p = this.peek();
    if (p?.t === "op" && p.v === "-") {
      this.next();
      return -toNum(this.unary());
    }
    if (p?.t === "id" && p.v.toUpperCase() === "NOT") {
      this.next();
      if (this.peek()?.t === "lp") {
        this.next();
        const v = this.expr();
        if (this.peek()?.t === "rp") this.next();
        return !v;
      }
      return !this.unary();
    }
    return this.primary();
  }
  primary(): any {
    const tok = this.next();
    if (!tok) throw new Error("Unexpected end");
    if (tok.t === "num") return Number(tok.v);
    if (tok.t === "str") return tok.v;
    if (tok.t === "lp") {
      const v = this.expr();
      if (this.peek()?.t === "rp") this.next();
      return v;
    }
    if (tok.t === "id") {
      const up = tok.v.toUpperCase();
      if (up === "TRUE") return true;
      if (up === "FALSE") return false;
      // function call?
      if (this.peek()?.t === "lp") {
        this.next();
        const args: any[] = [];
        if (this.peek()?.t !== "rp") {
          args.push(this.expr());
          while (this.peek()?.t === "comma") {
            this.next();
            args.push(this.expr());
          }
        }
        if (this.peek()?.t === "rp") this.next();
        if (up === "PROP") {
          const key = toStr(args[0]).toLowerCase();
          return this.ctx[key];
        }
        return callFn(tok.v, args);
      }
      // bare property reference
      const key = tok.v.toLowerCase();
      if (key in this.ctx) return this.ctx[key];
      return "";
    }
    throw new Error(`Unexpected token ${tok.v}`);
  }
}

export function evalFormula(expr: string, ctx: Ctx): FormulaResult {
  try {
    if (!expr || !expr.trim()) return "";
    const toks = tokenize(expr);
    const p = new Parser(toks, normalizeCtx(ctx));
    const v = p.expr();
    if (v instanceof Date) {
      return isNaN(v.getTime()) ? { error: "bad date" } : v.toISOString().slice(0, 10);
    }
    if (typeof v === "number" && !isFinite(v)) return { error: "NaN" };
    return v as FormulaResult;
  } catch (e: any) {
    return { error: e?.message || "Formula error" };
  }
}

function normalizeCtx(ctx: Ctx): Ctx {
  const out: Ctx = {};
  for (const k of Object.keys(ctx || {})) out[k.toLowerCase()] = ctx[k];
  return out;
}

export function formatResult(r: FormulaResult): string {
  if (r && typeof r === "object" && "error" in r) return `\u26A0 ${r.error}`;
  if (typeof r === "boolean") return r ? "\u2713" : "\u2717";
  if (typeof r === "number") return Number.isInteger(r) ? String(r) : r.toFixed(2);
  return String(r);
}
