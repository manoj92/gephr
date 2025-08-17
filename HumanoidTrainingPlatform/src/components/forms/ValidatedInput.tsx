/**
 * Validated Input Components with real-time validation and error display
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  KeyboardTypeOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ValidationRule, useFieldValidation, sanitizeInput } from '../../utils/validation';

// ==================== TYPES ====================

interface BaseInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  rules?: ValidationRule[];
  disabled?: boolean;
  required?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  showErrorIcon?: boolean;
  showSuccessIcon?: boolean;
  debounceValidation?: number;
  sanitizer?: (value: string) => string;
}

interface TextInputProps extends BaseInputProps {
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
}

interface PasswordInputProps extends BaseInputProps {
  showToggleButton?: boolean;
  confirmPassword?: boolean;
}

interface SelectInputProps extends BaseInputProps {
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
  searchable?: boolean;
  multiple?: boolean;
}

// ==================== VALIDATED TEXT INPUT ====================

export const ValidatedTextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChangeText,
  onBlur,
  onFocus,
  placeholder,
  rules = [],
  disabled = false,
  required = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  returnKeyType = 'done',
  onSubmitEditing,
  style,
  inputStyle,
  labelStyle,
  errorStyle,
  showErrorIcon = true,
  showSuccessIcon = false,
  debounceValidation = 300,
  sanitizer,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  
  const { error, isValidating, isValid } = useFieldValidation(value, rules, {
    validateOnChange: hasBeenTouched,
    debounceMs: debounceValidation,
  });
  
  const animatedBorderColor = useRef(new Animated.Value(0)).current;
  const animatedLabelPosition = useRef(new Animated.Value(value ? 1 : 0)).current;
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Border color animation
    Animated.timing(animatedBorderColor, {
      toValue: error ? 2 : isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    
    // Label position animation
    Animated.timing(animatedLabelPosition, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    
    // Shake animation for errors
    if (error && hasBeenTouched) {
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error, isFocused, value, hasBeenTouched]);
  
  const handleChangeText = (text: string) => {
    const sanitizedText = sanitizer ? sanitizer(text) : text;
    onChangeText(sanitizedText);
  };
  
  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) onFocus();
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    setHasBeenTouched(true);
    if (onBlur) onBlur();
  };
  
  const borderColor = animatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#333333', '#00E5FF', '#FF4444'],
  });
  
  const labelTop = animatedLabelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });
  
  const labelFontSize = animatedLabelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });
  
  const labelColor = animatedLabelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: ['#888888', isFocused ? '#00E5FF' : '#CCCCCC'],
  });
  
  const getStatusIcon = () => {
    if (isValidating) {
      return <Ionicons name="time-outline" size={20} color="#888888" />;
    }
    if (error && showErrorIcon && hasBeenTouched) {
      return <Ionicons name="alert-circle" size={20} color="#FF4444" />;
    }
    if (isValid && showSuccessIcon && hasBeenTouched && value) {
      return <Ionicons name="checkmark-circle" size={20} color="#00C896" />;
    }
    return null;
  };
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        style,
        { transform: [{ translateX: shakeAnimation }] }
      ]}
    >
      <View style={styles.inputContainer}>
        <Animated.View
          style={[
            styles.inputWrapper,
            { borderColor },
            multiline && { height: numberOfLines * 24 + 32 },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              inputStyle,
              multiline && { height: numberOfLines * 24 },
              disabled && styles.disabled,
            ]}
            value={value}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isFocused ? placeholder : ''}
            placeholderTextColor="#666666"
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            numberOfLines={numberOfLines}
            maxLength={maxLength}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            editable={!disabled}
          />
          
          <Animated.Text
            style={[
              styles.label,
              labelStyle,
              {
                top: labelTop,
                fontSize: labelFontSize,
                color: labelColor,
              },
            ]}
          >
            {label}{required && ' *'}
          </Animated.Text>
          
          <View style={styles.iconContainer}>
            {getStatusIcon()}
          </View>
        </Animated.View>
      </View>
      
      {error && hasBeenTouched && (
        <Animated.View style={styles.errorContainer}>
          <Text style={[styles.errorText, errorStyle]}>{error}</Text>
        </Animated.View>
      )}
      
      {maxLength && (
        <Text style={styles.characterCount}>
          {value.length}/{maxLength}
        </Text>
      )}
    </Animated.View>
  );
};

// ==================== VALIDATED PASSWORD INPUT ====================

export const ValidatedPasswordInput: React.FC<PasswordInputProps> = ({
  showToggleButton = true,
  confirmPassword = false,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };
  
  return (
    <View style={props.style}>
      <ValidatedTextInput
        {...props}
        secureTextEntry={!isVisible}
        keyboardType="default"
        autoCapitalize="none"
        autoCorrect={false}
        inputStyle={[props.inputStyle, showToggleButton && { paddingRight: 50 }]}
      />
      
      {showToggleButton && (
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={toggleVisibility}
          disabled={props.disabled}
        >
          <Ionicons
            name={isVisible ? 'eye-off' : 'eye'}
            size={20}
            color="#888888"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ==================== VALIDATED SELECT INPUT ====================

export const ValidatedSelectInput: React.FC<SelectInputProps> = ({
  label,
  value,
  onChangeText,
  onSelect,
  options,
  rules = [],
  required = false,
  searchable = false,
  multiple = false,
  placeholder = 'Select an option...',
  style,
  labelStyle,
  errorStyle,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  
  const { error, isValid } = useFieldValidation(value, rules, {
    validateOnChange: hasBeenTouched,
  });
  
  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchText.toLowerCase())
      )
    : options;
  
  const selectedOption = options.find(option => option.value === value);
  
  const handleSelect = (optionValue: string) => {
    onSelect(optionValue);
    onChangeText(optionValue);
    setIsOpen(false);
    setHasBeenTouched(true);
  };
  
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };
  
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.selectLabel, labelStyle]}>
        {label}{required && ' *'}
      </Text>
      
      <TouchableOpacity
        style={[
          styles.selectContainer,
          error && hasBeenTouched && styles.selectError,
          disabled && styles.disabled,
        ]}
        onPress={toggleDropdown}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectText,
            !selectedOption && styles.selectPlaceholder,
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#888888"
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdown}>
          {searchable && (
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search options..."
              placeholderTextColor="#666666"
            />
          )}
          
          {filteredOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                option.value === value && styles.selectedOption,
              ]}
              onPress={() => handleSelect(option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  option.value === value && styles.selectedOptionText,
                ]}
              >
                {option.label}
              </Text>
              {option.value === value && (
                <Ionicons name="checkmark" size={16} color="#00E5FF" />
              )}
            </TouchableOpacity>
          ))}
          
          {filteredOptions.length === 0 && (
            <View style={styles.noOptions}>
              <Text style={styles.noOptionsText}>No options found</Text>
            </View>
          )}
        </View>
      )}
      
      {error && hasBeenTouched && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, errorStyle]}>{error}</Text>
        </View>
      )}
    </View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputContainer: {
    position: 'relative',
  },
  inputWrapper: {
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    minHeight: 56,
    position: 'relative',
  },
  input: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    paddingTop: 8,
    paddingRight: 40,
  },
  label: {
    position: 'absolute',
    left: 16,
    fontWeight: '500',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 4,
  },
  iconContainer: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  errorContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#FF4444',
    marginLeft: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginTop: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  
  // Password input
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 18,
    padding: 4,
  },
  
  // Select input
  selectLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
    fontWeight: '500',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
  },
  selectError: {
    borderColor: '#FF4444',
  },
  selectText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  selectPlaceholder: {
    color: '#666666',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  searchInput: {
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 8,
    borderRadius: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  selectedOption: {
    backgroundColor: '#333333',
  },
  optionText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  selectedOptionText: {
    color: '#00E5FF',
    fontWeight: '500',
  },
  noOptions: {
    padding: 16,
    alignItems: 'center',
  },
  noOptionsText: {
    fontSize: 14,
    color: '#666666',
  },
});

export default {
  ValidatedTextInput,
  ValidatedPasswordInput,
  ValidatedSelectInput,
};