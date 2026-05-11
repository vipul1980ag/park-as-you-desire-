// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { registerUser } from '../../services/api';

export default function RegisterScreen({ navigation }) {
  const { T } = useTheme();
  const C = T;
  const styles = useMemo(() => createStyles(T), [T]);

  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimName = name.trim();
    const trimEmail = email.trim();
    const trimPass = password.trim();

    if (!trimName || !trimEmail || !trimPass) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (trimPass.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (trimPass !== confirmPassword.trim()) {
      Alert.alert('Passwords do not match', 'Please re-enter your password.');
      return;
    }

    setLoading(true);
    try {
      const userData = await registerUser({ name: trimName, email: trimEmail, password: trimPass });
      await login(userData);
    } catch (err) {
      Alert.alert('Registration failed', err.message || 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.iconCircle}>
              <Ionicons name="business" size={36} color={C.teal} />
            </View>
            <Text style={styles.appName}>Park As You Desire</Text>
            <Text style={styles.tagline}>Register as a Parking Owner</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create account</Text>
            <Text style={styles.cardSub}>List and manage your parking spaces</Text>

            {/* Name */}
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={C.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={C.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Min. 6 characters"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={C.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repeat password"
                placeholderTextColor={C.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>

            {/* Create Account button */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.btnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Login link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already registered? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Back to driver mode */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-outline" size={16} color={C.textMuted} />
            <Text style={styles.backText}>Back to driver mode</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(T) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 24,
  },
  logoArea: { alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: T.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: T.teal,
  },
  appName: { fontSize: 22, fontWeight: '900', color: T.text, letterSpacing: 0.3 },
  tagline: { fontSize: 13, color: T.textMuted },
  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: T.border,
    gap: 6,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: T.text, marginBottom: 2 },
  cardSub: { fontSize: 13, color: T.textMuted, marginBottom: 10 },
  label: { fontSize: 12, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    height: 48,
    color: T.text,
    fontSize: 15,
  },
  eyeBtn: { padding: 6 },
  btn: {
    backgroundColor: T.teal,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  loginText: { fontSize: 13, color: T.textMuted },
  loginLink: { fontSize: 13, color: T.gold, fontWeight: '700' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backText: { fontSize: 13, color: T.textMuted },
});
}
