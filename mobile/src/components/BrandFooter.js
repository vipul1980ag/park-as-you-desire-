// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BrandFooter() {
  return (
    <View style={styles.wrap}>
      <View style={styles.line} />
      <Text style={styles.text}>
        This belongs to DNW — Designed, coded and Implemented by Vipul Agrawal
      </Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#243350',
  },
  text: {
    fontSize: 10,
    color: '#3a5070',
    textAlign: 'center',
    fontStyle: 'italic',
    flexShrink: 1,
  },
});
