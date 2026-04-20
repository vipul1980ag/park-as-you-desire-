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

const T = {
  surface: '#142033',
  surface2: '#1c2e44',
  border: '#243350',
  gold: '#f0a500',
  teal: '#0ab5a0',
  text: '#e2eaf4',
  textMuted: '#6e92b5',
  bg: '#0d1b2a',
};

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
    if (!text || text.trim().length < 2) { setSuggestions([]); return; }
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
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={16} color={T.teal} />
        </View>

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.textMuted}
          editable={editable}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="words"
        />

        {loadingSugg && (
          <ActivityIndicator size="small" color={T.gold} style={styles.loader} />
        )}

        {showGps && (
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={onGpsPress}
            disabled={gpsLoading}
            activeOpacity={0.7}
          >
            {gpsLoading
              ? <ActivityIndicator size="small" color={T.bg} />
              : <Ionicons name="navigate" size={15} color={T.bg} />
            }
          </TouchableOpacity>
        )}

        {!showGps && !loadingSugg && value && value.length > 0 && editable && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={17} color={T.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.suggestion, i < suggestions.length - 1 && styles.suggBorder]}
              onPress={() => handleSuggestionPress(s)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={13} color={T.teal} style={{ marginRight: 8 }} />
              <Text style={styles.suggText} numberOfLines={2}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: {
    fontSize: 12, fontWeight: '700', color: T.textMuted,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface2, borderWidth: 1.5, borderColor: T.border,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, minHeight: 48,
  },
  disabledRow: { opacity: 0.5 },
  iconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(10,181,160,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  input: { flex: 1, fontSize: 14, color: T.text, paddingVertical: 6 },
  loader: { marginLeft: 4 },
  gpsBtn: {
    backgroundColor: T.gold, borderRadius: 9,
    padding: 8, marginLeft: 6,
    alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34,
  },
  clearBtn: { paddingLeft: 4 },
  dropdown: {
    backgroundColor: T.surface2,
    borderWidth: 1, borderColor: T.border,
    borderRadius: 12, marginTop: 4, overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
    zIndex: 999,
  },
  suggestion: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  suggBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  suggText: { flex: 1, fontSize: 13, color: T.text, lineHeight: 18 },
});
