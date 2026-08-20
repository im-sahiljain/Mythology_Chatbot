import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Pressable as RNPressable,
  useWindowDimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Carousel, type CarouselRef } from "react-native-reanimated-carousel";
import { apiService, SourceCitation } from "../../src/services/api";
import { StreamingText } from "../../src/components/StreamingText";
import { SourceCard } from "../../src/components/SourceCard";
import { useTheme } from "../../src/context/ThemeContext";
import { FadeSlide, TypingDots } from "../../src/components/AnimatedComponents";
import { VedicDrawer } from "../../src/components/VedicDrawer";
import { VedicTopBar } from "../../src/components/VedicTopBar";

const serif =
  Platform.OS === "web"
    ? "'EB Garamond', Georgia, serif"
    : "EBGaramond_700Bold";
const body =
  Platform.OS === "web"
    ? "'Hanken Grotesk', sans-serif"
    : "HankenGrotesk_400Regular";
const bold =
  Platform.OS === "web"
    ? "'Hanken Grotesk', sans-serif"
    : "HankenGrotesk_700Bold";
const label =
  Platform.OS === "web"
    ? "'Hanken Grotesk', sans-serif"
    : "HankenGrotesk_600SemiBold";

import {
  loadAllSessions,
  saveAllSessions,
  getActiveSessionId,
  setActiveSessionId,
  createNewSession,
  subscribeToSessions,
  fetchSessionDetailFromDb,
  ChatMessage,
  ChatSession,
} from "../../src/services/chatStorage";

// ─── Character Data ────────────────────────────────────────────

export interface GuideCard {
  name: string;
  epic: "Ramayana" | "Mahabharata" | "Both";
  category: string;
  role: string;
  subtitle: string;
  imageUrl: string;
  quote: string;
  icon: string;
}

const ALL_CHARACTERS: GuideCard[] = [
  // ── 1. Major Heroes & Guides (12) ──
  {
    name: "Krishna",
    epic: "Mahabharata",
    category: "Major Heroes & Guides",
    role: "Divine Strategist",
    subtitle: "Karma & Svadharma",
    icon: "🪶",
    // imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvy6FRDn2yeF0ZDAQ68lRMvO-idwqZ8BX_rPH9sULF1u4k8rHqyhhCbIQ4g1W-0dqCJg_p6OC5YIq2SBGlvh2yugr56Bm05mx-2b6wWnu5SeO-Hj_ksa9mz36vxX5K_TMEn4DAMT-o0ToGqDPI7rA4hG6ugmN8JMBmhyx-k3SSZpnwHN6Cmj2xXQFpeJ2zljs5B0oWLSBabHJASbFmXZJAJMRNPeOiwKPc0WClp1YoQWStEmp60skyLQ',
    imageUrl:
      "https://res.cloudinary.com/dagkrnoap/image/upload/q_auto/f_auto/w_500/h_667/v1787224937/Gemini_Generated_Image_68wuqy68wuqy68wu_yzl158.png",
    quote:
      '"You have a right to perform your prescribed duty, but you are not entitled to the fruits of action."',
  },
  {
    name: "Rama",
    epic: "Ramayana",
    category: "Major Heroes & Guides",
    role: "Maryada Purushottam",
    subtitle: "Absolute Dharma & Duty",
    icon: "🏹",
    imageUrl:
      "https://res.cloudinary.com/dagkrnoap/image/upload/q_auto/f_auto/w_500/h_667/v1787225852/Gemini_Generated_Image_ppmhznppmhznppmh_fzb4li.png",
    quote:
      '"Dharma is subtle. The wise know its course by following the path of righteousness."',
  },
  {
    name: "Arjuna",
    epic: "Mahabharata",
    category: "Major Heroes & Guides",
    role: "Moral Hesitation & Duty",
    subtitle: "Reluctant Warrior",
    icon: "🎯",
    imageUrl:
      "https://res.cloudinary.com/dagkrnoap/image/upload/q_auto/f_auto/w_500/h_667/v1787225681/Gemini_Generated_Image_epem8qepem8qepem_ydc4nz.png",
    quote:
      '"My limbs fail and my mouth becomes dry. How can any good come from killing my own kinsmen?"',
  },
  {
    name: "Hanuman",
    epic: "Ramayana",
    category: "Major Heroes & Guides",
    role: "Supreme Devotion",
    subtitle: "Strength through Surrender",
    icon: "🙏",
    imageUrl:
      "https://res.cloudinary.com/dagkrnoap/image/upload/q_auto/f_auto/w_500/h_667/v1787225286/Gemini_Generated_Image_rzo6farzo6farzo6_qmhfkn.png",
    quote:
      '"When you do the work of God, all the forces of nature work alongside you."',
  },
  {
    name: "Yudhishthira",
    epic: "Mahabharata",
    category: "Major Heroes & Guides",
    role: "Dharma King",
    subtitle: "Justice & Truth Above All",
    icon: "⚖️",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"The greatest sorrow is the sorrow of seeing duty and desire pull in opposite directions."',
  },
  {
    name: "Bhima",
    epic: "Mahabharata",
    category: "Major Heroes & Guides",
    role: "Protector & Valor",
    subtitle: "Strength with Heart",
    icon: "💪",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Let might serve the meek. Strength without compassion is tyranny."',
  },
  {
    name: "Lakshmana",
    epic: "Ramayana",
    category: "Major Heroes & Guides",
    role: "Brotherly Loyalty",
    subtitle: "Selfless Devotion",
    icon: "🤝",
    imageUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Where Rama walks, there walk I. No forest is exile when dharma walks beside you."',
  },
  {
    name: "Karna",
    epic: "Mahabharata",
    category: "Major Heroes & Guides",
    role: "Unwavering Loyalty",
    subtitle: "Tragic Hero",
    icon: "🌅",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Duryodhana gave me honor when the world gave me shame. I shall not abandon my friend in war."',
  },
  {
    name: "Vibhishana",
    epic: "Ramayana",
    category: "Major Heroes & Guides",
    role: "Righteous Whistleblowing",
    subtitle: "Truth over Kinship",
    icon: "🛡️",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    quote:
      '"When a king abandons dharma, true loyalty demands speaking the truth, even if cast out as a traitor."',
  },
  {
    name: "Bhishma",
    epic: "Mahabharata",
    category: "Major Heroes & Guides",
    role: "Solemn Duty & Vows",
    subtitle: "Grand Patriarch",
    icon: "🔱",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"I chose my vow over a kingdom. Sometimes the greatest power lies in renunciation."',
  },
  {
    name: "Abhimanyu",
    epic: "Mahabharata",
    category: "Major Heroes & Guides",
    role: "Fearless Youth",
    subtitle: "Courage in the Chakravyuha",
    icon: "⚔️",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"I enter the labyrinth knowing I may not return. The warrior\'s call accepts no half-measures."',
  },
  {
    name: "Vidura",
    epic: "Mahabharata",
    category: "Major Heroes & Guides",
    role: "Moral Conscience",
    subtitle: "Voice of Reason",
    icon: "📜",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Knowledge is the ornament of kings; righteousness is their armor."',
  },

  // ── 2. Queens & Heroines (10) ──
  {
    name: "Sita",
    epic: "Ramayana",
    category: "Queens & Heroines",
    role: "Moral Dignity & Dharma",
    subtitle: "Princess of Mithila",
    icon: "🌸",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDFb6Kk0BzbFNK6vaa61WLC1GhK3P5GfbepMaVR_URnbMpLSeS-BKvJj40LOPlR26D8vIJ79Xdi_MLRNWvjhKMsGh9D_lHrELz_ASLV8PWcF_pEpeb-wbeyi0R_x1Ym6iXCmXdRfXUKCXbk7dssz2IgdKEddNkhTz16p5z8C63i8XRTqSAHsTiZmGRSY9-pAf-uV4w5ip3ggTmSOMYUYIK_tcUK-aOeG-QS1TJQSvgsjRBtj2cqo-pPCQ",
    quote:
      '"In the Ashoka Grove, I faced not just the demon king, but the shadows of despair. Yet, my dharma remained unyielding."',
  },
  {
    name: "Draupadi",
    epic: "Mahabharata",
    category: "Queens & Heroines",
    role: "Justice & Fortitude",
    subtitle: "Fire-Born Queen",
    icon: "🔥",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"A court that watches injustice in silence has already fallen. I will not be silent."',
  },
  {
    name: "Kunti",
    epic: "Mahabharata",
    category: "Queens & Heroines",
    role: "Sacrifice & Motherhood",
    subtitle: "Bearer of Secrets",
    icon: "🕊️",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    quote:
      '"A mother\'s duty sometimes demands carrying the heaviest truth in absolute silence."',
  },
  {
    name: "Gandhari",
    epic: "Mahabharata",
    category: "Queens & Heroines",
    role: "Impartiality & Grief",
    subtitle: "Blindfolded Queen",
    icon: "🖤",
    imageUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    quote:
      '"I bound my eyes in solidarity. But blindness to a son\'s sins is a different darkness."',
  },
  {
    name: "Savitri",
    epic: "Mahabharata",
    category: "Queens & Heroines",
    role: "Devotion Conquers Death",
    subtitle: "Defied Yama",
    icon: "🌺",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Neither fear nor fate shall turn me back. I walk after my husband even into the realm of death."',
  },
  {
    name: "Damayanti",
    epic: "Mahabharata",
    category: "Queens & Heroines",
    role: "Love & Resilience",
    subtitle: "Chose Nala Over Gods",
    icon: "💎",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Even when the gods themselves stood before me, my heart chose the mortal who walked in truth."',
  },
  {
    name: "Tara",
    epic: "Ramayana",
    category: "Queens & Heroines",
    role: "Strategic Counsel",
    subtitle: "Queen of Kishkindha",
    icon: "👑",
    imageUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Do not let unbridled fury blind your wisdom. Even the mightiest warrior falls when counsel is ignored."',
  },
  {
    name: "Mandodari",
    epic: "Ramayana",
    category: "Queens & Heroines",
    role: "Moral Conscience",
    subtitle: "Queen of Lanka",
    icon: "🌙",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Righteousness alone preserves a kingdom. No fortress of gold can withstand the tide of adharma."',
  },
  {
    name: "Shakuntala",
    epic: "Mahabharata",
    category: "Queens & Heroines",
    role: "Purity & Dignity",
    subtitle: "Mother of Emperor Bharata",
    icon: "🌿",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"A wife is half the man, his best of friends, the root of all three goals of life."',
  },
  {
    name: "Subhadra",
    epic: "Mahabharata",
    category: "Queens & Heroines",
    role: "Grace & Valor",
    subtitle: "Mother of Abhimanyu",
    icon: "✨",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"The courage of a mother shines in raising heroes who know neither fear nor deceit."',
  },

  // ── 3. Kings, Rulers & Antagonists (10) ──
  {
    name: "Ravana",
    epic: "Ramayana",
    category: "Kings & Antagonists",
    role: "Hubris & Brilliance",
    subtitle: "Scholar-Demon King",
    icon: "👿",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"My ten heads held the knowledge of all Vedas. Yet unchecked desire consumed them all."',
  },
  {
    name: "Duryodhana",
    epic: "Mahabharata",
    category: "Kings & Antagonists",
    role: "Ambition & Stubbornness",
    subtitle: "Crown Prince of Kuru",
    icon: "👑",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"I know what dharma is, yet I cannot follow it. I know what adharma is, yet I cannot avoid it."',
  },
  {
    name: "Sugriva",
    epic: "Ramayana",
    category: "Kings & Antagonists",
    role: "Alliance King",
    subtitle: "Vanara Sovereign",
    icon: "🐵",
    imageUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    quote:
      '"In Rama I found a friend who honored his pledge; in return, the entire Vanara realm marches for Sita."',
  },
  {
    name: "Dasharatha",
    epic: "Ramayana",
    category: "Kings & Antagonists",
    role: "Fatherly Affection",
    subtitle: "Bound by Promises",
    icon: "🏛️",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      "\"A king's word once given cannot be withdrawn—even when it shatters a father's heart.\"",
  },
  {
    name: "Janaka",
    epic: "Ramayana",
    category: "Kings & Antagonists",
    role: "Philosopher King",
    subtitle: "Karma Yogi Ruler",
    icon: "🌾",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Even while ruling a kingdom, one can remain completely detached from worldly illusion."',
  },
  {
    name: "Bharata",
    epic: "Ramayana",
    category: "Kings & Antagonists",
    role: "Selfless Stewardship",
    subtitle: "Regent of the Sandals",
    icon: "👡",
    imageUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    quote:
      '"The throne belongs to Rama alone. I serve merely as the keeper of his sacred padukas."',
  },
  {
    name: "Dhritarashtra",
    epic: "Mahabharata",
    category: "Kings & Antagonists",
    role: "Blind Attachment",
    subtitle: "Tragic Monarch",
    icon: "👁️",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"My paternal love was my greatest blindfold. When desire overtakes justice, ruin follows."',
  },
  {
    name: "Shantanu",
    epic: "Mahabharata",
    category: "Kings & Antagonists",
    role: "Duty & Destiny",
    subtitle: "King of Hastinapura",
    icon: "🌊",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote: '"Human longing often binds the destiny of generations to come."',
  },
  {
    name: "Vali",
    epic: "Ramayana",
    category: "Kings & Antagonists",
    role: "Undefeated Might",
    subtitle: "Fallen King of Kishkindha",
    icon: "🥊",
    imageUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Unchecked strength without discernment leads even the victorious to their downfall."',
  },
  {
    name: "Yayati",
    epic: "Mahabharata",
    category: "Kings & Antagonists",
    role: "Desire & Renunciation",
    subtitle: "Lunar Dynasty Monarch",
    icon: "⏳",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Desire never ends by fulfillment; it only flares up like fire fed by clarified butter."',
  },

  // ── 4. Sages, Gurus & Ascetics (12) ──
  {
    name: "Drona",
    epic: "Mahabharata",
    category: "Sages & Gurus",
    role: "Master Preceptor",
    subtitle: "Archery Guru",
    icon: "🏹",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"A teacher judges not by birth, but by unyielding focus and reverence for the sacred bow."',
  },
  {
    name: "Vyasa",
    epic: "Both",
    category: "Sages & Gurus",
    role: "Cosmic Chronicler",
    subtitle: "Author of the Epics",
    icon: "✍️",
    imageUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    quote:
      '"What is found here may be found elsewhere. What is not found here will be found nowhere."',
  },
  {
    name: "Vishvamitra",
    epic: "Ramayana",
    category: "Sages & Gurus",
    role: "Willpower & Penance",
    subtitle: "King Turned Brahmarishi",
    icon: "🔥",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    quote:
      '"From king to sage—the fire of tapas transforms the impossible into the inevitable."',
  },
  {
    name: "Valmiki",
    epic: "Ramayana",
    category: "Sages & Gurus",
    role: "Transformation & Poetry",
    subtitle: "Adi Kavi",
    icon: "📖",
    imageUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    quote:
      '"From a life of shadows emerged the first verse—born from compassion for a wounded crane."',
  },
  {
    name: "Vashistha",
    epic: "Ramayana",
    category: "Sages & Gurus",
    role: "Spiritual Equanimity",
    subtitle: "Royal Kulaguru",
    icon: "🧘",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Purity of intellect and steadfast peace of mind overcome all celestial curses."',
  },
  {
    name: "Agastya",
    epic: "Both",
    category: "Sages & Gurus",
    role: "Master of Nature",
    subtitle: "Giver of the Aditya Hridaya",
    icon: "🌊",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    quote:
      '"When doubts surround you in battle, fix your mind on the eternal radiance of the Sun."',
  },
  {
    name: "Parashurama",
    epic: "Both",
    category: "Sages & Gurus",
    role: "Righteous Wrath",
    subtitle: "Avatar of the Battleaxe",
    icon: "🪓",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Power without righteousness is corruption; austerity without discipline is vanity."',
  },
  {
    name: "Kripacharya",
    epic: "Mahabharata",
    category: "Sages & Gurus",
    role: "Royal Preceptor",
    subtitle: "Immortal Teacher",
    icon: "📜",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"True knowledge guides the student toward righteousness, not towards senseless destruction."',
  },
  {
    name: "Narada",
    epic: "Both",
    category: "Sages & Gurus",
    role: "Cosmic Catalyst",
    subtitle: "Divine Messenger",
    icon: "🪕",
    imageUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    quote:
      '"In every cosmic turning, devotional joy and truth dissolve the deepest illusions of Maya."',
  },
  {
    name: "Durvasa",
    epic: "Both",
    category: "Sages & Gurus",
    role: "Fiery Discipline",
    subtitle: "Tester of Virtues",
    icon: "⚡",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Hospitality and devotion must be genuine. False humility invites the wrath of truth."',
  },
  {
    name: "Shukracharya",
    epic: "Both",
    category: "Sages & Gurus",
    role: "Master of Sanjivani",
    subtitle: "Preceptor of Asuras",
    icon: "👁️",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Wisdom serves whoever earns it through relentless penance, regardless of their realm."',
  },
  {
    name: "Brihaspati",
    epic: "Both",
    category: "Sages & Gurus",
    role: "Counselor of Devas",
    subtitle: "Master of Sacred Wisdom",
    icon: "🌟",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Diplomacy, patience, and righteous intellect are far sharper than the thunderbolt of Indra."',
  },

  // ── 5. Warriors, Allies & Devas (10) ──
  {
    name: "Jatayu",
    epic: "Ramayana",
    category: "Warriors & Allies",
    role: "Supreme Sacrifice",
    subtitle: "Noble Vulture King",
    icon: "🦅",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Even with shattered wings, I fought—for when dharma calls, age and body do not matter."',
  },
  {
    name: "Ashvatthama",
    epic: "Mahabharata",
    category: "Warriors & Allies",
    role: "Uncontrolled Vengeance",
    subtitle: "Cursed Immortal",
    icon: "💀",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Rage consumed what honor had built. The price of vengeance is immortality in suffering."',
  },
  {
    name: "Ghatotkacha",
    epic: "Mahabharata",
    category: "Warriors & Allies",
    role: "Ultimate Sacrifice",
    subtitle: "Rakshasa Son of Bhima",
    icon: "⚡",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      "\"I gave my life to shield Arjuna. A son's love for his father's cause knows no limits.\"",
  },
  {
    name: "Garuda",
    epic: "Both",
    category: "Warriors & Allies",
    role: "Duty & Liberation",
    subtitle: "King of Birds",
    icon: "🦅",
    imageUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    quote:
      '"I carried the nectar of the gods—not for myself, but to free my mother from bondage."',
  },
  {
    name: "Nakula",
    epic: "Mahabharata",
    category: "Warriors & Allies",
    role: "Equine & Healing Lore",
    subtitle: "Fourth Pandava",
    icon: "🐴",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"True humility lies in mastering your craft quietly without demanding applause."',
  },
  {
    name: "Sahadeva",
    epic: "Mahabharata",
    category: "Warriors & Allies",
    role: "Silent Foreknowledge",
    subtitle: "Wisest of the Pandavas",
    icon: "🔮",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Knowing the future is a heavy burden when dharma commands silence until asked."',
  },
  {
    name: "Satyaki",
    epic: "Mahabharata",
    category: "Warriors & Allies",
    role: "Fierce Devotion",
    subtitle: "Vrishni Chieftain",
    icon: "🗡️",
    imageUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    quote:
      '"My devotion to Krishna and Arjuna never wavered, even when the cosmos was in turmoil."',
  },
  {
    name: "Angada",
    epic: "Ramayana",
    category: "Warriors & Allies",
    role: "Courageous Envoy",
    subtitle: "Prince of Kishkindha",
    icon: "🛡️",
    imageUrl:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Let Ravana\'s entire court try to move my foot—such is the unyielding power of righteous faith."',
  },
  {
    name: "Shikhandi",
    epic: "Mahabharata",
    category: "Warriors & Allies",
    role: "Destiny & Purpose",
    subtitle: "Instrument of Cosmic Fate",
    icon: "🏹",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    quote:
      '"Through lifetimes of patience, destiny finds its moment to balance the cosmic scales."',
  },
  {
    name: "Ekalavya",
    epic: "Mahabharata",
    category: "Warriors & Allies",
    role: "Unmatched Guru-Bhakti",
    subtitle: "Nishada Archer",
    icon: "🎯",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"I surrendered my right thumb without hesitation, proving that true reverence transcends all tests."',
  },
];

// Backward compatibility
export const GUIDE_CHARACTERS = ALL_CHARACTERS;

// ─── Category Definitions ──────────────────────────────────────

interface CategoryDef {
  label: string;
  icon: string;
  filter: (c: GuideCard) => boolean;
}

const CATEGORIES: CategoryDef[] = [
  { label: "All", icon: "🪷", filter: () => true },
  {
    label: "Ramayana",
    icon: "🏹",
    filter: (c) => c.epic === "Ramayana" || c.epic === "Both",
  },
  {
    label: "Mahabharata",
    icon: "🎯",
    filter: (c) => c.epic === "Mahabharata" || c.epic === "Both",
  },
  {
    label: "Heroes",
    icon: "⚔️",
    filter: (c) => c.category === "Major Heroes & Guides",
  },
  {
    label: "Queens",
    icon: "👑",
    filter: (c) => c.category === "Queens & Heroines",
  },
  { label: "Sages", icon: "📜", filter: (c) => c.category === "Sages & Gurus" },
  {
    label: "Warriors",
    icon: "🛡️",
    filter: (c) =>
      c.category === "Warriors & Allies" ||
      c.category === "Kings & Antagonists",
  },
];

// ─── Chat Types ────────────────────────────────────────────────

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  stage?: "interviewing" | "resolved" | "follow_up";
  sources?: SourceCitation[];
}

// ─── Main Screen ───────────────────────────────────────────────

export default function PersonaScreen() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [selectedGuide, setSelectedGuide] = useState<GuideCard>(
    ALL_CHARACTERS[0],
  );
  const [sessionId, setSessionId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [hasStartedConsultation, setHasStartedConsultation] = useState(false);
  const [currentStage, setCurrentStage] = useState<
    "interviewing" | "resolved" | "follow_up"
  >("interviewing");
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showMentionDropup, setShowMentionDropup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const [history, setHistory] = useState<ChatMsg[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const consultationInputRef = useRef<TextInput>(null);

  // Responsive dimensions
  const isMobile = screenWidth < 768;
  const containerWidth = isMobile ? screenWidth : Math.min(screenWidth, 900);
  const CARD_WIDTH = isMobile ? Math.round(screenWidth * 0.62) : 280;
  const CARD_HEIGHT = isMobile
    ? Math.min(340, Math.round(screenHeight * 0.4))
    : 360;

  const carouselRef = useRef<CarouselRef>(null);

  // Filter characters by active category
  const filteredCharacters = ALL_CHARACTERS.filter(
    CATEGORIES[activeCategory].filter,
  );

  // Animated values for the about section
  const aboutOpacity = useSharedValue(1);
  const aboutTranslateY = useSharedValue(0);

  const aboutAnimatedStyle = useAnimatedStyle(() => ({
    opacity: aboutOpacity.value,
    transform: [{ translateY: aboutTranslateY.value }],
  }));

  const handleSnapToItem = useCallback(
    (index: number) => {
      const validIndex = Math.max(
        0,
        Math.min(index, filteredCharacters.length - 1),
      );
      setActiveIndex(validIndex);
      if (filteredCharacters[validIndex]) {
        aboutOpacity.value = withTiming(0, { duration: 100 }, () => {
          aboutOpacity.value = withTiming(1, { duration: 180 });
        });
        aboutTranslateY.value = withTiming(-4, { duration: 100 }, () => {
          aboutTranslateY.value = withSpring(0, {
            damping: 14,
            stiffness: 120,
          });
        });
        setSelectedGuide(filteredCharacters[validIndex]);
      }
    },
    [filteredCharacters, aboutOpacity, aboutTranslateY],
  );

  // Handle typing inside input box and detect '@'
  const handleInputChange = (text: string) => {
    setInput(text);

    const lastAtIndex = text.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      if (lastAtIndex > 0 && text[lastAtIndex - 1] === "@") {
        setShowMentionDropup(false);
        setMentionQuery("");
        return;
      }
      const textAfterAt = text.slice(lastAtIndex + 1);
      if (
        !textAfterAt.includes(" ") &&
        !textAfterAt.includes("\n") &&
        !textAfterAt.includes("@")
      ) {
        setShowMentionDropup(true);
        setMentionQuery(textAfterAt.toLowerCase());
        return;
      }
    }
    setShowMentionDropup(false);
    setMentionQuery("");
  };

  // Select 1 character from @ mention dropup and start consultation immediately
  const handleSelectMentionCharacter = (character: GuideCard) => {
    // Extract any existing query text user had typed
    let queryText = "";
    const lastAtIndex = input.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      queryText = input.slice(0, lastAtIndex).trim();
    } else {
      queryText = input.trim();
    }

    setInput("");
    setShowMentionDropup(false);
    setMentionQuery("");

    // Start consultation immediately with selected character
    handleSelectGuideAndStart(character, queryText);
  };

  const toggleMentionDropup = () => {
    if (showMentionDropup) {
      setShowMentionDropup(false);
      setMentionQuery("");
    } else {
      setShowMentionDropup(true);
      setMentionQuery("");
      if (!input.includes("@")) {
        setInput((prev) => (prev ? `${prev} @` : "@"));
      }
      setTimeout(() => {
        inputRef.current?.focus();
        consultationInputRef.current?.focus();
      }, 50);
    }
  };

  // Reset carousel when category changes
  useEffect(() => {
    setActiveIndex(0);
    if (filteredCharacters.length > 0) {
      setSelectedGuide(filteredCharacters[0]);
    }
    carouselRef.current?.scrollTo({ index: 0, animated: false });
  }, [activeCategory]);

  // ─── Session Restore Logic (identical to original) ──────────

  useEffect(() => {
    const syncSession = () => {
      if (!params.id) {
        setSessionId("");
        setHasStartedConsultation(false);
        setCurrentStage("interviewing");
        setHistory([]);
        return;
      }

      const all = loadAllSessions();
      const active = all.find(
        (s) => s.id === params.id && s.mode === "persona",
      );

      if (
        active &&
        active.character &&
        active.history &&
        active.history.length > 0
      ) {
        setSessionId(active.id);
        if (active.stage) setCurrentStage(active.stage as any);
        const matchedGuide = ALL_CHARACTERS.find(
          (g) => g.name.toLowerCase() === active.character?.toLowerCase(),
        );
        if (matchedGuide) setSelectedGuide(matchedGuide);
        setHistory(
          active.history.map((h) => ({
            role: h.role,
            content: h.content,
            stage: (h as any).stage || active.stage || "resolved",
            sources: h.sources,
          })),
        );
        setHasStartedConsultation(true);
      } else {
        fetchSessionDetailFromDb(params.id as string).then((msgs) => {
          if (msgs && msgs.length > 0) {
            setSessionId(params.id as string);
            const foundSession = all.find((s) => s.id === params.id);
            const charName =
              foundSession?.character ||
              (msgs[1] as any)?.character ||
              "Krishna";
            const matchedGuide = ALL_CHARACTERS.find(
              (g) => g.name.toLowerCase() === charName.toLowerCase(),
            );
            if (matchedGuide) setSelectedGuide(matchedGuide);
            setHistory(
              msgs.map((h) => ({
                role: h.role,
                content: h.content,
                stage: (h as any).stage || "resolved",
                sources: h.sources,
              })),
            );
            setHasStartedConsultation(true);
          } else {
            setSessionId("");
            setHasStartedConsultation(false);
            setCurrentStage("interviewing");
            setHistory([]);
          }
        });
      }
    };

    syncSession();
    const unsubscribe = subscribeToSessions((all, activeId) => {
      if (!params.id) return;
      const active = all.find(
        (s) => s.id === params.id && s.mode === "persona",
      );
      if (
        active &&
        active.character &&
        active.history &&
        active.history.length > 0
      ) {
        setSessionId(active.id);
        if (active.stage) setCurrentStage(active.stage as any);
        const matchedGuide = ALL_CHARACTERS.find(
          (g) => g.name.toLowerCase() === active.character?.toLowerCase(),
        );
        if (matchedGuide) setSelectedGuide(matchedGuide);
        setHistory(
          active.history.map((h) => ({
            role: h.role,
            content: h.content,
            stage: (h as any).stage || active.stage || "resolved",
            sources: h.sources,
          })),
        );
        setHasStartedConsultation(true);
      }
    });

    return unsubscribe;
  }, [params.id]);

  // ─── Session Save ───────────────────────────────────────────

  const savePersonaSession = (
    msgs: ChatMsg[],
    stage: "interviewing" | "resolved" | "follow_up" = "interviewing",
    overrideId?: string,
    overrideChar?: string,
  ) => {
    let currentId = overrideId || sessionId;
    if (!currentId) {
      currentId = Date.now().toString();
      setSessionId(currentId);
    }
    const charName = overrideChar || selectedGuide.name;
    const firstUserMsg = msgs.find((m) => m.role === "user");
    let title = `${charName} Counsel`;
    if (firstUserMsg) {
      title = `${charName}: ${firstUserMsg.content.slice(0, 24)}...`;
    }
    const chatMessages: ChatMessage[] = msgs.map((m, idx) => ({
      id: `${currentId}-${idx}`,
      role: m.role,
      content: m.content,
      stage: m.stage || stage,
      sources: m.sources,
    }));
    const session: ChatSession = {
      id: currentId,
      title,
      mode: "persona",
      character: charName,
      updatedAt: Date.now(),
      stage: stage,
      history: chatMessages,
    };
    const all = loadAllSessions();
    const idx = all.findIndex((s) => s.id === currentId);
    let list: ChatSession[];
    if (idx >= 0) {
      list = [...all];
      list[idx] = session;
    } else {
      list = [session, ...all];
    }
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    saveAllSessions(list, currentId);
  };

  // ─── Start Consultation ─────────────────────────────────────

  const handleSelectGuideAndStart = (guide: GuideCard, queryText?: string) => {
    setSelectedGuide(guide);
    const newSession = createNewSession(
      `${guide.name} Counsel`,
      "persona",
      guide.name,
    );
    setSessionId(newSession.id);
    setActiveSessionId(newSession.id);
    setCurrentStage("interviewing");
    setHasStartedConsultation(true);
    const initialMsgs: ChatMsg[] = [
      { role: "assistant", content: guide.quote, stage: "interviewing" },
    ];
    setHistory(initialMsgs);
    router.setParams({ id: newSession.id });
    savePersonaSession(initialMsgs, "interviewing", newSession.id, guide.name);

    if (queryText && queryText.trim()) {
      setTimeout(() => {
        sendQuery(
          queryText.trim(),
          false,
          initialMsgs,
          newSession.id,
          guide.name,
        );
      }, 60);
    }
  };

  // ─── Send Query ─────────────────────────────────────────────

  const sendQuery = async (
    queryText?: string,
    isForceResolve: boolean = false,
    customHistory?: ChatMsg[],
    customSessionId?: string,
    customGuideName?: string,
  ) => {
    const textToSend = (queryText || input).trim();
    if ((!textToSend && !isForceResolve) || loading) return;

    if (!queryText) setInput("");
    setHasStartedConsultation(true);

    const baseHistory = customHistory || history;
    const activeCharName = customGuideName || selectedGuide.name;
    const activeSession = customSessionId || sessionId;

    let nextHistory = [...baseHistory];
    if (textToSend) {
      nextHistory.push({ role: "user", content: textToSend });
    }
    setHistory(nextHistory);
    setLoading(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Prior turns for API history (excluding current user message which is sent as message)
      const apiHistory = baseHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiService.characterChat(
        textToSend ||
          "Please deliver your final grounded counsel from your life lessons.",
        activeCharName,
        apiHistory,
        isForceResolve,
        activeSession,
      );

      const respStage = res.stage || "resolved";
      setCurrentStage(respStage);

      const finalHistory: ChatMsg[] = [
        ...nextHistory,
        {
          role: "assistant",
          content: res.reply,
          stage: respStage,
          sources: res.sources || [],
        },
      ];
      setHistory(finalHistory);
      savePersonaSession(
        finalHistory,
        respStage,
        activeSession,
        activeCharName,
      );
    } catch (err) {
      console.error("Character chat error:", err);
      const fallbackHistory: ChatMsg[] = [
        ...nextHistory,
        {
          role: "assistant",
          content: `Even in turbulent times, seek stillness. I am reflecting upon your query on ${textToSend}.`,
          stage: "resolved",
        },
      ];
      setHistory(fallbackHistory);
      savePersonaSession(
        fallbackHistory,
        "resolved",
        activeSession,
        activeCharName,
      );
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  // ─── JSX ────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <VedicDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onSelectAction={(action) => {
          if (action === "dharma")
            sendQuery("How do I assess my moral duty in this conflict?");
          else if (action === "contemplation")
            sendQuery("Give me a morning Vedic reflection for clarity.");
        }}
      />

      <VedicTopBar onOpenDrawer={() => setDrawerVisible(true)} />

      {/* ═══ Section 1: Hero Character Selection Deck (Fixed, Non-Scrolling) ═══ */}
      {!hasStartedConsultation ? (
        <View style={styles.heroFullContainer}>
          {/* Top Header & About Box */}
          <View style={styles.heroTopContent}>
            <View style={styles.heroHeader}>
              <Text
                style={[
                  styles.heroTitle,
                  { color: theme.primaryContainer, fontFamily: serif },
                ]}
              >
                Speak with Legends
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  { color: theme.secondary, fontFamily: body },
                ]}
              >
                Seek timeless wisdom from epic heroes, queens & sages
              </Text>
            </View>

            {/* About Character Section (Animated on Swipe) */}
            <Animated.View
              style={[
                styles.aboutSection,
                {
                  backgroundColor: theme.surfaceContainerLowest,
                  borderColor: theme.outlineVariant,
                },
                aboutAnimatedStyle,
              ]}
            >
              <View style={styles.aboutTopRow}>
                <Text style={[styles.aboutIcon]}>{selectedGuide.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.aboutName,
                      { color: theme.primary, fontFamily: serif },
                    ]}
                  >
                    {selectedGuide.name}
                  </Text>
                  <Text
                    style={[
                      styles.aboutRole,
                      { color: theme.secondary, fontFamily: label },
                    ]}
                  >
                    {selectedGuide.role}
                  </Text>
                </View>
                <View
                  style={[
                    styles.epicTag,
                    {
                      backgroundColor: theme.isDark
                        ? "rgba(234,194,92,0.15)"
                        : "rgba(146,113,13,0.1)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.epicTagText,
                      { color: theme.primaryContainer, fontFamily: label },
                    ]}
                  >
                    {selectedGuide.epic}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.aboutQuote,
                  { color: theme.textSecondary, fontFamily: body },
                ]}
                numberOfLines={2}
              >
                {selectedGuide.quote}
              </Text>
            </Animated.View>
          </View>

          {/* ═══ Center 3D Floating Carousel: Parallax Centered Active Card ═══ */}
          <View style={[styles.carouselSection, { height: CARD_HEIGHT + 30 }]}>
            {/* Desktop Navigation Chevrons */}
            {!isMobile && filteredCharacters.length > 1 && (
              <>
                <TouchableOpacity
                  style={[
                    styles.desktopChevron,
                    styles.desktopChevronLeft,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                      shadowColor: theme.shadow,
                    },
                  ]}
                  onPress={() => carouselRef.current?.prev()}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.desktopChevronText,
                      { color: theme.primary },
                    ]}
                  >
                    ‹
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.desktopChevron,
                    styles.desktopChevronRight,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                      shadowColor: theme.shadow,
                    },
                  ]}
                  onPress={() => carouselRef.current?.next()}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.desktopChevronText,
                      { color: theme.primary },
                    ]}
                  >
                    ›
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <Carousel
              ref={carouselRef}
              loop={filteredCharacters.length > 3}
              itemSize={CARD_WIDTH}
              style={{
                width: containerWidth,
                height: CARD_HEIGHT + 30,
                justifyContent: "center",
                alignItems: "center",
                overflow: "visible",
              }}
              contentContainerStyle={{
                width: CARD_WIDTH,
                overflow: "visible",
              }}
              data={filteredCharacters}
              renderItem={({ item, index, relativeProgress }) => (
                <FloatingCard
                  item={item}
                  index={index}
                  relativeProgress={relativeProgress}
                  cardWidth={CARD_WIDTH}
                  cardHeight={CARD_HEIGHT}
                  theme={theme}
                  onSelect={handleSelectGuideAndStart}
                />
              )}
              layout={{
                type: "parallax",
                scale: 1,
                adjacentScale: isMobile ? 0.74 : 0.78,
                offset: isMobile ? 32 : 45,
              }}
              animation={{ type: "timing", duration: 350 }}
              onSnapToItem={handleSnapToItem}
            />
          </View>

          {/* Bottom Fixed Area: Category Filter Pills + Input Bar (Per Figma) */}
          <View style={styles.heroBottomControls}>
            {/* Category Filter Pills (Horizontal Scroll at bottom) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillRow}
            >
              {CATEGORIES.map((cat, idx) => {
                const isActive = idx === activeCategory;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    onPress={() => setActiveCategory(idx)}
                    activeOpacity={0.7}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isActive
                          ? theme.primaryContainer
                          : theme.surfaceContainerHigh,
                        borderColor: isActive
                          ? theme.primaryContainer
                          : theme.outlineVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        {
                          color: isActive
                            ? theme.onPrimaryContainer
                            : theme.textSecondary,
                          fontFamily: label,
                        },
                      ]}
                    >
                      {cat.icon} {cat.label}
                      {idx === 0 ? ` (${ALL_CHARACTERS.length})` : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Autocomplete Dropup when typing @ or clicking @ button */}
            {showMentionDropup && (
              <View
                style={[
                  styles.mentionDropupCard,
                  {
                    backgroundColor: theme.surfaceContainerLowest,
                    borderColor: theme.outlineVariant,
                    shadowColor: theme.shadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dropupHeader,
                    { borderBottomColor: theme.outlineVariant },
                  ]}
                >
                  <Text
                    style={[
                      styles.dropupHeaderTitle,
                      { color: theme.secondary, fontFamily: label },
                    ]}
                  >
                    SELECT 1 {CATEGORIES[activeCategory].label.toUpperCase()}{" "}
                    LEGEND
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowMentionDropup(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.textTertiary,
                        fontWeight: "700",
                      }}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ maxHeight: 210 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                >
                  {filteredCharacters
                    .filter(
                      (c) =>
                        c.name.toLowerCase().includes(mentionQuery) ||
                        c.role.toLowerCase().includes(mentionQuery) ||
                        c.subtitle.toLowerCase().includes(mentionQuery),
                    )
                    .map((char) => {
                      const isSelected =
                        selectedGuide.name.toLowerCase() ===
                        char.name.toLowerCase();

                      return (
                        <TouchableOpacity
                          key={char.name}
                          style={[
                            styles.dropupRow,
                            {
                              backgroundColor: isSelected
                                ? theme.isDark
                                  ? "rgba(234,194,92,0.12)"
                                  : "rgba(146,113,13,0.08)"
                                : "transparent",
                              borderBottomColor: theme.outlineVariant,
                            },
                          ]}
                          onPress={() => handleSelectMentionCharacter(char)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 10,
                              flex: 1,
                            }}
                          >
                            <Text style={{ fontSize: 22 }}>{char.icon}</Text>
                            <View style={{ flex: 1 }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Text
                                  style={[
                                    styles.dropupName,
                                    { color: theme.primary, fontFamily: serif },
                                  ]}
                                >
                                  {char.name}
                                </Text>
                                <View
                                  style={[
                                    styles.dropupEpicPill,
                                    {
                                      backgroundColor: theme.isDark
                                        ? "rgba(234,194,92,0.15)"
                                        : "rgba(146,113,13,0.1)",
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.dropupEpicText,
                                      {
                                        color: theme.primaryContainer,
                                        fontFamily: label,
                                      },
                                    ]}
                                  >
                                    {char.epic}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={[
                                  styles.dropupRole,
                                  { color: theme.secondary, fontFamily: body },
                                ]}
                                numberOfLines={1}
                              >
                                {char.role} · {char.subtitle}
                              </Text>
                            </View>
                          </View>
                          {isSelected ? (
                            <Text
                              style={{
                                color: theme.primaryContainer,
                                fontWeight: "700",
                                fontSize: 12,
                                fontFamily: label,
                              }}
                            >
                              Active ✓
                            </Text>
                          ) : (
                            <Text
                              style={{
                                color: theme.textTertiary,
                                fontSize: 12,
                                fontFamily: label,
                              }}
                            >
                              Choose →
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>
            )}

            {/* Bottom Input Pill */}
            <View
              style={[
                styles.floatingInputPill,
                {
                  backgroundColor: theme.surfaceContainerLowest,
                  borderColor: theme.outlineVariant,
                  shadowColor: theme.primaryContainer,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.atMentionTriggerBtn,
                  {
                    backgroundColor: showMentionDropup
                      ? theme.primaryContainer
                      : theme.isDark
                        ? "rgba(234,194,92,0.12)"
                        : "rgba(146,113,13,0.08)",
                    borderColor: showMentionDropup
                      ? theme.primaryContainer
                      : theme.outlineVariant,
                  },
                ]}
                onPress={toggleMentionDropup}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.atMentionTriggerText,
                    {
                      color: showMentionDropup
                        ? theme.onPrimaryContainer
                        : theme.primaryContainer,
                      fontFamily: label,
                    },
                  ]}
                >
                  @
                </Text>
              </TouchableOpacity>

              <TextInput
                ref={inputRef}
                style={[
                  styles.textInput,
                  { color: theme.text, fontFamily: body },
                ]}
                placeholder={`Seek guidance from ${selectedGuide.name}... (type @ to switch)`}
                placeholderTextColor={theme.textTertiary}
                value={input}
                onChangeText={handleInputChange}
                onSubmitEditing={() => sendQuery()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendCircleBtn,
                  { backgroundColor: theme.primaryContainer },
                ]}
                onPress={() => sendQuery()}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.sendIcon, { color: theme.onPrimaryContainer }]}
                >
                  ➤
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        /* ═══ Section 2: Live Consultation Stream ═══ */
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.dialogueSection}>
              <View style={styles.dialogueHeader}>
                <Text
                  style={[
                    styles.dialogueTitle,
                    { color: theme.primary, fontFamily: serif },
                  ]}
                >
                  Dialogue with {selectedGuide.name}
                </Text>
              </View>

              {history.map((msg, index) => (
                <FadeSlide key={index} delay={30} distance={10}>
                  {msg.role === "assistant" ? (
                    <View
                      style={[
                        styles.aiMessageCard,
                        {
                          backgroundColor: theme.surfaceContainerLowest,
                          borderColor: theme.outlineVariant,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.aiAccentStripe,
                          { backgroundColor: theme.primaryContainer },
                        ]}
                      />
                      <View style={styles.aiContentInner}>
                        <View style={styles.aiHeaderRow}>
                          <Text style={styles.aiAvatarIcon}>
                            {selectedGuide.icon}
                          </Text>
                          <Text
                            style={[
                              styles.aiSenderName,
                              {
                                color: theme.primaryContainer,
                                fontFamily: label,
                              },
                            ]}
                          >
                            {selectedGuide.name.toUpperCase()}
                          </Text>
                        </View>
                        <StreamingText
                          text={msg.content}
                          style={[
                            styles.aiText,
                            { color: theme.text, fontFamily: serif },
                          ]}
                        />
                        {msg.sources && msg.sources.length > 0 && (
                          <SourceCard sources={msg.sources} />
                        )}
                      </View>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.userMessageBubble,
                        {
                          backgroundColor: theme.bgSecondary,
                          borderColor: theme.outlineVariant,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.userText,
                          { color: theme.text, fontFamily: body },
                        ]}
                      >
                        {msg.content}
                      </Text>
                    </View>
                  )}
                </FadeSlide>
              ))}

              {loading && (
                <FadeSlide duration={200}>
                  <View
                    style={[
                      styles.loadingIndicator,
                      {
                        backgroundColor: theme.surfaceContainerLowest,
                        borderColor: theme.outlineVariant,
                      },
                    ]}
                  >
                    <TypingDots color={theme.primaryContainer} />
                    <Text
                      style={[
                        styles.loadingText,
                        { color: theme.secondary, fontFamily: body },
                      ]}
                    >
                      {selectedGuide.name} is contemplating scripture...
                    </Text>
                  </View>
                </FadeSlide>
              )}
            </View>

            <View style={{ height: 110 }} />
          </ScrollView>

          {/* Floating Bottom Input Pill for Consultation */}
          <View
            style={[
              styles.floatingInputWrapper,
              Platform.OS === "web"
                ? ({
                    background: `linear-gradient(to top, ${theme.bg} 40%, ${theme.bg}BB 65%, ${theme.bg}00 100%)`,
                  } as any)
                : { backgroundColor: "transparent" },
            ]}
          >
            {/* Autocomplete Dropup when typing @ in consultation */}
            {showMentionDropup && (
              <View
                style={[
                  styles.mentionDropupCard,
                  {
                    backgroundColor: theme.surfaceContainerLowest,
                    borderColor: theme.outlineVariant,
                    shadowColor: theme.shadow,
                    bottom: 80,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dropupHeader,
                    { borderBottomColor: theme.outlineVariant },
                  ]}
                >
                  <Text
                    style={[
                      styles.dropupHeaderTitle,
                      { color: theme.secondary, fontFamily: label },
                    ]}
                  >
                    SWITCH TO 1 CHARACTER
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowMentionDropup(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.textTertiary,
                        fontWeight: "700",
                      }}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ maxHeight: 210 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                >
                  {filteredCharacters
                    .filter(
                      (c) =>
                        c.name.toLowerCase().includes(mentionQuery) ||
                        c.role.toLowerCase().includes(mentionQuery),
                    )
                    .map((char) => (
                      <TouchableOpacity
                        key={char.name}
                        style={[
                          styles.dropupRow,
                          {
                            backgroundColor:
                              selectedGuide.name === char.name
                                ? theme.isDark
                                  ? "rgba(234,194,92,0.12)"
                                  : "rgba(146,113,13,0.08)"
                                : "transparent",
                            borderBottomColor: theme.outlineVariant,
                          },
                        ]}
                        onPress={() => handleSelectMentionCharacter(char)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 20, marginRight: 8 }}>
                          {char.icon}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.dropupName,
                              { color: theme.primary, fontFamily: serif },
                            ]}
                          >
                            {char.name}
                          </Text>
                          <Text
                            style={[
                              styles.dropupRole,
                              { color: theme.secondary, fontFamily: body },
                            ]}
                          >
                            {char.role}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}

            <View
              style={[
                styles.floatingInputPill,
                {
                  backgroundColor: theme.surfaceContainerLowest,
                  borderColor: theme.outlineVariant,
                  shadowColor: theme.primaryContainer,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.atMentionTriggerBtn,
                  {
                    backgroundColor: showMentionDropup
                      ? theme.primaryContainer
                      : theme.isDark
                        ? "rgba(234,194,92,0.12)"
                        : "rgba(146,113,13,0.08)",
                    borderColor: showMentionDropup
                      ? theme.primaryContainer
                      : theme.outlineVariant,
                  },
                ]}
                onPress={toggleMentionDropup}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.atMentionTriggerText,
                    {
                      color: showMentionDropup
                        ? theme.onPrimaryContainer
                        : theme.primaryContainer,
                      fontFamily: label,
                    },
                  ]}
                >
                  @
                </Text>
              </TouchableOpacity>

              <TextInput
                ref={consultationInputRef}
                style={[
                  styles.textInput,
                  { color: theme.text, fontFamily: body },
                ]}
                placeholder={`Seek guidance from ${selectedGuide.name}... (type @ to switch)`}
                placeholderTextColor={theme.textTertiary}
                value={input}
                onChangeText={handleInputChange}
                onSubmitEditing={() => sendQuery()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendCircleBtn,
                  { backgroundColor: theme.primaryContainer },
                ]}
                onPress={() => sendQuery()}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.sendIcon, { color: theme.onPrimaryContainer }]}
                >
                  ➤
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

// ═══ Floating Card Component (with Reanimated Parallax Elevation) ═══

interface FloatingCardProps {
  item: GuideCard;
  index: number;
  relativeProgress: SharedValue<number>;
  cardWidth: number;
  cardHeight: number;
  theme: any;
  onSelect: (guide: GuideCard) => void;
}

function FloatingCard({
  item,
  index,
  relativeProgress,
  cardWidth,
  cardHeight,
  theme,
  onSelect,
}: FloatingCardProps) {
  const animatedCardStyle = useAnimatedStyle(() => {
    // translateY: 0 at center (relativeProgress = 0), and 34px lower at sides (-1 and 1)
    const translateY = interpolate(
      relativeProgress.value,
      [-1, 0, 1],
      [34, 0, 34],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      relativeProgress.value,
      [-1, -0.4, 0, 0.4, 1],
      [0.45, 0.7, 1.0, 0.7, 0.45],
      Extrapolation.CLAMP,
    );

    const rotateZ = interpolate(
      relativeProgress.value,
      [-1, 0, 1],
      [-2.5, 0, 2.5],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateY }, { rotateZ: `${rotateZ}deg` }],
      opacity,
    };
  }, [relativeProgress]);

  const glowStyle = useAnimatedStyle(() => {
    const glowOpacity = interpolate(
      relativeProgress.value,
      [-0.4, 0, 0.4],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: glowOpacity,
    };
  }, [relativeProgress]);

  return (
    <Animated.View
      style={[
        {
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
        },
        animatedCardStyle,
      ]}
    >
      <View
        style={[
          styles.floatingCard,
          {
            width: "100%",
            height: "100%",
            backgroundColor: theme.surfaceContainerLowest,
            borderColor: theme.isDark ? "rgba(234,194,92,0.3)" : "#C4B499",
            shadowColor: theme.shadow,
          },
        ]}
      >
        {/* Golden glow ring for active card */}
        <Animated.View
          style={[
            styles.glowOverlay,
            {
              borderColor: theme.primaryContainer,
              shadowColor: theme.primaryContainer,
            },
            glowStyle,
          ]}
        />

        {/* Portrait Image */}
        <View style={styles.cardImageWrapper}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardPortrait}
            resizeMode="cover"
          />
          <View style={styles.cardImageOverlay} />
          <View style={styles.cardEpicPill}>
            <Text style={[styles.cardEpicPillText, { fontFamily: label }]}>
              {item.icon} {item.epic}
            </Text>
          </View>
        </View>

        {/* Card Body */}
        <View
          style={[
            styles.cardBodyContent,
            { borderTopColor: theme.outlineVariant },
          ]}
        >
          <Text
            style={[
              styles.cardCharName,
              { color: theme.primary, fontFamily: serif },
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[
              styles.cardCharRole,
              { color: theme.secondary, fontFamily: body },
            ]}
            numberOfLines={1}
          >
            {item.role}
          </Text>
          <Text
            style={[
              styles.cardCharSubtitle,
              { color: theme.textTertiary, fontFamily: body },
            ]}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>

          {/* Consultation Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSelect(item)}
            style={[
              styles.cardSelectBtn,
              {
                backgroundColor: theme.isDark
                  ? "rgba(234,194,92,0.18)"
                  : "rgba(146,113,13,0.12)",
                borderColor: theme.primaryContainer,
              },
            ]}
          >
            <Text
              style={[
                styles.cardSelectBtnText,
                {
                  color: theme.primaryContainer,
                  fontFamily: label,
                },
              ]}
            >
              Consult {item.name} →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ═══ Styles ════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroFullContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 70 : 66,
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    overflow: "hidden",
  },
  heroTopContent: {
    paddingHorizontal: 16,
    width: "100%",
  },
  heroBottomControls: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    width: "100%",
    alignItems: "center",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 72,
    paddingHorizontal: 16,
    maxWidth: 900,
    alignSelf: "center",
    width: "100%",
  },

  // ── Hero Section ──
  heroHeader: {
    alignItems: "center",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },

  // ── Category Pills ──
  categoryPillRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  categoryPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
  },

  // ── About Section ──
  aboutSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 4,
  },
  aboutTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  aboutIcon: {
    fontSize: 24,
  },
  aboutName: {
    fontSize: 20,
    fontWeight: "700",
  },
  aboutRole: {
    fontSize: 11,
    marginTop: 1,
  },
  aboutQuote: {
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: "italic",
  },
  epicTag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  epicTagText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // ── Carousel ──
  carouselSection: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  desktopChevron: {
    position: "absolute",
    top: "40%",
    zIndex: 40,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  desktopChevronLeft: {
    left: Platform.OS === "web" ? 16 : 4,
  },
  desktopChevronRight: {
    right: Platform.OS === "web" ? 16 : 4,
  },
  desktopChevronText: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 26,
  },

  // ── Floating Card ──
  floatingCard: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 2,
    zIndex: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 0,
    pointerEvents: "none",
  },
  cardImageWrapper: {
    height: "52%",
    width: "100%",
    position: "relative",
    backgroundColor: "#1E1E24",
  },
  cardPortrait: {
    width: "100%",
    height: "100%",
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  cardEpicPill: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cardEpicPillText: {
    color: "#FFF",
    fontSize: 10,
  },
  cardBodyContent: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
  },
  cardCharName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardCharRole: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  cardCharSubtitle: {
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
  cardSelectBtn: {
    width: "100%",
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  cardSelectBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Dots ──
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 8,
    flexWrap: "wrap",
    paddingHorizontal: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  // ── Dialogue Section ──
  dialogueSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  dialogueHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dialogueTitle: {
    fontSize: 19,
    fontWeight: "700",
  },
  aiMessageCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    position: "relative",
    shadowColor: "rgba(0,0,0,0.04)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 2,
  },
  aiAccentStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  aiContentInner: {
    padding: 16,
    paddingLeft: 18,
  },
  aiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  aiAvatarIcon: {
    fontSize: 16,
  },
  aiSenderName: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  aiText: {
    fontSize: 16,
    lineHeight: 26,
  },
  userMessageBubble: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
  },
  loadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 13,
    fontStyle: "italic",
  },

  // ── Floating Input ──
  floatingInputWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    paddingTop: 24,
    alignItems: "center",
    zIndex: 50,
  },
  floatingInputPill: {
    width: "100%",
    maxWidth: 700,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
    ...(Platform.OS === "web" && { outlineStyle: "none" as any }),
  },
  sendCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  sendIcon: {
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Mention Dropup ──
  mentionDropupCard: {
    position: "absolute",
    bottom: 64,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    zIndex: 100,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    maxWidth: 700,
    alignSelf: "center",
    width: "100%",
  },
  dropupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  dropupHeaderTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  dropupRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    borderBottomWidth: 0.5,
  },
  dropupName: {
    fontSize: 15,
    fontWeight: "700",
  },
  dropupEpicPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  dropupEpicText: {
    fontSize: 9,
    fontWeight: "600",
  },
  dropupRole: {
    fontSize: 11,
    marginTop: 1,
  },
  atMentionTriggerBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  atMentionTriggerText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
});
