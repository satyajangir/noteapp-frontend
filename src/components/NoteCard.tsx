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
import { spacing, radius, typography, getNoteTheme } from '../theme/tokens';
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

  const noteTheme = getNoteTheme(note.color, isDark, theme);

  const cardBg = noteTheme.background;
  const titleColor = noteTheme.text;
  const previewColor = noteTheme.textSecondary;
  const metaColor = noteTheme.textTertiary;
  const accentDot = noteTheme.accent;

  const borderColor = isSelected
    ? theme.colors.primary
    : (noteTheme.isColored ? noteTheme.border : theme.colors.cardBorder);
  const borderWidth = isSelected ? 2 : 1.2;

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
      accessibilityLabel={`${note.isPinned ? 'Pinned note, ' : ''}${note.title || 'Untitled'}, ${
        note.contentPreview || 'no content preview'
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
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
        {noteTheme.isColored && (
          <View style={[styles.accentBar, { backgroundColor: accentDot }]} />
        )}

        {/* Content */}
        <View style={[styles.content, noteTheme.isColored && styles.contentWithAccent]}>
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
          importantForAccessibility="no"
          accessibilityElementsHidden={true}
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
