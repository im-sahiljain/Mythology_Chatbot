import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Platform } from 'react-native';
import { apiService, SourceCitation } from '../../src/services/api';
import { StreamingText } from '../../src/components/StreamingText';
import { SourceCard } from '../../src/components/SourceCard';
import { useTheme } from '../../src/context/ThemeContext';
import { FadeSlide, Pressable, TypingDots } from '../../src/components/AnimatedComponents';

import { VedicDrawer } from '../../src/components/VedicDrawer';
import { VedicTopBar } from '../../src/components/VedicTopBar';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

interface Msg {
  id: string; role: 'user' | 'assistant'; content: string;
  turn?: number; options?: string[]; picked?: string; sources?: SourceCitation[];
}

export default function TwoTurnScreen() {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [prompt, setPrompt] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const start = async () => {
    if (!input.trim() || loading) return;
    const t = input; setInput(''); setPrompt(t);
    const u: Msg = { id: Date.now().toString(), role: 'user', content: t };
    setMsgs([u]); setLoading(true);
    try {
      const res = await apiService.twoTurnStrategy(t, 1);
      setMsgs([u, { id: (Date.now()+1).toString(), role: 'assistant', content: res.reply, turn: 1, options: res.options || [] }]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const pickOpt = async (msgId: string, opt: string) => {
    setMsgs(p => p.map(m => m.id === msgId ? { ...m, picked: opt } : m));
    const u: Msg = { id: Date.now().toString(), role: 'user', content: opt };
    setMsgs(p => [...p, u]); setLoading(true);
    try {
      const res = await apiService.twoTurnStrategy(prompt, 2, opt);
      setMsgs(p => [...p, { id: (Date.now()+1).toString(), role: 'assistant', content: res.reply, turn: 2, sources: res.sources || [] }]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const reset = () => { setInput(''); setMsgs([]); setPrompt(''); };

  return (
    <View style={[st.container, { backgroundColor: theme.bg }]}>
      <VedicDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
      <VedicTopBar onOpenDrawer={() => setDrawerVisible(true)} />

      <ScrollView style={st.list} contentContainerStyle={[st.listContent, { paddingTop: 72 }]}>
        {msgs.length === 0 && (
          <FadeSlide>
            <View style={[st.empty, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              <View style={[st.emptyIcon, { backgroundColor: theme.tealSubtle }]}>
                <Text style={{ fontSize: 26 }}>🔄</Text>
              </View>
              <Text style={[st.emptyTitle, { color: theme.text, fontFamily: serif }]}>2-Step Decision Tree</Text>
              <Text style={[st.emptySub, { color: theme.textSecondary, fontFamily: body }]}>
                Step 1 classifies your dilemma into categories.{'\n'}Step 2 delivers matched scripture counsel.
              </Text>
            </View>
          </FadeSlide>
        )}

        {msgs.map(m => (
          <FadeSlide key={m.id} delay={20} distance={12}>
            {m.role === 'user' ? (
              <View style={[st.userBubble, { backgroundColor: theme.accentSubtle, borderColor: theme.surfaceBorder }]}>
                <Text style={[st.userText, { color: theme.text, fontFamily: body }]}>{m.content}</Text>
              </View>
            ) : (
              <View style={[st.aiCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                <View style={st.aiHead}>
                  <Text style={[st.aiLabel, { color: theme.teal, fontFamily: bold }]}>STEP {m.turn}</Text>
                  <View style={[st.stepPill, {
                    backgroundColor: m.turn === 2 ? theme.greenSubtle : theme.tealSubtle,
                    borderColor: m.turn === 2 ? theme.green : theme.teal,
                  }]}>
                    <Text style={[st.stepText, {
                      color: m.turn === 2 ? theme.green : theme.teal, fontFamily: bold,
                    }]}>{m.turn === 2 ? 'Final' : 'Classify'}</Text>
                  </View>
                </View>
                <StreamingText text={m.content} />

                {m.turn === 1 && m.options && m.options.length > 0 && !m.picked && (
                  <View style={st.chips}>
                    <Text style={[st.chipsLabel, { color: theme.textTertiary, fontFamily: bold }]}>SELECT CATEGORY</Text>
                    {m.options.map((opt, i) => (
                      <FadeSlide key={i} delay={i * 70} distance={10} from="left">
                        <Pressable onPress={() => pickOpt(m.id, opt)}>
                          <View style={[st.chip, { backgroundColor: theme.tealSubtle, borderColor: theme.surfaceBorder }]}>
                            <View style={[st.chipDot, { backgroundColor: theme.teal }]} />
                            <Text style={[st.chipText, { color: theme.text, fontFamily: body }]}>{opt}</Text>
                            <Text style={[st.chipArrow, { color: theme.textTertiary }]}>→</Text>
                          </View>
                        </Pressable>
                      </FadeSlide>
                    ))}
                  </View>
                )}

                {m.picked && (
                  <FadeSlide duration={250}>
                    <View style={[st.pickedBadge, { backgroundColor: theme.greenSubtle, borderColor: theme.green }]}>
                      <Text style={[st.pickedText, { color: theme.green, fontFamily: bold }]}>✓ {m.picked}</Text>
                    </View>
                  </FadeSlide>
                )}

                {m.turn === 2 && m.sources && m.sources.length > 0 && <SourceCard sources={m.sources} />}
              </View>
            )}
          </FadeSlide>
        ))}

        {loading && (
          <FadeSlide duration={200}>
            <View style={[st.loader, { backgroundColor: theme.bgTertiary }]}>
              <TypingDots color={theme.teal} />
              <Text style={[st.loaderText, { color: theme.textSecondary, fontFamily: body }]}>Processing...</Text>
            </View>
          </FadeSlide>
        )}
      </ScrollView>

      <View style={[st.bar, { backgroundColor: theme.bgSecondary, borderTopColor: theme.divider }]}>
        <TextInput
          style={[st.barInput, { color: theme.text, backgroundColor: theme.inputBg, fontFamily: body }]}
          placeholder="Type your dilemma..."
          placeholderTextColor={theme.textTertiary}
          value={input}
          onChangeText={setInput}
        />
        <Pressable onPress={start} disabled={loading}>
          <View style={[st.sendBtn, { backgroundColor: theme.teal, opacity: loading ? 0.5 : 1 }]}>
            <Text style={[st.sendText, { fontFamily: bold }]}>Start</Text>
          </View>
        </Pressable>
        {msgs.length > 0 && (
          <Pressable onPress={reset}>
            <View style={[st.resetBtn, { backgroundColor: theme.bgTertiary }]}>
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>↻</Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 20 },
  empty: { alignItems: 'center', padding: 28, borderRadius: 16, borderWidth: 1 },
  emptyIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 21, opacity: 0.7, maxWidth: 320 },
  userBubble: { borderRadius: 16, padding: 14, marginBottom: 12, alignSelf: 'flex-end', maxWidth: '82%', borderWidth: 1 },
  userText: { fontSize: 14, lineHeight: 21 },
  aiCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  aiHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  aiLabel: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' },
  stepPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  stepText: { fontSize: 10, fontWeight: '700' },
  chips: { marginTop: 14 },
  chipsLabel: { fontSize: 9, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  chip: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  chipDot: { width: 5, height: 5, borderRadius: 3, marginRight: 12 },
  chipText: { fontSize: 14, flex: 1 },
  chipArrow: { fontSize: 14, marginLeft: 8 },
  pickedBadge: { marginTop: 10, padding: 8, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  pickedText: { fontSize: 11, fontWeight: '700' },
  loader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 12 },
  loaderText: { fontSize: 13 },
  bar: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'center' },
  barInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginRight: 8 },
  sendBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  sendText: { color: '#09090B', fontWeight: '700', fontSize: 14 },
  resetBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginLeft: 6 },
});
