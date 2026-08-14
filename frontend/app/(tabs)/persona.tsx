import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Platform } from 'react-native';
import { apiService, SourceCitation } from '../../src/services/api';
import { AvatarSelector, CharacterItem, AVAILABLE_CHARACTERS } from '../../src/components/AvatarSelector';
import { StreamingText } from '../../src/components/StreamingText';
import { SourceCard } from '../../src/components/SourceCard';
import { useTheme } from '../../src/context/ThemeContext';
import { FadeSlide, Pressable, TypingDots } from '../../src/components/AnimatedComponents';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

interface ChatMsg { role: 'user' | 'assistant'; content: string; sources?: SourceCitation[] }

export default function PersonaScreen() {
  const { theme } = useTheme();
  const [char, setChar] = useState<CharacterItem>(AVAILABLE_CHARACTERS[0]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMsg[]>([{
    role: 'assistant',
    content: `"In the Ashoka Grove, I faced not just the demon king, but the shadows of despair. Yet, my dharma remained unyielding. The fire within me was brighter than Lanka's gold."`,
  }]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input;
    setInput('');
    const next: ChatMsg[] = [...history, { role: 'user', content: msg }];
    setHistory(next);
    setLoading(true);
    try {
      const res = await apiService.characterChat(msg, char.name);
      setHistory([...next, { role: 'assistant', content: res.reply, sources: res.sources || [] }]);
    } catch {
      setHistory([...next, { role: 'assistant', content: `Unable to reach ${char.name}'s counsel.` }]);
    } finally { setLoading(false); }
  };

  const switchChar = (c: CharacterItem) => {
    setChar(c);
    const greetings: Record<string, string> = {
      Sita: `"In the Ashoka Grove, I faced not just the demon king, but the shadows of despair. Yet, my dharma remained unyielding."`,
      Krishna: `"You have a right to perform your prescribed duty, but you are not entitled to the fruits of action."`,
    };
    setHistory([{ role: 'assistant', content: greetings[c.name] || `I am ${c.name}. Share your dilemma with me.` }]);
  };

  return (
    <View style={[st.container, { backgroundColor: theme.bg }]}>
      <ScrollView style={st.list} contentContainerStyle={st.listContent}>
        <AvatarSelector selectedCharacter={char.name} onSelect={switchChar} />

        {history.map((m, i) => (
          <FadeSlide key={i} delay={30} distance={10}>
            {m.role === 'assistant' ? (
              <View style={[st.aiCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                <View style={[st.aiAccent, { backgroundColor: theme.purple }]} />
                <View style={st.aiInner}>
                  <Text style={[st.aiLabel, { color: theme.purple, fontFamily: bold }]}>{char.name.toUpperCase()}</Text>
                  <StreamingText text={m.content} style={{ fontFamily: serif, fontSize: 15.5, lineHeight: 25 }} />
                  {m.sources && m.sources.length > 0 && <SourceCard sources={m.sources} />}
                </View>
              </View>
            ) : (
              <View style={[st.userBubble, { backgroundColor: theme.accentSubtle, borderColor: theme.surfaceBorder }]}>
                <Text style={[st.userText, { color: theme.text, fontFamily: body }]}>{m.content}</Text>
              </View>
            )}
          </FadeSlide>
        ))}

        {loading && (
          <FadeSlide duration={200}>
            <View style={[st.loader, { backgroundColor: theme.bgTertiary }]}>
              <TypingDots color={theme.purple} />
              <Text style={[st.loaderText, { color: theme.textSecondary, fontFamily: body }]}>{char.name} is reflecting...</Text>
            </View>
          </FadeSlide>
        )}
      </ScrollView>

      <View style={[st.bar, { backgroundColor: theme.bgSecondary, borderTopColor: theme.divider }]}>
        <TextInput
          style={[st.barInput, { color: theme.text, backgroundColor: theme.inputBg, fontFamily: body }]}
          placeholder={`Ask ${char.name}...`}
          placeholderTextColor={theme.textTertiary}
          value={input}
          onChangeText={setInput}
        />
        <Pressable onPress={send} disabled={loading}>
          <View style={[st.sendBtn, { backgroundColor: theme.purple }]}>
            <Text style={[st.sendText, { fontFamily: bold }]}>Ask</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 20 },
  aiCard: { borderRadius: 16, borderWidth: 1, marginBottom: 14, flexDirection: 'row', overflow: 'hidden' },
  aiAccent: { width: 3 },
  aiInner: { flex: 1, padding: 16 },
  aiLabel: { fontSize: 9, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  userBubble: { borderRadius: 16, padding: 14, marginBottom: 14, alignSelf: 'flex-end', maxWidth: '82%', borderWidth: 1 },
  userText: { fontSize: 14, lineHeight: 21 },
  loader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 12 },
  loaderText: { fontSize: 13 },
  bar: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'center' },
  barInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginRight: 8 },
  sendBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  sendText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
