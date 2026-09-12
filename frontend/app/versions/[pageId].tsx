import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, useTheme } from "@/src/context/AppContext";
import { useToast } from "@/src/components/Toast";
import { BottomSheet } from "@/src/components/Sheet";
import { EmptyState } from "@/src/components/EmptyState";
import { deleteVersion, listVersions, saveVersion } from "@/src/db/workspace-store";
import { getBlocks, getPage, replacePageBlocks, updatePage } from "@/src/db/pages-repo";
import { PageVersion } from "@/src/db/workspace-types";
import { parseBlockContent } from "@/src/lib/blocks";

export default function Versions() {
  const c = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { refresh } = useApp();
  const params = useLocalSearchParams<{ pageId: string }>();
  const pageId = String(params.pageId);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [preview, setPreview] = useState<PageVersion | null>(null);

  const load = useCallback(async () => { setVersions(await listVersions(pageId)); }, [pageId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const restore = async (v: PageVersion) => {
    // safety: snapshot current before restoring
    const cur = await getPage(pageId);
    const curBlocks = await getBlocks(pageId);
    if (cur) await saveVersion({ pageId, title: cur.title, icon: cur.icon, blocks: curBlocks, label: "Auto (before restore)" });
    await replacePageBlocks(pageId, v.blocks as any);
    await updatePage(pageId, { title: v.title, icon: v.icon });
    setPreview(null);
    refresh();
    toast.show("Version restored", "success");
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.surface, paddingTop: insets.top }}>
      <View style={styles.top}>
        <Pressable testID="ver-back" onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}><MaterialCommunityIcons name="chevron-left" size={28} color={c.onSurface} /></Pressable>
        <Text style={[styles.heading, { color: c.onSurface }]}>Version History</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {versions.length === 0 ? (
          <EmptyState icon="history" title="No versions yet" subtitle="Save a version from the page menu." testID="empty-versions" />
        ) : versions.map((v) => (
          <Pressable key={v.id} testID={`ver-${v.id}`} onPress={() => setPreview(v)} style={[styles.row, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}>
            <MaterialCommunityIcons name="history" size={20} color={c.brand} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: c.onSurface }]}>{v.label || "Snapshot"}</Text>
              <Text style={[styles.meta, { color: c.muted }]}>{`${new Date(v.createdAt).toLocaleString()} \u00B7 ${v.blocks.length} blocks`}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={c.muted} />
          </Pressable>
        ))}
      </ScrollView>
      <BottomSheet visible={!!preview} onClose={() => setPreview(null)} title={preview ? `${preview.icon} ${preview.title || "Untitled"}` : ""} testID="ver-preview">
        {preview && (
          <View>
            <Text style={[styles.meta, { color: c.muted, marginBottom: 10 }]}>{new Date(preview.createdAt).toLocaleString()}</Text>
            {preview.blocks.slice(0, 12).map((b) => <Text key={b.id} numberOfLines={1} style={[styles.previewLine, { color: c.onSurfaceTertiary }]}>{parseBlockContent(b.content).text || `[${b.type}]`}</Text>)}
            <View style={styles.actions}>
              <Pressable testID="ver-restore" onPress={() => restore(preview)} style={[styles.btn, { backgroundColor: c.brand }]}><Text style={[styles.btnText, { color: c.onBrand }]}>Restore</Text></Pressable>
              <Pressable testID="ver-del" onPress={async () => { await deleteVersion(preview.id); setPreview(null); load(); }} style={[styles.btn, { backgroundColor: c.surfaceTertiary }]}><Text style={[styles.btnText, { color: c.error }]}>Delete</Text></Pressable>
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", height: 56, paddingHorizontal: 8 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1, fontSize: 20, fontWeight: "800", marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 2 },
  previewLine: { fontSize: 13, paddingVertical: 2 },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 15, fontWeight: "700" },
});
