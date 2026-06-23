/**
 * Premium NoteCard — the core visual building block of the Notes list.
 * Supports selection mode, color accents, pin badge, and animated press.
 */

import { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, typography } from '../theme/tokens';
import type { Note } from '../stores/notes-store';

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  isSelectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function formatRelativeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Accent colors for note backgrounds
const COLOR_ACCENTS: Record<string, { light: string; dark: string; text: string }> = {
  '#FAECEC': { light: '#E53E3E', dark: '#FC8181', text: '#742A2A' },
  '#FFF0E6': { light: '#DD6B20', dark: '#F6AD55', text: '#7B341E' },
  '#FFF8E1': { light: '#D69E2E', dark: '#F6E05E', text: '#744210' },
  '#E8F5E9': { light: '#38A169', dark: '#68D391', text: '#22543D' },
  '#E8EAF6': { light: '#5C6BC0', dark: '#7F9CF5', text: '#2C4D9E' },
  '#EDE7F6': { light: '#805AD5', dark: '#B794F4', text: '#553C9A' },
  '#F3E5F5': { light: '#B83280', dark: '#F687B3', text: '#702459' },
  '#E0F7FA': { light: '#00838F', dark: '#76E4F7', text: '#065666' },
};

export function NoteCard({ note, isSelected, isSelectionMode, onPress, onLongPress }: NoteCardProps) {
  const { theme, isDark } = useTheme();

  const scale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const checkOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: isSelected ? 1 : 0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 280,
    }).start();
    Animated.timing(checkOpacity, {
      toValue: isSelected ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [isSelected]);

  const isColored = note.color && note.color !== '#FFFFFF' && note.color !== 'transparent';
  const accent = isColored ? COLOR_ACCENTS[note.color!] : null;
  const accentDot = accent ? (isDark ? accent.dark : accent.light) : theme.colors.primary;

  const cardBg = isColored ? note.color! : theme.colors.card;
  const titleColor = theme.colors.text;
  const previewColor = theme.colors.textSecondary;
  const metaColor = theme.colors.textTertiary;
  const borderColor = isSelected ? theme.colors.primary : (isColored ? 'transparent' : theme.colors.cardBorder);
  const borderWidth = isSelected ? 2 : StyleSheet.hairlineWidth;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 6 }).start();
  };
  const handlePress = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  const handleLongPress = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress();
  };

  const wordCount = note.contentPreview
    ? note.contentPreview.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={350}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor,
            borderWidth,
            shadowColor: isDark ? '#000' : '#6366F1',
            shadowOpacity: isDark ? 0.25 : 0.06,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 10,
            elevation: 3,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Colored accent bar on the left */}
        {isColored && (
          <View style={[styles.accentBar, { backgroundColor: accentDot }]} />
        )}

        {/* Content */}
        <View style={[styles.content, isColored && styles.contentWithAccent]}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: titleColor }]}
              numberOfLines={2}
            >
              {note.title || 'Untitled'}
            </Text>
            {note.isPinned && (
              <Ionicons
                name="pin"
                size={13}
                color={accentDot}
                style={styles.pinIcon}
              />
            )}
          </View>

          {/* Preview text */}
          {!!note.contentPreview && (
            <Text
              style={[styles.preview, { color: previewColor }]}
              numberOfLines={3}
            >
              {note.contentPreview}
            </Text>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.date, { color: metaColor }]}>
              {formatRelativeDate(note.updatedAt)}
            </Text>
            {wordCount > 0 && (
              <Text style={[styles.wordCount, { color: metaColor }]}>
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </Text>
            )}
          </View>
        </View>

        {/* Selection checkbox */}
        <Animated.View
          style={[
            styles.selectionBadge,
            {
              opacity: checkOpacity,
              transform: [{ scale: checkScale }],
              backgroundColor: isSelected ? theme.colors.primary : 'transparent',
              borderColor: isSelected ? theme.colors.primary : metaColor,
            },
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={13} color="#FFF" />}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
  },
  content: {
    flex: 1,
    padding: spacing.base,
    paddingVertical: spacing.md,
  },
  contentWithAccent: {
    paddingLeft: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    letterSpacing: -0.3,
    lineHeight: typography.sizes.base * 1.35,
  },
  pinIcon: {
    marginTop: 2,
    opacity: 0.7,
  },
  preview: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.55,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    letterSpacing: 0.1,
  },
  wordCount: {
    fontSize: typography.sizes.xs,
  },
  selectionBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
