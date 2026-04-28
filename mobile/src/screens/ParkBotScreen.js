// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatWithAI } from '../services/api';
import BrandFooter from '../components/BrandFooter';

const T = {
  bg: '#0d1b2a',
  surface: '#142033',
  surface2: '#1c2e44',
  border: '#243350',
  gold: '#f0a500',
  goldLight: 'rgba(240,165,0,0.15)',
  teal: '#0ab5a0',
  text: '#e2eaf4',
  textMuted: '#6e92b5',
  white: '#ffffff',
  error: '#ff6b6b',
  userBubble: '#f0a500',
  botBubble: '#1c2e44',
  toolBubble: '#0d2235',
};

const WELCOME = {
  id: 'welcome',
  role: 'bot',
  text: "Hi! I'm ParkBot 🤖\n\nAsk me to find parking anywhere, estimate costs, or get tips for parking in a city.\n\nTry: \"Find parking near Canary Wharf\"",
};

let msgCounter = 0;
function makeId() { return `msg-${++msgCounter}`; }

export default function ParkBotScreen({ navigation, route }) {
  const { userLat, userLng } = route.params || {};

  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef(null);
  const cancelRef = useRef(null);
  const historyRef = useRef([]);
  const botMsgIdRef = useRef(null);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    const userMsg = { id: makeId(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);

    const botId = makeId();
    botMsgIdRef.current = botId;
    setMessages(prev => [...prev, { id: botId, role: 'bot', text: '', loading: true }]);
    setStreaming(true);

    historyRef.current = [...historyRef.current, { role: 'user', content: text }];
    const context = userLat && userLng ? { userLat, userLng } : undefined;

    cancelRef.current = chatWithAI(historyRef.current, context, {
      onDelta: (delta) => {
        setMessages(prev =>
          prev.map(m => m.id === botId ? { ...m, loading: false, text: m.text + delta } : m)
        );
        listRef.current?.scrollToEnd({ animated: false });
      },
      onToolCalls: (calls) => {
        const searchCall = calls.find(c => c.name === 'search_parking');
        if (searchCall) {
          const { destination, priority = 'distance' } = searchCall.input;
          const toolMsgId = makeId();
          setMessages(prev => [...prev, {
            id: toolMsgId, role: 'tool',
            text: `Searching for parking near "${destination}"…`, destination,
          }]);
          setTimeout(() => {
            navigation.navigate('SearchResults', { to: destination, sortBy: priority, priority });
          }, 600);
        }
      },
      onDone: () => {
        let botText = '';
        setMessages(prev => {
          const m = prev.find(x => x.id === botId);
          if (m) botText = m.text;
          return prev;
        });
        historyRef.current = [...historyRef.current, { role: 'assistant', content: botText || '...' }];
        setStreaming(false);
        setMessages(prev => prev.map(m => m.id === botId ? { ...m, loading: false } : m));
      },
      onError: (err) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === botId
              ? { ...m, loading: false, text: `Sorry, something went wrong: ${err}`, error: true }
              : m
          )
        );
        setStreaming(false);
      },
    });
  }, [input, streaming, userLat, userLng, navigation]);

  const handleCancel = () => {
    cancelRef.current?.();
    setStreaming(false);
    setMessages(prev =>
      prev.map(m => m.id === botMsgIdRef.current
        ? { ...m, loading: false, text: m.text || '(cancelled)' }
        : m
      )
    );
  };

  const renderMessage = ({ item }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.rowUser}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    if (item.role === 'tool') {
      return (
        <View style={styles.rowBot}>
          <View style={styles.toolBubble}>
            <ActivityIndicator size="small" color={T.teal} />
            <Text style={styles.toolText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.rowBot}>
        <View style={styles.botAvatar}>
          <Text style={styles.botAvatarText}>P</Text>
        </View>
        <View style={[styles.botBubble, item.error && styles.errorBubble]}>
          {item.loading && item.text === '' ? (
            <View style={styles.typingRow}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, { opacity: 0.6 }]} />
              <View style={[styles.typingDot, { opacity: 0.3 }]} />
            </View>
          ) : (
            <Text style={[styles.botText, item.error && styles.errorText]}>{item.text}</Text>
          )}
        </View>
      </View>
    );
  };

  const QUICK_PROMPTS = ['Near me', 'Cheapest', 'Canary Wharf', '24hr parking'];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.botBadge}>
            <Text style={styles.botBadgeText}>P</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>ParkBot</Text>
            <Text style={styles.headerSub}>AI Parking Assistant</Text>
          </View>
        </View>
        <View style={styles.onlinePill}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Live AI</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {messages.length <= 1 && (
                <View style={styles.quickRow}>
                  {QUICK_PROMPTS.map(q => (
                    <TouchableOpacity
                      key={q}
                      style={styles.quickChip}
                      onPress={() => { setInput(q); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickChipText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <BrandFooter />
            </>
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask ParkBot anything…"
            placeholderTextColor={T.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline
            editable={!streaming}
          />
          {streaming ? (
            <TouchableOpacity style={styles.stopBtn} onPress={handleCancel}>
              <Ionicons name="stop-circle" size={28} color={T.error} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={send}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={17} color={T.bg} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  flex: { flex: 1 },

  header: {
    backgroundColor: T.surface,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: T.border,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  botBadge: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: T.gold, alignItems: 'center', justifyContent: 'center',
    shadowColor: T.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  botBadgeText: { fontSize: 20, fontWeight: '900', color: T.bg },
  headerTitle: { fontSize: 16, fontWeight: '800', color: T.text },
  headerSub: { fontSize: 11, color: T.textMuted, marginTop: 1 },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(10,181,160,0.15)', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(10,181,160,0.3)',
  },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: T.teal },
  onlineText: { fontSize: 11, color: T.teal, fontWeight: '700' },

  list: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 10, gap: 12 },

  rowUser: { flexDirection: 'row', justifyContent: 'flex-end' },
  userBubble: {
    backgroundColor: T.gold, borderRadius: 20, borderBottomRightRadius: 4,
    paddingHorizontal: 16, paddingVertical: 11, maxWidth: '78%',
    shadowColor: T.gold, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  userText: { fontSize: 15, color: T.bg, fontWeight: '600', lineHeight: 21 },

  rowBot: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  botAvatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: T.surface2, borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  botAvatarText: { fontSize: 16, fontWeight: '900', color: T.gold },
  botBubble: {
    backgroundColor: T.botBubble, borderRadius: 20, borderBottomLeftRadius: 4,
    paddingHorizontal: 16, paddingVertical: 11, maxWidth: '78%',
    borderWidth: 1, borderColor: T.border,
  },
  errorBubble: { backgroundColor: 'rgba(255,107,107,0.2)', borderColor: T.error },
  botText: { fontSize: 15, color: T.text, lineHeight: 22 },
  errorText: { color: T.error },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  typingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: T.textMuted,
  },

  toolBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.toolBubble, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    marginLeft: 42, maxWidth: '78%',
    borderWidth: 1, borderColor: 'rgba(10,181,160,0.25)',
  },
  toolText: { fontSize: 13, color: T.teal, fontStyle: 'italic', flex: 1 },

  quickRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingTop: 10, paddingHorizontal: 4,
  },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: T.surface2, borderRadius: 20,
    borderWidth: 1, borderColor: T.border,
  },
  quickChipText: { fontSize: 13, color: T.textMuted, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border,
  },
  input: {
    flex: 1, backgroundColor: T.surface2, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 11,
    fontSize: 15, color: T.text, maxHeight: 100,
    borderWidth: 1, borderColor: T.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: T.gold, alignItems: 'center', justifyContent: 'center',
    shadowColor: T.gold, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: T.surface2, shadowOpacity: 0 },
  stopBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
