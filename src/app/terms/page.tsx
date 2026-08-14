import { Metadata } from "next"
import Link from "next/link"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

export const metadata: Metadata = {
  title: "Terms of Service | AiForm Procure",
  description: "Terms of Service for AiForm Procure. Learn about supplier verification, SmartScore, procurement opportunities, liability, and platform rules under South African law.",
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 bg-canvas">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <BackLink href="/" label="Home" />

          <article className="prose prose-sm prose-neutral max-w-none dark:prose-invert">
            <h1 className="text-4xl font-bold mb-2 text-content">Terms of Service</h1>
            <p className="text-secondary text-sm mb-8">
              Effective: 1 November 2026 | Last Updated: 13 August 2026 | Governed by South African law
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4 mb-8">
              <p className="text-content font-semibold text-sm mb-2">⚠️ Key Summary</p>
              <p className="text-secondary text-sm">
                AiForm Procure is a platform that aggregates procurement opportunities and verifies suppliers. We are not a procurement issuing authority, and we do not guarantee supplier performance, opportunity accuracy, or contract execution. You use AiForm at your own risk. Please read these Terms carefully.
              </p>
            </div>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
              <p className="text-content mb-4">
                By accessing or using AiForm Procure (the "Platform"), you agree to be bound by these Terms of Service, our Privacy Policy, and any other policies posted on the Platform. If you do not agree to these terms, do not use AiForm Procure.
              </p>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h4 className="font-semibold text-content mb-2">1.2 Eligibility</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>You must be at least 18 years old</li>
                  <li>You must be a natural person or authorised representative of a legal entity</li>
                  <li>You must be able to form legally binding contracts under South African law</li>
                  <li>You represent that all information provided is true and accurate</li>
                </ul>
              </div>

              <p className="text-content text-sm italic">
                AiForm reserves the right to amend these terms at any time. Material changes will be notified via email or platform announcement at least 30 days in advance. Continued use after amendments constitutes acceptance.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">2. Platform Overview</h2>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">2.1 What AiForm Procure Is</h3>
                <p className="text-secondary text-sm mb-2">AiForm Procure is a digital platform that:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Aggregates procurement opportunities from official public sources (National Treasury eTenders, government portals)</li>
                  <li>Verifies supplier compliance information (CSD, BBBEE, tax, banking, CIDB, etc.)</li>
                  <li>Facilitates connections between buyers and suppliers</li>
                  <li>Manages RFQ workflows, quote submissions, and procurement tracking</li>
                  <li>Calculates SmartScore as a supplier engagement and compliance indicator</li>
                  <li>Provides AI-assisted summaries and guidance through Thuso</li>
                </ul>
              </div>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">2.2 What AiForm Procure Is NOT</h3>
                <p className="text-secondary text-sm mb-2">AiForm Procure is not:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>An agent or representative of any procurement issuing authority</li>
                  <li>A guarantor of supplier performance or capability</li>
                  <li>A lender or credit provider</li>
                  <li>A financial or legal advisor</li>
                  <li>An employment agency</li>
                  <li>Responsible for contract execution or dispute resolution between users</li>
                </ul>
              </div>

              <p className="text-content text-sm italic">
                AiForm may restrict, suspend, or terminate your access at any time for violation of these terms or illegal conduct. The Platform is provided "as is" with no warranties of uninterrupted service.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">3. Procurement Opportunities and Sourcing Data</h2>

              <div className="mb-6">
                <h3 className="font-semibold text-content mb-2">3.1 Origin of Opportunities</h3>
                <p className="text-secondary text-sm">
                  AiForm aggregates opportunities from National Treasury eTenders portal, published government procurement systems, and other official public sources. These opportunities are published by government departments, municipalities, SOEs, and other procuring entities.
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-6">
                <h3 className="font-semibold text-content mb-2">3.2 AiForm's Role: Aggregation, NOT Curation</h3>
                <p className="text-secondary text-sm mb-2">AiForm retrieves and republishes opportunities to help suppliers find them. AiForm does NOT:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Author the opportunities</li>
                  <li>Guarantee their accuracy, completeness, or currency</li>
                  <li>Control the procurement process</li>
                  <li>Guarantee opportunities remain open or unchanged</li>
                  <li>Act as the issuing authority's agent</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-content mb-2">3.3 Automated Screening</h3>
                <p className="text-secondary text-sm mb-2">
                  AiForm applies automated screening to filter cancelled, awarded, and obviously invalid opportunities. This screening is NOT a manual review, quality assessment, or guarantee of accuracy. <strong>You must independently verify opportunity status</strong> by checking the National Treasury eTenders portal or issuing authority directly before bidding.
                </p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                <h3 className="font-semibold text-content mb-2">3.4–3.5 Liability for Opportunities</h3>
                <p className="text-secondary text-sm">
                  You acknowledge that AiForm is not liable for opportunity accuracy, currency, availability, missed deadlines, or changed requirements. All risk of opportunity accuracy rests with you. Opportunities may change after publication without AiForm notification.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">4. Supplier Verification and SmartScore</h2>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">4.1 What "Verified" Means</h3>
                <p className="text-secondary text-sm">
                  "Verified" on AiForm means that AiForm has reviewed specific documentary evidence on a specific date and confirmed it matches stated criteria. Example: A CSD verification means AiForm reviewed the document, confirmed the registration number matches, and confirmed CSD status was "Active" as of that date.
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">4.2 What Verification Does NOT Mean</h3>
                <p className="text-secondary text-sm mb-2">Verification does NOT mean:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>The supplier is recommended, approved, or endorsed by AiForm</li>
                  <li>The supplier is honest, trustworthy, or ethical</li>
                  <li>The information remains current or accurate today</li>
                  <li>The supplier can perform work or deliver successfully</li>
                  <li>The supplier is solvent, capable, or in good financial standing</li>
                  <li>The supplier complies with all applicable laws</li>
                  <li>The supplier is suitable for your specific procurement needs</li>
                  <li>AiForm stands behind or guarantees the supplier</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-content mb-2">4.3 Three Verification States</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-content">Supplier Provided</p>
                    <p className="text-secondary">Supplier uploaded; AiForm has not reviewed. Confidence: LOW</p>
                  </div>
                  <div>
                    <p className="font-semibold text-content">Reviewed by AiForm</p>
                    <p className="text-secondary">AiForm examined the document and confirmed basic matching. Confidence: MEDIUM</p>
                  </div>
                  <div>
                    <p className="font-semibold text-content">Confirmed from Official Source</p>
                    <p className="text-secondary">AiForm verified directly with the issuing authority (SARS, CIPC, CSD, CIDB). Confidence: HIGH</p>
                  </div>
                </div>
              </div>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">4.4 SmartScore Explained</h3>
                <p className="text-secondary text-sm mb-2">SmartScore combines compliance points (up to 60) + activity bonus (up to 8), ranging from 0–100:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm mb-3">
                  <li><strong>0–39:</strong> Emerging</li>
                  <li><strong>40–59:</strong> Developing</li>
                  <li><strong>60–74:</strong> Reliable</li>
                  <li><strong>75–84:</strong> Trusted</li>
                  <li><strong>85–100:</strong> Elite</li>
                </ul>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">4.5 What SmartScore Is NOT</h3>
                <p className="text-secondary text-sm mb-2">SmartScore is NOT:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>A credit score or financial rating</li>
                  <li>A compliance certificate issued by any authority</li>
                  <li>A guarantee of supplier performance, honesty, or integrity</li>
                  <li>A recommendation to award a contract</li>
                  <li>A substitute for your due diligence</li>
                  <li>Audited, certified, or endorsed by third parties</li>
                </ul>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                <h3 className="font-semibold text-content mb-2">4.6 Buyer Responsibility (CRITICAL)</h3>
                <p className="text-secondary text-sm mb-2">Before awarding a contract:</p>
                <ol className="list-decimal list-inside space-y-1 text-secondary text-sm">
                  <li>Do NOT rely solely on SmartScore</li>
                  <li>Independently verify current compliance status with authorities</li>
                  <li>Request references and conduct checks</li>
                  <li>Assess supplier capability for your work</li>
                  <li>Make your own procurement decision</li>
                  <li>Accept full responsibility for your award decision</li>
                </ol>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">5. Supplier and Buyer Obligations</h2>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">5.1 Supplier Warranties</h3>
                <p className="text-secondary text-sm mb-2">You warrant that:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>All information provided is true and accurate</li>
                  <li>All compliance documents are genuine and not forged</li>
                  <li>You own or have authority to share all content and documents</li>
                  <li>Your business is legitimate and lawful</li>
                  <li>You will not use the Platform to circumvent procurement regulations</li>
                </ul>
              </div>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">5.2 Buyer Warranties</h3>
                <p className="text-secondary text-sm mb-2">You warrant that:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>You are authorised to post procurement opportunities</li>
                  <li>RFQs are genuine procurement requests (not spam or test)</li>
                  <li>Procurement is lawful and complies with applicable regulations</li>
                  <li>You will not harvest or scrape supplier contact information</li>
                  <li>You will evaluate suppliers fairly</li>
                </ul>
              </div>

              <p className="text-content text-sm italic">
                If you breach these representations, AiForm may suspend or terminate your account, report to law enforcement, and pursue legal action.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">6. Platform Rules and Prohibited Conduct</h2>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4">
                <h3 className="font-semibold text-content mb-2">6.1 You Must Not</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Misrepresent information (false identity, false compliance status, fraudulent documents)</li>
                  <li>Engage in fraud, create fake accounts, or collude to rig bids</li>
                  <li>Abuse the Platform (spam, harassment, automated attacks)</li>
                  <li>Violate laws (money laundering, corruption, sanctions evasion)</li>
                  <li>Attempt to exploit or reverse-engineer AiForm's algorithms</li>
                </ul>
              </div>

              <div className="mt-4 text-sm">
                <p className="font-semibold text-content mb-2">6.2–6.3 Account Actions</p>
                <p className="text-secondary">AiForm may immediately suspend or permanently terminate your account for violations, fraudulent documents, illegal conduct, or credible reports of fraud.</p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">7. Intellectual Property</h2>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">7.1 AiForm Ownership</h3>
                <p className="text-secondary text-sm">AiForm owns all platform software, code, technology, user interface, SmartScore algorithms, matching algorithms, database, branding, and Thuso AI technology.</p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">7.2 Scraping and Data Extraction Prohibited</h3>
                <p className="text-secondary text-sm mb-2">You cannot:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm mb-3">
                  <li>Use bots or scripts to scrape AiForm data</li>
                  <li>Bulk-extract supplier information or opportunities</li>
                  <li>Create a competing supplier directory</li>
                  <li>Republish AiForm's opportunities or SmartScore scores</li>
                  <li>Mirror or replicate AiForm's interface</li>
                </ul>
                <p className="text-secondary text-sm"><strong>Enforcement:</strong> Account suspension, legal action, and potential law enforcement reporting.</p>
              </div>

              <p className="text-content text-sm italic">
                You retain ownership of your uploaded content and can request deletion (subject to legal holds). AiForm may use your content for platform improvement, verification, compliance analysis, and aggregated statistics.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">8. AI and Thuso Assistant</h2>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                <h3 className="font-semibold text-content mb-2">8.1 Important Limitations</h3>
                <p className="text-secondary text-sm mb-2">Thuso is informational only and does NOT:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm mb-3">
                  <li>Constitute legal, financial, or professional advice</li>
                  <li>Guarantee accuracy of summaries or interpretations</li>
                  <li>Replace reading the original tender document</li>
                  <li>Guarantee eligibility assessments</li>
                </ul>
                <p className="text-secondary text-sm"><strong>AI Risks:</strong> Inaccuracies, missed obligations, outdated information, biased advice, contradictions with original documents.</p>
                <p className="text-secondary text-sm mt-2"><strong>Your Responsibility:</strong> Always read the original tender document. Verify Thuso outputs. Consult legal counsel. Make all decisions independently. Accept full responsibility.</p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">9. Liability Limitations (IMPORTANT)</h2>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">9.1 AiForm Is NOT Liable For:</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Supplier Performance:</strong> Failure to deliver, non-performance, fraud, bankruptcy</li>
                  <li><strong>Buyer Decisions:</strong> Your award decision, contract terms, unsuccessful bids</li>
                  <li><strong>Data Accuracy:</strong> Errors in tender data, opportunities that change, fraudulent documents</li>
                  <li><strong>Verification Reliance:</strong> Your reliance on verification badges or SmartScore</li>
                  <li><strong>Platform Operations:</strong> Downtime, lost data, email failures</li>
                  <li><strong>Third-Party Services:</strong> Failures of Supabase, payment processors, email services</li>
                </ul>
              </div>

              <div className="bg-panel border border-secondary rounded p-4">
                <h3 className="font-semibold text-content mb-2">9.2 Liability Cap</h3>
                <p className="text-secondary text-sm">
                  Subject to the Consumer Protection Act and non-excludable statutory duties, AiForm's total liability to you for any claim is limited to fees paid to AiForm in the 12 months preceding the claim (or R0 for free users).
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">10. Indemnification</h2>

              <p className="text-content mb-4">
                You will indemnify, defend, and hold harmless AiForm from all claims, damages, liabilities, costs, and expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li>Your use of the Platform</li>
                <li>Your breach of these Terms</li>
                <li>Your violation of laws or third-party rights</li>
                <li>Your contract disputes with other users</li>
                <li>Fraudulent documents or information you submit</li>
                <li>AI content reliance or misuse</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">11. Dispute Resolution</h2>

              <p className="text-content mb-4">
                AiForm does not resolve disputes between users. For disputes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li>Contact the other user directly or through Platform messaging</li>
                <li>Attempt good faith negotiation</li>
                <li>If unresolved, pursue legal action in South African courts</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">12. Governing Law</h2>

              <p className="text-content mb-4">
                These Terms are governed by the laws of the Republic of South Africa, without regard to conflicts of law principles. You consent to the exclusive jurisdiction of South African courts.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">13. Severability and Waiver</h2>

              <p className="text-content mb-4">
                If any provision of these Terms is found invalid, it will be severed, and the remaining provisions will continue. No waiver of any provision is effective unless in writing and signed by AiForm.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">14. Entire Agreement</h2>

              <p className="text-content mb-4">
                These Terms, along with the Privacy Policy, Data Protection page, and any other posted policies, constitute the entire agreement between you and AiForm and supersede all prior agreements.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">15. Contact Us</h2>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                <p className="text-secondary text-sm mb-2">
                  <strong>Questions about these Terms?</strong>
                </p>
                <p className="text-secondary text-sm">
                  Email: <Link href="mailto:support@aiformstudio.com" className="text-accent hover:underline">support@aiformstudio.com</Link>
                </p>
                <p className="text-secondary text-sm">
                  For legal matters: <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link>
                </p>
              </div>
            </section>

            <section className="pt-8 border-t border-secondary">
              <p className="text-secondary text-sm italic">
                <strong>Status:</strong> PRODUCTION — Effective 1 November 2026
              </p>
            </section>
          </article>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
