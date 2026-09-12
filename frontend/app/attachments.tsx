import React, { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, useTheme } from "@/src/context/AppContext";
import { useToast } from "@/src/components/Toast";
import { EmptyState } from "@/src/components/EmptyState";
import { deleteAttachment, listAllAttachments } from "@/src/db/repo";
import { getAllBlocks } from "@/src/db/pages-repo";
import { parseBlockContent } from "@/src/lib/blocks";
import { Attachment } from "@/src/db/types";

function fmtBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

export default function Attachments() {
  const c = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { refresh } = useApp();
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [imageBlocks, setImageBlocks] = useState<{ id: string; pageId: string; uri: string; size: number }[]>([]);
  const [filter, setFilter] = useState<"all" | "image" | "audio" | "drawing">("all");

  const load = useCallback(async () => {
    try {
      const a = await listAllAttachments();
      setAtts(a);
      const blocks = await getAllBlocks();
      const imgs = blocks.filter((b) => b.type === "image").map((b) => { const u = parseBlockContent(b.content).image || ""; return { id: b.id, pageId: b.pageId, uri: u, size: Math.floor((u.length * 3) / 4) }; }).filter((x) => x.uri);
      setImageBlocks(imgs);
    } catch (e) { console.warn("[attachments] load failed", e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === "all" ? atts : atts.filter((a) => a.type === filter);
  const totalBytes = atts.reduce((s, a) => s + (a.fileSize ?? 0), 0) + imageBlocks.reduce((s, i) => s + i.size, 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.surface, paddingTop: insets.top }}>
      <View style={styles.top}>
        <Pressable testID="att-back" onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}><MaterialCommunityIcons name="chevron-left" size={28} color={c.onSurface} /></Pressable>
        <Text style={[styles.heading, { color: c.onSurface }]}>Attachments</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: c.brandTertiary }]}>
        <Text style={[styles.statBig, { color: c.onBrandTertiary }]}>{fmtBytes(totalBytes)}</Text>
        <Text style={[styles.statSub, { color: c.onBrandTertiary }]}>{`${atts.length} files \u00B7 ${imageBlocks.length} page images`}</Text>
      </View>
      <View style={styles.chipRow}>
        {(["all", "image", "audio", "drawing"] as const).map((k) => (
          <Pressable key={k} testID={`att-filter-${k}`} onPress={() => setFilter(k)} style={[styles.chip, { backgroundColor: filter === k ? c.brandTertiary : c.surfaceSecondary, borderColor: filter === k ? c.brand : c.border }]}>
            <Text style={[styles.chipText, { color: filter === k ? c.brand : c.onSurfaceTertiary }]}>{k}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {filtered.length === 0 && imageBlocks.length === 0 ? (
          <EmptyState icon="paperclip" title="No attachments" subtitle="Files you add to notes and pages appear here." testID="empty-attachments" />
        ) : (
          <>
            {filtered.map((a) => (
              <View key={a.id} style={[styles.row, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}>
                <MaterialCommunityIcons name={a.type === "image" ? "image" : a.type === "audio" ? "music-note" : "draw"} size={22} color={c.brand} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[styles.name, { color: c.onSurface }]}>{a.fileName || a.type}</Text>
                  <Text style={[styles.meta, { color: c.muted }]}>{`${fmtBytes(a.fileSize ?? 0)} \u00B7 ${new Date(a.createdAt).toLocaleDateString()}`}</Text>
                </View>
                <Pressable testID={`att-del-${a.id}`} onPress={async () => { await deleteAttachment(a.id); load(); refresh(); toast.show("Attachment deleted", "success"); }} hitSlop={8}><MaterialCommunityIcons name="trash-can-outline" size={18} color={c.error} /></Pressable>
              </View>
            ))}
            {(filter === "all" || filter === "image") && imageBlocks.map((im) => (
              <Pressable key={im.id} testID={`imgblk-${im.id}`} onPress={() => router.push({ pathname: "/page/[id]", params: { id: im.pageId } })} style={[styles.row, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}>
                <Image source={{ uri: im.uri }} style={styles.thumb} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[styles.name, { color: c.onSurface }]}>Page image</Text>
                  <Text style={[styles.meta, { color: c.muted }]}>{`${fmtBytes(im.size)} \u00B7 in a page`}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={c.muted} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", height: 56, paddingHorizontal: 8 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1, fontSize: 20, fontWeight: "800", marginLeft: 4 },
  statCard: { marginHorizontal: 16, borderRadius: 16, padding: 18, marginBottom: 12 },
  statBig: { fontSize: 26, fontWeight: "800" },
  statSub: { fontSize: 13, marginTop: 4, fontWeight: "600" },
  chipRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, marginBottom: 8 },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  name: { fontSize: 14, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2 },
});
