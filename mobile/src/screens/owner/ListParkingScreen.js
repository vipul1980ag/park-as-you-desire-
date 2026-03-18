import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addParking, updateParking } from '../../services/api';

const COLORS = {
  primary: '#1a3c5e',
  accent: '#f0a500',
  background: '#f5f5f5',
  white: '#ffffff',
  textDark: '#333333',
  textSecondary: '#666666',
  border: '#d0d8e0',
  error: '#c62828',
  errorBg: '#ffebee',
  success: '#2e7d32',
};

const PARKING_TYPES = [
  { id: 1, label: 'Dedicated Parking' },
  { id: 2, label: 'Street Designated Parking' },
  { id: 3, label: 'Private Parking in Open' },
  { id: 4, label: 'Private Parking - 3-4 Storey Apt (Unlocked)' },
  { id: 5, label: 'Private Parking - 3-4 Storey Building (Unlocked)' },
  { id: 6, label: 'Private Parking - Multi Storey Apt (Unlocked)' },
  { id: 7, label: 'Private Parking - 3-4 Storey Apt (Locked)' },
  { id: 8, label: 'Private Parking - 3-4 Storey Building (Locked)' },
  { id: 9, label: 'Private Parking - Multi Storey Apt (Locked)' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const OWNER_ID = 'demo-owner';

function FormField({ label, required, children, error }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function TimeSelector({ label, value, onChange }) {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const [h, m] = (value || '08:00').split(':');
  const currentH = h || '08';
  const currentM = m || '00';

  const adjustHour = (dir) => {
    let newH = (parseInt(currentH) + dir + 24) % 24;
    onChange(`${newH.toString().padStart(2, '0')}:${currentM}`);
  };

  const adjustMinute = (dir) => {
    const idx = minutes.indexOf(currentM);
    const newIdx = (idx + dir + minutes.length) % minutes.length;
    onChange(`${currentH}:${minutes[newIdx]}`);
  };

  return (
    <View style={styles.timeSelector}>
      <Text style={styles.timeSelectorLabel}>{label}</Text>
      <View style={styles.timeSelectorRow}>
        <TouchableOpacity onPress={() => adjustHour(-1)} style={styles.timeArrow}>
          <Ionicons name="chevron-back" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.timeDisplay}>
          <Text style={styles.timeDisplayText}>{currentH}:{currentM}</Text>
        </View>
        <TouchableOpacity onPress={() => adjustHour(1)} style={styles.timeArrow}>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ListParkingScreen({ navigation, route }) {
  const existingParking = route?.params?.existingParking || null;
  const isEdit = !!existingParking;

  const [form, setForm] = useState({
    name: '',
    address: '',
    typeId: 1,
    type: PARKING_TYPES[0].label,
    costPerHour: '',
    costPerDay: '',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    availableFrom: '08:00',
    availableTo: '20:00',
    totalSpots: '',
    description: '',
    isPrivate: true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    if (existingParking) {
      setForm({
        name: existingParking.name || '',
        address: existingParking.address || '',
        typeId: existingParking.typeId || 1,
        type: existingParking.type || PARKING_TYPES[0].label,
        costPerHour: existingParking.costPerHour?.toString() || '',
        costPerDay: existingParking.costPerDay?.toString() || '',
        availableDays: existingParking.availableDays || DAYS,
        availableFrom: existingParking.availableFrom || '08:00',
        availableTo: existingParking.availableTo || '20:00',
        totalSpots: existingParking.totalSpots?.toString() || '',
        description: existingParking.description || '',
        isPrivate: existingParking.isPrivate !== undefined ? existingParking.isPrivate : true,
      });
    }
  }, [existingParking]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const selectType = (type) => {
    setForm((prev) => ({ ...prev, typeId: type.id, type: type.label }));
    setShowTypeDropdown(false);
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Parking name is required';
    if (!form.address.trim()) newErrors.address = 'Address is required';
    if (!form.costPerHour || isNaN(parseFloat(form.costPerHour)) || parseFloat(form.costPerHour) < 0) {
      newErrors.costPerHour = 'Enter a valid hourly cost (e.g. 2.50)';
    }
    if (!form.costPerDay || isNaN(parseFloat(form.costPerDay)) || parseFloat(form.costPerDay) < 0) {
      newErrors.costPerDay = 'Enter a valid daily cost (e.g. 15.00)';
    }
    if (!form.totalSpots || isNaN(parseInt(form.totalSpots)) || parseInt(form.totalSpots) < 1) {
      newErrors.totalSpots = 'Enter a valid number of spots (at least 1)';
    }
    if (form.availableDays.length === 0) {
      newErrors.availableDays = 'Select at least one available day';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the highlighted errors before submitting.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        type: form.type,
        typeId: form.typeId,
        costPerHour: parseFloat(form.costPerHour),
        costPerDay: parseFloat(form.costPerDay),
        totalSpots: parseInt(form.totalSpots),
        availableSpots: parseInt(form.totalSpots),
        availableDays: form.availableDays,
        availableFrom: form.availableFrom,
        availableTo: form.availableTo,
        isPrivate: form.isPrivate,
        description: form.description.trim(),
      };

      let result;
      if (isEdit) {
        result = await updateParking(existingParking.id, payload, OWNER_ID);
      } else {
        result = await addParking(payload, OWNER_ID);
      }

      if (result) {
        Alert.alert(
          'Success!',
          isEdit
            ? 'Your parking listing has been updated.'
            : 'Your parking spot has been listed successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', 'Failed to save the listing. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Parking Spot' : 'List Your Parking Spot'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <FormField label="Parking Name" required error={errors.name}>
            <TextInput
              style={[styles.textInput, errors.name && styles.textInputError]}
              value={form.name}
              onChangeText={(v) => updateField('name', v)}
              placeholder="e.g. Central Garage, Maple Court Parking"
              placeholderTextColor="#aaa"
              maxLength={80}
            />
          </FormField>

          <FormField label="Address" required error={errors.address}>
            <TextInput
              style={[styles.textInput, errors.address && styles.textInputError]}
              value={form.address}
              onChangeText={(v) => updateField('address', v)}
              placeholder="Full street address"
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </FormField>

          {/* Type Dropdown */}
          <FormField label="Type of Parking" required>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownText}>{form.type}</Text>
              <Ionicons
                name={showTypeDropdown ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.primary}
              />
            </TouchableOpacity>
            {showTypeDropdown && (
              <View style={styles.dropdownList}>
                {PARKING_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.dropdownItem,
                      form.typeId === type.id && styles.dropdownItemSelected,
                    ]}
                    onPress={() => selectType(type)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        form.typeId === type.id && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                    {form.typeId === type.id && (
                      <Ionicons name="checkmark" size={16} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </FormField>

          {/* Private toggle */}
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Private Parking</Text>
              <Text style={styles.switchSub}>
                {form.isPrivate ? 'Restricted to authorized users' : 'Open to the public'}
              </Text>
            </View>
            <Switch
              value={form.isPrivate}
              onValueChange={(v) => updateField('isPrivate', v)}
              trackColor={{ false: '#ccc', true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <FormField label="Cost Per Hour ($)" required error={errors.costPerHour}>
                <TextInput
                  style={[styles.textInput, errors.costPerHour && styles.textInputError]}
                  value={form.costPerHour}
                  onChangeText={(v) => updateField('costPerHour', v)}
                  placeholder="2.50"
                  placeholderTextColor="#aaa"
                  keyboardType="decimal-pad"
                />
              </FormField>
            </View>
            <View style={styles.halfField}>
              <FormField label="Cost Per Day ($)" required error={errors.costPerDay}>
                <TextInput
                  style={[styles.textInput, errors.costPerDay && styles.textInputError]}
                  value={form.costPerDay}
                  onChangeText={(v) => updateField('costPerDay', v)}
                  placeholder="15.00"
                  placeholderTextColor="#aaa"
                  keyboardType="decimal-pad"
                />
              </FormField>
            </View>
          </View>
        </View>

        {/* Availability Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>

          {/* Days */}
          <FormField label="Available Days" required error={errors.availableDays}>
            <View style={styles.daysGrid}>
              {DAYS.map((day) => {
                const selected = form.availableDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayBtn, selected && styles.dayBtnSelected]}
                    onPress={() => toggleDay(day)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[styles.dayBtnText, selected && styles.dayBtnTextSelected]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FormField>

          {/* Time Range */}
          <Text style={styles.fieldLabel}>Available Hours</Text>
          <View style={styles.timeRow}>
            <TimeSelector
              label="From"
              value={form.availableFrom}
              onChange={(v) => updateField('availableFrom', v)}
            />
            <View style={styles.timeSeparator}>
              <Ionicons name="arrow-forward" size={18} color={COLORS.textSecondary} />
            </View>
            <TimeSelector
              label="To"
              value={form.availableTo}
              onChange={(v) => updateField('availableTo', v)}
            />
          </View>
        </View>

        {/* Capacity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Capacity</Text>
          <FormField label="Total Parking Spots" required error={errors.totalSpots}>
            <TextInput
              style={[styles.textInput, errors.totalSpots && styles.textInputError]}
              value={form.totalSpots}
              onChangeText={(v) => updateField('totalSpots', v)}
              placeholder="e.g. 10"
              placeholderTextColor="#aaa"
              keyboardType="number-pad"
            />
          </FormField>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={form.description}
            onChangeText={(v) => updateField('description', v)}
            placeholder="Describe your parking spot — security features, access instructions, special notes..."
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{form.description.length}/500</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <Ionicons
                name={isEdit ? 'save' : 'checkmark-circle'}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.submitBtnText}>
                {isEdit ? 'Save Changes' : 'List My Parking Spot'}
              </Text>
            </>
          )}
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
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  scroll: { flex: 1 },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  formField: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  required: { color: COLORS.error },
  fieldError: {
    fontSize: 11,
    color: COLORS.error,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textDark,
    minHeight: 46,
  },
  textInputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBg,
  },
  textArea: {
    minHeight: 90,
    paddingTop: 10,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: { flex: 1 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 46,
  },
  dropdownText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  dropdownList: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  dropdownItemSelected: {
    backgroundColor: '#e8f0fe',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
  },
  dropdownItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  switchSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  dayBtnSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dayBtnTextSelected: {
    color: COLORS.white,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  timeSeparator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
  },
  timeSelector: {
    flex: 1,
  },
  timeSelectorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  timeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  timeArrow: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#eef2f5',
  },
  timeDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  timeDisplayText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#e8edf2',
  },
  submitBtn: {
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
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
});
