// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

import React, { useState } from 'react';
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
import { registerUser } from '../../services/api';

const C = {
  bg: '#0d1b2a',
  surface: '#142033',
  surface2: '#1c2e44',
  border: '#243350',
  gold: '#f0a500',
  teal: '#0ab5a0',
  text: '#e2eaf4',
  textMuted: '#6e92b5',
  error: '#f87171',
};

export default function RegisterScreen({ navigation }) {
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
      await login(userData); // saves to SecureStore + updates context → auto-navigates
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
                <ActivityIndicator color={C.bg} size="small" />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
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
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.teal,
  },
  appName: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 0.3 },
  tagline: { fontSize: 13, color: C.textMuted },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 2 },
  cardSub: { fontSize: 13, color: C.textMuted, marginBottom: 10 },
  label: { fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    height: 48,
    color: C.text,
    fontSize: 15,
  },
  eyeBtn: { padding: 6 },
  btn: {
    backgroundColor: C.teal,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '800', color: C.bg },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  loginText: { fontSize: 13, color: C.textMuted },
  loginLink: { fontSize: 13, color: C.gold, fontWeight: '700' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backText: { fontSize: 13, color: C.textMuted },
});
