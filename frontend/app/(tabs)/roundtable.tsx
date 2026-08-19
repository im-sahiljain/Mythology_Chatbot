import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { apiService, SourceCitation } from '../../src/services/api';
import {
  loadAllSessions,
  saveAllSessions,
  createNewSession,
  setActiveSessionId,
  subscribeToSessions,
  fetchSessionDetailFromDb,
  ChatMessage,
  ChatSession,
} from '../../src/services/chatStorage';

import { SourceCard } from '../../src/components/SourceCard';
import { VedicTopBar } from '../../src/components/VedicTopBar';
import { VedicDrawer } from '../../src/components/VedicDrawer';
import { FadeSlide } from '../../src/components/AnimatedComponents';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const label = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';

interface LegendProfile {
  name: string;
  epic: string;
  archetype: string;
  icon: string;
  color: string;
  accent: string;
  quote: string;
}

const AVAILABLE_LEGENDS: LegendProfile[] = [
  {
    name: 'Sita',
    epic: 'Ramayana',
    archetype: 'Unyielding Dignity & Truth',
    icon: '🌸',
    color: '#E0A96D',
    accent: 'rgba(224, 169, 109, 0.15)',
    quote: 'Righteousness is not weakness; it is the inner fire that endures all trials.',
  },
  {
    name: 'Krishna',
    epic: 'Mahabharata',
    archetype: 'Contextual Strategy & Higher Duty',
    icon: '🪶',
    color: '#5C9CE6',
    accent: 'rgba(92, 156, 230, 0.15)',
    quote: 'You have a right to perform your prescribed duty, but you are not entitled to the fruits of action.',
  },
  {
    name: 'Rama',
    epic: 'Ramayana',
    archetype: 'Absolute Idealism & Sacred Vows',
    icon: '🏹',
    color: '#D4AF37',
    accent: 'rgba(212, 175, 55, 0.15)',
    quote: 'Truth is the foundation of all righteous strength; a vow spoken must be a vow upheld.',
  },
  {
    name: 'Arjuna',
    epic: 'Mahabharata',
    archetype: 'Ethical Vulnerability & Focus',
    icon: '🎯',
    color: '#7EBC89',
    accent: 'rgba(126, 188, 137, 0.15)',
    quote: 'When the heart trembles with sorrow, focus on your true purpose to dispel doubt.',
  },
  {
    name: 'Bhishma',
    epic: 'Mahabharata',
    archetype: 'Solemn Duty & Tragic Loyalty',
    icon: '🛡️',
    color: '#B0C4DE',
    accent: 'rgba(176, 196, 222, 0.15)',
    quote: 'Duty without wisdom binds the soul, yet an oath once pledged is one’s immortal measure.',
  },
  {
    name: 'Karna',
    epic: 'Mahabharata',
    archetype: 'Fierce Loyalty & Defiance',
    icon: '🌅',
    color: '#E27D60',
    accent: 'rgba(226, 125, 96, 0.15)',
    quote: 'Destiny may deny me honor by birth, but my bravery and generous spirit belong to me alone.',
  },
  {
    name: 'Vibhishana',
    epic: 'Ramayana',
    archetype: 'Moral Conscience Over Kinship',
    icon: '🕊️',
    color: '#85E3B3',
    accent: 'rgba(133, 227, 179, 0.15)',
    quote: 'When loyalty demands complicity in adharma, true allegiance is to righteousness alone.',
  },
  {
    name: 'Drona',
    epic: 'Mahabharata',
    archetype: 'Mastery & Institutional Constraint',
    icon: '📜',
    color: '#C38D9E',
    accent: 'rgba(195, 141, 158, 0.15)',
    quote: 'Knowledge is the sharpest arrow, but wisdom dictates the target upon which it is aimed.',
  },
  {
    name: 'Sugriva',
    epic: 'Ramayana',
    archetype: 'Alliance & Restored Honor',
    icon: '👑',
    color: '#F4A261',
    accent: 'rgba(244, 162, 97, 0.15)',
    quote: 'In mutual trust between allies, mountains are crossed and lost kingdoms are reclaimed.',
  },
];

const PRESET_COUNCILS = [
  {
    id: 'virtue_strategy',
    title: 'Virtue vs. Strategy',
    members: ['Sita', 'Krishna'],
    desc: 'Balance deep moral dignity with pragmatic, decisive strategy.',
    icon: '⚖️',
  },
  {
    id: 'dharma_pillars',
    title: 'The Pillars of Righteousness',
    members: ['Rama', 'Sita'],
    desc: 'Uncompromising duty, truth, and endurance from the Ramayana.',
    icon: '🏹',
  },
  {
    id: 'warriors_destiny',
    title: 'Warriors of Destiny',
    members: ['Arjuna', 'Karna'],
    desc: 'Two greatest archers debate honor, personal fate, and moral struggle.',
    icon: '🎯',
  },
  {
    id: 'conscience_council',
    title: 'Council of Conscience',
    members: ['Krishna', 'Bhishma', 'Vibhishana'],
    desc: 'Resolve complex institutional loyalty vs. higher ethical truth.',
    icon: '🕊️',
  },
];

export default function RoundtableScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [activeCouncil, setActiveCouncil] = useState<string[]>(['Sita', 'Krishna']);
  const [mutedCouncil, setMutedCouncil] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showMentionDropup, setShowMentionDropup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const screenWidth = Dimensions.get('window').width;

  const handleInputChange = (text: string) => {
    setInput(text);

    // Check if user is typing an '@' mention
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      // If preceding character is also '@' (e.g. '@@') or textAfterAt contains '@', hide dropup!
      if (lastAtIndex > 0 && text[lastAtIndex - 1] === '@') {
        setShowMentionDropup(false);
        setMentionQuery('');
        return;
      }

      const textAfterAt = text.slice(lastAtIndex + 1);
      // If there is no whitespace or extra '@' after '@', active mention dropup is open
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n') && !textAfterAt.includes('@')) {
        setShowMentionDropup(true);
        setMentionQuery(textAfterAt.toLowerCase());
        return;
      }
    }
    setShowMentionDropup(false);
    setMentionQuery('');
  };

  const handleSelectMentionCandidate = (legend: LegendProfile) => {
    // 1. If not yet invited to council, automatically invite and add them!
    if (!activeCouncil.includes(legend.name)) {
      const updatedCouncil = [...activeCouncil, legend.name];
      setActiveCouncil(updatedCouncil);
      if (sessionId) {
        saveRoundtableSession(history, sessionId, updatedCouncil);
      }
    }

    // 2. Replace '@...' with '@Name ' in input
    const lastAtIndex = input.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = input.slice(0, lastAtIndex);
      setInput(`${beforeAt}@${legend.name} `);
    } else {
      setInput((prev) => `${prev}@${legend.name} `);
    }

    setShowMentionDropup(false);
    setMentionQuery('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Session Synchronization
  useEffect(() => {
    const syncState = async () => {
      if (!params.id) {
        // Fresh /roundtable page
        setIsSessionLoading(false);
        setSessionId('');
        setHistory([]);
        setInput('');
        setActiveCouncil(['Sita', 'Krishna']);
        setMutedCouncil([]);
        return;
      }

      const loaded = loadAllSessions();
      const active = loaded.find((s) => s.id === params.id && s.mode === 'roundtable');

      if (active && active.history && active.history.length > 0) {
        setIsSessionLoading(false);
        setSessionId(active.id);
        setActiveSessionId(active.id);
        setHistory(active.history);
        if (active.council && active.council.length > 0) {
          setActiveCouncil(active.council);
        }
        return;
      }

      setIsSessionLoading(true);
      setSessionId(params.id);
      setActiveSessionId(params.id);
      const dbMsgs = await fetchSessionDetailFromDb(params.id);
      setIsSessionLoading(false);

      if (dbMsgs && dbMsgs.length > 0) {
        setHistory(dbMsgs);
        if (active && active.council && active.council.length > 0) {
          setActiveCouncil(active.council);
        }
      } else {
        setHistory([]);
      }
    };


    syncState();

    const unsubscribe = subscribeToSessions((allSessions, activeId) => {
      if (!params.id) return;
      const target = allSessions.find((s) => s.id === params.id);
      if (target && target.history && target.history.length > 0) {
        setSessionId(target.id);
        setHistory(target.history);
        if (target.council && target.council.length > 0) {
          setActiveCouncil(target.council);
        }
      }
    });



    return unsubscribe;
  }, [params.id]);


  const saveRoundtableSession = (
    newHistory: ChatMessage[],
    currentId: string,
    councilMembers: string[]
  ) => {
    if (!currentId) return;
    const all = loadAllSessions();
    const existingIdx = all.findIndex((s) => s.id === currentId);

    let sessionTitle = 'Vedic Roundtable';
    const firstUserMsg = newHistory.find((m) => m.role === 'user');
    if (firstUserMsg) {
      sessionTitle = firstUserMsg.content.slice(0, 32);
      if (firstUserMsg.content.length > 32) sessionTitle += '...';
    }

    const session: ChatSession = {
      id: currentId,
      title: sessionTitle,
      mode: 'roundtable',
      council: councilMembers,
      updatedAt: Date.now(),
      stage: 'follow_up',
      history: newHistory,
    };

    let list: ChatSession[];
    if (existingIdx >= 0) {
      list = [...all];
      list[existingIdx] = session;
    } else {
      list = [session, ...all];
    }
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    saveAllSessions(list, currentId);
  };

  const handleSelectPreset = (preset: (typeof PRESET_COUNCILS)[0]) => {
    setActiveCouncil(preset.members);
    setMutedCouncil([]);
  };

  const handleToggleMute = (characterName: string) => {
    setMutedCouncil((prev) =>
      prev.includes(characterName)
        ? prev.filter((c) => c !== characterName)
        : [...prev, characterName]
    );
  };

  const handleDismissCharacter = (characterName: string) => {
    if (activeCouncil.length <= 1) return; // Keep at least 1 member
    const updated = activeCouncil.filter((c) => c !== characterName);
    setActiveCouncil(updated);
    setMutedCouncil((prev) => prev.filter((c) => c !== characterName));
    if (sessionId) {
      saveRoundtableSession(history, sessionId, updated);
    }
  };

  const handleAddCharacter = (characterName: string) => {
    if (!activeCouncil.includes(characterName)) {
      const updated = [...activeCouncil, characterName];
      setActiveCouncil(updated);
      if (sessionId) {
        saveRoundtableSession(history, sessionId, updated);
      }
    }
    // Keep modal open so user can invite multiple legends manually until clicking ✕
  };

  const handleInsertMention = (charName: string) => {
    setInput((prev) => (prev ? `${prev} @${charName} ` : `@${charName} `));
  };

  const handleSend = async (forcedQuery?: string, isForceResolve: boolean = false) => {
    const textToSend = (forcedQuery || input).trim();
    if (!textToSend || loading) return;

    if (!forcedQuery) setInput('');

    let currentId = sessionId;
    if (!currentId) {
      const newSession = createNewSession(textToSend.slice(0, 32), 'roundtable', undefined, activeCouncil);
      currentId = newSession.id;
      setSessionId(currentId);
      setActiveSessionId(currentId);
      router.setParams({ id: currentId });
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
    };

    const nextHistory = [...history, userMsg];
    setHistory(nextHistory);
    saveRoundtableSession(nextHistory, currentId, activeCouncil);
    setLoading(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const apiHistory = nextHistory.map((m) => ({
        role: m.role,
        content: m.content,
        character: m.character,
        stage: (m as any).stage,
      }));

      const res = await apiService.roundtableChat(
        textToSend,
        activeCouncil,
        mutedCouncil,
        apiHistory,
        isForceResolve,
        currentId
      );

      const newReplies: ChatMessage[] = res.replies.map((r, idx) => ({
        id: (Date.now() + idx + 1).toString(),
        role: 'assistant',
        character: r.character,
        action: r.action,
        content: r.content,
        sources: r.sources || [],
        stage: r.stage || res.stage,
      }));

      const finalHistory = [...nextHistory, ...newReplies];
      setHistory(finalHistory);

      if (res.active_council && res.active_council.length > 0) {
        setActiveCouncil(res.active_council);
      }

      saveRoundtableSession(finalHistory, currentId, res.active_council || activeCouncil);
    } catch {
      const fallback: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        character: activeCouncil[0] || 'Guide',
        content: 'The council listens with deep reverence. When duty is unclear, steady your heart upon righteous action.',
      };
      const finalHistory = [...nextHistory, fallback];
      setHistory(finalHistory);
      saveRoundtableSession(finalHistory, currentId, activeCouncil);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  const getLegendInfo = (name: string): LegendProfile => {
    return (
      AVAILABLE_LEGENDS.find((l) => l.name.toLowerCase() === name.toLowerCase()) || {
        name,
        epic: 'Epics',
        archetype: 'Vedic Guide',
        icon: '👑',
        color: '#D4AF37',
        accent: 'rgba(212, 175, 55, 0.15)',
        quote: '',
      }
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <VedicTopBar onOpenDrawer={() => setDrawerVisible(true)} />
      <VedicDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {/* Top Header Fade Overlay */}
      <View
        style={[
          styles.topFadeOverlay,
          Platform.OS === 'web'
            ? ({
                background: `linear-gradient(to bottom, ${theme.bg} 40%, ${theme.bg}CC 70%, ${theme.bg}00 100%)`,
              } as any)
            : { backgroundColor: 'transparent' },
        ]}
        pointerEvents="none"
      />

      {/* Main Container */}
      <View style={styles.contentWrapper}>
        {/* Chat History & Welcome Deck */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={[styles.chatContent, { paddingTop: 80, paddingBottom: 220 }]}
          showsVerticalScrollIndicator={false}
        >
          {isSessionLoading ? (
            <View style={styles.centerLoaderContainer}>
              <ActivityIndicator size="large" color={theme.primaryContainer} />
              <Text style={[styles.centerLoaderText, { color: theme.secondary, fontFamily: body }]}>
                Loading Council Dialogue...
              </Text>
            </View>
          ) : history.length === 0 ? (
            <FadeSlide delay={50} distance={15}>
              <View style={styles.welcomeContainer}>

                <View style={styles.heroBadge}>
                  <Text style={[styles.heroBadgeText, { color: theme.primary, fontFamily: label }]}>
                    MULTI-LEGEND SABHA
                  </Text>
                </View>
                <Text style={[styles.welcomeTitle, { color: theme.primary, fontFamily: serif }]}>
                  Council of Ancient Wisdom
                </Text>
                <Text style={[styles.welcomeSubtitle, { color: theme.secondary, fontFamily: body }]}>
                  Convene a sacred roundtable of ancient figures. Debate your dilemmas across multiple
                  epic viewpoints simultaneously.
                </Text>

                {/* Preset Council Quick Picks */}
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: serif }]}>
                  Recommended Sabha Presets
                </Text>
                <View style={styles.presetsGrid}>
                  {PRESET_COUNCILS.map((preset) => {
                    const isSelected =
                      preset.members.length === activeCouncil.length &&
                      preset.members.every((m) => activeCouncil.includes(m));

                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.presetCard,
                          {
                            backgroundColor: isSelected ? theme.primaryContainer : theme.surface,
                            borderColor: isSelected ? theme.primary : theme.outlineVariant,
                            shadowColor: theme.shadow,
                          },
                        ]}
                        onPress={() => handleSelectPreset(preset)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 20 }}>{preset.icon}</Text>
                          <Text
                            style={[
                              styles.presetTitle,
                              {
                                color: isSelected ? theme.onPrimaryContainer : theme.text,
                                fontFamily: label,
                              },
                            ]}
                          >
                            {preset.title}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.presetDesc,
                            {
                              color: isSelected ? theme.onPrimaryContainer : theme.secondary,
                              fontFamily: body,
                            },
                          ]}
                        >
                          {preset.desc}
                        </Text>
                        <View style={styles.presetMembersRow}>
                          {preset.members.map((m) => (
                            <View
                              key={m}
                              style={[
                                styles.memberMiniTag,
                                { backgroundColor: theme.surfaceContainerLowest },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.memberMiniTagText,
                                  { color: theme.text, fontFamily: label },
                                ]}
                              >
                                {getLegendInfo(m).icon} {m}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </FadeSlide>
          ) : (
            history.map((msg, index) => {
              const isUser = msg.role === 'user';
              const profile = getLegendInfo(msg.character || 'Guide');

              return (
                <FadeSlide key={msg.id || index} delay={20} distance={10}>
                  {isUser ? (
                    <View style={styles.userMsgRow}>
                      <View
                        style={[
                          styles.userBubble,
                          {
                            backgroundColor: theme.primaryContainer,
                            borderColor: theme.primary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.userMsgText,
                            { color: theme.onPrimaryContainer, fontFamily: body },
                          ]}
                        >
                          {msg.content}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.councilMsgCard,
                        {
                          backgroundColor: theme.surface,
                          borderColor: profile.color,
                          shadowColor: theme.shadow,
                        },
                      ]}
                    >
                      {/* Character Header */}
                      <View
                        style={[
                          styles.speakerHeader,
                          { borderBottomColor: theme.outlineVariant },
                        ]}
                      >
                        <View style={styles.speakerIdentity}>
                          <View
                            style={[
                              styles.speakerAvatarCircle,
                              { backgroundColor: profile.accent },
                            ]}
                          >
                            <Text style={{ fontSize: 18 }}>{profile.icon}</Text>
                          </View>
                          <View>
                            <Text
                              style={[
                                styles.speakerName,
                                { color: profile.color, fontFamily: serif },
                              ]}
                            >
                              {profile.name}
                            </Text>
                            <Text
                              style={[
                                styles.speakerArchetype,
                                { color: theme.secondary, fontFamily: body },
                              ]}
                            >
                              {profile.epic} • {profile.archetype}
                            </Text>
                          </View>
                        </View>

                        {msg.action === 'depart' && (
                          <View
                            style={[
                              styles.actionTag,
                              { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                            ]}
                          >
                            <Text style={{ fontSize: 10.5, color: '#EF4444', fontFamily: label }}>
                              🚪 Departed
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Content */}
                      <Text
                        style={[
                          styles.speakerBodyText,
                          { color: theme.text, fontFamily: body },
                        ]}
                      >
                        {msg.content}
                      </Text>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <View style={{ marginTop: 12 }}>
                          <SourceCard sources={msg.sources} />
                        </View>
                      )}
                    </View>
                  )}
                </FadeSlide>
              );
            })
          )}

          {loading && (
            <View style={[styles.loadingBox, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.secondary, fontFamily: body }]}>
                The Council is deliberating your dilemma...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Fade Gradient Mask */}
        <View
          style={[
            styles.bottomFadeOverlay,
            Platform.OS === 'web'
              ? ({
                  background: `linear-gradient(to top, ${theme.bg} 50%, ${theme.bg}CC 80%, ${theme.bg}00 100%)`,
                } as any)
              : { backgroundColor: 'transparent' },
          ]}
          pointerEvents="none"
        />

        {/* Floating Input Dock with Integrated Council Controls & Mention Autocomplete */}
        <View
          style={[
            styles.dockContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outlineVariant,
              shadowColor: theme.shadow,
            },
          ]}
        >
          {/* Integrated Council Header & Active Member Chips */}
          <View style={styles.councilBarTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>🪷</Text>
              <Text style={[styles.councilBarTitle, { color: theme.primary, fontFamily: serif }]}>
                Vedic Council
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.inviteBtn, { backgroundColor: theme.primaryContainer }]}
              onPress={() => setInviteModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.inviteBtnText, { color: theme.onPrimaryContainer, fontFamily: label }]}>
                ➕ Invite Legend
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Council Member Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.councilChipsScroll}
          >
            {activeCouncil.map((charName) => {
              const profile = getLegendInfo(charName);
              const isMuted = mutedCouncil.includes(charName);

              return (
                <View
                  key={charName}
                  style={[
                    styles.councilChip,
                    {
                      backgroundColor: isMuted ? theme.surfaceContainerLowest : profile.accent,
                      borderColor: isMuted ? theme.outlineVariant : profile.color,
                      opacity: isMuted ? 0.6 : 1,
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleInsertMention(charName)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.councilChipName, { color: theme.text, fontFamily: label }]}>
                      @{charName}
                    </Text>
                  </TouchableOpacity>

                  {/* Mute Toggle */}
                  <TouchableOpacity
                    style={[styles.chipActionBtn, { backgroundColor: theme.surface }]}
                    onPress={() => handleToggleMute(charName)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 11 }}>{isMuted ? '🔇' : '🔊'}</Text>
                  </TouchableOpacity>

                  {/* Dismiss Button */}
                  {activeCouncil.length > 1 && (
                    <TouchableOpacity
                      style={[styles.chipActionBtn, { backgroundColor: theme.surface }]}
                      onPress={() => handleDismissCharacter(charName)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 10, color: theme.secondary }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Autocomplete Dropup when typing @ */}
          {showMentionDropup && (
            <View
              style={[
                styles.mentionDropupCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.outlineVariant,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <View style={[styles.dropupHeader, { borderBottomColor: theme.outlineVariant }]}>
                <Text style={[styles.dropupHeaderTitle, { color: theme.secondary, fontFamily: label }]}>
                  SELECT LEGEND TO ADDRESS & INVITE
                </Text>
                <TouchableOpacity onPress={() => setShowMentionDropup(false)}>
                  <Text style={{ fontSize: 13, color: theme.secondary }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {AVAILABLE_LEGENDS.filter((l) =>
                  l.name.toLowerCase().includes(mentionQuery) ||
                  l.archetype.toLowerCase().includes(mentionQuery) ||
                  l.epic.toLowerCase().includes(mentionQuery)
                ).map((legend) => {
                  const isInCouncil = activeCouncil.includes(legend.name);

                  return (
                    <TouchableOpacity
                      key={legend.name}
                      style={[
                        styles.dropupRow,
                        {
                          backgroundColor: theme.surfaceContainerLowest,
                          borderColor: isInCouncil ? theme.outlineVariant : legend.color,
                        },
                      ]}
                      onPress={() => handleSelectMentionCandidate(legend)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Text style={{ fontSize: 20 }}>{legend.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.dropupName, { color: theme.text, fontFamily: serif }]}>
                              {legend.name}
                            </Text>
                            <Text style={[styles.dropupEpic, { color: theme.secondary, fontFamily: label }]}>
                              ({legend.epic})
                            </Text>
                          </View>
                          <Text style={[styles.dropupArchetype, { color: theme.secondary, fontFamily: body }]} numberOfLines={1}>
                            {legend.archetype}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.dropupTag,
                          {
                            backgroundColor: isInCouncil ? 'rgba(74, 222, 128, 0.12)' : theme.primaryContainer,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropupTagText,
                            {
                              color: isInCouncil ? '#16A34A' : theme.onPrimaryContainer,
                              fontFamily: label,
                            },
                          ]}
                        >
                          {isInCouncil ? '● In Council' : '➕ Add & Tag'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Seek Counsel Now Button (during Interviewing Stage) */}
          {history.length > 0 && (history[history.length - 1] as any).stage === 'interviewing' && (
            <TouchableOpacity
              style={[
                styles.forceResolveBtn,
                { backgroundColor: theme.primaryContainer, borderColor: theme.primary },
              ]}
              onPress={() => handleSend("Please deliver your final council now.", true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.forceResolveText, { color: theme.onPrimaryContainer, fontFamily: label }]}>
                ⚡ Seek Counsel Now (Deliver Scripture Wisdom)
              </Text>
            </TouchableOpacity>
          )}

          {/* Input Row */}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  color: theme.text,
                  backgroundColor: theme.surfaceContainerLowest,
                  borderColor: theme.outlineVariant,
                  fontFamily: body,
                },
              ]}
              placeholder="Type @ to summon legends, e.g. '@Krishna what should I do?'"
              placeholderTextColor={theme.textTertiary}
              value={input}
              onChangeText={handleInputChange}
              multiline
              maxLength={1000}
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: input.trim() && !loading ? theme.primaryContainer : theme.outlineVariant,
                },
              ]}
              onPress={() => handleSend()}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 18, color: theme.onPrimaryContainer }}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Invite Legend Modal */}
      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setInviteModalVisible(false)}
          />
          <View
            style={[
              styles.inviteModalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.outlineVariant,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.outlineVariant }]}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.primary, fontFamily: serif }]}>
                  Invite to Council
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.secondary, fontFamily: body }]}>
                  Add another epic legend to your active discussion
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setInviteModalVisible(false)}
                style={[styles.closeBtn, { borderColor: theme.outlineVariant }]}
              >
                <Text style={{ fontSize: 16, color: theme.text }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {AVAILABLE_LEGENDS.map((legend) => {
                const isAlreadyInCouncil = activeCouncil.includes(legend.name);

                return (
                  <TouchableOpacity
                    key={legend.name}
                    style={[
                      styles.legendInviteRow,
                      {
                        backgroundColor: isAlreadyInCouncil
                          ? theme.surfaceContainerLowest
                          : theme.surface,
                        borderColor: theme.outlineVariant,
                        opacity: isAlreadyInCouncil ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => handleAddCharacter(legend.name)}
                    disabled={isAlreadyInCouncil}
                    activeOpacity={0.8}
                  >
                    <View style={styles.legendInviteInfo}>
                      <Text style={{ fontSize: 24 }}>{legend.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.legendInviteName, { color: theme.text, fontFamily: serif }]}>
                          {legend.name}
                        </Text>
                        <Text
                          style={[styles.legendInviteArchetype, { color: theme.secondary, fontFamily: body }]}
                        >
                          {legend.epic} • {legend.archetype}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.inviteActionBadge,
                        {
                          backgroundColor: isAlreadyInCouncil
                            ? theme.surfaceContainerLowest
                            : theme.primaryContainer,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.inviteActionBadgeText,
                          {
                            color: isAlreadyInCouncil ? theme.secondary : theme.onPrimaryContainer,
                            fontFamily: label,
                          },
                        ]}
                      >
                        {isAlreadyInCouncil ? 'Present' : '➕ Invite'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  councilBar: {
    width: '100%',
    maxWidth: 820,
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  councilBarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  councilBarTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  inviteBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  councilChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  councilChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  councilChipName: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipActionBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  chatScroll: {
    flex: 1,
    width: '100%',
  },
  chatContent: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  heroBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14.5,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 580,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  presetsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetCard: {
    flex: 1,
    minWidth: 260,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  presetTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  presetDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 10,
  },
  presetMembersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  memberMiniTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  memberMiniTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userMsgRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  userBubble: {
    maxWidth: '85%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    borderWidth: 1,
  },
  userMsgText: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  councilMsgCard: {
    width: '100%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  speakerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  speakerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  speakerAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerName: {
    fontSize: 17,
    fontWeight: '700',
  },
  speakerArchetype: {
    fontSize: 11.5,
    marginTop: 1,
  },
  actionTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  speakerBodyText: {
    fontSize: 14.5,
    lineHeight: 23,
  },
  sourcesWrapper: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  sourcesHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceSnippetChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 240,
  },
  sourceChipTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  sourceChipMeta: {
    fontSize: 10.5,
    marginTop: 2,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'center',
    marginVertical: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  mentionDropupCard: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  dropupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  dropupHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dropupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  dropupName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  dropupEpic: {
    fontSize: 11,
    fontWeight: '600',
  },
  dropupArchetype: {
    fontSize: 11,
    marginTop: 1,
  },
  dropupTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  dropupTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  forceResolveBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forceResolveText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topFadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 10,
  },
  bottomFadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    zIndex: 5,
  },
  dockContainer: {
    position: 'absolute',
    bottom: 16,
    width: '92%',
    maxWidth: 820,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 10,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    zIndex: 20,
  },
  mentionChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  mentionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginRight: 2,
  },
  mentionChip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  mentionChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 14,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }),
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  inviteModalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendInviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  legendInviteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  legendInviteName: {
    fontSize: 16,
    fontWeight: '700',
  },
  legendInviteArchetype: {
    fontSize: 12,
    marginTop: 1,
  },
  inviteActionBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  inviteActionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centerLoaderContainer: {
    paddingVertical: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  centerLoaderText: {
    fontSize: 14,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
});

