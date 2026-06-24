/**
 * Premium Note Editor — redesigned with clean layout, sticky frosted header,
 * separator bar, improved markdown preview, and safe-area aware footer.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useTheme } from '../../src/theme/ThemeProvider';
import { spacing, radius, typography } from '../../src/theme/tokens';
import { useNotesStore } from '../../src/stores/notes-store';
import { useAuthStore } from '../../src/stores/auth-store';
import { NoteColorPicker } from '../../src/components/NoteColorPicker';
import { useAlert } from '../../src/components/AlertProvider';
import { playSound } from '../../src/lib/sound-manager';
import {
  getNoteById,
  updateNoteField,
  insertNote,
} from '../../src/lib/database';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, isDark } = useTheme();
  const { updateNote } = useNotesStore();
  const { user } = useAuthStore();
  const { showAlert, showActionSheet } = useAlert();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('transparent');
  const [isPinned, setIsPinned] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  const titleInputRef = useRef<TextInput>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isCreatedRef = useRef<boolean>(false);
  const skipAutoDeleteRef = useRef<boolean>(false);

  // Keep refs of latest states to avoid re-triggering effect and to get the final values on unmount
  const stateRef = useRef({ title, content, isCreated: isCreatedRef.current });
  useEffect(() => {
    stateRef.current = { title, content, isCreated: isCreatedRef.current };
  }, [title, content, isCreatedRef.current]);

  useEffect(() => {
    return () => {
      const { title: finalTitle, content: finalContent, isCreated: finalIsCreated } = stateRef.current;
      if (
        !skipAutoDeleteRef.current &&
        finalIsCreated &&
        (!finalTitle || finalTitle.trim() === '') &&
        (!finalContent || finalContent.trim() === '')
      ) {
        // Automatically move note to trash if it is left empty (both title and content clear)
        const now = new Date().toISOString();
        playSound('delete');
        updateNoteField(id, 'deleted_at', now).catch(e => console.error('Failed to auto-delete note:', e));
        useNotesStore.getState().removeNote(id);
      }
    };
  }, [id]);

  // ── Load ──────────────────────────────────────────────────────────

  useEffect(() => { loadNote(); }, [id]);

  const loadNote = async () => {
    if (!id) return;
    try {
      const note = await getNoteById(id);
      if (note) {
        isCreatedRef.current = true;
        setTitle(note.title || '');
        setContent(note.content_preview || '');
        setColor(note.color || 'transparent');
        setIsPinned(note.is_pinned === 1);
        if (note.content_preview && note.content_preview.length > 0) {
          setIsEditing(false);
        }
      } else {
        isCreatedRef.current = false;
        setTitle('');
        setContent('');
        setIsEditing(true);
      }
    } catch (e) {
      console.error('Failed to load note:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Auto-Save ─────────────────────────────────────────────────────

  const autoSave = useCallback(
    (field: 'title' | 'content_preview' | 'color' | 'is_pinned' | 'is_archived', value: any) => {
      if (!id) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          if (!isCreatedRef.current) {
            const now = new Date().toISOString();
            await insertNote({
              id,
              ownerId: user?.id || '',
              title: field === 'title' ? value : title,
              contentPreview: field === 'content_preview' ? value : content,
              color: field === 'color' ? value : color,
            });
            isCreatedRef.current = true;

            useNotesStore.getState().addNote({
              id,
              ownerId: user?.id || '',
              title: field === 'title' ? value : title,
              contentPreview: field === 'content_preview' ? value : content,
              color: field === 'color' ? value : color,
              isPinned: field === 'is_pinned' ? !!value : isPinned,
              isArchived: field === 'is_archived' ? !!value : false,
              isLocked: false,
              isShared: false,
              version: 1,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            });
          } else {
            await updateNoteField(id, field, value);
            const storeFieldMap: Record<string, string> = {
              title: 'title',
              content_preview: 'contentPreview',
              color: 'color',
              is_pinned: 'isPinned',
              is_archived: 'isArchived',
            };
            updateNote(id, {
              [storeFieldMap[field]]: value === 1 ? true : value === 0 ? false : value,
            });
          }
        } catch (e) {
          console.error('Auto-save failed:', e);
        } finally {
          setIsSaving(false);
        }
      }, 500);
    },
    [id, title, content, color, isPinned]
  );

  // ── Handlers ──────────────────────────────────────────────────────

  const handleTitleChange = (text: string) => { setTitle(text); autoSave('title', text); };
  const handleContentChange = (text: string) => { setContent(text); autoSave('content_preview', text); };
  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    autoSave('color', newColor);
    playSound('tap');
  };
  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    autoSave('is_pinned', next ? 1 : 0);
    playSound('tap');
  };

  const handleArchive = () => {
    showAlert('Archive Note', 'Move this note to archive?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        onPress: () => {
          skipAutoDeleteRef.current = true;
          playSound('archive');
          autoSave('is_archived', 1);
          router.back();
        },
      },
    ]);
  };

  const handleDelete = (silent = false) => {
    const doDelete = async () => {
      if (!id) return;
      skipAutoDeleteRef.current = true;
      playSound('delete');
      if (!silent && Platform.OS === 'ios') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await updateNoteField(id, 'deleted_at', new Date().toISOString());
      useNotesStore.getState().removeNote(id);
      router.back();
    };
    if (silent) { doDelete(); return; }
    showAlert('Delete Note', 'Move this note to trash?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const handleBack = () => {
    playSound('click');
    router.back();
  };

  const openNoteOptions = () => {
    playSound('click');
    showActionSheet('Note Options', undefined, [
      { text: isPinned ? 'Unpin Note' : 'Pin Note', onPress: togglePin },
      { text: 'Archive Note', onPress: handleArchive },
      { text: 'Delete Note', style: 'destructive', onPress: () => handleDelete(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Stats ─────────────────────────────────────────────────────────

  const words = content.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const chars = content.length;

  // ── Render ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isDefaultColor = !color || color === 'transparent' || color === '#FFFFFF';
  const bgColor = isDefaultColor ? theme.colors.background : color;
  const textColor = isDefaultColor ? theme.colors.text : '#1a1a1a';
  const placeholderColor = isDefaultColor ? theme.colors.textTertiary : '#6b7280';
  const metaColor = isDefaultColor ? theme.colors.textSecondary : '#4b5563';
  const separatorColor = isDefaultColor ? theme.colors.border : 'rgba(0,0,0,0.08)';
  const headerHeight = insets.top + 56;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>

      {/* ── Sticky frosted header ────────────────────────────────── */}
      <BlurView
        intensity={isDark ? 60 : 90}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.header, { paddingTop: insets.top, height: headerHeight }]}
      >
        {/* Back */}
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={textColor} />
        </Pressable>

        {/* Center: saving indicator */}
        <View style={styles.headerCenter}>
          {isSaving && (
            <View style={styles.savingIndicator}>
              <View style={[styles.savingDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.savingText, { color: metaColor }]}>Saving</Text>
            </View>
          )}
        </View>

        {/* Right actions */}
        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerBtn}
            onPress={() => setIsEditing(!isEditing)}
            hitSlop={8}
          >
            <Ionicons
              name={isEditing ? 'eye-outline' : 'pencil-outline'}
              size={21}
              color={textColor}
            />
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={openNoteOptions} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={21} color={textColor} />
          </Pressable>
        </View>
      </BlurView>

      {/* ── Editor / Reader ──────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={[styles.editorWrapper, { paddingTop: headerHeight }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.editorContent,
            { paddingBottom: insets.bottom + 130 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <TextInput
            ref={titleInputRef}
            style={[styles.titleInput, { color: textColor }]}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Untitled"
            placeholderTextColor={placeholderColor}
            multiline
            selectionColor={theme.colors.primary}
            scrollEnabled={false}
          />

          {/* Separator */}
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />

          {/* Body */}
          {isEditing ? (
            <TextInput
              style={[styles.bodyInput, { color: textColor }]}
              value={content}
              onChangeText={handleContentChange}
              placeholder="Start writing your note..."
              placeholderTextColor={placeholderColor}
              multiline
              textAlignVertical="top"
              autoFocus={!isCreatedRef.current}
              selectionColor={theme.colors.primary}
              scrollEnabled={false}
            />
          ) : (
            <Markdown
              style={{
                body: { color: textColor, fontSize: 16, lineHeight: 26 },
                heading1: { color: textColor, fontSize: 28, fontWeight: '700', marginTop: 24, marginBottom: 10, letterSpacing: -0.5 },
                heading2: { color: textColor, fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 8 },
                heading3: { color: textColor, fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 6 },
                paragraph: { color: textColor, marginTop: 0, marginBottom: 14, lineHeight: 26 },
                text: { color: textColor },
                link: { color: theme.colors.primary, textDecorationLine: 'underline' },
                list_item: { color: textColor, marginBottom: 6, lineHeight: 24 },
                bullet_list: { marginBottom: 12 },
                ordered_list: { marginBottom: 12 },
                blockquote: {
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary,
                  paddingLeft: 14,
                  fontStyle: 'italic',
                  color: metaColor,
                  marginBottom: 14,
                  opacity: 0.85,
                },
                code_block: {
                  backgroundColor: isDark ? '#1e1e2e' : '#f4f4f8',
                  padding: 14,
                  borderRadius: radius.md,
                  marginBottom: 14,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontSize: 13,
                },
                code_inline: {
                  backgroundColor: isDark ? '#1e1e2e' : '#f4f4f8',
                  paddingHorizontal: 5,
                  borderRadius: radius.sm,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontSize: 13,
                  color: theme.colors.primary,
                },
                fence: {
                  backgroundColor: isDark ? '#1e1e2e' : '#f4f4f8',
                  padding: 14,
                  borderRadius: radius.md,
                  marginBottom: 14,
                },
                hr: { backgroundColor: separatorColor, height: 1, marginVertical: 16 },
                strong: { color: textColor, fontWeight: '700' },
                em: { color: textColor, fontStyle: 'italic' },
              }}
            >
              {content || '*No content yet. Tap the pencil to start writing.*'}
            </Markdown>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Footer toolbar ───────────────────────────────────────── */}
      <BlurView
        intensity={isDark ? 60 : 90}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.footer,
          {
            borderTopColor: separatorColor,
            paddingBottom: insets.bottom || spacing.md,
          },
        ]}
      >
        <NoteColorPicker selectedColor={color} onSelectColor={handleColorChange} />

        {/* Stats pill */}
        <View style={[styles.statsPill, { backgroundColor: theme.colors.primary + '12' }]}>
          <Text style={[styles.statsText, { color: theme.colors.primary }]}>
            {words > 0 ? `${words}w · ${chars}ch` : 'Empty'}
          </Text>
        </View>
      </BlurView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  savingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  savingText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },

  // Editor
  editorWrapper: { flex: 1 },
  editorContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    flexGrow: 1,
  },
  titleInput: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    letterSpacing: -0.8,
    lineHeight: typography.sizes['2xl'] * 1.25,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.xs,
  },
  bodyInput: {
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * 1.75,
    textAlignVertical: 'top',
    flex: 1,
    minHeight: 300,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statsPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statsText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.2,
  },
});
