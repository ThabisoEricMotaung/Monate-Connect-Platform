"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type FeedbackStatus = "New" | "Confirmed" | "In Progress" | "Fixed" | "Won't Fix" | "Closed"
type FeedbackPriority = "Low" | "Medium" | "High" | "Critical"
type IssueCategory =
  | "Bug"
  | "UI Confusion"
  | "Mobile Issue"
  | "Missing Feature"
  | "Performance"
  | "Positive Feedback"

type PilotFeedback = {
  id: number
  tester_name: string | null
  tester_role: string | null
  page_or_feature: string | null
  feedback_type: string | null
  issue_category?: IssueCategory | string | null
  rating: number | null
  message: string | null
  priority: FeedbackPriority | string | null
  status: FeedbackStatus | string | null
  admin_notes?: string | null
  assigned_to?: string | null
  created_at: string | null
}

const statuses: FeedbackStatus[] = ["New", "Confirmed", "In Progress", "Fixed", "Won't Fix", "Closed"]
const priorities: FeedbackPriority[] = ["Low", "Medium", "High", "Critical"]
const categories: IssueCategory[] = [
  "Bug",
  "UI Confusion",
  "Mobile Issue",
  "Missing Feature",
  "Performance",
  "Positive Feedback",
]

function formatDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalizeStatus(status: string | null | undefined): FeedbackStatus {
  if (status === "Reviewing") return "Confirmed"
  if (status === "Planned") return "In Progress"
  if (statuses.includes(status as FeedbackStatus)) return status as FeedbackStatus
  return "New"
}

function normalizePriority(priority: string | null | undefined): FeedbackPriority {
  if (priority === "Urgent") return "Critical"
  if (priority === "Normal") return "Medium"
  if (priorities.includes(priority as FeedbackPriority)) return priority as FeedbackPriority
  return "Medium"
}

function normalizeCategory(item: PilotFeedback): IssueCategory {
  if (categories.includes(item.issue_category as IssueCategory)) {
    return item.issue_category as IssueCategory
  }

  if (item.feedback_type === "Confusing") return "UI Confusion"
  if (item.feedback_type === "Suggestion") return "Missing Feature"
  if (item.feedback_type === "Praise") return "Positive Feedback"
  return "Bug"
}

function statusClass(status: string | null): string {
  const normalized = normalizeStatus(status)
  if (normalized === "Fixed" || normalized === "Closed") return "border-success/30 bg-success-soft text-success"
  if (normalized === "In Progress" || normalized === "Confirmed") return "border-warning/30 bg-warning-soft text-warning"
  if (normalized === "Won't Fix") return "border-panel bg-panel text-muted"
  return "border-accent/30 bg-accent-soft text-accent-strong"
}

function priorityClass(priority: string | null): string {
  const normalized = normalizePriority(priority)
  if (normalized === "Critical") return "border-rose-500/30 bg-rose-500/10 text-rose-700"
  if (normalized === "High") return "border-warning/30 bg-warning-soft text-warning"
  if (normalized === "Medium") return "border-accent/30 bg-accent-soft text-accent-strong"
  return "border-panel bg-panel text-muted"
}

export default function AdminFeedbackPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<PilotFeedback[]>([])
  const [drafts, setDrafts] = useState<Record<number, { admin_notes: string; assigned_to: string }>>({})
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    category: "",
    testerRole: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    async function loadFeedback() {
      const profile = await requireAdminOrBuyer()
      if (!profile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setError("Supabase is not configured.")
        setLoading(false)
        return
      }

      const { data, error: feedbackError } = await supabase
        .from("pilot_feedback")
        .select("*")
        .order("created_at", { ascending: false })

      if (feedbackError) {
        setError(feedbackError.message)
      } else {
        const rows = (data ?? []) as PilotFeedback[]
        setFeedback(rows)
        setDrafts(
          Object.fromEntries(
            rows.map((item) => [
              item.id,
              {
                admin_notes: item.admin_notes ?? "",
                assigned_to: item.assigned_to ?? "",
              },
            ])
          )
        )
      }

      setLoading(false)
    }

    loadFeedback()
  }, [router])

  const testerRoles = useMemo(() => {
    return Array.from(
      new Set(
        feedback
          .map((item) => item.tester_role?.trim())
          .filter((role): role is string => Boolean(role))
      )
    ).sort()
  }, [feedback])

  const filteredFeedback = useMemo(() => {
    return feedback.filter((item) => {
      const status = normalizeStatus(item.status)
      const priority = normalizePriority(item.priority)
      const category = normalizeCategory(item)
      const role = item.tester_role?.trim() ?? ""

      return (
        (!filters.status || status === filters.status) &&
        (!filters.priority || priority === filters.priority) &&
        (!filters.category || category === filters.category) &&
        (!filters.testerRole || role === filters.testerRole)
      )
    })
  }, [feedback, filters])

  const summary = useMemo(() => {
    return {
      newIssues: feedback.filter((item) => normalizeStatus(item.status) === "New").length,
      criticalIssues: feedback.filter((item) => normalizePriority(item.priority) === "Critical").length,
      inProgress: feedback.filter((item) => normalizeStatus(item.status) === "In Progress").length,
      fixed: feedback.filter((item) => normalizeStatus(item.status) === "Fixed").length,
    }
  }, [feedback])

  async function updateIssue(
    id: number,
    updates: Partial<Pick<PilotFeedback, "status" | "priority" | "issue_category" | "admin_notes" | "assigned_to">>,
    successMessage = "Issue updated."
  ) {
    if (!supabase) return

    setSavingId(id)
    setError("")
    setSuccess("")

    const { error: updateError } = await supabase
      .from("pilot_feedback")
      .update(updates)
      .eq("id", id)

    if (updateError) {
      setError(updateError.message)
      setSavingId(null)
      return
    }

    setFeedback((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
    setSuccess(successMessage)
    setSavingId(null)
  }

  function updateDraft(id: number, field: "admin_notes" | "assigned_to", value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        admin_notes: current[id]?.admin_notes ?? "",
        assigned_to: current[id]?.assigned_to ?? "",
        [field]: value,
      },
    }))
  }

  function resetFilters() {
    setFilters({ status: "", priority: "", category: "", testerRole: "" })
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="enterprise-section-label">Pilot Operations</p>
        <h1 className="enterprise-page-title">Tester Issue Tracker</h1>
        <p className="enterprise-page-description">
          Convert pilot feedback into issues, assign owners, record admin notes,
          and move each item from discovery to resolution.
        </p>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-4">
        {[
          ["New Issues", summary.newIssues],
          ["Critical Issues", summary.criticalIssues],
          ["In Progress", summary.inProgress],
          ["Fixed", summary.fixed],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-panel bg-card p-5 shadow-panel">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-secondary">
              {label}
            </p>
            <p className="mt-3 text-3xl font-bold text-heading">{value}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
              className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            >
              <option value="">All priorities</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
              className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
              Tester role
            </label>
            <select
              value={filters.testerRole}
              onChange={(event) => setFilters((current) => ({ ...current, testerRole: event.target.value }))}
              className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            >
              <option value="">All roles</option>
              {testerRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-panel pt-4">
          <p className="text-sm font-semibold text-secondary">
            Showing {filteredFeedback.length} of {feedback.length} feedback item(s)
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-secondary hover:border-accent hover:text-accent"
          >
            Clear Filters
          </button>
        </div>
      </section>

      {success && (
        <div className="mb-6 rounded-md border border-success/30 bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-md bg-panel" />
          ))}
        </div>
      ) : feedback.length === 0 ? (
        <div className="rounded-md border border-panel bg-card px-6 py-12 text-center shadow-panel">
          <p className="font-semibold text-heading">No pilot feedback yet.</p>
          <p className="mt-2 text-sm text-secondary">
            Feedback submitted from /feedback will appear here.
          </p>
        </div>
      ) : filteredFeedback.length === 0 ? (
        <div className="rounded-md border border-panel bg-card px-6 py-12 text-center shadow-panel">
          <p className="font-semibold text-heading">No issues match these filters.</p>
          <p className="mt-2 text-sm text-secondary">Clear filters to return to the full issue list.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFeedback.map((item) => {
            const status = normalizeStatus(item.status)
            const priority = normalizePriority(item.priority)
            const category = normalizeCategory(item)
            const draft = drafts[item.id] ?? { admin_notes: "", assigned_to: "" }

            return (
              <article key={item.id} className="rounded-md border border-panel bg-card p-5 shadow-panel">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(status)}`}>
                        {status}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityClass(priority)}`}>
                        {priority}
                      </span>
                      <span className="rounded-full border border-panel bg-panel px-3 py-1 text-xs font-semibold text-secondary">
                        {category}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-heading">
                      {item.page_or_feature || "Unspecified feature"}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {item.tester_name || "Anonymous"}{" "}
                      <span aria-hidden="true">&middot;</span>{" "}
                      {item.tester_role || "No role"}{" "}
                      <span aria-hidden="true">&middot;</span>{" "}
                      {formatDate(item.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      ["Mark Confirmed", "Confirmed"],
                      ["Start Fix", "In Progress"],
                      ["Mark Fixed", "Fixed"],
                      ["Close", "Closed"],
                    ].map(([label, nextStatus]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => updateIssue(item.id, { status: nextStatus }, `Issue marked ${nextStatus}.`)}
                        disabled={savingId === item.id}
                        className="rounded-md border border-panel bg-surface px-3 py-2 text-xs font-bold text-secondary hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-panel bg-panel p-4">
                  <p className="text-sm leading-7 text-secondary">
                    {item.message || "No message supplied."}
                  </p>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-4">
                  <div>
                    <label className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(event) => updateIssue(item.id, { status: event.target.value }, "Issue status updated.")}
                      disabled={savingId === item.id}
                      className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent disabled:opacity-60"
                    >
                      {statuses.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(event) => updateIssue(item.id, { priority: event.target.value }, "Issue priority updated.")}
                      disabled={savingId === item.id}
                      className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent disabled:opacity-60"
                    >
                      {priorities.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(event) => updateIssue(item.id, { issue_category: event.target.value }, "Issue category updated.")}
                      disabled={savingId === item.id}
                      className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent disabled:opacity-60"
                    >
                      {categories.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
                      Assigned to
                    </label>
                    <input
                      value={draft.assigned_to}
                      onChange={(event) => updateDraft(item.id, "assigned_to", event.target.value)}
                      className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent"
                      placeholder="Owner name"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
                    Admin notes
                  </label>
                  <textarea
                    value={draft.admin_notes}
                    onChange={(event) => updateDraft(item.id, "admin_notes", event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-md border border-panel bg-surface px-3 py-2 text-sm leading-6 text-primary outline-none focus:border-accent"
                    placeholder="Capture triage notes, reproduction steps, release notes, or next action."
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-panel pt-4 text-xs text-secondary">
                  <div className="flex flex-wrap gap-3">
                    <span>Rating: {item.rating ?? "-"}/5</span>
                    <span>Original type: {item.feedback_type ?? "Feedback"}</span>
                    <span>Reference: #{item.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateIssue(
                        item.id,
                        {
                          admin_notes: draft.admin_notes,
                          assigned_to: draft.assigned_to,
                        },
                        "Admin notes and assignment saved."
                      )
                    }
                    disabled={savingId === item.id}
                    className="rounded-md border border-accent bg-accent px-4 py-2 text-xs font-bold text-button hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save Notes
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
