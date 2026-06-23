/**
 * Search screen — premium redesign with inline hero search bar,
 * NoteCard results, and animated empty state.
 */

import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing, radius, typography } from '../../src/theme/tokens';
import { getAllNotes } from '../../src/lib/database';
import type { Note } from '../../src/stores/notes-store';
import { NoteCard } from '../../src/components/NoteCard';

export default function SearchScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<TextInput>(null);

  const search = useCallback(async (text: string) => {
    if (text.trim().length === 0) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setHasSearched(true);
    try {
      const raw = await getAllNotes({ search: text });
      setResults(
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
      console.error('Search failed:', e);
    }
  }, []);

  const debouncedSearch = (text: string) => {
    setQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => search(text), 220);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* ── Hero Search Header ──────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.base }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Search</Text>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark ? theme.colors.card : theme.colors.searchBar,
              borderColor: theme.colors.cardBorder,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search in notes…"
            placeholderTextColor={theme.colors.textTertiary}
            value={query}
            onChangeText={debouncedSearch}
            returnKeyType="search"
            selectionColor={theme.colors.primary}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.colors.textTertiary}
              onPress={clearSearch}
            />
          )}
        </View>
      </View>

      {/* ── Results count ───────────────────────────────────────── */}
      {hasSearched && results.length > 0 && (
        <View style={styles.resultsMeta}>
          <Text style={[styles.resultsMetaText, { color: theme.colors.textSecondary }]}>
            {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>"{query}"</Text>
          </Text>
        </View>
      )}

      {/* ── Results list ────────────────────────────────────────── */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            isSelected={false}
            isSelectionMode={false}
            onPress={() => router.push(`/note/${item.id}`)}
            onLongPress={() => {}}
          />
        )}
        ListEmptyComponent={
          hasSearched ? (
            // No results
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconRing,
                  { backgroundColor: theme.colors.primary + '12', borderColor: theme.colors.primary + '20' },
                ]}
              >
                <Ionicons name="search-outline" size={40} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No results found
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {"No notes match \"" + query + "\".\nTry different keywords."}
              </Text>
            </View>
          ) : (
            // Idle state
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconRing,
                  { backgroundColor: theme.colors.primary + '12', borderColor: theme.colors.primary + '20' },
                ]}
              >
                <Ionicons name="telescope-outline" size={40} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                Find anything
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {"Search across titles and\ncontent in all your notes."}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  headerTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    letterSpacing: -0.8,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.base,
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    height: '100%',
  },

  resultsMeta: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  resultsMetaText: {
    fontSize: typography.sizes.sm,
  },

  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
  },
  emptyIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.4,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: typography.sizes.sm * 1.65,
  },
});
