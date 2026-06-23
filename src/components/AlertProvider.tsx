import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../theme/ThemeProvider';
import { spacing, radius, typography } from '../theme/tokens';

type AlertOption = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertConfig = {
  title: string;
  message?: string;
  options?: AlertOption[];
  cancelable?: boolean;
};

interface AlertContextType {
  showAlert: (title: string, message?: string, options?: AlertOption[], optionsProps?: { cancelable?: boolean }) => void;
  showActionSheet: (title: string, message?: string, options?: AlertOption[], optionsProps?: { cancelable?: boolean }) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within AlertProvider');
  return ctx;
};

export function AlertProvider({ children }: { children: ReactNode }) {
  const { theme, isDark } = useTheme();

  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [type, setType] = useState<'dialog' | 'action-sheet'>('dialog');

  const animValue = useRef(new Animated.Value(0)).current;

  const show = (newType: 'dialog' | 'action-sheet', newConfig: AlertConfig) => {
    setType(newType);
    setConfig(newConfig);
    setIsVisible(true);
    
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.spring(animValue, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 250,
    }).start();
  };

  const hide = (onHidden?: () => void) => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      setConfig(null);
      if (onHidden) onHidden();
    });
  };

  const handleOptionPress = (option: AlertOption) => {
    hide(() => {
      if (option.onPress) option.onPress();
    });
  };

  const handleBackdropPress = () => {
    if (config?.cancelable !== false) {
      hide();
    }
  };

  const showAlert = (title: string, message?: string, options?: AlertOption[], optionsProps?: { cancelable?: boolean }) => {
    show('dialog', {
      title,
      message,
      options: options || [{ text: 'OK', onPress: () => {} }],
      cancelable: optionsProps?.cancelable ?? true,
    });
  };

  const showActionSheet = (title: string, message?: string, options?: AlertOption[], optionsProps?: { cancelable?: boolean }) => {
    show('action-sheet', {
      title,
      message,
      options: options || [{ text: 'Cancel', style: 'cancel', onPress: () => {} }],
      cancelable: optionsProps?.cancelable ?? true,
    });
  };

  const renderDialog = () => {
    if (!config) return null;

    const scale = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    });

    return (
      <Animated.View style={[styles.dialogContainer, { opacity: animValue, transform: [{ scale }] }]}>
        <View style={[styles.dialogBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <View style={styles.dialogHeader}>
            <Text style={[styles.dialogTitle, { color: theme.colors.text }]}>{config.title}</Text>
            {config.message && (
              <Text style={[styles.dialogMessage, { color: theme.colors.textSecondary }]}>{config.message}</Text>
            )}
          </View>
          
          <View style={styles.dialogButtonContainer}>
            {config.options?.map((option, index) => {
              const isDestructive = option.style === 'destructive';
              const isCancel = option.style === 'cancel';
              
              const textColor = isDestructive 
                ? theme.colors.error 
                : isCancel 
                ? theme.colors.textSecondary 
                : theme.colors.primary;

              return (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.dialogButton,
                    { 
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: theme.colors.border,
                      borderLeftWidth: index > 0 && config.options?.length === 2 ? StyleSheet.hairlineWidth : 0,
                      borderLeftColor: theme.colors.border,
                      flex: config.options?.length === 2 ? 1 : undefined,
                      backgroundColor: pressed ? (isDark ? '#FFFFFF10' : '#00000008') : 'transparent',
                    }
                  ]}
                  onPress={() => handleOptionPress(option)}
                >
                  <Text style={[
                    styles.dialogButtonText, 
                    { 
                      color: textColor,
                      fontWeight: isCancel || isDestructive ? typography.weights.bold : typography.weights.medium 
                    }
                  ]}>
                    {option.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderActionSheet = () => {
    if (!config) return null;

    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [300, 0],
    });

    return (
      <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
        <View style={[styles.sheetBox, { backgroundColor: theme.colors.card }]}>
          {(config.title || config.message) && (
            <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.border }]}>
              {config.title && <Text style={[styles.sheetTitle, { color: theme.colors.textSecondary }]}>{config.title}</Text>}
              {config.message && <Text style={[styles.sheetMessage, { color: theme.colors.textTertiary }]}>{config.message}</Text>}
            </View>
          )}
          
          <View style={styles.sheetOptions}>
            {config.options?.map((option, index) => {
              const isDestructive = option.style === 'destructive';
              const isCancel = option.style === 'cancel';
              
              // Move cancel buttons to a separate block at the bottom
              if (isCancel) return null;

              return (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.sheetButton,
                    { 
                      borderTopWidth: index > 0 ? StyleSheet.hairlineWidth : 0,
                      borderTopColor: theme.colors.border,
                      backgroundColor: pressed ? (isDark ? '#FFFFFF10' : '#00000008') : 'transparent',
                    }
                  ]}
                  onPress={() => handleOptionPress(option)}
                >
                  <Text style={[styles.sheetButtonText, { color: isDestructive ? theme.colors.error : theme.colors.primary }]}>
                    {option.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Cancel Button Block */}
        {config.options?.some(o => o.style === 'cancel') && (
          <View style={[styles.sheetBox, styles.sheetCancelBox, { backgroundColor: theme.colors.card }]}>
            {config.options.filter(o => o.style === 'cancel').map((option, index) => (
              <Pressable
                key={'cancel-' + index}
                style={({ pressed }) => [
                  styles.sheetButton,
                  { backgroundColor: pressed ? (isDark ? '#FFFFFF10' : '#00000008') : 'transparent' }
                ]}
                onPress={() => handleOptionPress(option)}
              >
                <Text style={[styles.sheetButtonText, styles.sheetCancelText, { color: theme.colors.primary }]}>
                  {option.text}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <AlertContext.Provider value={{ showAlert, showActionSheet }}>
      {children}
      
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleBackdropPress}
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View style={[styles.overlay, { opacity: animValue }]}>
            <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </TouchableWithoutFeedback>

        <View style={styles.contentContainer} pointerEvents="box-none">
          {type === 'dialog' ? renderDialog() : renderActionSheet()}
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  contentContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  
  // Dialog Styles
  dialogContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBox: {
    width: '100%',
    maxWidth: 320,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dialogHeader: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  dialogMessage: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: typography.sizes.sm * 1.4,
  },
  dialogButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dialogButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dialogButtonText: {
    fontSize: typography.sizes.md,
  },

  // Action Sheet Styles
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.base,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
  },
  sheetBox: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  sheetCancelBox: {
    marginBottom: 0,
  },
  sheetHeader: {
    padding: spacing.md,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    marginBottom: 4,
  },
  sheetMessage: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  sheetOptions: {},
  sheetButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
  },
  sheetCancelText: {
    fontWeight: typography.weights.bold,
  },
});
