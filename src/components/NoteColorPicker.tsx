import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius } from '../theme/tokens';

const NOTE_COLORS = [
  'transparent',
  '#fecaca', // red
  '#fed7aa', // orange
  '#fef08a', // yellow
  '#bbf7d0', // green
  '#bfdbfe', // blue
  '#e9d5ff', // purple
  '#fbcfe8', // pink
];

export function NoteColorPicker({
  selectedColor,
  onSelectColor,
}: {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}) {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {NOTE_COLORS.map((color) => {
          const isSelected = selectedColor === color;
          return (
            <Pressable
              key={color}
              onPress={() => onSelectColor(color)}
              style={[
                styles.colorCircle,
                {
                  backgroundColor: color === 'transparent' ? theme.colors.card : color,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              {color === 'transparent' && !isSelected && (
                <Ionicons name="color-palette-outline" size={16} color={theme.colors.textTertiary} />
              )}
              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={color === 'transparent' ? theme.colors.primary : '#000'}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
