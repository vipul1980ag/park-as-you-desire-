// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LocationInput from '../components/LocationInput';
import BrandFooter from '../components/BrandFooter';

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
  text: '#e2eaf4',
  textMuted: '#6e92b5',
  white: '#ffffff',
};

const PRIORITY_OPTIONS = [
  {
    id: 'distance',
    label: 'Closest to Destination',
    sub: 'Minimise your walk from parking to destination',
    icon: 'locate',
    sortBy: 'distance',
    color: T.teal,
  },
  {
    id: 'type',
    label: 'Parking Type',
    sub: 'Dedicated, street, private, multi-storey…',
    icon: 'layers',
    sortBy: 'type',
    color: '#a78bfa',
  },
  {
    id: 'cost',
    label: 'Lowest Cost',
    sub: 'Cheapest hourly or daily rate first',
    icon: 'cash',
    sortBy: 'cost',
    color: T.gold,
  },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDate(d) { return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function formatTime(d) {
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

export default function ParkingPlannerScreen({ navigation }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departDate, setDepartDate] = useState(new Date());
  const [priority, setPriority] = useState('distance');
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);

  const handleSearch = () => {
    if (!from.trim()) { Alert.alert('Missing Info', 'Please enter your starting location.'); return; }
    if (!to.trim()) { Alert.alert('Missing Info', 'Please enter your destination.'); return; }
    const sel = PRIORITY_OPTIONS.find(p => p.id === priority);
    const center = toCoords || fromCoords;
    navigation.navigate('SearchResults', {
      from: from.trim(), to: to.trim(),
      lat: center?.lat, lng: center?.lng,
      departDate: departDate.toISOString(),
      priority, sortBy: sel?.sortBy || 'distance',
    });
  };

  const adjustDate = (d) => { const nd = new Date(departDate); nd.setDate(nd.getDate() + d); setDepartDate(nd); };
  const adjustHour = (d) => { const nd = new Date(departDate); nd.setHours(nd.getHours() + d); setDepartDate(nd); };
  const adjustMin = (d) => { const nd = new Date(departDate); nd.setMinutes(nd.getMinutes() + d * 15); setDepartDate(nd); };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="map" size={18} color={T.gold} />
          <Text style={styles.headerTitle}>Parking Planner</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* WHERE Section */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTag}>
            <Ionicons name="location" size={13} color={T.bg} />
            <Text style={styles.sectionTagText}>WHERE</Text>
          </View>
          <View style={styles.card}>
            <LocationInput
              label="From"
              value={from}
              onChangeText={setFrom}
              onLocationSelect={(loc) => setFromCoords({ lat: loc.lat, lng: loc.lng })}
              placeholder="Enter starting point"
              icon="radio-button-on-outline"
              showGps={false}
            />
            <View style={styles.routeConnector}>
              <View style={styles.routeDot} />
              <View style={styles.routeLine} />
              <View style={[styles.routeDot, { backgroundColor: T.gold }]} />
            </View>
            <LocationInput
              label="To"
              value={to}
              onChangeText={setTo}
              onLocationSelect={(loc) => setToCoords({ lat: loc.lat, lng: loc.lng })}
              placeholder="Enter your destination"
              icon="location"
            />
          </View>
        </View>

        {/* WHEN Section */}
        <View style={styles.sectionWrap}>
          <View style={[styles.sectionTag, { backgroundColor: T.teal }]}>
            <Ionicons name="time" size={13} color={T.bg} />
            <Text style={styles.sectionTagText}>WHEN</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Departing</Text>

            {/* Date row */}
            <View style={styles.timeRow}>
              <TouchableOpacity onPress={() => adjustDate(-1)} style={styles.arrowBtn}>
                <Ionicons name="chevron-back" size={18} color={T.text} />
              </TouchableOpacity>
              <View style={styles.timeDisplay}>
                <Ionicons name="calendar-outline" size={15} color={T.gold} />
                <Text style={styles.timeText}>{formatDate(departDate)}</Text>
              </View>
              <TouchableOpacity onPress={() => adjustDate(1)} style={styles.arrowBtn}>
                <Ionicons name="chevron-forward" size={18} color={T.text} />
              </TouchableOpacity>
            </View>

            {/* Time row */}
            <View style={styles.timeRow}>
              <TouchableOpacity onPress={() => adjustHour(-1)} style={styles.arrowBtn}>
                <Ionicons name="chevron-back" size={18} color={T.text} />
              </TouchableOpacity>
              <View style={styles.timeDisplay}>
                <Ionicons name="time-outline" size={15} color={T.teal} />
                <Text style={styles.timeText}>{formatTime(departDate)}</Text>
              </View>
              <TouchableOpacity onPress={() => adjustHour(1)} style={styles.arrowBtn}>
                <Ionicons name="chevron-forward" size={18} color={T.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.minuteRow}>
              <TouchableOpacity onPress={() => adjustMin(-1)} style={styles.minuteBtn}>
                <Ionicons name="remove" size={14} color={T.textMuted} />
                <Text style={styles.minuteBtnText}>−15 min</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => adjustMin(1)} style={styles.minuteBtn}>
                <Text style={styles.minuteBtnText}>+15 min</Text>
                <Ionicons name="add" size={14} color={T.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* HOW / Priority Section */}
        <View style={styles.sectionWrap}>
          <View style={[styles.sectionTag, { backgroundColor: '#a78bfa' }]}>
            <Ionicons name="options" size={13} color={T.bg} />
            <Text style={styles.sectionTagText}>PRIORITY</Text>
          </View>
          <View style={styles.card}>
            {PRIORITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.priorityRow, priority === opt.id && { borderColor: opt.color + '70', backgroundColor: opt.color + '12' }]}
                onPress={() => setPriority(opt.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.priorityIcon, {
                  backgroundColor: priority === opt.id ? opt.color : opt.color + '20',
                }]}>
                  <Ionicons name={opt.icon} size={20} color={priority === opt.id ? T.bg : opt.color} />
                </View>
                <View style={styles.priorityText}>
                  <Text style={[styles.priorityLabel, priority === opt.id && { color: T.text }]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.prioritySub}>{opt.sub}</Text>
                </View>
                <View style={[styles.radioOuter, priority === opt.id && { borderColor: opt.color }]}>
                  {priority === opt.id && <View style={[styles.radioInner, { backgroundColor: opt.color }]} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <BrandFooter />
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Search Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Ionicons name="search" size={20} color={T.bg} />
          <Text style={styles.searchBtnText}>Find Parking</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: T.surface,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: T.text, letterSpacing: 0.3 },

  scroll: { flex: 1 },

  sectionWrap: { marginHorizontal: 16, marginTop: 18 },
  sectionTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', backgroundColor: T.gold,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 10,
  },
  sectionTagText: { color: T.bg, fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },

  card: {
    backgroundColor: T.surface, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  cardLabel: {
    fontSize: 12, fontWeight: '700', color: T.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14,
  },

  routeConnector: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, marginVertical: -4, gap: 0,
  },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.teal },
  routeLine: { flex: 1, height: 1.5, backgroundColor: T.border, marginHorizontal: 4 },

  timeRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  arrowBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: T.surface2, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  timeDisplay: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.surface2, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    marginHorizontal: 8, justifyContent: 'center',
    borderWidth: 1, borderColor: T.border,
  },
  timeText: { fontSize: 16, fontWeight: '700', color: T.text },
  minuteRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  minuteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: T.surface2, borderRadius: 10, borderWidth: 1, borderColor: T.border,
  },
  minuteBtnText: { fontSize: 12, color: T.textMuted, fontWeight: '600' },

  priorityRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: T.border,
    backgroundColor: T.surface2, gap: 14,
  },
  priorityIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  priorityText: { flex: 1 },
  priorityLabel: { fontSize: 14, fontWeight: '700', color: T.textMuted, marginBottom: 2 },
  prioritySub: { fontSize: 11, color: T.textMuted, lineHeight: 15 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 11, height: 11, borderRadius: 5.5 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: T.surface,
    borderTopWidth: 1, borderTopColor: T.border,
  },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.gold, borderRadius: 16, paddingVertical: 16, gap: 10,
    shadowColor: T.gold, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  searchBtnText: { fontSize: 17, fontWeight: '900', color: T.bg, letterSpacing: 0.5 },
});
