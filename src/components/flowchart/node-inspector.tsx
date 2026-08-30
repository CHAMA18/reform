'use client';

import { useFlowchartStore } from '@/lib/flowchart/store';
import {
  FIELD_TYPES,
  CONDITION_OPERATORS,
  type FieldType,
  type FlowNode,
  type FlowNodeData,
} from '@/lib/flowchart/types';
import { ValidationRulesEditor } from '@/components/flowchart/validation-rules-editor';

/**
 * NodeInspector
 *
 * The right sidebar. Shows properties of the currently selected node.
 * If no node is selected, shows form-level settings (name, description).
 */
export function NodeInspector() {
  const {
    selectedNodeId,
    flowchart,
    formName,
    formDescription,
    updateNodeData,
    setFormName,
    setFormDescription,
  } = useFlowchartStore();

  const selectedNode = flowchart.nodes.find((n) => n.id === selectedNodeId);

  // All field nodes — for the condition node's field dropdown
  const fieldNodes = flowchart.nodes.filter((n) => n.type === 'field');

  if (!selectedNode) {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-l border-white/10 bg-rf-surface-container/60 backdrop-blur-xl">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 text-rf-primary">
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
              Form Settings
            </span>
          </div>
          <p className="mt-1 text-[10px] text-rf-on-surface-variant">
            Select a node to edit its properties
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
              Form Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="My Awesome Form"
              className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="What is this form for?"
              rows={3}
              className="w-full resize-none rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-white/5 bg-rf-surface/30 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
              Flow Summary
            </div>
            <div className="mt-2 space-y-1 font-mono text-[11px] text-rf-on-surface-variant">
              <div>{flowchart.nodes.length} nodes</div>
              <div>{flowchart.edges.length} edges</div>
              <div>
                {flowchart.nodes.filter((n) => n.type === 'field').length} fields
              </div>
              <div>
                {flowchart.nodes.filter((n) => n.type === 'condition').length}{' '}
                conditions
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const node = selectedNode;
  const isField = node.type === 'field';
  const isCondition = node.type === 'condition';
  const isTerminal = node.type === 'start' || node.type === 'end';

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-white/10 bg-rf-surface-container/60 backdrop-blur-xl">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-rf-primary">
          <span className="material-symbols-outlined text-[16px]">edit_document</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
            Node Properties
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] text-rf-on-surface-variant">
          {node.id.slice(0, 16)}…
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Label — all nodes */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
            Label
          </label>
          <input
            type="text"
            value={node.data.label}
            onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
            placeholder="Node label"
            className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
          />
        </div>

        {/* Field type */}
        {isField && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
              Field Type
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() =>
                    updateNodeData(node.id, { fieldType: ft.value as FieldType })
                  }
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all ${
                    node.data.fieldType === ft.value
                      ? 'border-rf-primary bg-rf-primary/10 text-rf-primary'
                      : 'border-white/10 bg-rf-surface/50 text-rf-on-surface-variant hover:text-rf-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {ft.icon}
                  </span>
                  <span className="truncate">{ft.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder */}
        {isField &&
          !['dropdown', 'radio', 'checkbox', 'file', 'rating'].includes(
            node.data.fieldType ?? ''
          ) && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                Placeholder
              </label>
              <input
                type="text"
                value={node.data.placeholder ?? ''}
                onChange={(e) =>
                  updateNodeData(node.id, { placeholder: e.target.value })
                }
                placeholder="Enter placeholder text"
                className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
              />
            </div>
          )}

        {/* Helper text */}
        {isField && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
              Helper Text
            </label>
            <input
              type="text"
              value={node.data.helperText ?? ''}
              onChange={(e) =>
                updateNodeData(node.id, { helperText: e.target.value })
              }
              placeholder="Shown below the field"
              className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
            />
          </div>
        )}

        {/* Required toggle */}
        {isField && (
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-rf-surface/50 px-3 py-2.5">
            <span className="text-[12px] font-medium text-rf-on-surface">
              Required
            </span>
            <button
              type="button"
              onClick={() => {
                updateNodeData(node.id, { required: !node.data.required });
                // Sync the validation.required too so the engine reads one source of truth
                updateNodeData(node.id, {
                  validation: {
                    ...(node.data.validation ?? {}),
                    required: !node.data.required,
                  },
                });
              }}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                node.data.required ? 'bg-rf-primary' : 'bg-white/10'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  node.data.required ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        )}

        {/* Dynamic validation rules editor */}
        {isField && <ValidationRulesEditor node={node} updateNodeData={updateNodeData} />}

        {/* Options for dropdown/radio/checkbox */}
        {isField &&
          ['dropdown', 'radio', 'checkbox'].includes(node.data.fieldType ?? '') && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                Options (one per line)
              </label>
              <textarea
                value={(node.data.options ?? []).join('\n')}
                onChange={(e) =>
                  updateNodeData(node.id, {
                    options: e.target.value.split('\n'),
                  })
                }
                placeholder={'Option 1\nOption 2\nOption 3'}
                rows={5}
                className="w-full resize-none rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[12px] font-mono text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
              />
            </div>
          )}

        {/* Condition config */}
        {isCondition && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                If Field
              </label>
              <select
                value={node.data.conditionField ?? ''}
                onChange={(e) =>
                  updateNodeData(node.id, { conditionField: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface focus:border-rf-primary focus:outline-none"
              >
                <option value="">Select a field…</option>
                {fieldNodes.map((fn) => (
                  <option key={fn.id} value={fn.id}>
                    {fn.data.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                Operator
              </label>
              <select
                value={node.data.conditionOperator ?? '=='}
                onChange={(e) =>
                  updateNodeData(node.id, { conditionOperator: e.target.value })
                }
                className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface focus:border-rf-primary focus:outline-none"
              >
                {CONDITION_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            {!['empty', 'not_empty'].includes(node.data.conditionOperator ?? '') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-rf-on-surface-variant">
                  Value
                </label>
                <input
                  type="text"
                  value={node.data.conditionValue ?? ''}
                  onChange={(e) =>
                    updateNodeData(node.id, { conditionValue: e.target.value })
                  }
                  placeholder="Compare against this value"
                  className="w-full rounded-lg border border-white/10 bg-rf-input-hollow-bg px-3 py-2 text-[13px] text-rf-on-surface placeholder:text-rf-on-surface-variant/40 focus:border-rf-primary focus:outline-none"
                />
              </div>
            )}

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="material-symbols-outlined text-[14px]">alt_route</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Branches
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-rf-on-surface-variant">
                Drag from the green (T) or red (F) handle at the bottom of this
                node to connect the true / false branches.
              </p>
            </div>
          </>
        )}

        {isTerminal && (
          <div className="rounded-lg border border-white/5 bg-rf-surface/30 p-3">
            <p className="text-[11px] leading-relaxed text-rf-on-surface-variant">
              {node.type === 'start'
                ? 'This is the entry point of the form flow. Every form must have exactly one Start node.'
                : 'This is the terminal node. The flow ends here. Every form must have at least one End node.'}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
