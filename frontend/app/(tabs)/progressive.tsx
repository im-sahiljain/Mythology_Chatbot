import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Platform } from 'react-native';
import { apiService, SourceCitation } from '../../src/services/api';
import { StreamingText } from '../../src/components/StreamingText';
import { SourceCard } from '../../src/components/SourceCard';
import { useTheme } from '../../src/context/ThemeContext';
import { FadeSlide, Pressable, TypingDots } from '../../src/components/AnimatedComponents';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

interface ChatBubble {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
}

export default function ProgressiveScreen() {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatBubble[]>([]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');

    const newHistory: ChatBubble[] = [...history, { role: 'user', content: userMsg }];
    setHistory(newHistory);
    setLoading(true);

    try {
      const apiHistory = history.map((h) => ({ role: h.role, content: h.content }));
      const res = await apiService.progressiveStrategy(userMsg, apiHistory);

      setHistory([
        ...newHistory,
        {
          role: 'assistant',
          content: res.reply,
          sources: res.sources || [],
        },
      ]);
    } catch (err: any) {
      setHistory([
        ...newHistory,
        {
          role: 'assistant',
          content: 'Unable to connect to the progressive dialogue engine. Please ensure backend is running.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInput('');
    setHistory([]);
  };

  return (
    <View style={[st.container, { backgroundColor: theme.bg }]}>
      <ScrollView style={st.list} contentContainerStyle={st.listContent}>
        {history.length === 0 && (
          <FadeSlide>
            <View style={[st.empty, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              <View style={[st.emptyIcon, { backgroundColor: theme.accentSubtle }]}>
                <Text style={{ fontSize: 26 }}>💬</Text>
              </View>
              <Text style={[st.emptyTitle, { color: theme.text, fontFamily: serif }]}>
                Progressive Dialogue
              </Text>
              <Text style={[st.emptySub, { color: theme.textSecondary, fontFamily: body }]}>
                Every turn triggers real-time vector retrieval over 475+ epic stories, dynamically refining advice as you share more details.
              </Text>
            </View>
          </FadeSlide>
        )}

        {history.map((msg, idx) => (
          <FadeSlide key={idx} delay={20} distance={12}>
            {msg.role === 'user' ? (
              <View style={[st.userBubble, { backgroundColor: theme.accentSubtle, borderColor: theme.surfaceBorder }]}>
                <Text style={[st.userText, { color: theme.text, fontFamily: body }]}>{msg.content}</Text>
              </View>
            ) : (
              <View style={[st.aiCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                <View style={st.aiHead}>
                  <Text style={[st.aiLabel, { color: theme.accent, fontFamily: bold }]}>EPIC SCHOLAR</Text>
                </View>
                <StreamingText text={msg.content} />
                {msg.sources && msg.sources.length > 0 && <SourceCard sources={msg.sources} />}
              </View>
            )}
          </FadeSlide>
        ))}

        {loading && (
          <FadeSlide duration={200}>
            <View style={[st.loader, { backgroundColor: theme.bgTertiary }]}>
              <TypingDots color={theme.accent} />
              <Text style={[st.loaderText, { color: theme.textSecondary, fontFamily: body }]}>
                Searching scriptures & composing guidance...
              </Text>
            </View>
          </FadeSlide>
        )}
      </ScrollView>

      <View style={[st.bar, { backgroundColor: theme.bgSecondary, borderTopColor: theme.divider }]}>
        <TextInput
          style={[st.barInput, { color: theme.text, backgroundColor: theme.inputBg, fontFamily: body }]}
          placeholder="Respond or add follow-up details..."
          placeholderTextColor={theme.textTertiary}
          value={input}
          onChangeText={setInput}
        />
        <Pressable onPress={handleSend} disabled={loading}>
          <View style={[st.sendBtn, { backgroundColor: theme.accent, opacity: loading ? 0.5 : 1 }]}>
            <Text style={[st.sendText, { fontFamily: bold }]}>Send</Text>
          </View>
        </Pressable>
        {history.length > 0 && (
          <Pressable onPress={handleReset}>
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
  loader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 12 },
  loaderText: { fontSize: 13 },
  bar: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'center' },
  barInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginRight: 8 },
  sendBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  sendText: { color: '#09090B', fontWeight: '700', fontSize: 14 },
  resetBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginLeft: 6 },
});
