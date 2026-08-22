import React, { createContext, useContext, useEffect, useState } from "react";
import { apiService, CharacterRecord } from "../services/api";
import { GuideCard, LegendProfile } from "../data/characters";

type CharacterContextValue = {
  characters: GuideCard[];
  legends: LegendProfile[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const CharacterContext = createContext<CharacterContextValue | undefined>(
  undefined,
);

const toGuideCard = (character: CharacterRecord): GuideCard => ({
  name: character.name,
  epic: character.epic as GuideCard["epic"],
  category: character.category as GuideCard["category"],
  role: character.role,
  subtitle: character.subtitle,
  icon: character.icon,
  color: character.color || undefined,
  accent: character.accent || undefined,
  imageUrl: character.image_url || "",
  quote: character.quote,
});

const toLegend = (character: GuideCard): LegendProfile => ({
  name: character.name,
  epic: character.epic,
  archetype: `${character.role} · ${character.subtitle}`,
  icon: character.icon,
  color: character.color || "#D4AF37",
  accent: character.accent || "rgba(212, 175, 55, 0.15)",
  quote: character.quote.replace(/^"|"$/g, ""),
  imageUrl: character.imageUrl,
  category: character.category,
});

export function CharacterProvider({ children }: { children: React.ReactNode }) {
  const [characters, setCharacters] = useState<GuideCard[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const records = await apiService.fetchCharacters();
      setCharacters(records.map(toGuideCard));
    } catch (error) {
      setCharacters([]);
      console.warn("[Characters] Could not load database catalog:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await refresh();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <CharacterContext.Provider
      value={{
        characters,
        legends: characters.map(toLegend),
        loading,
        refresh,
      }}
    >
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacters(): CharacterContextValue {
  const context = useContext(CharacterContext);
  if (!context)
    throw new Error("useCharacters must be used inside CharacterProvider");
  return context;
}
