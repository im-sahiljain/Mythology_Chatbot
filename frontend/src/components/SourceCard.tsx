import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SourceCitation } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { FadeSlide, Pressable } from './AnimatedComponents';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const label = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Robust helper to parse and clean raw verse citations
function parseVerseCitations(rawCitations?: any[]): { id?: string; text: string }[] {
  if (!rawCitations || rawCitations.length === 0) return [];
  const results: { id?: string; text: string }[] = [];

  for (const raw of rawCitations) {
    if (!raw) continue;
    if (typeof raw === 'object' && raw !== null) {
      results.push({
        id: (raw.verse_id || raw.id || '').replace(/_/g, ' '),
        text: raw.english || raw.text || '',
      });
      continue;
    }

    const str = String(raw).trim();
    if (!str) continue;

    // Handle stringified Python/JSON list of dicts: "[{'verse_id': ...}]"
    if (str.startsWith('[{') || str.startsWith('{')) {
      try {
        const jsonStr = str.replace(/'/g, '"');
        const parsed = JSON.parse(jsonStr);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of list) {
          results.push({
            id: (item.verse_id || item.id || '').replace(/_/g, ' '),
            text: item.english || item.text || '',
          });
        }
        continue;
      } catch {
        const idMatch = str.match(/verse_id['"]?\s*:\s*['"]([^'"]+)['"]/);
        const textMatch = str.match(/english['"]?\s*:\s*['"]([^'"]+)['"]/);
        if (idMatch || textMatch) {
          results.push({
            id: idMatch ? idMatch[1].replace(/_/g, ' ') : undefined,
            text: textMatch ? textMatch[1] : str,
          });
          continue;
        }
      }
    }

    // Handle "MBH BP CH025 V028: Text" format
    if (str.includes(': "') || str.includes(':"')) {
      const splitIdx = str.indexOf(':');
      const idPart = str.slice(0, splitIdx).trim();
      const textPart = str.slice(splitIdx + 1).trim().replace(/^["']|["']$/g, '');
      results.push({ id: idPart, text: textPart });
      continue;
    }

    results.push({ text: str.replace(/^["']|["']$/g, '') });
  }

  return results;
}

export const SourceCard: React.FC<{ sources: SourceCitation[] }> = ({ sources }) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!sources || sources.length === 0) return null;

  const handleOpenCard = (index: number) => {
    setActiveIndex(index);
    setModalVisible(true);
  };

  const handleNext = () => {
    if (activeIndex < sources.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const activeSource = sources[activeIndex] || sources[0];
  const isMbh = activeSource.epic?.toLowerCase().includes('mahabharata');
  const activeColor = isMbh ? theme.teal : theme.accent;
  const activeSubtle = isMbh ? theme.tealSubtle : theme.accentSubtle;

  // Split story narrative and core teaching if present
  const fullText = activeSource.summary_snippet || '';
  let narrativeText = fullText;
  let principleText = '';

  if (fullText.includes('✨ Core Teaching:')) {
    const parts = fullText.split('✨ Core Teaching:');
    narrativeText = parts[0].trim();
    principleText = parts[1].trim();
  }

  const parsedVerses = parseVerseCitations(activeSource.verse_citations);

  return (
    <View style={s.wrap}>
      <View style={s.headerRow}>
        <Text style={[s.label, { color: theme.textTertiary, fontFamily: label }]}>
          SCRIPTURE SOURCES ({sources.length})
        </Text>
        <Text style={[s.hint, { color: theme.textTertiary, fontFamily: body }]}>
          Tap card to read full story ↗
        </Text>
      </View>

      {/* Horizontal Previews */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {sources.map((src, i) => {
          const itemIsMbh = src.epic?.toLowerCase().includes('mahabharata');
          const color = itemIsMbh ? theme.teal : theme.accent;
          const subtle = itemIsMbh ? theme.tealSubtle : theme.accentSubtle;

          return (
            <FadeSlide key={i} delay={i * 70} duration={250} from="right" distance={15}>
              <Pressable onPress={() => handleOpenCard(i)}>
                <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
                  <View style={[s.stripe, { backgroundColor: color }]} />
                  <View style={s.badges}>
                    <View style={[s.badge, { backgroundColor: subtle }]}>
                      <Text style={[s.badgeText, { color, fontFamily: label }]}>
                        {src.epic || 'Epic'}
                      </Text>
                    </View>
                    {src.character && (
                      <Text style={[s.charText, { color: theme.textSecondary, fontFamily: body }]}>
                        {src.character}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.title, { color: theme.text, fontFamily: serif }]} numberOfLines={2}>
                    {src.scenario_title}
                  </Text>
                  {src.summary_snippet && (
                    <Text style={[s.snippet, { color: theme.textSecondary, fontFamily: body }]} numberOfLines={3}>
                      {src.summary_snippet.replace('✨ Core Teaching:', '• Teaching:')}
                    </Text>
                  )}
                  <View style={s.cardFooter}>
                    <Text style={[s.readMore, { color, fontFamily: label }]}>
                      Read Complete Scripture Card →
                    </Text>
                  </View>
                </View>
              </Pressable>
            </FadeSlide>
          );
        })}
      </ScrollView>

      {/* Full Untruncated Swipeable Popup Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity
            style={s.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />

          <View style={[s.popupContainer, { backgroundColor: theme.bgSecondary, borderColor: theme.surfaceBorder }]}>
            {/* Top Stripe */}
            <View style={[s.modalStripe, { backgroundColor: activeColor }]} />

            {/* Modal Header */}
            <View style={[s.modalHeader, { borderBottomColor: theme.divider }]}>
              <View style={s.modalBadges}>
                <View style={[s.badge, { backgroundColor: activeSubtle }]}>
                  <Text style={[s.badgeText, { color: activeColor, fontFamily: label }]}>
                    {activeSource.epic || 'Epic'}
                  </Text>
                </View>
                {activeSource.character && (
                  <View style={[s.badge, { backgroundColor: theme.bgTertiary }]}>
                    <Text style={[s.charBadgeText, { color: theme.textSecondary, fontFamily: label }]}>
                      👤 {activeSource.character}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[s.closeBtn, { backgroundColor: theme.bgTertiary }]}
              >
                <Text style={[s.closeText, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Scrollable Content */}
            <ScrollView
              style={s.modalScroll}
              contentContainerStyle={s.modalContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Full Title */}
              <Text style={[s.modalTitle, { color: theme.text, fontFamily: serif }]}>
                {activeSource.scenario_title}
              </Text>

              {/* Clean Parsed Verse Citations */}
              {parsedVerses.length > 0 && (
                <View style={[s.citationBox, { backgroundColor: theme.bgTertiary, borderColor: theme.surfaceBorder }]}>
                  <Text style={[s.citationLabel, { color: activeColor, fontFamily: label }]}>
                    📜 SCRIPTURE CHAPTER & VERSE
                  </Text>
                  {parsedVerses.map((v, vIdx) => (
                    <View key={vIdx} style={s.verseItem}>
                      {v.id ? (
                        <View style={[s.verseIdBadge, { backgroundColor: activeSubtle }]}>
                          <Text style={[s.verseIdText, { color: activeColor, fontFamily: label }]}>
                            {v.id}
                          </Text>
                        </View>
                      ) : null}
                      {v.text ? (
                        <Text style={[s.citationText, { color: theme.text, fontFamily: body }]}>
                          "{v.text}"
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {/* Full Untruncated Story Narrative */}
              <View style={s.bodySection}>
                <Text style={[s.sectionHeader, { color: theme.textTertiary, fontFamily: label }]}>
                  📖 FULL NARRATIVE STORY
                </Text>
                <Text style={[s.modalFullText, { color: theme.text, fontFamily: body }]}>
                  {narrativeText}
                </Text>
              </View>

              {/* Core Principle / Teaching Box */}
              {principleText ? (
                <View style={[s.principleBox, { backgroundColor: activeSubtle, borderColor: activeColor }]}>
                  <Text style={[s.principleLabel, { color: activeColor, fontFamily: label }]}>
                    ✨ CORE TEACHING & PRINCIPLE:
                  </Text>
                  <Text style={[s.principleText, { color: theme.text, fontFamily: body }]}>
                    {principleText}
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Modal Footer with Pagination & Navigation Controls */}
            {sources.length > 1 && (
              <View style={[s.modalFooter, { borderTopColor: theme.divider, backgroundColor: theme.surface }]}>
                <TouchableOpacity
                  onPress={handlePrev}
                  disabled={activeIndex === 0}
                  style={[
                    s.navBtn,
                    { backgroundColor: theme.bgTertiary, opacity: activeIndex === 0 ? 0.35 : 1 },
                  ]}
                >
                  <Text style={[s.navBtnText, { color: theme.text, fontFamily: label }]}>← Previous</Text>
                </TouchableOpacity>

                {/* Dots indicator */}
                <View style={s.dotsContainer}>
                  {sources.map((_, dotIdx) => (
                    <TouchableOpacity key={dotIdx} onPress={() => setActiveIndex(dotIdx)}>
                      <View
                        style={[
                          s.dot,
                          {
                            backgroundColor: dotIdx === activeIndex ? activeColor : theme.divider,
                            width: dotIdx === activeIndex ? 18 : 6,
                          },
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleNext}
                  disabled={activeIndex === sources.length - 1}
                  style={[
                    s.navBtn,
                    { backgroundColor: theme.bgTertiary, opacity: activeIndex === sources.length - 1 ? 0.35 : 1 },
                  ]}
                >
                  <Text style={[s.navBtnText, { color: theme.text, fontFamily: label }]}>Next →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  hint: { fontSize: 11, fontStyle: 'italic' },
  card: { width: 270, borderRadius: 14, padding: 14, marginRight: 10, borderWidth: 1, position: 'relative', overflow: 'hidden' },
  stripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 2 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  charText: { fontSize: 11, opacity: 0.8 },
  title: { fontSize: 14, lineHeight: 18, marginBottom: 6 },
  snippet: { fontSize: 12, lineHeight: 17, opacity: 0.75, marginBottom: 8 },
  cardFooter: { marginTop: 'auto', paddingTop: 6 },
  readMore: { fontSize: 11, letterSpacing: 0.2 },

  // Modal Full Screen Pop-up
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  popupContainer: {
    width: Platform.OS === 'web' ? Math.min(SCREEN_WIDTH * 0.9, 580) : '100%',
    maxHeight: '84%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  modalStripe: { height: 4, width: '100%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  charBadgeText: { fontSize: 11 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { fontSize: 14, fontWeight: '700' },
  modalScroll: { flexGrow: 1 },
  modalContent: { padding: 22, paddingBottom: 26 },
  modalTitle: { fontSize: 22, lineHeight: 28, marginBottom: 16 },

  // Verses Citation Box
  citationBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
  },
  citationLabel: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  verseItem: { marginBottom: 6 },
  verseIdBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  verseIdText: { fontSize: 11, letterSpacing: 0.5 },
  citationText: { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  bodySection: { marginBottom: 18 },
  sectionHeader: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  modalFullText: { fontSize: 15, lineHeight: 24 },
  principleBox: { borderRadius: 14, padding: 16, borderWidth: 1.5, marginTop: 4 },
  principleLabel: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  principleText: { fontSize: 14, lineHeight: 22, fontWeight: '600' },

  // Modal Footer Navigation
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  navBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  navBtnText: { fontSize: 12, fontWeight: '700' },
  dotsContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
});
