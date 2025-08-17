/**
 * Comprehensive validation utilities and hooks for React Native
 */

import { useState, useEffect, useCallback } from 'react';

// ==================== VALIDATION TYPES ====================

export interface ValidationRule {
  validator: (value: any) => boolean | string;
  message: string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

export interface FormValidationState {
  values: { [key: string]: any };
  errors: { [key: string]: string };
  touched: { [key: string]: boolean };
  isValid: boolean;
  isSubmitted: boolean;
}

// ==================== VALIDATION RULES ====================

export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validator: (value: any) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    message,
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true; // Let required handle empty values
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      return value.length >= min;
    },
    message: message || `Must be at least ${min} characters long`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      return value.length <= max;
    },
    message: message || `Must be no more than ${max} characters long`,
  }),

  minValue: (min: number, message?: string): ValidationRule => ({
    validator: (value: number) => {
      if (value === null || value === undefined) return true;
      return Number(value) >= min;
    },
    message: message || `Must be at least ${min}`,
  }),

  maxValue: (max: number, message?: string): ValidationRule => ({
    validator: (value: number) => {
      if (value === null || value === undefined) return true;
      return Number(value) <= max;
    },
    message: message || `Must be no more than ${max}`,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      return regex.test(value);
    },
    message,
  }),

  phoneNumber: (message = 'Please enter a valid phone number'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      const phoneRegex = /^\+?1?\d{9,15}$/;
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
    },
    message,
  }),

  password: (message = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      const minLength = value.length >= 8;
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
      return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
    },
    message,
  }),

  confirmPassword: (passwordField: string, message = 'Passwords must match'): ValidationRule => ({
    validator: (value: string, allValues: any) => {
      if (!value || !allValues) return true;
      return value === allValues[passwordField];
    },
    message,
  }),

  ipAddress: (message = 'Please enter a valid IP address'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      return ipRegex.test(value);
    },
    message,
  }),

  port: (message = 'Please enter a valid port number (1024-65535)'): ValidationRule => ({
    validator: (value: number) => {
      if (value === null || value === undefined) return true;
      const portNum = Number(value);
      return !isNaN(portNum) && portNum >= 1024 && portNum <= 65535;
    },
    message,
  }),

  coordinates: (message = 'Please enter valid coordinates (x, y, z)'): ValidationRule => ({
    validator: (value: number[]) => {
      if (!Array.isArray(value) || value.length !== 3) return false;
      return value.every(coord => 
        typeof coord === 'number' && 
        !isNaN(coord) && 
        coord >= -1000 && 
        coord <= 1000
      );
    },
    message,
  }),

  jointAngles: (message = 'Please enter valid joint angles (-360 to 360 degrees)'): ValidationRule => ({
    validator: (value: number[]) => {
      if (!Array.isArray(value)) return false;
      if (value.length > 30) return false;
      return value.every(angle => 
        typeof angle === 'number' && 
        !isNaN(angle) && 
        angle >= -360 && 
        angle <= 360
      );
    },
    message,
  }),

  percentage: (message = 'Please enter a valid percentage (0-100)'): ValidationRule => ({
    validator: (value: number) => {
      if (value === null || value === undefined) return true;
      const num = Number(value);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    message,
  }),

  fileSize: (maxSizeMB: number, message?: string): ValidationRule => ({
    validator: (file: { size: number }) => {
      if (!file || !file.size) return true;
      const maxBytes = maxSizeMB * 1024 * 1024;
      return file.size <= maxBytes;
    },
    message: message || `File size must be less than ${maxSizeMB}MB`,
  }),

  fileType: (allowedTypes: string[], message?: string): ValidationRule => ({
    validator: (file: { type: string }) => {
      if (!file || !file.type) return true;
      return allowedTypes.includes(file.type);
    },
    message: message || `File type must be one of: ${allowedTypes.join(', ')}`,
  }),

  robotSerial: (message = 'Invalid robot serial number format (expected: XX######XX)'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      const serialRegex = /^[A-Z]{2}\d{6}[A-Z]{2}$/;
      return serialRegex.test(value);
    },
    message,
  }),

  alphanumeric: (message = 'Only letters and numbers are allowed'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      const alphanumericRegex = /^[a-zA-Z0-9]+$/;
      return alphanumericRegex.test(value);
    },
    message,
  }),

  noSpaces: (message = 'Spaces are not allowed'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      return !value.includes(' ');
    },
    message,
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  custom: (validator: (value: any, allValues?: any) => boolean | string, message: string): ValidationRule => ({
    validator,
    message,
  }),
};

// ==================== VALIDATION FUNCTIONS ====================

export const validateField = (
  value: any,
  rules: ValidationRule[],
  allValues?: any
): string | null => {
  for (const rule of rules) {
    const result = rule.validator(value, allValues);
    if (result === false || typeof result === 'string') {
      return typeof result === 'string' ? result : rule.message;
    }
  }
  return null;
};

export const validateForm = (
  values: { [key: string]: any },
  schema: ValidationSchema
): ValidationResult => {
  const errors: { [key: string]: string } = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(values[field], rules, values);
    if (error) {
      errors[field] = error;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// ==================== VALIDATION HOOKS ====================

export const useFormValidation = (
  initialValues: { [key: string]: any },
  schema: ValidationSchema,
  options: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    revalidateOnChange?: boolean;
  } = {}
) => {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    revalidateOnChange = true,
  } = options;

  const [state, setState] = useState<FormValidationState>({
    values: initialValues,
    errors: {},
    touched: {},
    isValid: false,
    isSubmitted: false,
  });

  const validateSingleField = useCallback(
    (field: string, value: any) => {
      const rules = schema[field] || [];
      return validateField(value, rules, state.values);
    },
    [schema, state.values]
  );

  const validateAllFields = useCallback(() => {
    const result = validateForm(state.values, schema);
    setState(prev => ({
      ...prev,
      errors: result.errors,
      isValid: result.isValid,
    }));
    return result;
  }, [state.values, schema]);

  const setValue = useCallback(
    (field: string, value: any) => {
      setState(prev => {
        const newValues = { ...prev.values, [field]: value };
        const newState = { ...prev, values: newValues };

        // Validate on change if enabled
        if (validateOnChange || (revalidateOnChange && prev.touched[field])) {
          const error = validateSingleField(field, value);
          newState.errors = { ...prev.errors };
          if (error) {
            newState.errors[field] = error;
          } else {
            delete newState.errors[field];
          }
          newState.isValid = Object.keys(newState.errors).length === 0;
        }

        return newState;
      });
    },
    [validateOnChange, revalidateOnChange, validateSingleField]
  );

  const setTouched = useCallback(
    (field: string, touched = true) => {
      setState(prev => {
        const newState = { ...prev, touched: { ...prev.touched, [field]: touched } };

        // Validate on blur if enabled
        if (validateOnBlur && touched) {
          const error = validateSingleField(field, prev.values[field]);
          newState.errors = { ...prev.errors };
          if (error) {
            newState.errors[field] = error;
          } else {
            delete newState.errors[field];
          }
          newState.isValid = Object.keys(newState.errors).length === 0;
        }

        return newState;
      });
    },
    [validateOnBlur, validateSingleField]
  );

  const setError = useCallback((field: string, error: string | null) => {
    setState(prev => {
      const newErrors = { ...prev.errors };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return {
        ...prev,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, []);

  const resetForm = useCallback((newValues?: { [key: string]: any }) => {
    setState({
      values: newValues || initialValues,
      errors: {},
      touched: {},
      isValid: false,
      isSubmitted: false,
    });
  }, [initialValues]);

  const submitForm = useCallback(() => {
    setState(prev => ({ ...prev, isSubmitted: true }));
    const result = validateAllFields();
    
    // Mark all fields as touched
    const allTouched = Object.keys(schema).reduce(
      (acc, field) => ({ ...acc, [field]: true }),
      {}
    );
    setState(prev => ({ ...prev, touched: allTouched }));
    
    return result;
  }, [validateAllFields, schema]);

  // Initial validation
  useEffect(() => {
    const result = validateForm(state.values, schema);
    setState(prev => ({
      ...prev,
      isValid: result.isValid,
    }));
  }, []);

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isValid: state.isValid,
    isSubmitted: state.isSubmitted,
    setValue,
    setTouched,
    setError,
    resetForm,
    submitForm,
    validateField: validateSingleField,
    validateForm: validateAllFields,
  };
};

export const useFieldValidation = (
  value: any,
  rules: ValidationRule[],
  options: {
    validateOnChange?: boolean;
    debounceMs?: number;
  } = {}
) => {
  const { validateOnChange = true, debounceMs = 0 } = options;
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(
    (val: any) => {
      if (debounceMs > 0) {
        setIsValidating(true);
      }
      
      const errorResult = validateField(val, rules);
      
      if (debounceMs > 0) {
        setTimeout(() => {
          setError(errorResult);
          setIsValidating(false);
        }, debounceMs);
      } else {
        setError(errorResult);
      }
    },
    [rules, debounceMs]
  );

  useEffect(() => {
    if (validateOnChange) {
      validate(value);
    }
  }, [value, validateOnChange, validate]);

  return {
    error,
    isValidating,
    validate: () => validate(value),
    isValid: !error,
  };
};

// ==================== SPECIALIZED VALIDATION SCHEMAS ====================

export const UserRegistrationSchema: ValidationSchema = {
  email: [ValidationRules.required(), ValidationRules.email()],
  password: [ValidationRules.required(), ValidationRules.password()],
  confirmPassword: [
    ValidationRules.required(),
    ValidationRules.confirmPassword('password'),
  ],
  fullName: [
    ValidationRules.required(),
    ValidationRules.minLength(2),
    ValidationRules.maxLength(100),
    ValidationRules.pattern(/^[a-zA-Z\s\-\.\']+$/, 'Only letters, spaces, hyphens, dots, and apostrophes are allowed'),
  ],
  phone: [ValidationRules.phoneNumber()],
};

export const RobotConnectionSchema: ValidationSchema = {
  name: [
    ValidationRules.required(),
    ValidationRules.minLength(1),
    ValidationRules.maxLength(50),
    ValidationRules.pattern(/^[a-zA-Z0-9\s\-_]+$/, 'Only letters, numbers, spaces, hyphens, and underscores are allowed'),
  ],
  robotType: [ValidationRules.required()],
  serialNumber: [ValidationRules.required(), ValidationRules.robotSerial()],
  ipAddress: [ValidationRules.required(), ValidationRules.ipAddress()],
  port: [ValidationRules.required(), ValidationRules.port()],
};

export const TrainingSessionSchema: ValidationSchema = {
  name: [
    ValidationRules.required(),
    ValidationRules.minLength(1),
    ValidationRules.maxLength(100),
  ],
  description: [ValidationRules.maxLength(500)],
  robotId: [ValidationRules.required()],
  modelType: [ValidationRules.required()],
};

export const RobotCommandSchema: ValidationSchema = {
  commandType: [ValidationRules.required()],
  priority: [
    ValidationRules.required(),
    ValidationRules.minValue(1),
    ValidationRules.maxValue(10),
  ],
  timeout: [
    ValidationRules.required(),
    ValidationRules.minValue(1),
    ValidationRules.maxValue(300),
  ],
};

// ==================== SANITIZATION UTILITIES ====================

export const sanitizeInput = {
  text: (input: string): string => {
    return input.trim().replace(/\s+/g, ' ');
  },

  email: (input: string): string => {
    return input.toLowerCase().trim();
  },

  phone: (input: string): string => {
    return input.replace(/[\s\-\(\)]/g, '');
  },

  numeric: (input: string): string => {
    return input.replace(/[^\d.-]/g, '');
  },

  alphanumeric: (input: string): string => {
    return input.replace(/[^a-zA-Z0-9]/g, '');
  },

  filename: (input: string): string => {
    return input.replace(/[^a-zA-Z0-9._\-\s]/g, '').trim();
  },

  htmlTags: (input: string): string => {
    return input.replace(/<[^>]*>/g, '');
  },

  sql: (input: string): string => {
    return input.replace(/['";\\]/g, '');
  },
};

export default {
  ValidationRules,
  validateField,
  validateForm,
  useFormValidation,
  useFieldValidation,
  UserRegistrationSchema,
  RobotConnectionSchema,
  TrainingSessionSchema,
  RobotCommandSchema,
  sanitizeInput,
};