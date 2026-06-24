/**
 * Notes Dashboard — premium home screen.
 * Features: animated navbar ↔ contextual action bar transition,
 * 3-dot menu, grid/list view toggle, pinned carousel, masonry grid, animated FAB.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const uuidv4 = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing, radius, typography } from '../../src/theme/tokens';
import { useNotesStore, type Note } from '../../src/stores/notes-store';
import { useAuthStore } from '../../src/stores/auth-store';
import { getAllNotes, updateNoteField } from '../../src/lib/database';
import { NoteCard } from '../../src/components/NoteCard';
import { EmptyState } from '../../src/components/EmptyState';
import { useAlert } from '../../src/components/AlertProvider';
import { playSound } from '../../src/lib/sound-manager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = spacing.sm;
const H_PADDING = spacing.base;

type ViewMode = 'grid' | 'list';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Spring config presets
const SPRING_SNAPPY = { damping: 22, stiffness: 300, useNativeDriver: true };
const SPRING_SOFT = { damping: 20, stiffness: 200, useNativeDriver: true };

export default function NotesScreen() {
  const { theme, isDark } = useTheme();
  const { notes, setNotes, isLoading, setLoading, removeNote } = useNotesStore();
  const { user } = useAuthStore();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [menuOpen, setMenuOpen] = useState(false);

  const isSelectionMode = selectedNoteIds.size > 0;
  const allSelected = notes.length > 0 && selectedNoteIds.size === notes.length;

  // Animation refs
  const fabLabelWidth = useRef(new Animated.Value(1)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  // Navbar ↔ action bar animation (0 = navbar visible, 1 = action bar visible)
  const selectionProgress = useRef(new Animated.Value(0)).current;
  const prevIsSelectionMode = useRef(false);

  // ── Animate bar transition ────────────────────────────────────────
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

  // Derived animated values for navbar
  const navbarTranslateY = selectionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -80],
  });
  const navbarOpacity = selectionProgress.interpolate({
    inputRange: [0, 0.4],
    outputRange: [1, 0],
  });

  // Derived animated values for action bar
  const actionBarTranslateY = selectionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 0],
  });
  const actionBarOpacity = selectionProgress.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0, 1],
  });

  // ── Data ──────────────────────────────────────────────────────────

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const raw = await getAllNotes({ archived: false });
      setNotes(
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
      console.error('Failed to load notes:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  }, []);

  // ── 3-dot Menu ────────────────────────────────────────────────────

  const openMenu = () => {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(true);
    Animated.spring(menuAnim, { toValue: 1, ...SPRING_SOFT }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() =>
      setMenuOpen(false)
    );
  };

  // ── FAB scroll animation ──────────────────────────────────────────

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: new Animated.Value(0) } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const collapsed = e.nativeEvent.contentOffset.y > 60;
        Animated.spring(fabLabelWidth, {
          toValue: collapsed ? 0 : 1,
          useNativeDriver: false,
          speed: 14,
          bounciness: 0,
        }).start();
      },
    }
  );

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
      setSelectedNoteIds(new Set(notes.map((n) => n.id)));
      playSound('success');
    }
    if (Platform.OS === 'ios') Haptics.selectionAsync();
  };

  // ── Bulk actions ──────────────────────────────────────────────────

  const deleteSelected = () => {
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
            playSound('delete');
            for (const id of Array.from(selectedNoteIds)) {
              await updateNoteField(id, 'deleted_at', new Date().toISOString());
              removeNote(id);
            }
            setSelectedNoteIds(new Set());
          },
        },
      ]
    );
  };

  const archiveSelected = async () => {
    if (Platform.OS === 'ios') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSound('archive');
    for (const id of Array.from(selectedNoteIds)) {
      await updateNoteField(id, 'is_archived', 1);
      removeNote(id);
    }
    setSelectedNoteIds(new Set());
  };

  // ── Create note ───────────────────────────────────────────────────

  const createNote = async () => {
    if (Platform.OS === 'ios') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSound('click');
    router.push(`/note/${uuidv4()}`);
  };

  // ── Data splits ───────────────────────────────────────────────────

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const regularNotes = notes.filter((n) => !n.isPinned);
  const leftColumn: Note[] = [];
  const rightColumn: Note[] = [];
  regularNotes.forEach((n, i) => (i % 2 === 0 ? leftColumn : rightColumn).push(n));
  const hasNotes = notes.length > 0;

  const noteOnPress = (id: string) => {
    if (isSelectionMode) toggleSelection(id);
    else {
      playSound('click');
      router.push(`/note/${id}`);
    }
  };

  const renderCard = (note: Note) => (
    <NoteCard
      key={note.id}
      note={note}
      isSelected={selectedNoteIds.has(note.id)}
      isSelectionMode={isSelectionMode}
      onPress={() => noteOnPress(note.id)}
      onLongPress={() => toggleSelection(note.id)}
    />
  );

  const NAVBAR_H = insets.top + 58;

  // ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* ══════════════════════════════════════════════════════════
          LAYER 1 — Default Navbar (slides UP and fades when selection starts)
      ══════════════════════════════════════════════════════════ */}
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
          <Text style={[styles.navTitle, { color: theme.colors.text }]}>Notes</Text>
          <Pressable
            style={styles.navMenuBtn}
            onPress={openMenu}
            hitSlop={12}
            accessibilityLabel="Open options menu"
            accessibilityRole="button"
          >
            <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={theme.colors.text} />
          </Pressable>
        </BlurView>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════════
          LAYER 2 — Contextual Action Bar (slides DOWN in when selection starts)
      ══════════════════════════════════════════════════════════ */}
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
          style={[styles.barInner, { paddingTop: insets.top, borderBottomColor: theme.colors.primary + '40' }]}
        >
          {/* Left: cancel */}
          <Pressable
            style={styles.actionBarSide}
            onPress={clearSelection}
            hitSlop={12}
            accessibilityLabel="Cancel selection mode"
            accessibilityRole="button"
          >
            <Text style={[styles.actionBarCancel, { color: theme.colors.primary }]}>Cancel</Text>
          </Pressable>

          {/* Center: count + select all */}
          <Pressable
            style={styles.actionBarCenter}
            onPress={selectAll}
            hitSlop={12}
            accessibilityLabel={allSelected ? "Deselect all notes" : "Select all notes"}
            accessibilityRole="button"
          >
            <Text style={[styles.actionBarCount, { color: theme.colors.text }]}>
              {selectedNoteIds.size} selected
            </Text>
            <Text style={[styles.actionBarSelectAll, { color: theme.colors.primary }]}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>

          {/* Right: bulk actions */}
          <View style={[styles.actionBarSide, styles.actionBarActionsRow]}>
            {/* Archive */}
            <Pressable
              style={({ pressed }) => [styles.actionBarIconBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={archiveSelected}
              hitSlop={12}
              accessibilityLabel="Archive selected notes"
              accessibilityRole="button"
            >
              <Ionicons name="archive-outline" size={22} color={theme.colors.textSecondary} />
            </Pressable>
            {/* Delete */}
            <Pressable
              style={({ pressed }) => [styles.actionBarIconBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={deleteSelected}
              hitSlop={12}
              accessibilityLabel="Move selected notes to trash"
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
            </Pressable>
          </View>
        </BlurView>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════════
          Scroll Content
      ══════════════════════════════════════════════════════════ */}
      <Animated.ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: NAVBAR_H + spacing.base, paddingBottom: insets.bottom + 120 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            progressViewOffset={NAVBAR_H}
          />
        }
      >
        {/* ── Greeting ─────────────────────────────────────────── */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            <View>
              <Text style={[styles.greetingText, { color: theme.colors.textSecondary }]}>
                {getGreeting()}
              </Text>
              <Text style={[styles.greetingName, { color: theme.colors.text }]}>
                {user?.displayName?.split(' ')[0] || 'My Notes'}
              </Text>
            </View>
            {hasNotes && (
              <View style={[styles.notesCountBadge, { backgroundColor: theme.colors.primary + '18' }]}>
                <Text style={[styles.notesCountText, { color: theme.colors.primary }]}>
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Loading ──────────────────────────────────────────── */}
        {isLoading && notes.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}

        {/* ── Empty ────────────────────────────────────────────── */}
        {!isLoading && !hasNotes && (
          <EmptyState
            icon="document-text-outline"
            title="No notes yet"
            description={"Tap + below to capture your first thought."}
          />
        )}

        {/* ── Pinned carousel ──────────────────────────────────── */}
        {pinnedNotes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pin" size={12} color={theme.colors.textTertiary} />
              <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>PINNED</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pinnedRow}>
              {pinnedNotes.map((note) => (
                <View key={note.id} style={{ width: SCREEN_WIDTH * 0.72, marginRight: spacing.md }}>
                  {renderCard(note)}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Notes grid / list ────────────────────────────────── */}
        {regularNotes.length > 0 && (
          <View style={styles.section}>
            {pinnedNotes.length > 0 && (
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={12} color={theme.colors.textTertiary} />
                <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>ALL NOTES</Text>
              </View>
            )}
            {viewMode === 'grid' ? (
              <View style={styles.masonryRow}>
                <View style={{ flex: 1 }}>{leftColumn.map(renderCard)}</View>
                <View style={{ width: COLUMN_GAP }} />
                <View style={{ flex: 1 }}>{rightColumn.map(renderCard)}</View>
              </View>
            ) : (
              <View>{regularNotes.map(renderCard)}</View>
            )}
          </View>
        )}
      </Animated.ScrollView>

      {/* ══════════════════════════════════════════════════════════
          FAB — hidden during selection mode
      ══════════════════════════════════════════════════════════ */}
      {!isSelectionMode && (
        <View style={[styles.fabContainer, { bottom: insets.bottom + spacing.lg }]}>
          <Pressable
            onPress={createNote}
            accessibilityLabel="Create new note"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: theme.colors.primary, opacity: pressed ? 0.88 : 1, shadowColor: theme.colors.primary },
            ]}
          >
            {() => (
              <Animated.View style={styles.fabInner}>
                <Ionicons name="add" size={26} color="#FFF" />
                <Animated.Text
                  style={[
                    styles.fabLabel,
                    {
                      maxWidth: fabLabelWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }),
                      opacity: fabLabelWidth,
                      marginLeft: fabLabelWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }),
                    },
                  ]}
                  numberOfLines={1}
                >
                  New Note
                </Animated.Text>
              </Animated.View>
            )}
          </Pressable>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════
          3-dot Dropdown Menu
      ══════════════════════════════════════════════════════════ */}
      <Modal visible={menuOpen} transparent animationType="none" statusBarTranslucent onRequestClose={closeMenu}>
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.menuContainer,
            {
              top: insets.top + 54,
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              opacity: menuAnim,
              transform: [
                { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
                { translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
              ],
            },
          ]}
        >
          <Text style={[styles.menuSectionLabel, { color: theme.colors.textTertiary }]}>VIEW</Text>

          {(['grid', 'list'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? (isDark ? '#FFFFFF10' : '#00000008') : 'transparent' },
              ]}
              onPress={() => {
                setViewMode(mode);
                playSound('tap');
                if (Platform.OS === 'ios') Haptics.selectionAsync();
                closeMenu();
              }}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: theme.colors.primary + '18' }]}>
                <Ionicons
                  name={mode === 'grid' ? 'grid-outline' : 'list-outline'}
                  size={17}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={[styles.menuItemText, { color: theme.colors.text }]}>
                {mode === 'grid' ? 'Grid View' : 'List View'}
              </Text>
              {viewMode === mode && (
                <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
              )}
            </Pressable>
          ))}

          <View style={[styles.menuDivider, { backgroundColor: theme.colors.border }]} />

          {/* Archive */}
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              { backgroundColor: pressed ? (isDark ? '#FFFFFF10' : '#00000008') : 'transparent' },
            ]}
            onPress={() => { playSound('click'); closeMenu(); setTimeout(() => router.push('/archive'), 180); }}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: theme.colors.textTertiary + '20' }]}>
              <Ionicons name="archive-outline" size={17} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Archive</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </Pressable>

          {/* Settings */}
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              { backgroundColor: pressed ? (isDark ? '#FFFFFF10' : '#00000008') : 'transparent' },
            ]}
            onPress={() => { playSound('click'); closeMenu(); setTimeout(() => router.push('/(tabs)/settings'), 180); }}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: theme.colors.textTertiary + '20' }]}>
              <Ionicons name="settings-outline" size={17} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
          </Pressable>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: H_PADDING },

  // Shared bar base (absolute, full-width overlay)
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

  // ── Default Navbar ───────────────────────────────────────────────
  navTitle: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  navMenuBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Contextual Action Bar ────────────────────────────────────────
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

  // ── Greeting ────────────────────────────────────────────────────
  greetingSection: { paddingTop: spacing.xs, paddingBottom: spacing.lg },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greetingText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, marginBottom: 2 },
  greetingName: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold, letterSpacing: -0.8 },
  notesCountBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  notesCountText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  loadingContainer: { paddingTop: 80, alignItems: 'center' },

  // ── Sections ────────────────────────────────────────────────────
  section: { marginBottom: spacing.base },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  sectionLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, letterSpacing: 0.8 },
  pinnedRow: { paddingRight: H_PADDING },
  masonryRow: { flexDirection: 'row' },

  // ── FAB ─────────────────────────────────────────────────────────
  fabContainer: { position: 'absolute', right: spacing.xl, zIndex: 50 },
  fab: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    minWidth: 64,
  },
  fabInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  fabLabel: { color: '#FFF', fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, overflow: 'hidden' },

  // ── 3-dot Dropdown ──────────────────────────────────────────────
  menuContainer: {
    position: 'absolute',
    right: spacing.base,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    width: 230,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
    zIndex: 999,
  },
  menuSectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.8,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    marginBottom: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: { flex: 1, fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  menuDivider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs, marginHorizontal: spacing.base },
});
