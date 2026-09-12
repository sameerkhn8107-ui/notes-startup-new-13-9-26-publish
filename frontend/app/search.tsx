import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/context/AppContext";
import { EmptyState } from "@/src/components/EmptyState";
import { listNotes } from "@/src/db/repo";
import { getAllBlocks, listAllPages, getBreadcrumb } from "@/src/db/pages-repo";
import { parseBlockContent } from "@/src/lib/blocks";
import { listTasks, listAllDatabases, listRecords, listProperties } from "@/src/db/workspace-store";

interface Result {
  kind: "page" | "note" | "block" | "task" | "record";
  id: string;
  title: string;
  snippet: string;
  path: string;
  nav: () => void;
}

export default function GlobalSearch() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);

  const run = useCallback(async (q: string) => {
    setQuery(q);
    const s = q.trim().toLowerCase();
    if (!s) { setResults([]); setSearched(false); return; }
    const out: Result[] = [];
    try {
      const pages = await listAllPages(false);
      const pageMap = new Map(pages.map((p) => [p.id, p]));
      for (const p of pages) {
        if (p.title.toLowerCase().includes(s)) {
          const bc = await getBreadcrumb(p.id);
          out.push({ kind: "page", id: p.id, title: p.title || "Untitled", snippet: "", path: bc.map((x) => x.title || "Untitled").join(" / "), nav: () => router.push({ pathname: "/page/[id]", params: { id: p.id } }) });
        }
      }
      const blocks = await getAllBlocks();
      const seenPage = new Set(out.filter((r) => r.kind === "page").map((r) => r.id));
      for (const b of blocks) {
        const txt = parseBlockContent(b.content).text || "";
        if (txt.toLowerCase().includes(s) && !seenPage.has(b.pageId)) {
          const pg = pageMap.get(b.pageId);
          if (!pg) continue;
          seenPage.add(b.pageId);
          out.push({ kind: "block", id: b.id, title: pg.title || "Untitled", snippet: txt.slice(0, 80), path: "in page", nav: () => router.push({ pathname: "/page/[id]", params: { id: b.pageId } }) });
        }
      }
      const notes = await listNotes({ filter: "all", search: q, sort: "updated" });
      for (const n of notes) out.push({ kind: "note", id: n.id, title: n.title || "Untitled note", snippet: (n.content || "").slice(0, 80), path: "Note", nav: () => router.push({ pathname: "/editor", params: { id: n.id } }) });
      const tasks = await listTasks();
      for (const t of tasks) if (t.title.toLowerCase().includes(s)) out.push({ kind: "task", id: t.id, title: t.title, snippet: `${t.status} \u00B7 ${t.priority}`, path: "Task", nav: () => router.push("/calendar") });
      const dbs = await listAllDatabases();
      for (const db of dbs) {
        const props = await listProperties(db.id);
        const titleProp = props.find((p) => p.type === "title");
        const recs = await listRecords(db.id);
        for (const r of recs) {
          const title = titleProp ? String(r.values?.[titleProp.id] ?? "") : "";
          if (title.toLowerCase().includes(s)) out.push({ kind: "record", id: r.id, title, snippet: db.title, path: `Database / ${db.title}`, nav: () => router.push({ pathname: "/database/[id]", params: { id: db.id } }) });
        }
      }
    } catch (e) {
      console.warn("[search] failed", e);
    }
    setResults(out.slice(0, 200));
    setSearched(true);
  }, [router]);

  const icon = (k: Result["kind"]) => k === "page" ? "file-document-outline" : k === "note" ? "note-outline" : k === "task" ? "checkbox-marked-circle-outline" : k === "record" ? "table" : "text-box-outline";

  return (
    <View style={{ flex: 1, backgroundColor: c.surface, paddingTop: insets.top }}>
      <View style={styles.top}>
        <Pressable testID="search-back" onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={c.onSurface} />
        </Pressable>
        <View style={[styles.searchBar, { backgroundColor: c.surfaceTertiary, borderColor: c.border }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={c.muted} />
          <TextInput testID="global-search" autoFocus value={query} onChangeText={run} placeholder="Search everything" placeholderTextColor={c.muted} style={[styles.searchInput, { color: c.onSurface }]} />
          {query.length > 0 && (
            <Pressable testID="clear" onPress={() => run("")}><MaterialCommunityIcons name="close-circle" size={18} color={c.muted} /></Pressable>
          )}
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {searched && results.length === 0 ? (
          <EmptyState icon="magnify" title="No results" subtitle="Try different keywords." testID="empty-search-global" />
        ) : (
          results.map((r) => (
            <Pressable key={`${r.kind}-${r.id}`} testID={`sr-${r.id}`} onPress={r.nav} style={[styles.row, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}>
              <MaterialCommunityIcons name={icon(r.kind) as any} size={20} color={c.brand} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.title, { color: c.onSurface }]}>{r.title}</Text>
                {!!r.snippet && <Text numberOfLines={1} style={[styles.snippet, { color: c.onSurfaceTertiary }]}>{r.snippet}</Text>}
                <Text numberOfLines={1} style={[styles.path, { color: c.muted }]}>{`${r.kind.toUpperCase()} \u00B7 ${r.path}`}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 4, height: 56, paddingHorizontal: 8 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 46, borderRadius: 999, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, marginRight: 12 },
  searchInput: { flex: 1, fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 12, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: "600" },
  snippet: { fontSize: 13, marginTop: 1 },
  path: { fontSize: 11, marginTop: 2 },
});
