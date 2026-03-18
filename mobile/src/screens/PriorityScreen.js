import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#1a3c5e',
  accent: '#f0a500',
  background: '#f5f5f5',
  white: '#ffffff',
  textDark: '#333333',
  textSecondary: '#666666',
  border: '#d0d8e0',
};

const PRIORITY_ITEMS = [
  {
    id: 'cost',
    label: 'Costs Per Hour / Per Day',
    sub: 'Find the most affordable parking options sorted by cost',
    icon: 'cash-outline',
    iconColor: '#2e7d32',
    iconBg: '#e8f5e9',
    sortBy: 'cost',
  },
  {
    id: 'type',
    label: 'Parking Priority (Type)',
    sub: 'Filter by parking category — dedicated, street, private, etc.',
    icon: 'car-outline',
    iconColor: '#1565c0',
    iconBg: '#e3f2fd',
    sortBy: 'type',
  },
  {
    id: 'distance',
    label: 'Near to Destination',
    sub: 'Show parking closest to where you need to be',
    icon: 'locate-outline',
    iconColor: '#6a1b9a',
    iconBg: '#f3e5f5',
    sortBy: 'distance',
  },
  {
    id: 'citations',
    label: 'Pay Parking Citations',
    sub: 'Find official pay stations and avoid ticketing zones',
    icon: 'document-text-outline',
    iconColor: '#bf360c',
    iconBg: '#fbe9e7',
    sortBy: 'type',
  },
];

export default function PriorityScreen({ navigation, route }) {
  const returnTo = route?.params?.returnTo || 'SearchResults';
  const existingParams = route?.params?.searchParams || {};

  const handleSelect = (item) => {
    navigation.navigate(returnTo, {
      ...existingParams,
      priority: item.id,
      sortBy: item.sortBy,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Priority Options</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Choose how you want parking results to be sorted and filtered.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What matters most to you?</Text>

        {PRIORITY_ITEMS.map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            style={styles.priorityItem}
            onPress={() => handleSelect(item)}
            activeOpacity={0.8}
          >
            {/* Icon */}
            <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={24} color={item.iconColor} />
            </View>

            {/* Text */}
            <View style={styles.textWrap}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemSub}>{item.sub}</Text>
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
          </TouchableOpacity>
        ))}

        {/* Info section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>How priorities work</Text>
          <View style={styles.infoRow}>
            <Ionicons name="cash" size={14} color={COLORS.accent} />
            <Text style={styles.infoRowText}>
              <Text style={{ fontWeight: '700' }}>Cost:</Text> Lowest hourly rate shown first
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="car" size={14} color={COLORS.accent} />
            <Text style={styles.infoRowText}>
              <Text style={{ fontWeight: '700' }}>Type:</Text> Grouped by parking category
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="locate" size={14} color={COLORS.accent} />
            <Text style={styles.infoRowText}>
              <Text style={{ fontWeight: '700' }}>Proximity:</Text> Closest to your destination first
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="document-text" size={14} color={COLORS.accent} />
            <Text style={styles.infoRowText}>
              <Text style={{ fontWeight: '700' }}>Citations:</Text> Official designated parking areas
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f0fe',
    margin: 16,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  itemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 3,
  },
  itemSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  infoRowText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
