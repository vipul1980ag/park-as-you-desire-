import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchPhoton } from '../services/api';

const COLORS = {
  primary: '#1a3c5e',
  accent: '#f0a500',
  background: '#f5f5f5',
  white: '#ffffff',
  textDark: '#333333',
  textSecondary: '#888888',
  border: '#d0d8e0',
};

/**
 * LocationInput — styled text input with optional GPS button and Photon autocomplete.
 *
 * Props:
 *   label            {string}  - Label above the input
 *   value            {string}  - Current text value
 *   onChangeText     {func}    - Called when text changes
 *   onLocationSelect {func}    - Called with {label, lat, lng} when a suggestion is picked
 *   placeholder      {string}  - Placeholder text
 *   icon             {string}  - Ionicons name for left icon
 *   showGps          {bool}    - Show GPS/locate button (default false)
 *   onGpsPress       {func}    - Called when GPS button pressed
 *   gpsLoading       {bool}    - Show spinner in GPS button
 *   editable         {bool}    - Whether input is editable (default true)
 */
export default function LocationInput({
  label,
  value,
  onChangeText,
  onLocationSelect,
  placeholder = 'Enter location',
  icon = 'location-outline',
  showGps = false,
  onGpsPress,
  gpsLoading = false,
  editable = true,
  style,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const debounceRef = useRef(null);

  const handleChangeText = useCallback((text) => {
    onChangeText && onChangeText(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoadingSugg(true);
      try {
        const results = await searchPhoton(text);
        setSuggestions(results);
      } catch (_) {
        setSuggestions([]);
      } finally {
        setLoadingSugg(false);
      }
    }, 400);
  }, [onChangeText]);

  const handleSuggestionPress = useCallback((s) => {
    onChangeText && onChangeText(s.label);
    onLocationSelect && onLocationSelect(s);
    setSuggestions([]);
  }, [onChangeText, onLocationSelect]);

  const handleClear = useCallback(() => {
    onChangeText && onChangeText('');
    setSuggestions([]);
  }, [onChangeText]);

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputRow, !editable && styles.disabledRow]}>
        <Ionicons name={icon} size={18} color={COLORS.primary} style={styles.leftIcon} />

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          editable={editable}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="words"
        />

        {loadingSugg && (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
        )}

        {showGps && (
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={onGpsPress}
            disabled={gpsLoading}
            activeOpacity={0.7}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="navigate" size={16} color={COLORS.white} />
            )}
          </TouchableOpacity>
        )}

        {!showGps && !loadingSugg && value && value.length > 0 && editable && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.suggestion, i < suggestions.length - 1 && styles.suggestionBorder]}
              onPress={() => handleSuggestionPress(s)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={13} color={COLORS.primary} style={styles.suggIcon} />
              <Text style={styles.suggText} numberOfLines={2}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 46,
  },
  disabledRow: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0',
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    paddingVertical: 6,
  },
  loader: {
    marginLeft: 4,
  },
  gpsBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 7,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
  },
  clearBtn: {
    paddingLeft: 4,
  },
  dropdown: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 2,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 999,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  suggText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 18,
  },
});
