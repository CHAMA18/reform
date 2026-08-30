'use client';

import { useState } from 'react';
import type { FlowNode, FlowNodeData, ValidationRules, FieldType } from '@/lib/flowchart/types';

/**
 * ValidationRulesEditor
 *
 * An inline editor for the dynamic validation rules on a field node.
 * The rules edited here are stored in the form config (JSON) and parsed
 * at runtime by the validation engine — they are NOT hardcoded in app code.
 *
 * This component shows different rule inputs based on the field type:
 *   - text/textarea/password: minLength, maxLength, pattern
 *   - email/url: pattern (with note that format is auto-validated)
 *   - number: min, max
 *   - date: minDate, maxDate
 *   - checkbox: min (min selections), max (max selections)
 *   - dropdown/radio: (options are the enum, no extra rules needed)
 */
export function ValidationRulesEditor({
  node,
  updateNodeData,
}: {
  node: FlowNode;
  updateNodeData: (id: string, data: Partial<FlowNodeData>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rules: ValidationRules = node.data.validation ?? {};
  const fieldType = (node.data.fieldType ?? 'text') as FieldType;

  const updateRule = (key: keyof ValidationRules, value: unknown) => {
    updateNodeData(node.id, {
      validation: { ...rules, [key]: value },
    });
  };

  // Determine which rule inputs to show based on field type
  const showMinLength = ['text', 'textarea', 'password', 'email', 'url', 'tel'].includes(fieldType);
  const showMaxLength = ['text', 'textarea', 'password', 'email', 'url', 'tel'].includes(fieldType);
  const showPattern = ['text', 'password', 'tel'].includes(fieldType);
  const showMinMax = fieldType === 'number';
  const showDateRange = fieldType === 'date';
  const showCheckboxLimits = fieldType === 'checkbox';
  const hasAnyRules =
    showMinLength || showMaxLength || showPattern || showMinMax || showDateRange || showCheckboxLimits;

  if (!hasAnyRules) return null;

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none';
  const labelClass =
    'text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant';

  return (
    <div className="rounded-lg border border-white/10 bg-rf-surface/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
          <span className="material-symbols-outlined text-[14px] text-rf-primary">
            rule
          </span>
          Validation Rules
        </span>
        <span className="material-symbols-outlined text-[16px] text-rf-on-surface-variant">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-white/5 p-3">
          {/* Min length */}
          {showMinLength && (
            <div className="space-y-1">
              <label className={labelClass}>Min Length</label>
              <input
                type="number"
                min={0}
                value={rules.minLength ?? ''}
                onChange={(e) =>
                  updateRule(
                    'minLength',
                    e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                  )
                }
                placeholder="No minimum"
                className={inputClass}
              />
            </div>
          )}

          {/* Max length */}
          {showMaxLength && (
            <div className="space-y-1">
              <label className={labelClass}>Max Length</label>
              <input
                type="number"
                min={1}
                value={rules.maxLength ?? ''}
                onChange={(e) =>
                  updateRule(
                    'maxLength',
                    e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                  )
                }
                placeholder="No maximum"
                className={inputClass}
              />
            </div>
          )}

          {/* Pattern (regex) */}
          {showPattern && (
            <>
              <div className="space-y-1">
                <label className={labelClass}>Pattern (regex)</label>
                <input
                  type="text"
                  value={rules.pattern ?? ''}
                  onChange={(e) => updateRule('pattern', e.target.value || undefined)}
                  placeholder="e.g. ^[A-Z]{2,4}$"
                  className={`${inputClass} font-mono text-[11px]`}
                />
              </div>
              {rules.pattern && (
                <div className="space-y-1">
                  <label className={labelClass}>Pattern Error Message</label>
                  <input
                    type="text"
                    value={rules.patternMessage ?? ''}
                    onChange={(e) =>
                      updateRule('patternMessage', e.target.value || undefined)
                    }
                    placeholder="Shown when pattern doesn't match"
                    className={inputClass}
                  />
                </div>
              )}
            </>
          )}

          {/* Number min/max */}
          {showMinMax && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className={labelClass}>Min Value</label>
                  <input
                    type="number"
                    value={rules.min ?? ''}
                    onChange={(e) =>
                      updateRule(
                        'min',
                        e.target.value === '' ? undefined : Number(e.target.value)
                      )
                    }
                    placeholder="No min"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Max Value</label>
                  <input
                    type="number"
                    value={rules.max ?? ''}
                    onChange={(e) =>
                      updateRule(
                        'max',
                        e.target.value === '' ? undefined : Number(e.target.value)
                      )
                    }
                    placeholder="No max"
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          {/* Date range */}
          {showDateRange && (
            <>
              <div className="space-y-1">
                <label className={labelClass}>Earliest Date</label>
                <input
                  type="date"
                  value={rules.minDate ?? ''}
                  onChange={(e) => updateRule('minDate', e.target.value || undefined)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Latest Date</label>
                <input
                  type="date"
                  value={rules.maxDate ?? ''}
                  onChange={(e) => updateRule('maxDate', e.target.value || undefined)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Checkbox min/max selections */}
          {showCheckboxLimits && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={labelClass}>Min Selections</label>
                <input
                  type="number"
                  min={0}
                  value={rules.min ?? ''}
                  onChange={(e) =>
                    updateRule(
                      'min',
                      e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                    )
                  }
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Max Selections</label>
                <input
                  type="number"
                  min={1}
                  value={rules.max ?? ''}
                  onChange={(e) =>
                    updateRule(
                      'max',
                      e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                    )
                  }
                  placeholder="No limit"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Custom error message (all types) */}
          <div className="space-y-1">
            <label className={labelClass}>Custom Error Message</label>
            <input
              type="text"
              value={rules.errorMessage ?? ''}
              onChange={(e) => updateRule('errorMessage', e.target.value || undefined)}
              placeholder="Overrides default validation message"
              className={inputClass}
            />
          </div>

          {/* Info note */}
          <div className="rounded border border-rf-primary/15 bg-rf-primary/5 p-2">
            <p className="text-[10px] leading-relaxed text-rf-on-surface-variant">
              <span className="material-symbols-outlined mb-0.5 text-[12px] text-rf-primary align-middle">
                info
              </span>{' '}
              Rules are stored in the form config and validated dynamically at runtime —
              no code changes needed to update validation behavior.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
