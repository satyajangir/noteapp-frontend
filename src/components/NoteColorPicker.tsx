import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { noteColors } from '../theme/tokens';

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
        {noteColors.map((colorItem) => {
          const isDefault = colorItem.name === 'Default';
          const colorHex = isDark ? colorItem.dark : colorItem.light;
          const isSelected =
            selectedColor === colorItem.name ||
            selectedColor === colorItem.light ||
            selectedColor === colorItem.dark ||
            (isDefault && (selectedColor === 'transparent' || selectedColor === '#FFFFFF'));

          return (
            <Pressable
              key={colorItem.name}
              onPress={() => onSelectColor(isDefault ? 'transparent' : colorItem.light)}
              accessibilityLabel={`Select ${colorItem.name} color`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.colorCircle,
                {
                  backgroundColor: isDefault ? theme.colors.card : colorHex,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              {isDefault && !isSelected && (
                <Ionicons name="color-palette-outline" size={18} color={theme.colors.textTertiary} />
              )}
              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={isDefault || isDark ? theme.colors.primary : '#1A1A1A'}
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
    height: 68,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

