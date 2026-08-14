/* eslint-disable react/no-unescaped-entities */
import { Metadata } from "next"
import Link from "next/link"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

export const metadata: Metadata = {
  title: "Data Protection | AiForm Procure",
  description: "How AiForm Procure protects your personal information under POPIA and South African law. Learn about data security, compliance documents, and your rights.",
}

export default function DataProtection() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 bg-canvas">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <BackLink href="/" label="Home" />

          <article className="prose prose-sm prose-neutral max-w-none dark:prose-invert">
            <h1 className="text-4xl font-bold mb-2 text-content">Data Protection</h1>
            <p className="text-secondary text-sm mb-8">
              Effective: 1 November 2026 | Last Updated: 13 August 2026 | POPIA compliant
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 mb-8">
              <p className="text-content font-semibold text-sm mb-2">📋 For Complete Details</p>
              <p className="text-secondary text-sm">
                This page describes our data protection principles and implementation. For full details on what we collect, why, and your rights, see our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
              </p>
            </div>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">Data Protection Principles</h2>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">Our Approach</h3>
                <p className="text-secondary text-sm mb-2">AiForm collects only information necessary for the Platform to function. We:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Minimise:</strong> Collect only what is needed</li>
                  <li><strong>Secure:</strong> Encrypt and restrict access</li>
                  <li><strong>Protect:</strong> Monitor for breaches and respond promptly</li>
                  <li><strong>Respect:</strong> Honour user privacy and rights</li>
                  <li><strong>Comply:</strong> Follow POPIA and South African law</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-content mb-3">Role-Based Access</h3>
                <p className="text-secondary text-sm mb-3">Information is accessible only to:</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-semibold text-content">Suppliers</p>
                    <p className="text-secondary">Their own profile and documents</p>
                  </div>
                  <div>
                    <p className="font-semibold text-content">Buyers</p>
                    <p className="text-secondary">Supplier profiles they search and suppliers responding to their RFQs</p>
                  </div>
                  <div>
                    <p className="font-semibold text-content">Administrators</p>
                    <p className="text-secondary">Account and compliance data (for support and fraud prevention)</p>
                  </div>
                  <div>
                    <p className="font-semibold text-content">Verification Services</p>
                    <p className="text-secondary">Specific documents needed to verify compliance (SARS, CIPC, CSD, etc.)</p>
                  </div>
                  <div>
                    <p className="font-semibold text-content">Law Enforcement</p>
                    <p className="text-secondary">Information compelled by valid legal process</p>
                  </div>
                </div>
                <p className="text-secondary text-sm italic mt-3">All staff are bound by confidentiality agreements.</p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">Compliance Documents and Supplier Information</h2>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">2.1 Supplier-Provided Documents</h3>
                <p className="text-secondary text-sm mb-2"><strong>What You Upload:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm mb-3">
                  <li>CSD registration reports</li>
                  <li>B-BBEE certificates</li>
                  <li>Tax clearance certificates</li>
                  <li>Bank letters</li>
                  <li>CIDB grading certificates</li>
                  <li>Company registration (CIPC)</li>
                  <li>Director identification information</li>
                  <li>Insurance certificates</li>
                  <li>Professional qualifications</li>
                </ul>
                <p className="text-secondary text-sm mb-2"><strong>Protection:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Encrypted storage (AES-256 at rest)</li>
                  <li>Access restricted to verification staff</li>
                  <li>Not publicly displayed (only verification badges shown)</li>
                  <li>Shared with buyers only when relevant to procurement</li>
                  <li>Retained for 3 years after account closure (audit/regulatory)</li>
                </ul>
              </div>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">2.2 Director and Personal Information</h3>
                <p className="text-secondary text-sm mb-2"><strong>Information Collected:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm mb-3">
                  <li>Director names and ID numbers</li>
                  <li>Employee names (from documents)</li>
                  <li>Third-party references and contacts</li>
                </ul>
                <p className="text-secondary text-sm"><strong>Protection:</strong> Encrypted storage, restricted access, not publicly displayed. You can request suppression of director ID numbers from public view. Used only for verification and fraud detection.</p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">2.3 Banking Information</h3>
                <p className="text-secondary text-sm mb-2"><strong>What We Store:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm mb-3">
                  <li>Account holder name</li>
                  <li>Account number</li>
                  <li>Bank name</li>
                  <li>Branch code</li>
                </ul>
                <p className="text-secondary text-sm mb-2"><strong>Protection (Strict):</strong></p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>✅ Encrypted storage (encrypted in database)</li>
                  <li>✅ Never stored in plain text</li>
                  <li>✅ PCI-DSS compliant handling</li>
                  <li>✅ NEVER publicly visible</li>
                  <li>✅ Shared only with payment processors during transactions</li>
                  <li>✅ Deleted when document is deleted</li>
                </ul>
              </div>

              <div className="bg-panel border border-secondary rounded p-4">
                <h3 className="font-semibold text-content mb-2">2.4 Verification Workflow</h3>
                <ol className="list-decimal list-inside space-y-1 text-secondary text-sm mb-3">
                  <li>Supplier uploads document</li>
                  <li>AiForm reviews for authenticity and matching</li>
                  <li>Where applicable, we verify with official source (SARS, CIPC, CSD, CIDB)</li>
                  <li>Verification badge added to supplier profile</li>
                  <li>Buyer sees badge but not full document</li>
                </ol>
                <p className="text-secondary text-sm"><strong>Audit Trail:</strong> All document reviews are logged. Access to sensitive documents is tracked. Logs retained for security and compliance.</p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">Data Security Measures</h2>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">Encryption</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>In Transit:</strong> HTTPS/TLS for all data in motion</li>
                  <li><strong>At Rest:</strong> Sensitive data encrypted using AES-256 in database</li>
                  <li><strong>Passwords:</strong> Hashed and salted, never stored in plain text</li>
                  <li><strong>Banking Details:</strong> Encrypted in database, never plain text</li>
                </ul>
              </div>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">Access Control</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Role-based access control (RBAC)</li>
                  <li>Staff can only access necessary information</li>
                  <li>Multi-factor authentication available for high-security accounts</li>
                  <li>All access logged and audited</li>
                  <li>Confidentiality agreements signed by all staff</li>
                </ul>
              </div>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">Ongoing Protection</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Regular security assessments and penetration testing</li>
                  <li>Continuous monitoring for unauthorised access</li>
                  <li>All data processors have Data Processing Agreements in place</li>
                  <li>Regular security assessments of third-party services</li>
                </ul>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                <h3 className="font-semibold text-content mb-2">Incident Response</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Detection:</strong> AiForm monitors for unauthorised access or breaches</li>
                  <li><strong>Notification:</strong> Affected users notified within 3 business days</li>
                  <li><strong>Reporting:</strong> Serious breaches reported to Information Regulator</li>
                  <li><strong>Remediation:</strong> Steps taken to prevent recurrence</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">Sensitive Data Protection</h2>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">POPIA Section 14 Compliance</h3>
                <p className="text-secondary text-sm mb-3">AiForm processes sensitive data (director IDs, banking, health information) only where:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Necessary:</strong> Required for contract performance or legal compliance</li>
                  <li><strong>Legitimate Interests:</strong> Fraud prevention and security</li>
                  <li><strong>Consent:</strong> You have explicitly consented</li>
                </ul>
              </div>

              <div className="bg-panel border border-secondary rounded p-4">
                <h3 className="font-semibold text-content mb-2">Your Control</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Director ID numbers: You can request suppression from public profile</li>
                  <li>Health/safety information: Encrypted and accessed only by authorized staff</li>
                  <li>Criminal history (if applicable): Accessed only by authorized staff, suppression available</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">Data Retention and Deletion</h2>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">Retention Schedule</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-content">Active Accounts</p>
                    <p className="text-secondary">Retained while account is active</p>
                  </div>
                  <div>
                    <p className="font-semibold text-content">After Account Closure</p>
                    <ul className="list-disc list-inside space-y-1 text-secondary mt-1">
                      <li><strong>Personal Data:</strong> 90 days (for recovery), then deleted</li>
                      <li><strong>Compliance Documents:</strong> 3 years (audit/regulatory)</li>
                      <li><strong>Transaction Records:</strong> 7 years (tax/regulatory)</li>
                      <li><strong>Logs/Analytics:</strong> 12 months (security)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-panel border border-secondary rounded p-4">
                <h3 className="font-semibold text-content mb-2">Legal Holds</h3>
                <p className="text-secondary text-sm">Information may be retained longer if:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm mt-2">
                  <li>Required by law (tax, regulatory, financial records)</li>
                  <li>Needed for legal proceedings or investigations</li>
                  <li>Involved in fraud or security investigation</li>
                  <li>Required to protect AiForm's legal interests</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">Cross-Border Data Transfers</h2>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">Where Your Data Is Processed</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-content">South Africa (Primary)</p>
                    <p className="text-secondary">AiForm operational data and accounts</p>
                  </div>
                  <div>
                    <p className="font-semibold text-content">European Union (EU)</p>
                    <p className="text-secondary">Supabase database hosting (Ireland); GDPR adequacy applies</p>
                  </div>
                  <div>
                    <p className="font-semibold text-content">United States (USA)</p>
                    <p className="text-secondary">OpenAI (AI processing), Google Analytics, Resend (email), Payment processors</p>
                  </div>
                </div>
              </div>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">Safeguards</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>EU:</strong> Protected under GDPR adequacy decision standards</li>
                  <li><strong>USA:</strong> Bound by Standard Contractual Clauses (SCC) and Data Processing Agreements</li>
                  <li><strong>Necessity:</strong> Transfers only where necessary for service delivery</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                <h3 className="font-semibold text-content mb-2">Your Rights</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Request data be processed only in South Africa (may limit functionality)</li>
                  <li>Object to transfers to specific jurisdictions</li>
                  <li>Contact <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link> for options</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">Your Rights Under POPIA</h2>

              <p className="text-content mb-4">
                Under the Protection of Personal Information Act (POPIA), you have the right to:
              </p>

              <div className="space-y-4 mb-6">
                <div className="bg-panel border border-secondary rounded p-4">
                  <h3 className="font-semibold text-content mb-2">Access Your Information</h3>
                  <p className="text-secondary text-sm">Request a copy of all personal information AiForm holds about you. <strong>Timeline:</strong> 20 business days. <strong>Cost:</strong> Free.</p>
                </div>

                <div className="bg-panel border border-secondary rounded p-4">
                  <h3 className="font-semibold text-content mb-2">Correct Inaccurate Information</h3>
                  <p className="text-secondary text-sm">Request correction of inaccurate, incomplete, or outdated information. <strong>Timeline:</strong> 10 business days. <strong>Cost:</strong> Free.</p>
                </div>

                <div className="bg-panel border border-secondary rounded p-4">
                  <h3 className="font-semibold text-content mb-2">Request Deletion</h3>
                  <p className="text-secondary text-sm mb-2">Request deletion ("Right to Be Forgotten"). <strong>Limitations:</strong> Cannot delete information required by law, needed for contracts, or involved in disputes.</p>
                  <p className="text-secondary text-sm"><strong>Timeline:</strong> 20 business days.</p>
                </div>

                <div className="bg-panel border border-secondary rounded p-4">
                  <h3 className="font-semibold text-content mb-2">Restrict Processing</h3>
                  <p className="text-secondary text-sm">Request restriction of how your data is used (e.g., stop marketing, restrict analytics). <strong>Timeline:</strong> 10 business days.</p>
                </div>

                <div className="bg-panel border border-secondary rounded p-4">
                  <h3 className="font-semibold text-content mb-2">Object to Processing</h3>
                  <p className="text-secondary text-sm">Object to processing on grounds of legitimate interest. <strong>Timeline:</strong> 20 business days.</p>
                </div>

                <div className="bg-panel border border-secondary rounded p-4">
                  <h3 className="font-semibold text-content mb-2">Data Portability</h3>
                  <p className="text-secondary text-sm">Request your data in a portable, machine-readable format (CSV, JSON). Covers information you provided directly (not derived data like SmartScore). <strong>Timeline:</strong> 20 business days.</p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                <h3 className="font-semibold text-content mb-2">How to Exercise Your Rights</h3>
                <p className="text-secondary text-sm mb-2">
                  Email <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link> with:
                </p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>"Data Access Request"</li>
                  <li>"Data Deletion Request"</li>
                  <li>"Data Portability Request"</li>
                  <li>Or describe your specific request</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">Dispute Resolution and Complaints</h2>

              <div className="bg-panel border border-secondary rounded p-4 mb-4">
                <h3 className="font-semibold text-content mb-2">Challenging Inaccurate Information</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-content">Supplier Verification Dispute</p>
                    <p className="text-secondary">If AiForm's verification is incorrect, email with details. AiForm will review and correct within 10 business days if warranted.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-content">SmartScore Dispute</p>
                    <p className="text-secondary">If your SmartScore is based on inaccurate information, request a review via dashboard or email. AiForm will recalculate based on corrected data.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-content">Compliance Information Dispute</p>
                    <p className="text-secondary">If government verification data (SARS, CIPC) shows incorrectly, AiForm can request live re-verification from authorities.</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                <h3 className="font-semibold text-content mb-2">Complaint to Information Regulator</h3>
                <p className="text-secondary text-sm mb-2">If you believe AiForm has violated your rights:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Website:</strong> <Link href="https://www.justice.gov.za/inforeg/" className="text-accent hover:underline">https://www.justice.gov.za/inforeg/</Link></li>
                  <li><strong>Email:</strong> complaints.ir@justice.gov.za</li>
                  <li><strong>Phone:</strong> +27 10 023 5400</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">Third-Party Processors</h2>

              <div className="bg-panel border border-secondary rounded p-4">
                <h3 className="font-semibold text-content mb-2">Data Processing Agreements in Place</h3>
                <p className="text-secondary text-sm mb-3">All data processors have Data Processing Agreements (DPAs) ensuring:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Data is processed only as instructed</li>
                  <li>Adequate security measures are implemented</li>
                  <li>Cross-border transfers are governed by SCCs (USA) or GDPR adequacy (EU)</li>
                  <li>Regular security audits are conducted</li>
                  <li>Breach notification is required within agreed timeframe</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 space-y-4">
                <div>
                  <p className="font-semibold text-content text-sm mb-1">Data Protection Questions</p>
                  <p className="text-secondary text-sm">
                    <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link>
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-content text-sm mb-1">Data Subject Rights (Access, Deletion, Portability)</p>
                  <p className="text-secondary text-sm">
                    <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link> with "Data [Access/Deletion/Portability] Request"
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-content text-sm mb-1">Security Incident Report</p>
                  <p className="text-secondary text-sm">
                    <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link> with "Security Incident Report" (Response within 3 business days)
                  </p>
                </div>
              </div>
            </section>

            <section className="pt-8 border-t border-secondary">
              <p className="text-secondary text-sm italic">
                <strong>Status:</strong> PRODUCTION — Effective 1 November 2026
              </p>
              <p className="text-secondary text-sm mt-2">
                See also: <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link> (full details on data collection and rights) | <Link href="/terms" className="text-accent hover:underline">Terms of Service</Link>
              </p>
            </section>
          </article>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
