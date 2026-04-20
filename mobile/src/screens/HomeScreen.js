import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const T = {
  bg: '#0d1b2a',
  surface: '#142033',
  surface2: '#1c2e44',
  border: '#243350',
  gold: '#f0a500',
  goldLight: 'rgba(240,165,0,0.15)',
  goldBorder: 'rgba(240,165,0,0.35)',
  teal: '#0ab5a0',
  tealLight: 'rgba(10,181,160,0.13)',
  tealBorder: 'rgba(10,181,160,0.3)',
  purple: '#a78bfa',
  purpleLight: 'rgba(167,139,250,0.12)',
  text: '#e2eaf4',
  textMuted: '#6e92b5',
  white: '#ffffff',
};

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.decorCircle3} />

          <View style={styles.logoWrap}>
            <View style={styles.logoRing}>
              <View style={styles.logoDisk}>
                <Text style={styles.logoP}>P</Text>
              </View>
            </View>
          </View>

          <Text style={styles.appName}>PARKING-IN</Text>
          <Text style={styles.tagline}>Find your perfect spot, every time</Text>

          <View style={styles.statsStrip}>
            {[
              { val: '500+', label: 'Spots' },
              { val: '24/7', label: 'Access' },
              { val: 'AI', label: 'Powered' },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{s.val}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ACTION CARDS */}
        <View style={styles.actions}>

          {/* Parking Planner — primary gold card */}
          <TouchableOpacity
            style={styles.cardPlanner}
            onPress={() => navigation.navigate('ParkingPlanner')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIconBox, { backgroundColor: T.goldLight, borderColor: T.goldBorder }]}>
              <Ionicons name="map" size={30} color={T.gold} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Parking Planner</Text>
              <Text style={styles.cardSub}>Plan route A → B with smart parking</Text>
            </View>
            <View style={styles.arrowRing}>
              <Ionicons name="arrow-forward" size={17} color={T.gold} />
            </View>
          </TouchableOpacity>

          {/* Track + ParkBot — two half cards */}
          <View style={styles.halfRow}>
            <TouchableOpacity
              style={[styles.halfCard, { borderColor: T.tealBorder }]}
              onPress={() => navigation.navigate('TrackLocation')}
              activeOpacity={0.85}
            >
              <View style={[styles.halfIconBox, { backgroundColor: T.tealLight }]}>
                <Ionicons name="navigate" size={26} color={T.teal} />
              </View>
              <Text style={styles.halfTitle}>Live{'\n'}GPS</Text>
              <Text style={styles.halfSub}>Spots near me now</Text>
              <View style={[styles.halfPill, { backgroundColor: T.tealLight }]}>
                <View style={[styles.halfDot, { backgroundColor: T.teal }]} />
                <Text style={[styles.halfPillText, { color: T.teal }]}>Live</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.halfCard, { borderColor: T.goldBorder }]}
              onPress={() => navigation.navigate('ParkBot')}
              activeOpacity={0.85}
            >
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
              <View style={[styles.halfIconBox, { backgroundColor: T.goldLight }]}>
                <Ionicons name="chatbubble-ellipses" size={26} color={T.gold} />
              </View>
              <Text style={styles.halfTitle}>Park{'\n'}Bot</Text>
              <Text style={styles.halfSub}>Ask in plain language</Text>
            </TouchableOpacity>
          </View>

          {/* Feature grid */}
          <View style={styles.featureGrid}>
            {[
              { icon: 'cash-outline', label: 'Best Rates', color: T.teal },
              { icon: 'location-outline', label: 'Nearest', color: T.gold },
              { icon: 'time-outline', label: '24/7 Open', color: T.purple },
              { icon: 'shield-checkmark-outline', label: 'Secure', color: '#f87171' },
            ].map((f) => (
              <View key={f.label} style={styles.featureItem}>
                <View style={[styles.featureIconWrap, {
                  backgroundColor: f.color + '1a',
                  borderColor: f.color + '40',
                }]}>
                  <Ionicons name={f.icon} size={20} color={f.color} />
                </View>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>

        </View>

        {/* Owner CTA */}
        <TouchableOpacity
          style={styles.ownerCta}
          onPress={() => navigation.navigate('OwnerHome')}
          activeOpacity={0.8}
        >
          <Ionicons name="business-outline" size={17} color={T.textMuted} />
          <Text style={styles.ownerCtaText}>
            Own a space?{' '}
            <Text style={{ color: T.gold, fontWeight: '700' }}>List it here →</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingBottom: 36 },

  // Hero section
  hero: {
    backgroundColor: T.surface,
    paddingTop: 44,
    paddingBottom: 32,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  decorCircle1: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(240,165,0,0.05)', top: -130, right: -90,
  },
  decorCircle2: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(10,181,160,0.06)', bottom: -70, left: -50,
  },
  decorCircle3: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(167,139,250,0.04)', top: 20, left: 30,
  },

  logoWrap: { marginBottom: 20 },
  logoRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: 'rgba(240,165,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: T.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 24, elevation: 10,
  },
  logoDisk: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: T.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  logoP: { fontSize: 42, fontWeight: '900', color: T.bg, letterSpacing: -2 },

  appName: {
    fontSize: 30, fontWeight: '900', color: T.text,
    letterSpacing: 9, marginBottom: 8,
  },
  tagline: { fontSize: 14, color: T.textMuted, letterSpacing: 0.4, marginBottom: 28 },

  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface2, borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 32,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  statDivider: { width: 1, height: 32, backgroundColor: T.border, marginHorizontal: 24 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', color: T.text },
  statLabel: { fontSize: 11, color: T.textMuted, marginTop: 2, letterSpacing: 0.6, textTransform: 'uppercase' },

  // Actions
  actions: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },

  cardPlanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: 22,
    padding: 20, gap: 16,
    borderWidth: 1.5, borderColor: 'rgba(240,165,0,0.28)',
    shadowColor: T.gold, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
  },
  cardIconBox: {
    width: 58, height: 58, borderRadius: 18,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: T.text, marginBottom: 4 },
  cardSub: { fontSize: 12, color: T.textMuted, lineHeight: 17 },
  arrowRing: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: 'rgba(240,165,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },

  halfRow: { flexDirection: 'row', gap: 14 },
  halfCard: {
    flex: 1, borderRadius: 22, padding: 18,
    backgroundColor: T.surface, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
    position: 'relative',
  },
  aiBadge: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: T.gold, borderRadius: 7,
    paddingHorizontal: 7, paddingVertical: 2, zIndex: 1,
  },
  aiBadgeText: { fontSize: 10, fontWeight: '900', color: T.bg, letterSpacing: 0.5 },
  halfIconBox: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  halfTitle: { fontSize: 20, fontWeight: '900', color: T.text, lineHeight: 24, marginBottom: 4 },
  halfSub: { fontSize: 11, color: T.textMuted, lineHeight: 16 },
  halfPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4, marginTop: 10,
  },
  halfDot: { width: 6, height: 6, borderRadius: 3 },
  halfPillText: { fontSize: 11, fontWeight: '700' },

  featureGrid: { flexDirection: 'row', gap: 10 },
  featureItem: { flex: 1, alignItems: 'center', gap: 8 },
  featureIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { fontSize: 11, fontWeight: '600', color: T.textMuted, textAlign: 'center' },

  ownerCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 16, marginTop: 6,
    paddingVertical: 16, backgroundColor: T.surface,
    borderRadius: 16, borderWidth: 1, borderColor: T.border,
  },
  ownerCtaText: { fontSize: 13, color: T.textMuted },
});
