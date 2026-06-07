export default function AdminMessagesPage() {
  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Communications
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Messages</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Your procurement conversations.
        </p>
      </div>

      <section className="rounded-md border border-panel bg-card p-10 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">
          No messages yet. Messages appear here when buyers and suppliers communicate about an RFQ, quote, or contract.
        </p>
      </section>
    </div>
  )
}
