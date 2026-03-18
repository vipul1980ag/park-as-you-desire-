import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#1a3c5e',
  accent: '#f0a500',
  background: '#f5f5f5',
  white: '#ffffff',
  textDark: '#333333',
  textSecondary: '#666666',
  privateBadge: '#1a3c5e',
  publicBadge: '#2e7d32',
  shadow: '#000000',
};

export default function ParkingCard({ parking, onPress, onNavigate }) {
  const isPrivate = parking.isPrivate;
  const distance =
    parking.distance !== null && parking.distance !== undefined
      ? `${parking.distance} km`
      : 'N/A';

  const spotsLeft = parking.availableSpots;
  const spotsColor = spotsLeft === 0 ? '#c62828' : spotsLeft <= 5 ? '#e65100' : '#2e7d32';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(parking)}
      activeOpacity={0.85}
    >
      {/* Top Row: Name + Type Badge */}
      <View style={styles.topRow}>
        <View style={styles.nameContainer}>
          <Ionicons name="car" size={18} color={COLORS.primary} style={styles.carIcon} />
          <Text style={styles.name} numberOfLines={1}>
            {parking.name}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isPrivate ? COLORS.privateBadge : COLORS.publicBadge }]}>
          <Text style={styles.badgeText}>{isPrivate ? 'Private' : 'Public'}</Text>
        </View>
      </View>

      {/* Address */}
      <Text style={styles.address} numberOfLines={1}>
        <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} /> {parking.address}
      </Text>

      {/* Type */}
      <Text style={styles.typeText}>{parking.type}</Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="cash-outline" size={14} color={COLORS.accent} />
          <Text style={styles.statValue}>${parking.costPerHour}/hr</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.accent} />
          <Text style={styles.statValue}>${parking.costPerDay}/day</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="navigate-outline" size={14} color={COLORS.primary} />
          <Text style={styles.statValue}>{distance}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="layers-outline" size={14} color={spotsColor} />
          <Text style={[styles.statValue, { color: spotsColor }]}>
            {spotsLeft} spots
          </Text>
        </View>
      </View>

      {/* Bottom Row: Time + Navigate */}
      <View style={styles.bottomRow}>
        <Text style={styles.hoursText}>
          <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />{' '}
          {parking.availableFrom} – {parking.availableTo}
        </Text>
        <TouchableOpacity
          style={styles.navigateBtn}
          onPress={() => onNavigate && onNavigate(parking)}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward-circle" size={20} color={COLORS.white} />
          <Text style={styles.navigateBtnText}>Navigate</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  carIcon: {
    marginRight: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  address: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  typeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
    marginLeft: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hoursText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  navigateBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
