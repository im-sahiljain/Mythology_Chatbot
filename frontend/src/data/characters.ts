// ─── Master Character Repository for Vedic Wisdom Chatbot ──────────

export interface GuideCard {
  name: string;
  epic: "Ramayana" | "Mahabharata" | "Both";
  category: "Major Heroes & Guides" | "Queens & Heroines" | "Kings & Antagonists" | "Sages & Gurus" | "Warriors & Allies";
  role: string;
  subtitle: string;
  imageUrl: string;
  quote: string;
  icon: string;
  color?: string;
  accent?: string;
}

export interface LegendProfile {
  name: string;
  epic: string;
  archetype: string;
  icon: string;
  color: string;
  accent: string;
  quote: string;
  imageUrl?: string;
  category?: string;
}

export const ALL_CHARACTERS: GuideCard[] = [
  // ── 1. Major Heroes & Guides (12) ──
  {
    name: "Krishna",
    epic: "Mahabharata",
    category: "Major Heroes & Guides",
    role: "Divine Strategist",
    subtitle: "Karma & Svadharma",
    icon: "🪶",
    color: "#5C9CE6",
    accent: "rgba(92, 156, 230, 0.15)",
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
    color: "#D4AF37",
    accent: "rgba(212, 175, 55, 0.15)",
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
    color: "#7EBC89",
    accent: "rgba(126, 188, 137, 0.15)",
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
    color: "#F59E0B",
    accent: "rgba(245, 158, 11, 0.15)",
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
    color: "#3B82F6",
    accent: "rgba(59, 130, 246, 0.15)",
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
    color: "#EF4444",
    accent: "rgba(239, 68, 68, 0.15)",
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
    color: "#EAB308",
    accent: "rgba(234, 179, 8, 0.15)",
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
    color: "#E27D60",
    accent: "rgba(226, 125, 96, 0.15)",
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
    color: "#85E3B3",
    accent: "rgba(133, 227, 179, 0.15)",
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
    color: "#B0C4DE",
    accent: "rgba(176, 196, 222, 0.15)",
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
    color: "#F97316",
    accent: "rgba(249, 115, 22, 0.15)",
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
    color: "#8B5CF6",
    accent: "rgba(139, 92, 246, 0.15)",
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
    color: "#E0A96D",
    accent: "rgba(224, 169, 109, 0.15)",
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
    color: "#EC4899",
    accent: "rgba(236, 72, 153, 0.15)",
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
    color: "#A855F7",
    accent: "rgba(168, 85, 247, 0.15)",
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
    color: "#64748B",
    accent: "rgba(100, 116, 139, 0.15)",
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
    color: "#F43F5E",
    accent: "rgba(244, 63, 94, 0.15)",
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
    color: "#06B6D4",
    accent: "rgba(6, 182, 212, 0.15)",
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
    color: "#D97706",
    accent: "rgba(217, 119, 6, 0.15)",
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
    color: "#6366F1",
    accent: "rgba(99, 102, 241, 0.15)",
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
    color: "#10B981",
    accent: "rgba(16, 185, 129, 0.15)",
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
    color: "#FBBF24",
    accent: "rgba(251, 191, 36, 0.15)",
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
    color: "#DC2626",
    accent: "rgba(220, 38, 38, 0.15)",
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
    color: "#B91C1C",
    accent: "rgba(185, 28, 28, 0.15)",
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
    color: "#F4A261",
    accent: "rgba(244, 162, 97, 0.15)",
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
    color: "#78716C",
    accent: "rgba(120, 113, 108, 0.15)",
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
    color: "#84CC16",
    accent: "rgba(132, 204, 22, 0.15)",
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
    color: "#F59E0B",
    accent: "rgba(245, 158, 11, 0.15)",
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
    color: "#475569",
    accent: "rgba(71, 85, 105, 0.15)",
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
    color: "#0284C7",
    accent: "rgba(2, 132, 199, 0.15)",
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
    color: "#EA580C",
    accent: "rgba(234, 88, 12, 0.15)",
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
    color: "#9333EA",
    accent: "rgba(147, 51, 234, 0.15)",
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
    color: "#C38D9E",
    accent: "rgba(195, 141, 158, 0.15)",
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
    color: "#8B5CF6",
    accent: "rgba(139, 92, 246, 0.15)",
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
    color: "#D97706",
    accent: "rgba(217, 119, 6, 0.15)",
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
    color: "#059669",
    accent: "rgba(5, 150, 105, 0.15)",
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
    color: "#4F46E5",
    accent: "rgba(79, 70, 229, 0.15)",
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
    color: "#0284C7",
    accent: "rgba(2, 132, 199, 0.15)",
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
    color: "#DC2626",
    accent: "rgba(220, 38, 38, 0.15)",
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
    color: "#6D28D9",
    accent: "rgba(109, 40, 217, 0.15)",
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
    color: "#D97706",
    accent: "rgba(217, 119, 6, 0.15)",
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
    color: "#EA580C",
    accent: "rgba(234, 88, 12, 0.15)",
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
    color: "#475569",
    accent: "rgba(71, 85, 105, 0.15)",
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
    color: "#EAB308",
    accent: "rgba(234, 179, 8, 0.15)",
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
    color: "#E11D48",
    accent: "rgba(225, 29, 72, 0.15)",
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
    color: "#4B5563",
    accent: "rgba(75, 85, 99, 0.15)",
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
    color: "#7C3AED",
    accent: "rgba(124, 58, 237, 0.15)",
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
    color: "#2563EB",
    accent: "rgba(37, 99, 235, 0.15)",
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
    color: "#10B981",
    accent: "rgba(16, 185, 129, 0.15)",
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
    color: "#8B5CF6",
    accent: "rgba(139, 92, 246, 0.15)",
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
    color: "#059669",
    accent: "rgba(5, 150, 105, 0.15)",
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
    color: "#F59E0B",
    accent: "rgba(245, 158, 11, 0.15)",
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
    color: "#EC4899",
    accent: "rgba(236, 72, 153, 0.15)",
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
    color: "#0D9488",
    accent: "rgba(13, 148, 136, 0.15)",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    quote:
      '"I surrendered my right thumb without hesitation, proving that true reverence transcends all tests."',
  },
];

export const GUIDE_CHARACTERS = ALL_CHARACTERS;

// ─── Master Legends List for Council & Roundtable ──────────────
export const AVAILABLE_LEGENDS: LegendProfile[] = ALL_CHARACTERS.map((char) => ({
  name: char.name,
  epic: char.epic,
  archetype: `${char.role} · ${char.subtitle}`,
  icon: char.icon,
  color: char.color || "#D4AF37",
  accent: char.accent || "rgba(212, 175, 55, 0.15)",
  quote: char.quote.replace(/^"|"$/g, ""),
  imageUrl: char.imageUrl,
  category: char.category,
}));

export interface CategoryDef {
  label: string;
  icon: string;
  filter: (c: GuideCard) => boolean;
}

export const CATEGORIES: CategoryDef[] = [
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

export function getCharacterByName(name: string): GuideCard | undefined {
  return ALL_CHARACTERS.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export function getLegendProfile(name: string): LegendProfile {
  const found = AVAILABLE_LEGENDS.find((l) => l.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  return {
    name,
    epic: "Epic",
    archetype: "Vedic Legend",
    icon: "📜",
    color: "#D4AF37",
    accent: "rgba(212, 175, 55, 0.15)",
    quote: "Righteousness endures across all ages.",
  };
}
