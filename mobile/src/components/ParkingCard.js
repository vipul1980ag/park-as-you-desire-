// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

function formatRate(amount, per = 'hr') {
  if (amount == null) return 'Rate unknown';
  if (amount === 0) return 'Free';
  try {
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
    return `${formatted}/${per}`;
  } catch {
    return `£${amount.toFixed(2)}/${per}`;
  }
}

export default function ParkingCard({ parking, onPress }) {
  const { T } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);

  const isPrivate = parking.isPrivate;
  const distance = parking.distance != null ? `${parking.distance} km` : null;
  const spotsLeft = parking.availableSpots ?? 0;
  const spotsColor = spotsLeft === 0 ? T.error : spotsLeft <= 5 ? T.warning : T.success;
  const spotsLabel = spotsLeft === 0 ? 'Full' : spotsLeft <= 5 ? 'Almost Full' : 'Available';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(parking)}
      activeOpacity={0.82}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="car" size={18} color={T.gold} />
        </View>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>{parking.name}</Text>
          <Text style={styles.address} numberOfLines={1}>
            <Ionicons name="location-outline" size={11} color={T.textMuted} /> {parking.address}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isPrivate ? 'rgba(167,139,250,0.18)' : T.tealLight,
          borderColor: isPrivate ? 'rgba(167,139,250,0.35)' : 'rgba(10,181,160,0.35)' }]}>
          <Ionicons
            name={isPrivate ? 'lock-closed' : 'earth'}
            size={10}
            color={isPrivate ? '#a78bfa' : T.teal}
          />
          <Text style={[styles.badgeText, { color: isPrivate ? '#a78bfa' : T.teal }]}>
            {isPrivate ? 'Private' : 'Public'}
          </Text>
        </View>
      </View>

      {/* Type pill */}
      {parking.type ? (
        <Text style={styles.typeText}>{parking.type}</Text>
      ) : null}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={13} color={T.gold} />
          <Text style={styles.statValue}>
            {parking.costPerHour === 0 ? 'Free'
              : parking.costPerHour > 0 ? formatRate(parking.costPerHour)
              : (parking.feeInfo || 'Rate unknown')}
          </Text>
        </View>
        {parking.costPerDay > 0 && (
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={13} color={T.textMuted} />
            <Text style={styles.statValue}>{formatRate(parking.costPerDay, 'day')}</Text>
          </View>
        )}
        {distance && (
          <View style={styles.statItem}>
            <Ionicons name="navigate-outline" size={13} color={T.textMuted} />
            <Text style={styles.statValue}>{distance}</Text>
          </View>
        )}
        <View style={[styles.spotsPill, { borderColor: spotsColor + '50', backgroundColor: spotsColor + '18' }]}>
          <View style={[styles.spotsDot, { backgroundColor: spotsColor }]} />
          <Text style={[styles.spotsText, { color: spotsColor }]}>{spotsLabel}</Text>
        </View>
      </View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        <Text style={styles.hoursText}>
          <Ionicons name="time-outline" size={11} color={T.textMuted} />{' '}
          {parking.availableFrom || '00:00'} – {parking.availableTo || '23:59'}
        </Text>
        <TouchableOpacity style={styles.viewBtn} onPress={() => onPress && onPress(parking)} activeOpacity={0.8}>
          <Text style={styles.viewBtnText}>View Details</Text>
          <Ionicons name="arrow-forward" size={13} color={T.bg} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(T) { return StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 18, padding: 16,
    marginHorizontal: 16, marginVertical: 6,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 4,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: T.goldLight, borderWidth: 1,
    borderColor: T.goldBorder, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  nameBlock: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: T.text, marginBottom: 3 },
  address: { fontSize: 12, color: T.textMuted, lineHeight: 16 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, flexShrink: 0,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

  typeText: {
    fontSize: 11, color: T.textMuted, fontStyle: 'italic',
    marginBottom: 10, marginLeft: 52,
  },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface2, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 12, gap: 14, flexWrap: 'wrap',
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { fontSize: 12, fontWeight: '700', color: T.text },
  spotsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, marginLeft: 'auto',
  },
  spotsDot: { width: 6, height: 6, borderRadius: 3 },
  spotsText: { fontSize: 11, fontWeight: '700' },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hoursText: { fontSize: 11, color: T.textMuted },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.gold, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 12,
  },
  viewBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
});
}
