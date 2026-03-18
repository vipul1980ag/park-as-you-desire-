import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LocationInput from '../components/LocationInput';

const COLORS = {
  primary: '#1a3c5e',
  accent: '#f0a500',
  background: '#f5f5f5',
  white: '#ffffff',
  textDark: '#333333',
  textSecondary: '#666666',
  selected: '#e8f0fe',
  border: '#d0d8e0',
};

const PRIORITY_OPTIONS = [
  {
    id: 'distance',
    label: 'Destination Proximity',
    sub: 'Sort by how close the parking is to your destination',
    icon: 'locate',
    sortBy: 'distance',
  },
  {
    id: 'type',
    label: 'Type of Parking',
    sub: 'Sort by parking type (Dedicated, Street, Private, etc.)',
    icon: 'layers',
    sortBy: 'type',
  },
  {
    id: 'cost',
    label: 'Cost Per Hour / Per Day',
    sub: 'Sort by cheapest hourly or daily rate first',
    icon: 'cash',
    sortBy: 'cost',
  },
];

// Simple month names for the date display
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTime(date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function ParkingPlannerScreen({ navigation }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departDate, setDepartDate] = useState(new Date());
  const [priority, setPriority] = useState('distance');
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);

  const handleSearch = () => {
    if (!from.trim()) {
      Alert.alert('Missing Info', 'Please enter your starting location.');
      return;
    }
    if (!to.trim()) {
      Alert.alert('Missing Info', 'Please enter your destination.');
      return;
    }

    const selectedPriority = PRIORITY_OPTIONS.find((p) => p.id === priority);
    const centerCoords = toCoords || fromCoords;

    navigation.navigate('SearchResults', {
      from: from.trim(),
      to: to.trim(),
      lat: centerCoords?.lat,
      lng: centerCoords?.lng,
      departDate: departDate.toISOString(),
      priority: priority,
      sortBy: selectedPriority?.sortBy || 'distance',
    });
  };

  const adjustDate = (direction) => {
    const d = new Date(departDate);
    d.setDate(d.getDate() + direction);
    setDepartDate(d);
  };

  const adjustHour = (direction) => {
    const d = new Date(departDate);
    d.setHours(d.getHours() + direction);
    setDepartDate(d);
  };

  const adjustMinute = (direction) => {
    const d = new Date(departDate);
    d.setMinutes(d.getMinutes() + (direction * 15));
    setDepartDate(d);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parking Planner</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* WHERE Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>WHERE</Text>
            </View>
          </View>

          <LocationInput
            label="From"
            value={from}
            onChangeText={setFrom}
            onLocationSelect={(loc) => setFromCoords({ lat: loc.lat, lng: loc.lng })}
            placeholder="Enter starting point"
            icon="radio-button-on-outline"
            showGps={false}
          />
          <LocationInput
            label="To"
            value={to}
            onChangeText={setTo}
            onLocationSelect={(loc) => setToCoords({ lat: loc.lat, lng: loc.lng })}
            placeholder="Enter your destination"
            icon="location"
          />
        </View>

        {/* WHEN Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>WHEN</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Departing</Text>

            {/* Date Row */}
            <View style={styles.dateRow}>
              <TouchableOpacity onPress={() => adjustDate(-1)} style={styles.arrowBtn}>
                <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={styles.dateDisplay}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                <Text style={styles.dateText}>{formatDate(departDate)}</Text>
              </View>
              <TouchableOpacity onPress={() => adjustDate(1)} style={styles.arrowBtn}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Time Row */}
            <View style={styles.dateRow}>
              <TouchableOpacity onPress={() => adjustHour(-1)} style={styles.arrowBtn}>
                <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={styles.dateDisplay}>
                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                <Text style={styles.dateText}>{formatTime(departDate)}</Text>
              </View>
              <TouchableOpacity onPress={() => adjustHour(1)} style={styles.arrowBtn}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Minute adjust */}
            <View style={styles.minuteRow}>
              <TouchableOpacity onPress={() => adjustMinute(-1)} style={styles.minuteBtn}>
                <Ionicons name="remove" size={14} color={COLORS.primary} />
                <Text style={styles.minuteBtnText}>-15 min</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => adjustMinute(1)} style={styles.minuteBtn}>
                <Text style={styles.minuteBtnText}>+15 min</Text>
                <Ionicons name="add" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* HOW / Priority Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>HOW</Text>
            </View>
            <Text style={styles.sectionSubLabel}>Select your priority</Text>
          </View>

          {PRIORITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.priorityRow,
                priority === opt.id && styles.priorityRowSelected,
              ]}
              onPress={() => setPriority(opt.id)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.priorityIconWrap,
                  priority === opt.id && styles.priorityIconWrapSelected,
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={22}
                  color={priority === opt.id ? COLORS.white : COLORS.primary}
                />
              </View>
              <View style={styles.priorityTextWrap}>
                <Text
                  style={[
                    styles.priorityLabel,
                    priority === opt.id && styles.priorityLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.prioritySub}>{opt.sub}</Text>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  priority === opt.id && styles.radioOuterSelected,
                ]}
              >
                {priority === opt.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Search Button (floating) */}
      <View style={styles.searchBtnContainer}>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Ionicons name="search" size={20} color={COLORS.primary} />
          <Text style={styles.searchBtnText}>Find Parking</Text>
        </TouchableOpacity>
      </View>
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
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  sectionBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sectionBadgeText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  sectionSubLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arrowBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    marginHorizontal: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  minuteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  minuteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  minuteBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  priorityRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.selected,
  },
  priorityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityIconWrapSelected: {
    backgroundColor: COLORS.primary,
  },
  priorityTextWrap: { flex: 1 },
  priorityLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  priorityLabelSelected: {
    color: COLORS.primary,
  },
  prioritySub: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: COLORS.primary,
  },
  searchBtnContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#e8edf2',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 15,
    gap: 10,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
});
