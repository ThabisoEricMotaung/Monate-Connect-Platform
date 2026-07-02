import HaveYourSayPanel from "@/components/HaveYourSayPanel"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

export default function FeedbackPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page px-5 py-10 text-primary sm:px-6">
        <section className="mx-auto max-w-7xl">
          <HaveYourSayPanel />
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
