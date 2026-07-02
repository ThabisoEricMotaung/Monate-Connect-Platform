"use client"

import Image from "next/image"
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

const popularQuestions: Array<{ action: AssistantAction; question: string }> = [
  {
    action: "explain-rfq",
    question: "Explain the key risks in this RFQ",
  },
  {
    action: "quote-readiness",
    question: "Is my quote ready to submit?",
  },
  {
    action: "compliance-terms",
    question: "What does CSD and BBBEE mean here?",
  },
  {
    action: "quote-checklist",
    question: "Build me a quote checklist",
  },
  {
    action: "draft-clarification",
    question: "Draft a clarification question for the buyer",
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

function HarbourSilhouette() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-full w-full opacity-[0.16]"
      viewBox="0 0 1200 320"
      preserveAspectRatio="xMidYMax slice"
    >
      <rect width="1200" height="320" fill="none" />
      <g fill="none" stroke="#c8a060" strokeLinecap="round" strokeLinejoin="round">
        <path d="M0 258H1200" strokeWidth="4" opacity="0.55" />
        <path d="M120 258V182h72v76M145 182v-28h24v28" strokeWidth="4" opacity="0.65" />
        <path d="M230 258V154h88v104M250 176h48M250 202h48M250 228h48" strokeWidth="4" opacity="0.55" />
        <path d="M388 258V118M388 118h210M598 118l-72 48M388 118l70 58M430 258l22-140M540 258l-20-140" strokeWidth="5" opacity="0.75" />
        <path d="M610 258V198h62v60M690 258v-88h74v88M786 258v-66h58v66" strokeWidth="4" opacity="0.62" />
        <path d="M900 258V102M900 102h160M1060 102l-58 42M900 102l54 48M932 258l18-156M1030 258l-16-156" strokeWidth="5" opacity="0.7" />
        <path d="M70 276c120-18 210-18 330 0s230 18 360 0 250-18 370 0" strokeWidth="3" opacity="0.45" />
      </g>
      <g fill="#f8f4ec" opacity="0.18">
        <rect x="28" y="226" width="58" height="32" />
        <rect x="336" y="218" width="34" height="40" />
        <rect x="854" y="216" width="34" height="42" />
        <rect x="1100" y="226" width="58" height="32" />
      </g>
    </svg>
  )
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

  function appendAssistantResponse(action: AssistantAction, prompt: string) {
    const timestamp = Date.now()

    setMessages((currentMessages) => [
      ...currentMessages,
      ...(prompt
        ? [
            {
              id: timestamp,
              role: "user" as const,
              text: prompt,
            },
          ]
        : []),
      {
        id: timestamp + 1,
        role: "assistant",
        text: createMockResponse(action, prompt),
      },
    ])
  }

  function handleActionSelect(action: AssistantAction) {
    setSelectedAction(action)
    appendAssistantResponse(action, "")
  }

  function handlePopularQuestion(action: AssistantAction, question: string) {
    setSelectedAction(action)
    appendAssistantResponse(action, question)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedInput = input.trim()

    if (!trimmedInput) return

    appendAssistantResponse(selectedAction, trimmedInput)
    setInput("")
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-xl bg-[#1a3a2a] px-5 py-6 text-[#f8f4ec] shadow-md sm:px-7 lg:px-8">
        <HarbourSilhouette />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a2a] via-[#1a3a2a]/92 to-[#10251b]" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#c8a060]/35 bg-white/10 shadow-sm backdrop-blur">
                <Image
                  src="/aiform-mark.png"
                  alt=""
                  width={28}
                  height={35}
                  className="h-8 w-auto"
                  priority
                />
              </span>
              <div>
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.24em] text-[#c8a060]">
                  AiForm Procure Assistant
                </p>
                <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
                  Thuso
                </h1>
              </div>
            </div>
            <p className="mt-5 max-w-2xl font-serif text-sm leading-7 text-[#f8f4ec]/78 sm:text-base">
              Ask procurement questions, shape RFQ responses, and turn compliance details into practical next steps.
            </p>
          </div>
          <div className="rounded-xl border border-[#c8a060]/25 bg-white/10 px-4 py-3 text-sm font-semibold text-[#f8f4ec]/85 backdrop-blur">
            Current mode: <span className="text-[#c8a060]">{selectedActionTitle}</span>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-[#1a3a2a]/10 bg-white/60 p-4 shadow-md backdrop-blur sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#c8a060]">
              Popular questions
            </p>
            <p className="mt-1 text-sm text-secondary">
              Start with a common procurement prompt.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularQuestions.map((item) => (
              <button
                key={item.question}
                type="button"
                onClick={() => handlePopularQuestion(item.action, item.question)}
                className="rounded-full border border-[#1a3a2a]/10 bg-white/70 px-3.5 py-2 text-xs font-bold text-[#1a3a2a] shadow-sm transition hover:border-[#c8a060]/45 hover:bg-[#c8a060]/10 hover:text-[#8a6a30] focus:outline-none focus:ring-2 focus:ring-[#c8a060]/30"
              >
                {item.question}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[18rem_1fr]">
        <aside className="rounded-xl border border-[#1a3a2a]/10 bg-white/60 p-4 shadow-md backdrop-blur sm:p-5">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#c8a060]">
            Focus modes
          </p>
          <div className="mt-4 grid gap-2">
            {actions.map((action) => {
              const active = selectedAction === action.id

              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleActionSelect(action.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-[#c8a060]/55 bg-[#c8a060]/10 text-[#1a3a2a] shadow-sm"
                      : "border-[#1a3a2a]/10 bg-white/55 text-secondary hover:border-[#c8a060]/35 hover:bg-white/80 hover:text-heading"
                  }`}
                >
                  <span className="block text-sm font-bold text-heading">{action.title}</span>
                  <span className="mt-1 block font-serif text-xs leading-5">{action.description}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="overflow-hidden rounded-xl border border-[#1a3a2a]/10 bg-white/60 shadow-md backdrop-blur">
          <div className="border-b border-[#1a3a2a]/10 bg-white/45 px-5 py-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#c8a060]">
              Assistant session
            </p>
            <p className="mt-1 text-sm font-semibold text-heading">
              Conversation history stays in this workspace preview.
            </p>
          </div>

          <div className="max-h-[540px] space-y-4 overflow-y-auto p-5">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`max-w-3xl rounded-xl border px-5 py-4 shadow-sm ${
                  message.role === "assistant"
                    ? "border-[#1a3a2a]/10 bg-white/70 text-secondary"
                    : "ml-auto border-[#c8a060]/45 bg-[#1a3a2a] text-[#f8f4ec]"
                }`}
              >
                <p className={`mb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] ${message.role === "assistant" ? "text-[#c8a060]" : "text-[#c8a060]"}`}>
                  {message.role === "assistant" ? "Thuso" : "You"}
                </p>
                <p className="whitespace-pre-line font-serif text-sm leading-7">
                  {message.text}
                </p>
              </article>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-[#1a3a2a]/10 bg-white/50 p-5"
          >
            <label
              htmlFor="assistant-message"
              className="mb-2 block text-[0.68rem] font-bold uppercase tracking-[0.24em] text-secondary"
            >
              Ask Thuso
            </label>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <textarea
                id="assistant-message"
                rows={3}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Paste an RFQ section, quote note, compliance term, or question you want help structuring..."
                className="w-full rounded-xl border border-[#1a3a2a]/10 bg-white/75 px-4 py-3 font-serif text-sm text-heading outline-none transition placeholder:text-muted focus:border-[#c8a060] focus:ring-2 focus:ring-[#c8a060]/20"
              />
              <button
                type="submit"
                className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-[#c8a060] bg-[#c8a060] px-6 py-3 text-sm font-bold text-[#1a3a2a] shadow-sm transition hover:bg-[#d8b36f] focus:outline-none focus:ring-2 focus:ring-[#c8a060]/35"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
