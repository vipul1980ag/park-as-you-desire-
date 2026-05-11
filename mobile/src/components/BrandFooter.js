// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function BrandFooter() {
  const { T } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.line, { backgroundColor: T.border }]} />
      <Text style={[styles.text, { color: T.textMuted }]}>
        This belongs to DNW (DNEXTWELT): Designed, coded and implemented by Vipul Agrawal
      </Text>
      <View style={[styles.line, { backgroundColor: T.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18, gap: 10,
  },
  line: { flex: 1, height: 1 },
  text: { fontSize: 10, textAlign: 'center', fontStyle: 'italic', flexShrink: 1 },
});
