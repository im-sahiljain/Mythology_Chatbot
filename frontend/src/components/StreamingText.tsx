import React, { useState, useEffect } from 'react';
import { Text, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

export const StreamingText: React.FC<{
  text: string;
  speed?: number;
  animate?: boolean;
  style?: any;
}> = ({ text, speed = 8, animate = true, style }) => {
  const { theme } = useTheme();
  const [displayed, setDisplayed] = useState(animate ? '' : text);
  const [idx, setIdx] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) {
      setDisplayed(text);
      setIdx(text.length);
      return;
    }
    setDisplayed('');
    setIdx(0);
  }, [text, animate]);

  useEffect(() => {
    if (animate && idx < text.length) {
      const t = setTimeout(() => {
        setDisplayed((p) => p + text[idx]);
        setIdx((p) => p + 1);
      }, speed);
      return () => clearTimeout(t);
    }
  }, [idx, text, speed, animate]);


  // Parse markdown bold (***text***, **text**, and *text*) tokens into bold Text components
  const renderFormatted = (raw: string) => {
    const parts = raw.split(/(\*\*\*[\s\S]*?\*\*\*|\*\*[\s\S]*?\*\*|\*[^*\n]+?\*)/g);

    return parts.map((part, i) => {
      if (!part) return null;

      // Handle ***text***
      if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
        return (
          <Text
            key={i}
            style={{
              fontFamily: bold,
              fontWeight: '700',
              color: theme.text,
            }}
          >
            {part.slice(3, -3)}
          </Text>
        );
      }

      // Handle **text**
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        const content = part.slice(2, -2);
        return (
          <Text
            key={i}
            style={{
              fontFamily: bold,
              fontWeight: '700',
              color: theme.text,
            }}
          >
            {content}
          </Text>
        );
      }

      // Handle *text* (single asterisk)
      if (
        part.startsWith('*') &&
        part.endsWith('*') &&
        part.length >= 2 &&
        !part.slice(1, -1).includes('*')
      ) {
        const content = part.slice(1, -1);
        return (
          <Text
            key={i}
            style={{
              fontFamily: bold,
              fontWeight: '700',
              color: theme.text,
            }}
          >
            {content}
          </Text>
        );
      }

      // Streaming in-flight opening tags
      if (part.startsWith('***')) {
        return (
          <Text
            key={i}
            style={{
              fontFamily: bold,
              fontWeight: '700',
              color: theme.text,
            }}
          >
            {part.slice(3)}
          </Text>
        );
      }

      if (part.startsWith('**')) {
        return (
          <Text
            key={i}
            style={{
              fontFamily: bold,
              fontWeight: '700',
              color: theme.text,
            }}
          >
            {part.slice(2)}
          </Text>
        );
      }

      return <Text key={i}>{part}</Text>;
    });
  };

  return (
    <Text
      style={[
        {
          fontSize: 15,
          lineHeight: 24,
          color: theme.text,
          fontFamily: body,
          letterSpacing: 0.1,
        },
        style,
      ]}
    >
      {renderFormatted(displayed)}
      {idx < text.length && <Text style={{ color: theme.accent, fontWeight: '200' }}>▎</Text>}
    </Text>
  );
};
