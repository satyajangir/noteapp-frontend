/**
 * Archive screen — view and restore archived notes.
 * Uses the same animated navbar ↔ contextual action bar transition as the home screen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useTheme } from '../src/theme/ThemeProvider';
import { spacing, radius, typography } from '../src/theme/tokens';
import { type Note } from '../src/stores/notes-store';
import { getAllNotes, updateNoteField } from '../src/lib/database';
import { NoteCard } from '../src/components/NoteCard';
import { EmptyState } from '../src/components/EmptyState';
import { useAlert } from '../src/components/AlertProvider';

// Spring presets (same as home screen for consistency)
const SPRING_SNAPPY = { damping: 22, stiffness: 300, useNativeDriver: true };

export default function ArchiveScreen() {
  const { theme, isDark } = useTheme();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  const isSelectionMode = selectedNoteIds.size > 0;
  const allSelected = archivedNotes.length > 0 && selectedNoteIds.size === archivedNotes.length;

  // ── Animated transition (0 = navbar, 1 = action bar) ──────────────
  const selectionProgress = useRef(new Animated.Value(0)).current;
  const prevIsSelectionMode = useRef(false);

  useEffect(() => {
    const entering = isSelectionMode && !prevIsSelectionMode.current;
    const leaving = !isSelectionMode && prevIsSelectionMode.current;
    prevIsSelectionMode.current = isSelectionMode;

    if (entering || leaving) {
      Animated.spring(selectionProgress, {
        toValue: isSelectionMode ? 1 : 0,
        ...SPRING_SNAPPY,
      }).start();
    }
  }, [isSelectionMode]);

  // Navbar — slides UP and fades out when selection starts
  const navbarTranslateY = selectionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -80],
  });
  const navbarOpacity = selectionProgress.interpolate({
    inputRange: [0, 0.4],
    outputRange: [1, 0],
  });

  // Action bar — slides DOWN in when selection starts
  const actionBarTranslateY = selectionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 0],
  });
  const actionBarOpacity = selectionProgress.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0, 1],
  });

  // ── Data ──────────────────────────────────────────────────────────

  useEffect(() => { loadArchivedNotes(); }, []);

  const loadArchivedNotes = async () => {
    setIsLoading(true);
    try {
      const raw = await getAllNotes({ archived: true });
      setArchivedNotes(
        raw.map((n: any) => ({
          id: n.id,
          ownerId: n.owner_id,
          title: n.title,
          contentPreview: n.content_preview,
          color: n.color,
          isPinned: !!n.is_pinned,
          isArchived: !!n.is_archived,
          isLocked: !!n.is_locked,
          isShared: !!n.is_shared,
          version: n.version,
          createdAt: n.created_at,
          updatedAt: n.updated_at,
          deletedAt: n.deleted_at,
        }))
      );
    } catch (e) {
      console.error('Failed to load archived notes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadArchivedNotes();
    setRefreshing(false);
  }, []);

  // ── Selection helpers ─────────────────────────────────────────────

  const toggleSelection = (id: string) => {
    const next = new Set(selectedNoteIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedNoteIds(next);
  };

  const clearSelection = () => setSelectedNoteIds(new Set());

  const selectAll = () => {
    if (allSelected) clearSelection();
    else setSelectedNoteIds(new Set(archivedNotes.map((n) => n.id)));
    if (Platform.OS === 'ios') Haptics.selectionAsync();
  };

  // ── Bulk actions ──────────────────────────────────────────────────

  const handleRestoreSelected = async () => {
    if (Platform.OS === 'ios') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    for (const id of Array.from(selectedNoteIds)) {
      await updateNoteField(id, 'is_archived', 0);
    }
    clearSelection();
    loadArchivedNotes();
  };

  const handleDeleteSelected = () => {
    showAlert(
      'Delete Notes',
      `Move ${selectedNoteIds.size} note${selectedNoteIds.size > 1 ? 's' : ''} to trash?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS === 'ios') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            for (const id of Array.from(selectedNoteIds)) {
              await updateNoteField(id, 'deleted_at', new Date().toISOString());
            }
            clearSelection();
            loadArchivedNotes();
          },
        },
      ]
    );
  };

  const handleUnarchiveAll = () => {
    if (archivedNotes.length === 0) return;
    showAlert(
      'Restore All',
      'Move all archived notes back to your main notes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore All',
          onPress: async () => {
            if (Platform.OS === 'ios') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            for (const note of archivedNotes) {
              await updateNoteField(note.id, 'is_archived', 0);
            }
            loadArchivedNotes();
          },
        },
      ]
    );
  };

  // ── Layout constants ──────────────────────────────────────────────

  const NAVBAR_H = insets.top + 58;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Hide the default Stack header — we draw our own */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* ═══════════════════════════════════════════════════════════
          LAYER 1 — Default Navbar (slides UP on selection)
      ═══════════════════════════════════════════════════════════ */}
      <Animated.View
        pointerEvents={isSelectionMode ? 'none' : 'auto'}
        style={[
          styles.barBase,
          { height: NAVBAR_H, zIndex: 100 },
          { opacity: navbarOpacity, transform: [{ translateY: navbarTranslateY }] },
        ]}
      >
        <BlurView
          intensity={isDark ? 65 : 90}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.barInner, { paddingTop: insets.top, borderBottomColor: theme.colors.border }]}
        >
          {/* Back button */}
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.primary} />
          </Pressable>

          <Text style={[styles.navTitle, { color: theme.colors.text }]}>Archive</Text>

          {/* Restore All */}
          <Pressable
            style={styles.navActionBtn}
            onPress={handleUnarchiveAll}
            disabled={archivedNotes.length === 0}
          >
            <Text
              style={[
                styles.navActionText,
                { color: archivedNotes.length > 0 ? theme.colors.primary : 'transparent' },
              ]}
            >
              Restore All
            </Text>
          </Pressable>
        </BlurView>
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════
          LAYER 2 — Contextual Action Bar (slides DOWN on selection)
      ═══════════════════════════════════════════════════════════ */}
      <Animated.View
        pointerEvents={isSelectionMode ? 'auto' : 'none'}
        style={[
          styles.barBase,
          { height: NAVBAR_H, zIndex: 110 },
          { opacity: actionBarOpacity, transform: [{ translateY: actionBarTranslateY }] },
        ]}
      >
        <BlurView
          intensity={isDark ? 75 : 92}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.barInner,
            { paddingTop: insets.top, borderBottomColor: theme.colors.primary + '40' },
          ]}
        >
          {/* Left — Cancel */}
          <Pressable style={styles.actionBarSide} onPress={clearSelection} hitSlop={8}>
            <Text style={[styles.actionBarCancel, { color: theme.colors.primary }]}>Cancel</Text>
          </Pressable>

          {/* Center — count + Select All toggle */}
          <Pressable style={styles.actionBarCenter} onPress={selectAll} hitSlop={8}>
            <Text style={[styles.actionBarCount, { color: theme.colors.text }]}>
              {selectedNoteIds.size} selected
            </Text>
            <Text style={[styles.actionBarSelectAll, { color: theme.colors.primary }]}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>

          {/* Right — Restore + Delete */}
          <View style={[styles.actionBarSide, styles.actionBarActionsRow]}>
            <Pressable
              style={({ pressed }) => [styles.actionBarIconBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={handleRestoreSelected}
              hitSlop={8}
            >
              <Ionicons name="arrow-undo-outline" size={22} color={theme.colors.primary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBarIconBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={handleDeleteSelected}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
            </Pressable>
          </View>
        </BlurView>
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════
          Scroll Content
      ═══════════════════════════════════════════════════════════ */}
      {isLoading && archivedNotes.length === 0 ? (
        <View style={[styles.loadingContainer, { paddingTop: NAVBAR_H }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={archivedNotes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: NAVBAR_H + spacing.sm, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              progressViewOffset={NAVBAR_H}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="archive-outline"
              title="No archived notes"
              description={"Notes you archive will appear here.\nOpen a note and tap ··· → Archive."}
            />
          }
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              isSelected={selectedNoteIds.has(item.id)}
              isSelectionMode={isSelectionMode}
              onPress={() => {
                if (isSelectionMode) toggleSelection(item.id);
                else router.push(`/note/${item.id}`);
              }}
              onLongPress={() => toggleSelection(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Shared bar base ───────────────────────────────────────────────
  barBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  barInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // ── Default Navbar ────────────────────────────────────────────────
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  navTitle: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  navActionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  navActionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },

  // ── Contextual Action Bar ─────────────────────────────────────────
  actionBarSide: {
    width: 90,
    justifyContent: 'center',
  },
  actionBarActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionBarCenter: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 2,
  },
  actionBarCount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.3,
  },
  actionBarSelectAll: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    marginTop: 1,
  },
  actionBarCancel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  actionBarIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── List ──────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: spacing.base,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
