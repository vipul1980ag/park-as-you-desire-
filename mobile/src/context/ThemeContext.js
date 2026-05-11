// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export const DARK = {
  bg: '#0d1b2a', surface: '#142033', surface2: '#1c2e44', border: '#243350',
  gold: '#f0a500', goldLight: 'rgba(240,165,0,0.15)', goldBorder: 'rgba(240,165,0,0.35)',
  teal: '#0ab5a0', tealLight: 'rgba(10,181,160,0.13)', tealBorder: 'rgba(10,181,160,0.3)',
  purple: '#a78bfa', purpleLight: 'rgba(167,139,250,0.12)',
  text: '#e2eaf4', textMuted: '#6e92b5', white: '#ffffff',
  error: '#ff6b6b', warning: '#f59e0b', success: '#0ab5a0',
  userBubble: '#f0a500', botBubble: '#1c2e44', toolBubble: '#0d2235',
  statusBar: 'light-content', isDark: true,
};

export const LIGHT = {
  bg: '#f5f7fc', surface: '#ffffff', surface2: '#eef2f9', border: '#dbe3f0',
  gold: '#f0a500', goldLight: 'rgba(240,165,0,0.15)', goldBorder: 'rgba(240,165,0,0.35)',
  teal: '#0ab5a0', tealLight: 'rgba(10,181,160,0.13)', tealBorder: 'rgba(10,181,160,0.3)',
  purple: '#a78bfa', purpleLight: 'rgba(167,139,250,0.12)',
  text: '#1a2b45', textMuted: '#5b7898', white: '#ffffff',
  error: '#ff6b6b', warning: '#f59e0b', success: '#0ab5a0',
  userBubble: '#f0a500', botBubble: '#eef2f9', toolBubble: '#e0f4ef',
  statusBar: 'dark-content', isDark: false,
};

const ThemeContext = createContext({ T: LIGHT, toggleTheme: () => {}, isDark: false });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('appTheme').then(val => {
      if (val === 'dark') setIsDark(true);
    }).catch(() => {});
  }, []);

  function toggleTheme() {
    setIsDark(prev => {
      const next = !prev;
      SecureStore.setItemAsync('appTheme', next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ T: isDark ? DARK : LIGHT, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
