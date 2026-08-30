'use client';

import { useMemo, useState } from 'react';
import { useFlowchartStore } from '@/lib/flowchart/store';
import { generateSchema } from '@/lib/flowchart/schema-generator';

/**
 * JsonPreviewPanel
 *
 * Shows the generated JSON schema in real time as the user builds the
 * flowchart. Includes copy-to-clipboard and a "valid / invalid" indicator.
 */
export function JsonPreviewPanel() {
  const { flowchart, formName, getErrors } = useFlowchartStore();
  const [copied, setCopied] = useState(false);

  const schema = useMemo(
    () => generateSchema(flowchart, formName),
    [flowchart, formName]
  );

  const errors = getErrors();
  const isValid = errors.length === 0;

  const jsonText = useMemo(() => {
    try {
      return JSON.stringify(schema, null, 2);
    } catch {
      return '{}';
    }
  }, [schema]);

  const jsonLines = jsonText.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be blocked in some iframe contexts — ignore.
    }
  };

  return (
    <section className="flex min-h-[400px] flex-col border-t border-rf-border-white-faint bg-rf-surface-container-lowest xl:border-t-0 xl:border-l">
      <div className="flex h-11 items-center justify-between border-b border-rf-border-white-faint bg-rf-surface-container-low/70 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-rf-primary">
            data_object
          </span>
          <span className="truncate font-mono text-[12px] text-rf-on-surface-variant">
            {formName.toLowerCase().replace(/\s+/g, '_')}_schema.json
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
              isValid
                ? 'border-rf-primary/30 bg-rf-primary-container/10 text-rf-primary'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                isValid ? 'bg-rf-primary' : 'bg-red-400'
              }`}
            />
            {isValid ? 'Valid' : `${errors.length} error${errors.length > 1 ? 's' : ''}`}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1 text-rf-on-surface-variant transition-colors hover:text-rf-on-surface"
            aria-label="Copy schema"
          >
            <span className="material-symbols-outlined text-[17px]">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-6">
        <div className="grid min-w-[480px] grid-cols-[40px_1fr] gap-4">
          <div className="select-none text-right text-rf-on-surface-variant/35">
            {jsonLines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="m-0 whitespace-pre-wrap text-rf-on-surface">
            <code>{jsonText}</code>
          </pre>
        </div>
      </div>

      {!isValid && (
        <div className="border-t border-red-500/20 bg-red-500/5 p-3">
          <div className="flex items-center gap-1.5 text-red-400">
            <span className="material-symbols-outlined text-[14px]">error</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Validation Errors
            </span>
          </div>
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-red-300/80">
            {errors.map((err, i) => (
              <li key={i}>· {err}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
