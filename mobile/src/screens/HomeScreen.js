import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#1a3c5e',
  accent: '#f0a500',
  background: '#f5f5f5',
  white: '#ffffff',
  textDark: '#333333',
  textSecondary: '#666666',
};

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="car" size={40} color={COLORS.accent} />
          <Text style={styles.logoText}>PARKING-IN</Text>
        </View>
        <Text style={styles.tagline}>Find your perfect parking spot</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Welcome card */}
        <View style={styles.welcomeCard}>
          <Ionicons name="shield-checkmark" size={30} color={COLORS.primary} />
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>Welcome, Driver!</Text>
            <Text style={styles.welcomeSub}>
              Discover nearby parking that fits your schedule and budget.
            </Text>
          </View>
        </View>

        {/* Main action buttons */}
        <Text style={styles.sectionLabel}>How would you like to find parking?</Text>

        <TouchableOpacity
          style={[styles.mainBtn, styles.plannerBtn]}
          onPress={() => navigation.navigate('ParkingPlanner')}
          activeOpacity={0.85}
        >
          <View style={styles.btnIconWrapper}>
            <Ionicons name="map" size={28} color={COLORS.white} />
          </View>
          <View style={styles.btnTextWrapper}>
            <Text style={styles.mainBtnTitle}>Parking Planner</Text>
            <Text style={styles.mainBtnSub}>Plan your trip from A to B</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainBtn, styles.trackBtn]}
          onPress={() => navigation.navigate('TrackLocation')}
          activeOpacity={0.85}
        >
          <View style={styles.btnIconWrapper}>
            <Ionicons name="navigate" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.btnTextWrapper}>
            <Text style={[styles.mainBtnTitle, { color: COLORS.primary }]}>
              Track My Location
            </Text>
            <Text style={[styles.mainBtnSub, { color: COLORS.textSecondary }]}>
              Use GPS to suggest nearest spots
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Feature pills */}
        <View style={styles.featureRow}>
          {[
            { icon: 'cash-outline', label: 'Best Price' },
            { icon: 'location-outline', label: 'Nearest' },
            { icon: 'time-outline', label: '24/7 Open' },
          ].map((f) => (
            <View key={f.label} style={styles.featurePill}>
              <Ionicons name={f.icon} size={16} color={COLORS.primary} />
              <Text style={styles.featurePillText}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => navigation.navigate('OwnerHome')}
          style={styles.ownerLink}
          activeOpacity={0.7}
        >
          <Ionicons name="business-outline" size={16} color={COLORS.primary} />
          <Text style={styles.ownerLinkText}>Are you a Parking Owner? List your space</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.accent} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 30,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 14,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  welcomeSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    gap: 14,
  },
  plannerBtn: {
    backgroundColor: COLORS.primary,
  },
  trackBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: '#d0dce8',
  },
  btnIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextWrapper: {
    flex: 1,
  },
  mainBtnTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  mainBtnSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    gap: 5,
  },
  featurePillText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8edf2',
    backgroundColor: COLORS.white,
  },
  ownerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ownerLinkText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});
