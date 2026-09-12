import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/AppContext";
import { Block } from "@/src/db/pages-types";
import {
  BlockContent,
  blockPlaceholder,
  numberedIndex,
  parseBlockContent,
} from "@/src/lib/blocks";

interface Props {
  block: Block;
  allBlocks: Block[];
  onChangeText: (id: string, text: string) => void;
  onToggleCheck: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onMenu: (id: string) => void;
  onFocus: (id: string) => void;
  onImagePress: (id: string) => void;
}

function BlockRowBase({
  block,
  allBlocks,
  onChangeText,
  onToggleCheck,
  onToggleCollapse,
  onMenu,
  onFocus,
  onImagePress,
}: Props) {
  const c = useTheme();
  const content: BlockContent = parseBlockContent(block.content);
  const indent = { marginLeft: block.depth * 18 };

  const handle = (
    <Pressable
      testID={`block-menu-${block.id}`}
      hitSlop={8}
      onPress={() => onMenu(block.id)}
      style={styles.handle}
    >
      <MaterialCommunityIcons name="dots-vertical" size={18} color={c.muted} />
    </Pressable>
  );

  if (block.type === "divider") {
    return (
      <View style={[styles.row, indent]}>
        {handle}
        <View style={[styles.divider, { backgroundColor: c.border }]} />
      </View>
    );
  }

  if (block.type === "image") {
    return (
      <View style={[styles.row, indent]}>
        {handle}
        <Pressable
          testID={`block-image-${block.id}`}
          onPress={() => onImagePress(block.id)}
          style={[styles.imageWrap, { borderColor: c.border, backgroundColor: c.surfaceTertiary }]}
        >
          {content.image ? (
            <Image source={{ uri: content.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="image-plus" size={26} color={c.muted} />
              <Text style={[styles.imageHint, { color: c.muted }]}>Tap to add image</Text>
            </View>
          )}
        </Pressable>
      </View>
    );
  }

  const commonInput = (
    extraStyle: any,
    placeholderColor = c.muted,
  ) => (
    <TextInput
      testID={`block-input-${block.id}`}
      value={content.text ?? ""}
      onChangeText={(t) => onChangeText(block.id, t)}
      onFocus={() => onFocus(block.id)}
      placeholder={blockPlaceholder(block.type)}
      placeholderTextColor={placeholderColor}
      multiline
      scrollEnabled={false}
      style={[styles.input, { color: c.onSurface }, extraStyle]}
    />
  );

  switch (block.type) {
    case "h1":
      return (
        <View style={[styles.row, indent]}>
          {handle}
          {commonInput(styles.h1)}
        </View>
      );
    case "h2":
      return (
        <View style={[styles.row, indent]}>
          {handle}
          {commonInput(styles.h2)}
        </View>
      );
    case "h3":
      return (
        <View style={[styles.row, indent]}>
          {handle}
          {commonInput(styles.h3)}
        </View>
      );
    case "bullet":
      return (
        <View style={[styles.row, indent]}>
          {handle}
          <Text style={[styles.marker, { color: c.onSurface }]}>{"\u2022"}</Text>
          {commonInput(styles.body)}
        </View>
      );
    case "numbered":
      return (
        <View style={[styles.row, indent]}>
          {handle}
          <Text style={[styles.markerNum, { color: c.onSurface }]}>
            {numberedIndex(allBlocks, block)}.
          </Text>
          {commonInput(styles.body)}
        </View>
      );
    case "checklist":
      return (
        <View style={[styles.row, indent]}>
          {handle}
          <Pressable
            testID={`block-check-${block.id}`}
            hitSlop={8}
            onPress={() => onToggleCheck(block.id)}
            style={styles.checkbox}
          >
            <MaterialCommunityIcons
              name={content.checked ? "checkbox-marked" : "checkbox-blank-outline"}
              size={22}
              color={content.checked ? c.brand : c.muted}
            />
          </Pressable>
          {commonInput([
            styles.body,
            content.checked && { textDecorationLine: "line-through", color: c.muted },
          ])}
        </View>
      );
    case "quote":
      return (
        <View style={[styles.row, indent]}>
          {handle}
          <View style={[styles.quoteBar, { backgroundColor: c.brand }]} />
          {commonInput([styles.body, { fontStyle: "italic", color: c.onSurfaceTertiary }])}
        </View>
      );
    case "code":
      return (
        <View style={[styles.row, indent]}>
          {handle}
          <View style={[styles.codeWrap, { backgroundColor: c.surfaceTertiary, borderColor: c.border }]}>
            {commonInput([styles.code, { color: c.onSurface }])}
          </View>
        </View>
      );
    case "callout":
      return (
        <View style={[styles.row, indent]}>
          {handle}
          <View style={[styles.calloutWrap, { backgroundColor: c.brandTertiary }]}>
            <Text style={styles.calloutEmoji}>{content.emoji ?? "\uD83D\uDCA1"}</Text>
            {commonInput([styles.body, { color: c.onBrandTertiary, flex: 1 }], c.onBrandTertiary)}
          </View>
        </View>
      );
    case "toggle":
      return (
        <View style={[styles.row, indent]}>
          {handle}
          <Pressable
            testID={`block-toggle-${block.id}`}
            hitSlop={8}
            onPress={() => onToggleCollapse(block.id)}
            style={styles.checkbox}
          >
            <MaterialCommunityIcons
              name={content.collapsed ? "chevron-right" : "chevron-down"}
              size={22}
              color={c.onSurface}
            />
          </Pressable>
          {commonInput([styles.body, { fontWeight: "600" }])}
        </View>
      );
    default:
      return (
        <View style={[styles.row, indent]}>
          {handle}
          {commonInput(styles.body)}
        </View>
      );
  }
}

export const BlockRow = React.memo(BlockRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 2,
    minHeight: 36,
  },
  handle: {
    width: 24,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  body: { fontSize: 16, lineHeight: 24 },
  h1: { fontSize: 26, lineHeight: 34, fontWeight: "800" },
  h2: { fontSize: 22, lineHeight: 30, fontWeight: "700" },
  h3: { fontSize: 18, lineHeight: 26, fontWeight: "700" },
  marker: { fontSize: 18, lineHeight: 24, paddingTop: 6, width: 18 },
  markerNum: { fontSize: 15, lineHeight: 24, paddingTop: 6, minWidth: 20 },
  checkbox: { paddingTop: 6, width: 28, alignItems: "center" },
  quoteBar: { width: 3, borderRadius: 2, alignSelf: "stretch", marginRight: 8, marginVertical: 4 },
  codeWrap: { flex: 1, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 2 },
  code: { fontSize: 14, lineHeight: 21, fontFamily: "monospace" },
  calloutWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 10,
  },
  calloutEmoji: { fontSize: 18, paddingTop: 4 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, marginVertical: 12 },
  imageWrap: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    minHeight: 80,
  },
  image: { width: "100%", height: 200 },
  imagePlaceholder: { alignItems: "center", justifyContent: "center", paddingVertical: 28, gap: 6 },
  imageHint: { fontSize: 13, fontWeight: "500" },
});
