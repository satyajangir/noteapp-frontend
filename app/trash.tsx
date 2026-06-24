/**
 * Trash screen — view, restore, or permanently delete trashed notes.
 * Uses the same animated navbar ↔ contextual action bar transition as Home & Archive.
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
import { spacing, typography } from '../src/theme/tokens';
import { type Note } from '../src/stores/notes-store';
import { getAllNotes, hardDeleteNote, restoreNote } from '../src/lib/database';
import { NoteCard } from '../src/components/NoteCard';
import { EmptyState } from '../src/components/EmptyState';
import { useAlert } from '../src/components/AlertProvider';
import { playSound } from '../src/lib/sound-manager';

const SPRING_SNAPPY = { damping: 22, stiffness: 300, useNativeDriver: true };

export default function TrashScreen() {
  const { theme, isDark } = useTheme();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [deletedNotes, setDeletedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  const isSelectionMode = selectedNoteIds.size > 0;
  const allSelected = deletedNotes.length > 0 && selectedNoteIds.size === deletedNotes.length;

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

  const navbarTranslateY = selectionProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -80] });
  const navbarOpacity = selectionProgress.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0] });
  const actionBarTranslateY = selectionProgress.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });
  const actionBarOpacity = selectionProgress.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1] });

  // ── Data ──────────────────────────────────────────────────────────

  useEffect(() => { loadDeletedNotes(); }, []);

  const loadDeletedNotes = async () => {
    setIsLoading(true);
    try {
      const raw = await getAllNotes({ deleted: true });
      setDeletedNotes(
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
      console.error('Failed to load deleted notes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDeletedNotes();
    setRefreshing(false);
  }, []);

  // ── Selection helpers ─────────────────────────────────────────────

  const toggleSelection = (id: string) => {
    const next = new Set(selectedNoteIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedNoteIds(next);
    playSound('tap');
  };

  const clearSelection = () => {
    setSelectedNoteIds(new Set());
    playSound('click');
  };

  const selectAll = () => {
    if (allSelected) {
      setSelectedNoteIds(new Set());
      playSound('click');
    } else {
      setSelectedNoteIds(new Set(deletedNotes.map((n) => n.id)));
      playSound('success');
    }
    if (Platform.OS === 'ios') Haptics.selectionAsync();
  };

  // ── Bulk actions ──────────────────────────────────────────────────

  const handleRestoreSelected = async () => {
    if (Platform.OS === 'ios') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSound('success');
    for (const id of Array.from(selectedNoteIds)) {
      await restoreNote(id);
    }
    setSelectedNoteIds(new Set());
    loadDeletedNotes();
  };

  const handleHardDeleteSelected = () => {
    showAlert(
      'Permanently Delete',
      `Permanently delete ${selectedNoteIds.size} note${selectedNoteIds.size > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS === 'ios') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            playSound('delete');
            for (const id of Array.from(selectedNoteIds)) {
              await hardDeleteNote(id);
            }
            setSelectedNoteIds(new Set());
            loadDeletedNotes();
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (deletedNotes.length === 0) return;
    showAlert(
      'Empty Trash',
      'Permanently delete ALL notes in trash? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS === 'ios') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            playSound('delete');
            for (const note of deletedNotes) {
              await hardDeleteNote(note.id);
            }
            setSelectedNoteIds(new Set());
            loadDeletedNotes();
          },
        },
      ]
    );
  };

  // ── Layout ────────────────────────────────────────────────────────

  const NAVBAR_H = insets.top + 58;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
          <Pressable style={styles.backBtn} onPress={() => { playSound('click'); router.back(); }} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.primary} />
          </Pressable>

          <Text style={[styles.navTitle, { color: theme.colors.text }]}>Trash</Text>

          {/* Empty Trash button */}
          <Pressable
            style={styles.navActionBtn}
            onPress={handleEmptyTrash}
            disabled={deletedNotes.length === 0}
          >
            <Text
              style={[
                styles.navActionText,
                { color: deletedNotes.length > 0 ? theme.colors.error : 'transparent' },
              ]}
            >
              Empty
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

          {/* Center — count + Select All */}
          <Pressable style={styles.actionBarCenter} onPress={selectAll} hitSlop={8}>
            <Text style={[styles.actionBarCount, { color: theme.colors.text }]}>
              {selectedNoteIds.size} selected
            </Text>
            <Text style={[styles.actionBarSelectAll, { color: theme.colors.primary }]}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>

          {/* Right — Restore + Delete Forever */}
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
              onPress={handleHardDeleteSelected}
              hitSlop={8}
            >
              <Ionicons name="trash-bin-outline" size={22} color={theme.colors.error} />
            </Pressable>
          </View>
        </BlurView>
      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════
          Content
      ═══════════════════════════════════════════════════════════ */}
      {isLoading && deletedNotes.length === 0 ? (
        <View style={[styles.loadingContainer, { paddingTop: NAVBAR_H }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={deletedNotes}
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
              icon="trash-outline"
              title="Trash is empty"
              description={"Deleted notes will appear here.\nThey can be restored or permanently removed."}
            />
          }
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              isSelected={selectedNoteIds.has(item.id)}
              isSelectionMode={isSelectionMode}
              onPress={() => toggleSelection(item.id)}
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

  barBase: { position: 'absolute', top: 0, left: 0, right: 0 },
  barInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Default Navbar
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs },
  navTitle: { flex: 1, fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, letterSpacing: -0.5 },
  navActionBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  navActionText: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },

  // Contextual Action Bar
  actionBarSide: { width: 90, justifyContent: 'center' },
  actionBarActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  actionBarCenter: { flex: 1, alignItems: 'center', paddingBottom: 2 },
  actionBarCount: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, letterSpacing: -0.3 },
  actionBarSelectAll: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, marginTop: 1 },
  actionBarCancel: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  actionBarIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // List
  listContent: { paddingHorizontal: spacing.base },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
