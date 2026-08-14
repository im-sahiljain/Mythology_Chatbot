import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Platform } from 'react-native';
import { apiService, SourceCitation, SocraticResponse } from '../../src/services/api';
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
  status?: 'interviewing' | 'resolved';
  sources?: SourceCitation[];
}

export default function CounselorScreen() {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatBubble[]>([]);
  const [currentStatus, setCurrentStatus] = useState<'interviewing' | 'resolved' | null>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');

    const newHistory: ChatBubble[] = [...history, { role: 'user', content: userMsg }];
    setHistory(newHistory);
    setLoading(true);

    try {
      const apiHistory = history.map((h) => ({ role: h.role, content: h.content }));
      const res: SocraticResponse = await apiService.socraticStrategy(userMsg, apiHistory);

      setCurrentStatus(res.status);
      setHistory([
        ...newHistory,
        {
          role: 'assistant',
          content: res.reply,
          status: res.status,
          sources: res.sources || [],
        },
      ]);
    } catch (err: any) {
      setHistory([
        ...newHistory,
        {
          role: 'assistant',
          content: 'Unable to connect to the counselor engine. Please ensure backend is running.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleForceResolve = async () => {
    if (history.length === 0 || loading) return;
    setLoading(true);
    try {
      const apiHistory = history.map((h) => ({ role: h.role, content: h.content }));
      const lastUserMsg = history.filter((h) => h.role === 'user').slice(-1)[0]?.content || 'Please give epic counsel.';
      const res: SocraticResponse = await apiService.socraticStrategy(lastUserMsg, apiHistory, true);

      setCurrentStatus('resolved');
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          status: 'resolved',
          sources: res.sources || [],
        },
      ]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInput('');
    setHistory([]);
    setCurrentStatus(null);
  };

  return (
    <View style={[st.container, { backgroundColor: theme.bg }]}>
      <ScrollView style={st.list} contentContainerStyle={st.listContent}>
        {/* Status Banner */}
        {currentStatus && (
          <FadeSlide duration={300}>
            <View style={[
              st.statusBanner,
              {
                backgroundColor: currentStatus === 'resolved' ? theme.greenSubtle : theme.purpleSubtle,
                borderColor: currentStatus === 'resolved' ? theme.green : theme.purple,
              },
            ]}>
              <Text style={[
                st.statusText,
                {
                  color: currentStatus === 'resolved' ? theme.green : theme.purple,
                  fontFamily: bold,
                },
              ]}>
                {currentStatus === 'resolved'
                  ? '✦ SUFFICIENT CONTEXT GATHERED — FINAL COUNSEL DELIVERED'
                  : '🔍 SOCRATIC INTERVIEW ACTIVE — PROBING FOR ROOT CAUSE'}
              </Text>
            </View>
          </FadeSlide>
        )}

        {/* Force Resolve Button */}
        {currentStatus === 'interviewing' && (
          <FadeSlide duration={300}>
            <Pressable onPress={handleForceResolve} disabled={loading}>
              <View style={[st.forceBtn, { backgroundColor: theme.accentSubtle, borderColor: theme.accent }]}>
                <Text style={[st.forceText, { color: theme.accent, fontFamily: bold }]}>
                  ✦ I've shared enough — Give me epic counsel now
                </Text>
              </View>
            </Pressable>
          </FadeSlide>
        )}

        {/* Empty State */}
        {history.length === 0 && (
          <FadeSlide>
            <View style={[st.empty, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              <View style={[st.emptyIcon, { backgroundColor: theme.purpleSubtle }]}>
                <Text style={{ fontSize: 26 }}>🧘</Text>
              </View>
              <Text style={[st.emptyTitle, { color: theme.text, fontFamily: serif }]}>
                Socratic Master Counselor
              </Text>
              <Text style={[st.emptySub, { color: theme.textSecondary, fontFamily: body }]}>
                An empathetic mentor that actively listens, asks clarifying follow-ups, and delivers profound epic advice only after fully understanding your dilemma.
              </Text>
            </View>
          </FadeSlide>
        )}

        {/* Chat History */}
        {history.map((msg, idx) => {
          const isResolved = msg.status === 'resolved';
          return (
            <FadeSlide key={idx} delay={20} distance={12}>
              {msg.role === 'user' ? (
                <View style={[st.userBubble, { backgroundColor: theme.accentSubtle, borderColor: theme.surfaceBorder }]}>
                  <Text style={[st.userText, { color: theme.text, fontFamily: body }]}>{msg.content}</Text>
                </View>
              ) : (
                <View style={[
                  st.aiCard,
                  { backgroundColor: theme.surface, borderColor: isResolved ? theme.green : theme.surfaceBorder },
                  isResolved && { borderWidth: 1.5 },
                ]}>
                  <View style={st.aiHead}>
                    <Text style={[
                      st.aiLabel,
                      { color: isResolved ? theme.green : theme.purple, fontFamily: bold },
                    ]}>
                      {isResolved ? '✦ FINAL RESOLUTION' : '❓ SOCRATIC INQUIRY'}
                    </Text>
                  </View>
                  <StreamingText text={msg.content} />
                  {msg.sources && msg.sources.length > 0 && <SourceCard sources={msg.sources} />}
                </View>
              )}
            </FadeSlide>
          );
        })}

        {loading && (
          <FadeSlide duration={200}>
            <View style={[st.loader, { backgroundColor: theme.bgTertiary }]}>
              <TypingDots color={theme.purple} />
              <Text style={[st.loaderText, { color: theme.textSecondary, fontFamily: body }]}>
                Counselor is contemplating your words...
              </Text>
            </View>
          </FadeSlide>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={[st.bar, { backgroundColor: theme.bgSecondary, borderTopColor: theme.divider }]}>
        <TextInput
          style={[st.barInput, { color: theme.text, backgroundColor: theme.inputBg, fontFamily: body }]}
          placeholder="Respond or share your dilemma..."
          placeholderTextColor={theme.textTertiary}
          value={input}
          onChangeText={setInput}
        />
        <Pressable onPress={handleSend} disabled={loading}>
          <View style={[st.sendBtn, { backgroundColor: theme.purple, opacity: loading ? 0.5 : 1 }]}>
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
  statusBanner: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1 },
  statusText: { fontSize: 10, letterSpacing: 1.2, textAlign: 'center', textTransform: 'uppercase' },
  forceBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 14, alignItems: 'center' },
  forceText: { fontSize: 12, letterSpacing: 0.3 },
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
  sendText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  resetBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginLeft: 6 },
});
