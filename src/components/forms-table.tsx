"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/app-shell";

interface FormData {
  id: string;
  shareId: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  submissionCount: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  draft: { label: "Draft", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  archived: { label: "Archived", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20" },
};

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function iconForForm(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("kyc") || lower.includes("identity") || lower.includes("verification")) return "how_to_reg";
  if (lower.includes("feedback") || lower.includes("survey") || lower.includes("nps")) return "forum";
  if (lower.includes("event") || lower.includes("register")) return "event";
  if (lower.includes("support") || lower.includes("ticket") || lower.includes("help")) return "support_agent";
  if (lower.includes("job") || lower.includes("application") || lower.includes("career")) return "work";
  if (lower.includes("contact") || lower.includes("email") || lower.includes("message")) return "mail";
  if (lower.includes("legal") || lower.includes("disclosure") || lower.includes("compliance")) return "gavel";
  if (lower.includes("enterprise") || lower.includes("request") || lower.includes("intake")) return "assured_workload";
  if (lower.includes("onboard")) return "group_add";
  if (lower.includes("order") || lower.includes("purchase") || lower.includes("checkout")) return "shopping_cart";
  return "dynamic_form";
}

type TabKey = "all" | "active" | "draft" | "archived";

export function FormsTable({ initialForms }: { initialForms: FormData[] }) {
  const [forms, setForms] = useState<FormData[]>(initialForms);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const activeCount = forms.filter((f) => f.status === "published").length;
  const draftCount = forms.filter((f) => f.status === "draft").length;
  const archivedCount = forms.filter((f) => f.status === "archived").length;

  const filtered = activeTab === "all" ? forms
    : activeTab === "active" ? forms.filter((f) => f.status === "published")
    : activeTab === "draft" ? forms.filter((f) => f.status === "draft")
    : forms.filter((f) => f.status === "archived");

  const tabs: { key: TabKey; label: string; icon: string; count: number }[] = [
    { key: "all", label: "All Forms", icon: "list", count: forms.length },
    { key: "active", label: "Active", icon: "check_circle", count: activeCount },
    { key: "draft", label: "Drafts", icon: "edit", count: draftCount },
    { key: "archived", label: "Archived", icon: "archive", count: archivedCount },
  ];

  async function handleDelete(form: FormData) {
    if (!confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
    setDeleting(form.id);
    try {
      const res = await fetch(`/api/forms/${form.id}`, { method: "DELETE" });
      if (res.ok) {
        setForms((prev) => prev.filter((f) => f.id !== form.id));
      }
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  }

  async function handleStatusToggle(form: FormData) {
    const newStatus = form.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setForms((prev) =>
          prev.map((f) => (f.id === form.id ? { ...f, status: newStatus } : f))
        );
      }
    } catch {
      // silent
    }
  }

  async function handleDuplicate(form: FormData) {
    try {
      const res = await fetch(`/api/forms/${form.id}`);
      if (!res.ok) return;
      const data = await res.json();
      const createRes = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.name} (Copy)`,
          description: form.description,
          flowchart: data.flowchart ? JSON.parse(data.flowchart) : undefined,
        }),
      });
      if (createRes.ok) {
        const created = await createRes.json();
        setForms((prev) => [
          {
            id: created.id,
            shareId: created.shareId,
            name: `${form.name} (Copy)`,
            description: form.description,
            status: "draft",
            createdAt: new Date(),
            updatedAt: new Date(),
            submissionCount: 0,
          },
          ...prev,
        ]);
      }
    } catch {
      // silent
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-white/8 bg-rf-surface/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-amber-500/15 text-amber-400"
                : "text-rf-on-surface-variant hover:text-rf-on-surface"
            }`}
          >
            <Icon name={tab.icon} className="text-[14px]" />
            {tab.label}
            <span className="ml-1 rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-bold">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel rounded-[20px] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rf-primary/10 text-rf-primary">
              <Icon name="dynamic_form" className="text-[32px]" />
            </div>
            <h3 className="mt-4 text-[18px] font-bold text-rf-on-surface">
              {activeTab === "all" ? "No forms yet" : `No ${activeTab} forms`}
            </h3>
            <p className="mt-2 max-w-sm text-[13px] text-rf-on-surface-variant">
              {activeTab === "all"
                ? "Create your first form using the AI generator or the visual builder."
                : "Try a different tab or create a new form."}
            </p>
            <div className="mt-5 flex gap-3">
              <Link
                href="/forms/ai"
                className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold"
              >
                <Icon name="auto_awesome" className="text-[16px]" />
                AI Generate
              </Link>
              <Link
                href="/templates"
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-rf-surface px-4 py-2.5 text-[13px] font-semibold text-rf-on-surface transition-colors hover:border-white/20"
              >
                <Icon name="edit_note" className="text-[16px]" />
                Use Template
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {/* Table header */}
            <div className="hidden px-5 py-3 sm:grid sm:grid-cols-12 sm:gap-4">
              <span className="col-span-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-rf-on-surface-variant">Form</span>
              <span className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-rf-on-surface-variant">Status</span>
              <span className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-rf-on-surface-variant">Submissions</span>
              <span className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-rf-on-surface-variant">Updated</span>
              <span className="col-span-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-rf-on-surface-variant text-right">Actions</span>
            </div>

            {filtered.map((form) => {
              const sc = statusConfig[form.status] || statusConfig.draft;
              const isDeleting = deleting === form.id;
              return (
                <div
                  key={form.id}
                  className="group px-5 py-4 transition-colors hover:bg-white/[0.02] sm:grid sm:grid-cols-12 sm:items-center sm:gap-4"
                >
                  {/* Form info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-rf-surface text-rf-on-surface">
                      <Icon name={iconForForm(form.name)} className="text-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/templates?edit=${form.id}`}
                        className="block truncate text-[14px] font-semibold text-rf-on-surface transition-colors hover:text-rf-primary"
                      >
                        {form.name}
                      </Link>
                      <p className="truncate text-[11px] text-rf-on-surface-variant">
                        {form.description || "No description"}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 mt-2 sm:mt-0">
                    <button
                      onClick={() => handleStatusToggle(form)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors hover:opacity-80 ${sc.bg} ${sc.color}`}
                      title={`Click to toggle to ${form.status === "published" ? "draft" : "active"}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${sc.color === "text-emerald-400" ? "bg-emerald-400" : sc.color === "text-amber-400" ? "bg-amber-400" : "bg-zinc-400"}`} />
                      {sc.label}
                    </button>
                  </div>

                  {/* Submissions */}
                  <div className="col-span-2 mt-2 sm:mt-0">
                    <a
                      href={`/submissions?form=${form.id}`}
                      className="flex items-center gap-1 text-[13px] font-mono text-rf-on-surface transition-colors hover:text-sky-400"
                    >
                      <Icon name="data_usage" className="text-[14px] text-rf-on-surface-variant" />
                      {formatCount(form.submissionCount)}
                    </a>
                  </div>

                  {/* Updated */}
                  <div className="col-span-2 mt-2 sm:mt-0">
                    <span className="text-[12px] text-rf-on-surface-variant">
                      {formatRelativeTime(form.updatedAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 mt-3 flex items-center justify-end gap-1 sm:mt-0">
                    <a
                      href={`/f/${form.shareId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-rf-on-surface-variant transition-colors hover:bg-white/8 hover:text-emerald-400"
                      title="Preview"
                    >
                      <Icon name="open_in_new" className="text-[16px]" />
                    </a>
                    <a
                      href={`/templates?edit=${form.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-rf-on-surface-variant transition-colors hover:bg-white/8 hover:text-rf-primary"
                      title="Edit"
                    >
                      <Icon name="edit" className="text-[16px]" />
                    </a>
                    <button
                      onClick={() => handleDuplicate(form)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-rf-on-surface-variant transition-colors hover:bg-white/8 hover:text-amber-400"
                      title="Duplicate"
                    >
                      <Icon name="content_copy" className="text-[16px]" />
                    </button>
                    <button
                      onClick={() => handleDelete(form)}
                      disabled={isDeleting}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-rf-on-surface-variant transition-colors hover:bg-white/8 hover:text-red-400 disabled:opacity-40"
                      title="Delete"
                    >
                      <Icon name={isDeleting ? "hourglass_empty" : "delete"} className="text-[16px]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
