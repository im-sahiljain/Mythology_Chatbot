import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Platform } from 'react-native';
import { apiService, SourceCitation } from '../../src/services/api';
import { StreamingText } from '../../src/components/StreamingText';
import { SourceCard } from '../../src/components/SourceCard';
import { useTheme } from '../../src/context/ThemeContext';
import { FadeSlide, Pressable, Card, TypingDots } from '../../src/components/AnimatedComponents';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

export default function ScholarScreen() {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceCitation[]>([]);
  const [focused, setFocused] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setReply(null);
    setSources([]);
    try {
      const res = await apiService.universalChat(input);
      setReply(res.reply);
      setSources(res.sources || []);
    } catch {
      setReply('Unable to connect. Ensure backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[st.container, { backgroundColor: theme.bg }]} contentContainerStyle={st.content}>
      {/* Hero */}
      <FadeSlide delay={0}>
        <View style={st.hero}>
          <View style={[st.heroIcon, { backgroundColor: theme.accentSubtle }]}>
            <Text style={{ fontSize: 28 }}>📜</Text>
          </View>
          <Text style={[st.heroTitle, { color: theme.text, fontFamily: serif }]}>
            Epic Scholar
          </Text>
          <Text style={[st.heroSub, { color: theme.textSecondary, fontFamily: body }]}>
            Ask anything about the Ramayana & Mahabharata.{'\n'}475+ scripture cards will guide your answer.
          </Text>
        </View>
      </FadeSlide>

      {/* Input Card */}
      <FadeSlide delay={100}>
        <Card>
          <Text style={[st.inputLabel, { color: theme.textTertiary, fontFamily: bold }]}>YOUR DILEMMA</Text>
          <TextInput
            style={[st.input, {
              color: theme.text,
              backgroundColor: theme.inputBg,
              borderColor: focused ? theme.inputFocusBorder : theme.inputBorder,
              fontFamily: body,
            }]}
            placeholder="What path should I take when duty conflicts with desire?"
            placeholderTextColor={theme.textTertiary}
            value={input}
            onChangeText={setInput}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            multiline
          />
          <Pressable onPress={handleSend} disabled={loading}>
            <View style={[st.btn, { backgroundColor: theme.accent, opacity: loading ? 0.5 : 1 }]}>
              <Text style={[st.btnText, { fontFamily: bold }]}>
                {loading ? 'Searching...' : 'Ask the Epics'}
              </Text>
            </View>
          </Pressable>
        </Card>
      </FadeSlide>

      {/* Loading */}
      {loading && (
        <FadeSlide duration={250}>
          <View style={[st.loader, { backgroundColor: theme.bgTertiary }]}>
            <TypingDots />
            <Text style={[st.loaderText, { color: theme.textSecondary, fontFamily: body }]}>Searching scriptures...</Text>
          </View>
        </FadeSlide>
      )}

      {/* Response */}
      {reply && (
        <FadeSlide delay={80} distance={20}>
          <Card style={{ marginTop: 16 }}>
            <View style={st.resHeader}>
              <View style={[st.resIcon, { backgroundColor: theme.accentSubtle }]}>
                <Text style={{ fontSize: 14 }}>✦</Text>
              </View>
              <Text style={[st.resTitle, { color: theme.accent, fontFamily: serif }]}>Divine Counsel</Text>
            </View>
            <View style={st.resBody}>
              <View style={[st.resBar, { backgroundColor: theme.accent }]} />
              <View style={{ flex: 1 }}>
                <StreamingText text={reply} />
              </View>
            </View>
            <SourceCard sources={sources} />
          </Card>
        </FadeSlide>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 20 },
  heroIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  heroSub: { fontSize: 14, textAlign: 'center', lineHeight: 21, opacity: 0.7, maxWidth: 340 },
  inputLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  input: { borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 22, minHeight: 100, textAlignVertical: 'top', borderWidth: 1.5, marginBottom: 14 },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#09090B', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  loader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginTop: 16 },
  loaderText: { fontSize: 13 },
  resHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  resIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  resTitle: { fontSize: 20, fontWeight: '700' },
  resBody: { flexDirection: 'row' },
  resBar: { width: 2.5, borderRadius: 2, marginRight: 14, opacity: 0.4 },
});