"use client"

import { FormEvent, useMemo, useState } from "react"

type AssistantAction =
  | "explain-rfq"
  | "quote-readiness"
  | "compliance-terms"
  | "quote-checklist"
  | "summarize-response"
  | "draft-clarification"

type ChatMessage = {
  id: number
  role: "assistant" | "user"
  text: string
}

const actions: Array<{
  id: AssistantAction
  title: string
  description: string
}> = [
  {
    id: "explain-rfq",
    title: "Explain this RFQ",
    description: "Break down scope, deadlines, risk areas, and next steps.",
  },
  {
    id: "quote-readiness",
    title: "Check my quote readiness",
    description: "Review whether your response has the essentials covered.",
  },
  {
    id: "compliance-terms",
    title: "Explain compliance terms",
    description: "Clarify CSD, BBBEE, tax, CIDB, and procurement language.",
  },
  {
    id: "quote-checklist",
    title: "Suggest quote checklist",
    description: "Generate a structured list before you submit.",
  },
  {
    id: "summarize-response",
    title: "Summarize supplier response",
    description: "Turn long notes into a procurement-ready summary.",
  },
  {
    id: "draft-clarification",
    title: "Draft clarification question",
    description: "Prepare a clear buyer question for ambiguous RFQ details.",
  },
]

const staticResponses: Record<AssistantAction, string> = {
  "explain-rfq":
    "RFQ response checklist:\n\n1. Confirm the scope of work and delivery location.\n2. Check the closing date and submit before the deadline.\n3. Identify mandatory documents, certifications, and compliance requirements.\n4. Confirm pricing includes VAT, delivery, labour, and any installation costs.\n5. Note assumptions, exclusions, and dependencies clearly.",
  "quote-readiness":
    "Quote readiness check:\n\n- Supplier details are complete.\n- Price is clear and formatted in ZAR.\n- Delivery timeline is realistic and stated in working days.\n- Scope confirms what is included and excluded.\n- Compliance documents are current.\n- Supporting notes explain capacity, warranties, and risks.",
  "compliance-terms":
    "Compliance terms:\n\nCSD means Central Supplier Database. It is the South African government supplier registration system.\n\nBBBEE means Broad-Based Black Economic Empowerment. Buyers often use BBBEE status to evaluate transformation and procurement compliance.\n\nTax compliance confirms that SARS tax obligations are in good standing.\n\nCIDB applies mainly to construction-related work and indicates contractor grading.",
  "quote-checklist":
    "Suggested quote checklist:\n\n- RFQ reference number\n- Supplier name and contact details\n- Valid CSD number\n- BBBEE certificate or affidavit\n- Tax compliance status\n- Itemised pricing\n- Delivery timeline\n- Scope of work\n- Warranty or support terms\n- Assumptions and exclusions\n- Signature or authorized submitter details",
  "summarize-response":
    "Supplier response summary format:\n\nSupplier proposes to deliver the requested goods or services within the stated timeline. Pricing should be reviewed against scope completeness, compliance readiness, delivery capacity, and any exclusions. Key procurement risks include missing documents, unclear warranty terms, or delivery assumptions.",
  "draft-clarification":
    "Draft clarification question:\n\nPlease confirm whether the quoted price must include delivery, installation, and all compliance documentation. Also confirm whether equivalent products or alternative technical specifications will be accepted, provided they meet the required performance standards.",
}

function createMockResponse(action: AssistantAction, input: string): string {
  const baseResponse = staticResponses[action]

  if (!input.trim()) {
    return baseResponse
  }

  return `${baseResponse}\n\nBased on your note:\n"${input.trim()}"\n\nRecommended next step: capture any unclear scope, missing document, or pricing assumption before submission so the buyer can evaluate your quote consistently.`
}

export default function ProcurementAssistantPage() {
  const [selectedAction, setSelectedAction] =
    useState<AssistantAction>("explain-rfq")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Welcome to the Procurement Assistant. Choose an action card or describe what you need help with. This is a safe local assistant preview and does not connect to any external AI service yet.",
    },
  ])

  const selectedActionTitle = useMemo(
    () => actions.find((action) => action.id === selectedAction)?.title,
    [selectedAction]
  )

  function handleActionSelect(action: AssistantAction) {
    setSelectedAction(action)
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        role: "assistant",
        text: createMockResponse(action, ""),
      },
    ])
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedInput = input.trim()

    if (!trimmedInput) return

    const timestamp = Date.now()

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: timestamp,
        role: "user",
        text: trimmedInput,
      },
      {
        id: timestamp + 1,
        role: "assistant",
        text: createMockResponse(selectedAction, trimmedInput),
      },
    ])
    setInput("")
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Guided Procurement Support
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Procurement Assistant
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Use a local assistant preview to structure RFQ thinking, quote
          readiness, compliance interpretation, and clarification questions.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {actions.map((action) => {
          const active = selectedAction === action.id

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleActionSelect(action.id)}
              className={`rounded-md border p-5 text-left shadow-sm transition hover:border-accent hover:bg-surface ${
                active
                  ? "border-accent bg-surface"
                  : "border-panel bg-card"
              }`}
            >
              <p className="text-sm font-semibold text-heading">
                {action.title}
              </p>
              <p className="mt-2 text-xs leading-5 text-secondary">
                {action.description}
              </p>
            </button>
          )
        })}
      </section>

      <section className="mt-8 overflow-hidden rounded-md border border-panel bg-card shadow-panel">
        <div className="border-b border-panel bg-panel px-5 py-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
            Mock Assistant Session
          </p>
          <p className="mt-1 text-sm font-semibold text-heading">
            Current mode: {selectedActionTitle}
          </p>
        </div>

        <div className="max-h-[520px] space-y-4 overflow-y-auto p-5">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-3xl rounded-md border px-5 py-4 ${
                message.role === "assistant"
                  ? "border-panel bg-panel text-secondary"
                  : "ml-auto border-accent bg-accent text-button"
              }`}
            >
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
                {message.role === "assistant" ? "Assistant" : "You"}
              </p>
              <p className="whitespace-pre-line text-sm leading-7">
                {message.text}
              </p>
            </article>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-panel bg-panel p-5"
        >
          <label
            htmlFor="assistant-message"
            className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-secondary"
          >
            Ask procurement assistant
          </label>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <textarea
              id="assistant-message"
              rows={3}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Paste an RFQ section, quote note, compliance term, or question you want help structuring..."
              className="w-full rounded-md border border-panel bg-card px-4 py-3 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-6 py-3 text-sm font-semibold text-button transition hover:bg-accent-strong"
            >
              Submit
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
