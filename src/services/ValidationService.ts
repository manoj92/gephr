export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

export class ValidationService {
  private readonly patterns = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    username: /^[a-zA-Z0-9_-]{3,20}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    robotId: /^[a-zA-Z0-9_-]{1,50}$/,
    ipAddress: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    macAddress: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  };

  /**
   * Validate data against a schema
   */
  public validate(data: any, schema: ValidationSchema): ValidationResult {
    const errors: { [key: string]: string } = {};

    for (const [field, rule] of Object.entries(schema)) {
      const value = data[field];
      const fieldError = this.validateField(value, rule, field);
      
      if (fieldError) {
        errors[field] = fieldError;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  private validateField(value: any, rule: ValidationRule, fieldName: string): string | null {
    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      return `${fieldName} is required`;
    }

    // Skip further validation if not required and empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Check string length
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return `${fieldName} must be at least ${rule.minLength} characters`;
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${fieldName} must not exceed ${rule.maxLength} characters`;
      }
    }

    // Check pattern
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        return `${fieldName} format is invalid`;
      }
    }

    // Check custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (typeof customResult === 'string') {
        return customResult;
      } else if (!customResult) {
        return `${fieldName} is invalid`;
      }
    }

    return null;
  }

  /**
   * Sanitize input to prevent XSS and injection attacks
   */
  public sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/script/gi, 'scr1pt') // Neutralize script tags
      .trim();
  }

  /**
   * Sanitize object recursively
   */
  public sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeInput(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Validate user registration data
   */
  public validateUserRegistration(data: any): ValidationResult {
    const schema: ValidationSchema = {
      email: {
        required: true,
        pattern: this.patterns.email,
        maxLength: 254
      },
      username: {
        required: true,
        pattern: this.patterns.username,
        minLength: 3,
        maxLength: 20
      },
      password: {
        required: true,
        pattern: this.patterns.password,
        minLength: 8,
        maxLength: 128
      },
      displayName: {
        required: true,
        minLength: 2,
        maxLength: 50,
        custom: (value) => {
          if (typeof value !== 'string') return false;
          return !/[<>\"'/\\]/.test(value); // No HTML/script characters
        }
      },
      agreeToTerms: {
        required: true,
        custom: (value) => value === true
      }
    };

    return this.validate(data, schema);
  }

  /**
   * Validate user login data
   */
  public validateUserLogin(data: any): ValidationResult {
    const schema: ValidationSchema = {
      email: {
        required: true,
        pattern: this.patterns.email
      },
      password: {
        required: true,
        minLength: 8,
        maxLength: 128
      }
    };

    return this.validate(data, schema);
  }

  /**
   * Validate robot connection data
   */
  public validateRobotConnection(data: any): ValidationResult {
    const schema: ValidationSchema = {
      robotId: {
        required: true,
        pattern: this.patterns.robotId
      },
      name: {
        required: true,
        minLength: 3,
        maxLength: 50,
        custom: (value) => {
          if (typeof value !== 'string') return false;
          return !/[<>\"'/\\]/.test(value);
        }
      },
      type: {
        required: true,
        custom: (value) => {
          const validTypes = ['unitree_g1', 'boston_dynamics', 'tesla_bot', 'custom'];
          return validTypes.includes(value);
        }
      },
      ipAddress: {
        required: false,
        pattern: this.patterns.ipAddress
      },
      port: {
        required: false,
        custom: (value) => {
          if (value === undefined || value === null) return true;
          const port = parseInt(value);
          return port >= 1 && port <= 65535;
        }
      }
    };

    return this.validate(data, schema);
  }

  /**
   * Validate hand tracking data
   */
  public validateHandTrackingData(data: any): ValidationResult {
    const schema: ValidationSchema = {
      poses: {
        required: true,
        custom: (value) => {
          if (!Array.isArray(value)) return false;
          if (value.length === 0) return true; // Empty array is valid
          
          // Validate each pose
          return value.every(pose => 
            pose &&
            typeof pose.handedness === 'string' &&
            typeof pose.confidence === 'number' &&
            pose.confidence >= 0 && pose.confidence <= 1 &&
            Array.isArray(pose.landmarks) &&
            pose.landmarks.length === 21 && // MediaPipe hand model
            pose.landmarks.every((landmark: any) =>
              landmark &&
              typeof landmark.x === 'number' &&
              typeof landmark.y === 'number' &&
              typeof landmark.confidence === 'number'
            )
          );
        }
      },
      timestamp: {
        required: true,
        custom: (value) => {
          const timestamp = parseInt(value);
          return timestamp > 0 && timestamp <= Date.now() + 1000; // Allow 1s clock skew
        }
      },
      sessionId: {
        required: true,
        pattern: this.patterns.uuid
      }
    };

    return this.validate(data, schema);
  }

  /**
   * Validate marketplace listing data
   */
  public validateMarketplaceListing(data: any): ValidationResult {
    const schema: ValidationSchema = {
      title: {
        required: true,
        minLength: 5,
        maxLength: 100,
        custom: (value) => {
          if (typeof value !== 'string') return false;
          return !/[<>\"'/\\]/.test(value);
        }
      },
      description: {
        required: true,
        minLength: 20,
        maxLength: 1000,
        custom: (value) => {
          if (typeof value !== 'string') return false;
          return !/[<>\"'\\]/.test(value);
        }
      },
      price: {
        required: true,
        custom: (value) => {
          const price = parseFloat(value);
          return price >= 0.01 && price <= 1000;
        }
      },
      category: {
        required: true,
        custom: (value) => {
          const validCategories = ['manipulation', 'navigation', 'vision', 'interaction', 'custom'];
          return validCategories.includes(value);
        }
      },
      robotCompatibility: {
        required: true,
        custom: (value) => {
          if (!Array.isArray(value)) return false;
          const validTypes = ['unitree_g1', 'boston_dynamics', 'tesla_bot', 'custom'];
          return value.length > 0 && value.every(type => validTypes.includes(type));
        }
      }
    };

    return this.validate(data, schema);
  }

  /**
   * Check if input contains potential security threats
   */
  public checkForSecurityThreats(input: string): {
    isSafe: boolean;
    threats: string[];
  } {
    const threats: string[] = [];
    const lowercaseInput = input.toLowerCase();

    // SQL Injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
      /exec\s*\(/i,
      /;\s*--/,
      /'\s*or\s*'1'\s*=\s*'1'/i
    ];

    // XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /eval\s*\(/i,
      /document\.cookie/i
    ];

    // Command injection patterns
    const cmdPatterns = [
      /;\s*cat\s/i,
      /;\s*ls\s/i,
      /;\s*rm\s/i,
      /;\s*curl\s/i,
      /;\s*wget\s/i,
      /\|\s*nc\s/i,
      /&&\s*rm\s/i
    ];

    // Check for SQL injection
    if (sqlPatterns.some(pattern => pattern.test(input))) {
      threats.push('SQL Injection');
    }

    // Check for XSS
    if (xssPatterns.some(pattern => pattern.test(input))) {
      threats.push('Cross-Site Scripting (XSS)');
    }

    // Check for command injection
    if (cmdPatterns.some(pattern => pattern.test(input))) {
      threats.push('Command Injection');
    }

    // Check for path traversal
    if (input.includes('../') || input.includes('..\\')) {
      threats.push('Path Traversal');
    }

    return {
      isSafe: threats.length === 0,
      threats
    };
  }

  /**
   * Validate file upload
   */
  public validateFileUpload(file: {
    name: string;
    size: number;
    type: string;
  }, options: {
    maxSize: number;
    allowedTypes: string[];
  }): ValidationResult {
    const errors: { [key: string]: string } = {};

    // Check file size
    if (file.size > options.maxSize) {
      errors.size = `File size exceeds maximum allowed size of ${options.maxSize} bytes`;
    }

    // Check file type
    if (!options.allowedTypes.includes(file.type)) {
      errors.type = `File type ${file.type} is not allowed`;
    }

    // Check filename for security
    const filenameThreats = this.checkForSecurityThreats(file.name);
    if (!filenameThreats.isSafe) {
      errors.filename = `Filename contains potentially dangerous content: ${filenameThreats.threats.join(', ')}`;
    }

    // Check for double extensions
    const extensionCount = (file.name.match(/\./g) || []).length;
    if (extensionCount > 1) {
      errors.extension = 'Multiple file extensions are not allowed';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Rate limiting validation
   */
  public checkRateLimit(userId: string, action: string, limit: number, windowMs: number): {
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
  } {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get stored requests (in a real app, this would use Redis or similar)
    const requests = this.getRateLimitData(key) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    const allowed = recentRequests.length < limit;
    
    if (allowed) {
      // Add current request
      recentRequests.push(now);
      this.setRateLimitData(key, recentRequests, windowMs);
    }

    return {
      allowed,
      remainingRequests: Math.max(0, limit - recentRequests.length),
      resetTime: Math.min(...recentRequests) + windowMs
    };
  }

  private rateLimitStore = new Map<string, number[]>();

  private getRateLimitData(key: string): number[] | undefined {
    return this.rateLimitStore.get(key);
  }

  private setRateLimitData(key: string, data: number[], ttl: number): void {
    this.rateLimitStore.set(key, data);
    
    // Clean up after TTL
    setTimeout(() => {
      this.rateLimitStore.delete(key);
    }, ttl);
  }
}

export const validationService = new ValidationService();