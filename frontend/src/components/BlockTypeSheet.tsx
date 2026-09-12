import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/AppContext";
import { BottomSheet } from "./Sheet";
import { BLOCK_DEFS } from "@/src/lib/blocks";
import { BlockType } from "@/src/db/pages-types";

interface Props {
  visible: boolean;
  title?: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

const GROUPS = ["Basic", "Lists", "Media"];

export function BlockTypeSheet({ visible, title = "Add block", onSelect, onClose }: Props) {
  const c = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} testID="block-type-sheet">
      {GROUPS.map((group) => (
        <View key={group} style={styles.group}>
          <Text style={[styles.groupTitle, { color: c.muted }]}>{group}</Text>
          {BLOCK_DEFS.filter((d) => d.group === group).map((d) => (
            <Pressable
              key={d.type}
              testID={`block-type-${d.type}`}
              onPress={() => {
                onSelect(d.type);
                onClose();
              }}
              style={styles.row}
            >
              <View style={[styles.iconBox, { backgroundColor: c.surfaceTertiary }]}>
                <MaterialCommunityIcons name={d.icon as any} size={20} color={c.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.onSurface }]}>{d.label}</Text>
                <Text style={[styles.desc, { color: c.muted }]}>{d.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 8 },
  groupTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15, fontWeight: "600" },
  desc: { fontSize: 12, marginTop: 1 },
});
