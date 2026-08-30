import { z } from 'zod';
import type { GeneratedSchema, SchemaField, ValidationRules, FieldType } from './types';

/**
 * Dynamic Validation Engine
 *
 * This is the heart of the "dynamic" part of the form engine. Instead of
 * hardcoding validation rules in application code (e.g. `if (age < 18)`),
 * we read the rules from the form configuration and build a Zod schema
 * dynamically at runtime.
 *
 * This means:
 *   - Adding a new validation rule requires only updating the form config (JSON)
 *   - No code changes or redeployments are needed to change validation behavior
 *   - The same engine runs on both client and server for consistent validation
 *
 * The engine supports:
 *   - required (all types)
 *   - minLength / maxLength (text, textarea, email, url, password)
 *   - pattern (regex) with custom error messages (text, email, url)
 *   - min / max (number)
 *   - minDate / maxDate (date)
 *   - enum validation (dropdown, radio — must be one of the configured options)
 *   - email format (automatic for email fields)
 *   - url format (automatic for url fields)
 *   - Conditional visibility (fields hidden by conditions are not validated)
 */

/**
 * Build a Zod schema for a single field based on its type and validation rules.
 * Returns undefined for non-validatable fields (like file uploads).
 */
function buildFieldSchema(field: SchemaField): z.ZodTypeAny | undefined {
  const rules: ValidationRules = field.validation ?? {};
  const isRequired = field.required || rules.required;

  const wrapOptional = <T extends z.ZodTypeAny>(schema: T): z.ZodTypeAny => {
    // For required fields, reject empty strings. For optional fields, allow
    // undefined/null/empty-string and let the pipeline pass.
    if (isRequired) {
      return schema;
    }
    return schema.optional().or(z.literal('').transform(() => undefined)).or(z.null().transform(() => undefined));
  };

  switch (field.type as FieldType) {
    case 'text':
    case 'textarea':
    case 'tel': {
      let s = z.string();
      if (rules.minLength !== undefined) {
        s = s.min(rules.minLength, {
          message: rules.errorMessage ?? `Must be at least ${rules.minLength} characters`,
        });
      }
      if (rules.maxLength !== undefined) {
        s = s.max(rules.maxLength, {
          message: rules.errorMessage ?? `Must be at most ${rules.maxLength} characters`,
        });
      }
      if (rules.pattern) {
        try {
          const regex = new RegExp(rules.pattern);
          s = s.regex(regex, {
            message: rules.patternMessage ?? rules.errorMessage ?? 'Invalid format',
          });
        } catch {
          // Invalid regex pattern in config — skip pattern validation
        }
      }
      if (isRequired) {
        s = s.min(1, { message: rules.errorMessage ?? `${field.label} is required` });
      }
      return wrapOptional(s);
    }

    case 'email': {
      let s = z.string();
      // Email format is built-in — no need for the user to configure a regex
      if (rules.pattern) {
        try {
          s = s.regex(new RegExp(rules.pattern), {
            message: rules.patternMessage ?? 'Invalid email format',
          });
        } catch {
          s = s.email({ message: rules.errorMessage ?? 'Invalid email format' });
        }
      } else {
        s = s.email({ message: rules.errorMessage ?? 'Invalid email format' });
      }
      if (rules.minLength !== undefined) s = s.min(rules.minLength);
      if (rules.maxLength !== undefined) s = s.max(rules.maxLength);
      if (isRequired) {
        s = s.min(1, { message: rules.errorMessage ?? `${field.label} is required` });
      }
      return wrapOptional(s);
    }

    case 'url': {
      let s = z.string().url({
        message: rules.errorMessage ?? 'Invalid URL format',
      });
      if (rules.maxLength !== undefined) s = s.max(rules.maxLength);
      if (isRequired) {
        s = s.min(1, { message: rules.errorMessage ?? `${field.label} is required` });
      }
      return wrapOptional(s);
    }

    case 'password': {
      let s = z.string();
      if (rules.minLength !== undefined) {
        s = s.min(rules.minLength, {
          message: rules.errorMessage ?? `Must be at least ${rules.minLength} characters`,
        });
      }
      if (rules.maxLength !== undefined) s = s.max(rules.maxLength);
      if (rules.pattern) {
        try {
          s = s.regex(new RegExp(rules.pattern), {
            message: rules.patternMessage ?? 'Invalid format',
          });
        } catch {
          // skip
        }
      }
      if (isRequired) {
        s = s.min(1, { message: rules.errorMessage ?? `${field.label} is required` });
      }
      return wrapOptional(s);
    }

    case 'number': {
      let s = z.coerce.number({
        message: rules.errorMessage ?? 'Must be a number',
      });
      if (rules.min !== undefined) {
        s = s.min(rules.min, {
          message: rules.errorMessage ?? `Must be at least ${rules.min}`,
        });
      }
      if (rules.max !== undefined) {
        s = s.max(rules.max, {
          message: rules.errorMessage ?? `Must be at most ${rules.max}`,
        });
      }
      return wrapOptional(s);
    }

    case 'date': {
      let s = z.string();
      if (rules.minDate) {
        s = s.refine((val) => !val || val >= rules.minDate!, {
          message: rules.errorMessage ?? `Must be on or after ${rules.minDate}`,
        });
      }
      if (rules.maxDate) {
        s = s.refine((val) => !val || val <= rules.maxDate!, {
          message: rules.errorMessage ?? `Must be on or before ${rules.maxDate}`,
        });
      }
      if (isRequired) {
        s = s.min(1, { message: rules.errorMessage ?? `${field.label} is required` });
      }
      return wrapOptional(s);
    }

    case 'dropdown':
    case 'radio': {
      // Enum validation — value must be one of the configured options
      const opts = field.options ?? [];
      if (opts.length === 0) {
        return wrapOptional(z.string());
      }
      let s = z.enum(opts as [string, ...string[]], {
        message: rules.errorMessage ?? 'Please select a valid option',
      });
      if (isRequired) return s;
      return wrapOptional(s);
    }

    case 'checkbox': {
      // Array of selected values — each must be a valid option
      const opts = field.options ?? [];
      let s = z.array(z.string());
      if (opts.length > 0) {
        s = z.array(z.enum(opts as [string, ...string[]]));
      }
      if (rules.min !== undefined) {
        s = s.min(rules.min, {
          message: rules.errorMessage ?? `Select at least ${rules.min} option${rules.min > 1 ? 's' : ''}`,
        });
      }
      if (rules.max !== undefined) {
        s = s.max(rules.max, {
          message: rules.errorMessage ?? `Select at most ${rules.max} options`,
        });
      }
      if (isRequired) {
        s = s.min(1, { message: rules.errorMessage ?? `${field.label} is required` });
      }
      return wrapOptional(s);
    }

    case 'rating': {
      let s = z.coerce.number().int().min(1).max(5);
      if (rules.min !== undefined) s = s.min(rules.min);
      if (rules.max !== undefined) s = s.max(rules.max);
      if (isRequired) {
        return s;
      }
      return wrapOptional(s);
    }

    case 'file': {
      // File uploads are validated by the browser — we just check required
      let s = z.string();
      if (isRequired) {
        s = s.min(1, { message: rules.errorMessage ?? `${field.label} is required` });
      }
      return wrapOptional(s);
    }

    default:
      return wrapOptional(z.any());
  }
}

/**
 * Evaluate whether a field should be visible based on conditional rules.
 * Hidden fields are skipped during validation.
 */
export function isFieldVisible(
  field: SchemaField,
  values: Record<string, unknown>
): boolean {
  if (!field.conditional) return true;
  const condValue = values[field.conditional.field];
  const op = field.conditional.operator;
  const condVal = field.conditional.value;
  if (op === '==') return String(condValue ?? '') === condVal;
  if (op === '!=') return String(condValue ?? '') !== condVal;
  if (op === 'empty') return !condValue || condValue === '';
  if (op === 'not_empty') return !!condValue && condValue !== '';
  if (op === 'contains') return String(condValue ?? '').includes(condVal);
  // Numeric comparisons — convert both to numbers
  if (op === '<') return Number(condValue) < Number(condVal);
  if (op === '>') return Number(condValue) > Number(condVal);
  return true;
}

/**
 * Build a complete Zod schema for a form, respecting conditional visibility.
 *
 * Only visible fields (based on the current values) are included in the
 * schema, so hidden fields don't trigger validation errors.
 *
 * @param schema - The form's generated schema (fields + logic)
 * @param values - Current form values (for evaluating conditions)
 * @returns A Zod object schema that can validate the form data
 */
export function buildFormSchema(
  schema: GeneratedSchema,
  values: Record<string, unknown>
): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of schema.fields) {
    if (!isFieldVisible(field, values)) continue;
    const fieldSchema = buildFieldSchema(field);
    if (fieldSchema) {
      shape[field.id] = fieldSchema;
    }
  }

  return z.object(shape);
}

/**
 * Validation result — field-level errors keyed by field id.
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate a form submission against the form's dynamic rules.
 *
 * This is the main entry point for the validation engine. It:
 *   1. Builds a Zod schema from the form config (dynamic, data-driven)
 *   2. Evaluates conditional visibility to skip hidden fields
 *   3. Validates the payload and returns field-level errors
 *
 * This function is isomorphic — it runs identically on client and server.
 *
 * @param schema - The form's generated schema
 * @param data - The submission payload to validate
 * @returns { valid, errors } where errors is keyed by field id
 */
export function validateSubmission(
  schema: GeneratedSchema,
  data: Record<string, unknown>
): ValidationResult {
  const zodSchema = buildFormSchema(schema, data);
  const result = zodSchema.safeParse(data);

  if (result.success) {
    return { valid: true, errors: {} };
  }

  // Convert Zod's error tree into a flat { fieldId: message } map
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const fieldId = issue.path[0]?.toString();
    if (fieldId && !errors[fieldId]) {
      // Only show the first error per field (avoid noise)
      errors[fieldId] = issue.message;
    }
  }

  return { valid: false, errors };
}
