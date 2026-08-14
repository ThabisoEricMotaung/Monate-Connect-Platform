/* eslint-disable react/no-unescaped-entities */
import { Metadata } from "next"
import Link from "next/link"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

export const metadata: Metadata = {
  title: "Privacy Policy | AiForm Procure",
  description: "Our Privacy Policy explains how AiForm Procure collects, uses, and protects your personal information under POPIA and South African law.",
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 bg-canvas">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <BackLink href="/" label="Home" />

          <article className="prose prose-sm prose-neutral max-w-none dark:prose-invert">
            <h1 className="text-4xl font-bold mb-2 text-content">Privacy Policy</h1>
            <p className="text-secondary text-sm mb-8">
              Effective: 1 November 2026 | Last Updated: 13 August 2026 | Jurisdiction: South African law; POPIA compliant
            </p>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">1. Who We Are and Our Commitment</h2>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Organization Details</h3>
                <ul className="list-disc list-inside space-y-1 text-content">
                  <li><strong>Operator:</strong> AiForm Studio (Pty) Ltd</li>
                  <li><strong>Location:</strong> South Africa (Pretoria)</li>
                  <li><strong>Service:</strong> AiForm Procure — a digital platform for verified supplier discovery, RFQ workflows, and procurement coordination</li>
                  <li><strong>Contact:</strong> privacy@aiformstudio.com</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Our Commitment</h3>
                <p className="text-content mb-3">
                  We handle your personal information with respect, transparency, and in compliance with:
                </p>
                <ul className="list-disc list-inside space-y-1 text-content mb-3">
                  <li>South African Protection of Personal Information Act (POPIA)</li>
                  <li>Consumer Protection Act (CPA)</li>
                  <li>Common law privacy duties</li>
                </ul>
                <p className="text-content">
                  This policy explains how we collect, use, store, protect, and delete your personal information.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">2. What Personal Information We Collect</h2>

              <h3 className="text-lg font-semibold mb-4">2.1 Information You Provide Directly</h3>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Account Registration</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Full name</li>
                  <li>Email address</li>
                  <li>Phone number (optional)</li>
                  <li>Company/organisation name</li>
                  <li>Trading address and registration details</li>
                  <li>Role (supplier, buyer, administrator)</li>
                  <li>Password (encrypted, never stored in plain text)</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Supplier Profile Information (optional)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Company description and services offered</li>
                  <li>Industry and service categories</li>
                  <li>Operating provinces/regions</li>
                  <li>Website and social media links</li>
                  <li>Company logo</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Compliance and Verification Documents (suppliers)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>CSD registration report</li>
                  <li>B-BBEE certificate or sworn affidavit</li>
                  <li>SARS tax clearance certificate or TCS PIN</li>
                  <li>Bank letter (account holder name, number, branch code)</li>
                  <li>CIDB grading certificate (if applicable)</li>
                  <li>COIDA letter of good standing (if applicable)</li>
                  <li>Company registration certificate (CIPC)</li>
                  <li>Directors' identification numbers and names</li>
                  <li>Insurance certificates (if applicable)</li>
                  <li>Professional qualifications and memberships</li>
                  <li>UIF registration confirmation</li>
                  <li>Any supporting documents you upload</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">RFQ and Procurement Information (buyers)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Procurement specifications and requirements</li>
                  <li>Budget and tender values</li>
                  <li>Closing dates and delivery locations</li>
                  <li>Documents and attachments related to opportunities</li>
                  <li>Buyer organisation details and approver information</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Communication</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Messages, enquiries, and support requests sent via the platform</li>
                  <li>Email communications</li>
                  <li>Feedback, complaints, and suggestions</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Payment Information (if/when subscriptions begin)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Payment method (debit/credit card, bank transfer)</li>
                  <li>Billing address</li>
                  <li>Transaction history</li>
                  <li>Invoice records</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">2.2 Information Collected Automatically</h2>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Usage Data</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Pages you visit and time spent on each</li>
                  <li>Links you click</li>
                  <li>Searches you perform</li>
                  <li>Profile views and interactions</li>
                  <li>RFQs viewed, opportunities saved, quotes submitted</li>
                  <li>Login dates and times</li>
                  <li>Device type, browser, operating system</li>
                  <li>IP address</li>
                  <li>Approximate location (from IP)</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Cookies and Tracking</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Session cookies (necessary for login)</li>
                  <li>Analytics cookies (Google Analytics)</li>
                  <li>Preference cookies (language, layout settings)</li>
                  <li>Third-party cookies (e.g., social media, payment processors)</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">2.3 Information from Third Parties</h2>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Verification Sources</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>SARS (tax compliance status via TCS PIN lookup)</li>
                  <li>National Treasury CSD database</li>
                  <li>CIPC (company registration checks)</li>
                  <li>Central Bank (banking verification)</li>
                  <li>CIDB (construction grading checks)</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Payment Processors</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>Transaction data from payment gateways</li>
                  <li>Fraud detection signals</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Publicly Available Sources</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>National Treasury eTenders (for opportunity aggregation)</li>
                  <li>Government business registries</li>
                  <li>Public procurement data</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">3. Why We Collect This Information (Lawful Basis)</h2>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">3.1 Performance of Contract</h3>
                <p className="text-content mb-3">We collect information to:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm mb-3">
                  <li>Set up and manage your account</li>
                  <li>Provide the platform and services you request</li>
                  <li>Process payments and manage subscriptions</li>
                  <li>Execute RFQs, quotes, and procurement workflows</li>
                  <li>Deliver customer support</li>
                </ul>
                <p className="text-secondary text-sm"><strong>Legal Basis:</strong> Necessary to perform the contract with you (POPIA section 11(a))</p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">3.2 Compliance with Law</h3>
                <p className="text-content mb-3">We collect information to:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm mb-3">
                  <li>Verify your identity and eligibility</li>
                  <li>Check supplier compliance (CSD, BBBEE, tax)</li>
                  <li>Detect and prevent fraud</li>
                  <li>Maintain audit trails for procurement decisions</li>
                  <li>Comply with tax, financial, and regulatory obligations</li>
                </ul>
                <p className="text-secondary text-sm"><strong>Legal Basis:</strong> Compliance with legal obligation (POPIA section 11(b))</p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">3.3 Legitimate Interests</h3>
                <p className="text-content mb-3">We collect information to:</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm mb-3">
                  <li>Improve platform security and prevent abuse</li>
                  <li>Understand how users interact with AiForm</li>
                  <li>Develop new features and services</li>
                  <li>Conduct market research and analytics</li>
                  <li>Detect patterns indicating fraud or misuse</li>
                  <li>Protect AiForm's legal and business interests</li>
                </ul>
                <p className="text-secondary text-sm"><strong>Legal Basis:</strong> Legitimate interests pursued by AiForm (POPIA section 11(c))</p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">3.4 Consent</h3>
                <p className="text-content">We collect information (such as marketing communications) only where you have explicitly consented.</p>
                <p className="text-secondary text-sm mt-3"><strong>Legal Basis:</strong> Your consent (POPIA section 11(d))</p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">4. How We Use Your Information</h2>

              <h3 className="text-lg font-semibold mb-3">4.1 Core Platform Functions</h3>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li><strong>Account Management:</strong> Create, maintain, and manage your account</li>
                <li><strong>Verification:</strong> Check CSD, BBBEE, tax, banking, and other compliance documents</li>
                <li><strong>Supplier Profiles:</strong> Display your information to potential buyers</li>
                <li><strong>RFQ Workflows:</strong> Match suppliers to opportunities and manage quotes</li>
                <li><strong>SmartScore:</strong> Calculate your compliance and activity score</li>
                <li><strong>Opportunity Matching:</strong> Recommend opportunities based on your profile</li>
                <li><strong>Payments:</strong> Process fees and manage billing</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">4.2 Communication</h3>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li><strong>Service Updates:</strong> Notify you of platform changes, maintenance, or security issues</li>
                <li><strong>Support:</strong> Respond to your questions and resolve issues</li>
                <li><strong>Transactional Emails:</strong> Send confirmations, deadlines, and urgent notifications</li>
                <li><strong>Legal Notices:</strong> Provide changes to terms, policies, or compliance requirements</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">4.3 Analytics and Improvement</h3>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li><strong>Usage Analytics:</strong> Understand how the platform is used</li>
                <li><strong>Performance:</strong> Identify and fix technical issues</li>
                <li><strong>Feature Development:</strong> Develop new features based on user needs</li>
                <li><strong>Fraud Detection:</strong> Identify suspicious patterns or misuse</li>
                <li><strong>Market Research:</strong> Analyse trends in procurement and supplier markets</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">4.4 Safety and Compliance</h3>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li><strong>Fraud Prevention:</strong> Detect fraudulent documents or accounts</li>
                <li><strong>Security:</strong> Monitor for unauthorised access or data breaches</li>
                <li><strong>Abuse Prevention:</strong> Enforce platform rules and investigate violations</li>
                <li><strong>Legal Obligations:</strong> Comply with tax, regulatory, and law enforcement requests</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">4.5 Marketing (with Consent Only)</h3>
              <ul className="list-disc list-inside space-y-1 text-content mb-3">
                <li><strong>Newsletters:</strong> Procurement tips, platform updates, industry news</li>
                <li><strong>Product Announcements:</strong> New features or service offerings</li>
                <li><strong>Targeted Communications:</strong> Opportunities matched to your profile</li>
                <li><strong>Surveys:</strong> Feedback on your experience</li>
              </ul>
              <p className="text-content italic">You can opt out of marketing at any time via email or account settings.</p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">5. Data Processors and Third-Party Sharing</h2>

              <h3 className="text-lg font-semibold mb-3">5.1 Data Processors (Services We Use)</h3>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Supabase (Database & Hosting)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>What:</strong> Cloud database, authentication, storage</li>
                  <li><strong>Where:</strong> EU (Ireland)</li>
                  <li><strong>Data:</strong> User accounts, profiles, documents, RFQs, quotes, contracts</li>
                  <li><strong>Contract:</strong> Data Processing Agreement in place</li>
                  <li><strong>Rights:</strong> Encrypted at rest; access restricted to authorised staff</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">OpenAI (AI Services)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>What:</strong> Thuso AI assistant, text summarisation, content generation</li>
                  <li><strong>Where:</strong> USA</li>
                  <li><strong>Data:</strong> Tender documents, RFQ content, user queries (NOT stored long-term)</li>
                  <li><strong>Contract:</strong> Data Processing Agreement in place</li>
                  <li><strong>Rights:</strong> Content used for improvements; not stored on OpenAI servers beyond processing</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Resend (Email Service)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>What:</strong> Transactional email delivery</li>
                  <li><strong>Where:</strong> USA</li>
                  <li><strong>Data:</strong> Email addresses, notification content</li>
                  <li><strong>Contract:</strong> Data Processing Agreement in place</li>
                  <li><strong>Rights:</strong> Used only to deliver emails; not used for marketing</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Google Analytics (Analytics)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>What:</strong> Website usage and performance analytics</li>
                  <li><strong>Where:</strong> USA</li>
                  <li><strong>Data:</strong> Anonymised usage data, page views, device types, IP addresses (anonymised)</li>
                  <li><strong>Contract:</strong> Data Processing Agreement in place</li>
                  <li><strong>Rights:</strong> Used only for platform improvement</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Payment Processors (if/when subscriptions begin)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>What:</strong> Payment processing, billing, invoicing</li>
                  <li><strong>Where:</strong> Various jurisdictions (TBD at launch)</li>
                  <li><strong>Data:</strong> Payment method, billing address, transaction history (NOT full card details; PCI-DSS compliant)</li>
                  <li><strong>Contract:</strong> Data Processing Agreements in place</li>
                  <li><strong>Rights:</strong> Used only for payment processing; card data never stored on AiForm servers</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Cloud Provider (Vercel)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>What:</strong> Application hosting, CDN, deployment</li>
                  <li><strong>Where:</strong> Global (primarily USA)</li>
                  <li><strong>Data:</strong> Logs, analytics, performance data</li>
                  <li><strong>Contract:</strong> Data Processing Agreement in place</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">5.2 Who Else Can See Your Information</h2>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Buyers (Supplier Information Only)</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>What:</strong> Your name, company, profile information, verification badges, SmartScore, uploaded documents (if applicable)</li>
                  <li><strong>When:</strong> When you respond to an RFQ or when a buyer searches suppliers</li>
                  <li><strong>Control:</strong> You control which information is public vs. hidden in your profile settings</li>
                  <li><strong>Limited to:</strong> Information necessary for procurement purposes</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Administrators and Support Staff</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Access:</strong> AiForm staff may view account information to provide support, investigate fraud, or resolve disputes</li>
                  <li><strong>Confidentiality:</strong> Staff are bound by confidentiality agreements</li>
                  <li><strong>Limited Access:</strong> Access is role-based and logged</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Law Enforcement / Government</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>When:</strong> In response to valid legal requests (court order, subpoena, regulatory inquiry)</li>
                  <li><strong>What:</strong> AiForm will disclose only what is legally required</li>
                  <li><strong>Notification:</strong> Where legally permitted, we will notify you of legal requests</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Business Partners (if applicable)</h3>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Strategic Partners:</strong> If AiForm partners with other organisations, data sharing will be governed by separate agreements; you will be notified</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 mb-6">
                <p className="text-content font-semibold mb-2">NOT Sold or Shared for Marketing</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li>We do NOT sell your personal information</li>
                  <li>We do NOT share data with third-party marketers</li>
                  <li>We do NOT rent your contact details</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">6. How Long We Keep Your Information</h2>

              <h3 className="text-lg font-semibold mb-3">6.1 Active Accounts</h3>
              <p className="text-content mb-6">While your account is active, we retain all information needed to provide the service.</p>

              <h3 className="text-lg font-semibold mb-3">6.2 After Account Closure</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="font-semibold text-content mb-2">Personal Account Data</h4>
                  <p className="text-secondary text-sm">Retained for 90 days after account closure to allow data recovery requests. Deleted thereafter (except as required by law).</p>
                </div>
                <div>
                  <h4 className="font-semibold text-content mb-2">Compliance Documents</h4>
                  <p className="text-secondary text-sm">Retained for 3 years after account closure (for audit and regulatory purposes). Extended retention if disputes, legal claims, or investigations are ongoing.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-content mb-2">Transaction and Contract Records</h4>
                  <p className="text-secondary text-sm">Retained for 7 years (tax and regulatory requirements).</p>
                </div>
                <div>
                  <h4 className="font-semibold text-content mb-2">Logs and Analytics</h4>
                  <p className="text-secondary text-sm">Retained for 12 months (security and performance purposes).</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-3">6.3 Legal and Security Holds</h3>
              <p className="text-content mb-3">Information may be retained longer if:</p>
              <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                <li>Required by law (tax, regulatory, financial records)</li>
                <li>Needed for legal proceedings or investigations</li>
                <li>Involved in a fraud or security investigation</li>
                <li>Required to protect AiForm's legal interests</li>
                <li>You have requested data preservation</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">7. Your Rights Under POPIA</h2>
              <p className="text-content mb-6">Under the Protection of Personal Information Act, you have the right to:</p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">7.1 Access Your Information</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                    <li><strong>What:</strong> Request a copy of all personal information AiForm holds about you</li>
                    <li><strong>How:</strong> Email privacy@aiformstudio.com with "Data Access Request" in the subject line</li>
                    <li><strong>Timeline:</strong> AiForm will provide a response within 20 business days</li>
                    <li><strong>Cost:</strong> Free for reasonable requests</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">7.2 Correct Inaccurate Information</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                    <li><strong>What:</strong> Request correction of inaccurate, incomplete, or outdated information</li>
                    <li><strong>How:</strong> Update your account directly, or email privacy@aiformstudio.com with specific corrections needed</li>
                    <li><strong>Timeline:</strong> AiForm will correct within 10 business days</li>
                    <li><strong>Cost:</strong> Free</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">7.3 Request Deletion ("Right to Be Forgotten")</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary text-sm mb-3">
                    <li><strong>What:</strong> Request deletion of your personal information</li>
                  </ul>
                  <p className="text-content font-semibold text-sm mb-2">Limitations:</p>
                  <ul className="list-disc list-inside space-y-1 text-secondary text-sm mb-3">
                    <li>Cannot delete information required by law (e.g., transaction records for 7 years)</li>
                    <li>Cannot delete information needed to fulfil contracts</li>
                    <li>Cannot delete information involved in disputes or investigations</li>
                  </ul>
                  <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                    <li><strong>How:</strong> Email privacy@aiformstudio.com with "Data Deletion Request"</li>
                    <li><strong>Timeline:</strong> AiForm will respond within 20 business days</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">7.4 Restrict Processing</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                    <li><strong>What:</strong> Request that AiForm restrict how your data is used</li>
                    <li><strong>Example:</strong> Stop receiving marketing communications, restrict analytics</li>
                    <li><strong>How:</strong> Email privacy@aiformstudio.com with specific restrictions</li>
                    <li><strong>Timeline:</strong> Implemented within 10 business days</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">7.5 Object to Processing</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                    <li><strong>What:</strong> Object to processing on grounds of legitimate interest</li>
                    <li><strong>Example:</strong> Object to marketing, analytics, or fraud detection on your data</li>
                    <li><strong>How:</strong> Email privacy@aiformstudio.com stating your objection</li>
                    <li><strong>Timeline:</strong> AiForm will review and respond within 20 business days</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">7.6 Data Portability</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                    <li><strong>What:</strong> Request your data in a portable, machine-readable format</li>
                    <li><strong>Scope:</strong> Information you provided directly (not derived data like SmartScore)</li>
                    <li><strong>How:</strong> Email privacy@aiformstudio.com with "Data Portability Request"</li>
                    <li><strong>Timeline:</strong> Within 20 business days</li>
                    <li><strong>Format:</strong> CSV, JSON, or other standard format</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">7.7 Complain to the Information Regulator</h3>
                  <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                    <li><strong>If:</strong> You believe AiForm has violated your rights</li>
                    <li><strong>Contact:</strong> Information Regulator (South Africa)
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Website: <Link href="https://www.justice.gov.za/inforeg/" className="text-accent hover:underline">https://www.justice.gov.za/inforeg/</Link></li>
                        <li>Email: complaints.ir@justice.gov.za</li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">8. Data Protection Measures</h2>

              <h3 className="text-lg font-semibold mb-3">8.1 Security Standards</h3>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li><strong>Encryption in Transit:</strong> HTTPS/TLS for all data in motion</li>
                <li><strong>Encryption at Rest:</strong> Sensitive data (passwords, banking details) encrypted in database</li>
                <li><strong>Access Control:</strong> Role-based access; staff can only access necessary information</li>
                <li><strong>Authentication:</strong> Multi-factor authentication available for high-security accounts</li>
                <li><strong>Regular Audits:</strong> Security assessments and penetration testing</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">8.2 Staff Training</h3>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li>All AiForm staff handling personal information receive data protection training</li>
                <li>Confidentiality agreements are signed by all staff</li>
                <li>Access logs are maintained</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">8.3 Vendor Management</h3>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li>All data processors have Data Processing Agreements in place</li>
                <li>Regular security assessments of third-party services</li>
                <li>Data is not processed outside of Europe/USA without explicit justification</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">8.4 Incident Response</h3>
              <ul className="list-disc list-inside space-y-1 text-content">
                <li><strong>Detection:</strong> AiForm monitors for unauthorised access or breaches</li>
                <li><strong>Notification:</strong> If a breach is detected, affected users will be notified within 3 business days</li>
                <li><strong>Reporting:</strong> Serious breaches will be reported to the Information Regulator</li>
                <li><strong>Remediation:</strong> AiForm will take steps to prevent recurrence</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">9. Special Categories of Data</h2>

              <h3 className="text-lg font-semibold mb-3">9.1 Sensitive Information (POPIA Section 14)</h3>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Director Identification Information</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Director name, ID number, date of birth</strong></li>
                  <li><strong>Used for:</strong> Verification and fraud prevention</li>
                  <li><strong>Protection:</strong> Stored encrypted; shared only with verification services</li>
                  <li><strong>Right:</strong> You can request suppression of director ID numbers from public profile</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Banking Details</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Account holder name, number, branch code</strong></li>
                  <li><strong>Used for:</strong> Payment processing and fraud detection</li>
                  <li><strong>Protection:</strong> Never stored in plain text; PCI-DSS compliant payment processing</li>
                  <li><strong>Right:</strong> Bank details are NEVER publicly visible</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Health/Safety Information (if applicable)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Worker compensation claims, health certificates</strong></li>
                  <li><strong>Used for:</strong> Compliance verification</li>
                  <li><strong>Protection:</strong> Encrypted; shared only with verification services</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-content mb-2">Criminal History (if applicable, e.g., in compliance documents)</h4>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Used for:</strong> Regulatory compliance</li>
                  <li><strong>Protection:</strong> Accessed only by authorised staff</li>
                  <li><strong>Right:</strong> Can request suppression from public view</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4 mb-6">
                <p className="text-content font-semibold mb-2">Lawful Basis for Processing Sensitive Data</p>
                <ul className="list-disc list-inside space-y-1 text-secondary text-sm">
                  <li><strong>Necessity:</strong> Required for performance of contract or compliance</li>
                  <li><strong>Legitimate Interests:</strong> Fraud prevention, security</li>
                  <li><strong>Explicit Consent:</strong> Where you have explicitly consented</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">10. Children's Privacy</h2>
              <p className="text-content mb-4">
                AiForm Procure is intended for users aged 18 and older. We do not knowingly collect information from children under 13.
              </p>
              <p className="text-content mb-4 italic">
                If we become aware that a child has provided personal information, we will delete the information promptly. Parents/guardians can contact <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link>.
              </p>
              <p className="text-content">
                For users 13–17, parental/guardian consent is required for account creation, with limited data sharing and additional protections applied.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">11. Cross-Border Data Transfers</h2>

              <h3 className="text-lg font-semibold mb-3">11.1 Where Your Data Is Processed</h3>
              <div className="space-y-3 mb-6">
                <div>
                  <h4 className="font-semibold text-content">South Africa (Primary)</h4>
                  <p className="text-secondary text-sm">AiForm operational data and accounts</p>
                </div>
                <div>
                  <h4 className="font-semibold text-content">European Union (EU)</h4>
                  <p className="text-secondary text-sm">Supabase database hosting (Ireland); GDPR adequacy applies</p>
                </div>
                <div>
                  <h4 className="font-semibold text-content">United States (USA)</h4>
                  <p className="text-secondary text-sm">OpenAI (AI processing), Google Analytics, Resend (email), Payment processors (TBD)</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-3">11.2 Lawful Basis for Transfers</h3>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li><strong>EU Adequacy Decision:</strong> EU data is protected under adequacy decision standards</li>
                <li><strong>Standard Contractual Clauses (SCC):</strong> USA-based processors are bound by SCCs; Data Processing Agreements include transfer safeguards</li>
                <li><strong>Necessity:</strong> Transfers are necessary for service delivery; No practical alternative with equivalent security</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">11.3 Your Rights Regarding Transfers</h3>
              <ul className="list-disc list-inside space-y-1 text-content">
                <li>You can request that data be processed only in South Africa (may limit functionality)</li>
                <li>You can object to transfers to specific jurisdictions</li>
                <li>Contact <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link> for options</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">12. Challenging Information & Corrections</h2>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">12.1 If You Believe Information Is Inaccurate</h3>

                <div className="mb-4">
                  <h4 className="font-semibold text-content mb-2">Supplier Verification Dispute</h4>
                  <p className="text-secondary text-sm mb-2">If AiForm's verification of your document is incorrect, email privacy@aiformstudio.com with: your profile, document reference, what is inaccurate, evidence of correct information. AiForm will review within 10 business days and correct if warranted.</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-content mb-2">SmartScore Dispute</h4>
                  <p className="text-secondary text-sm mb-2">If you believe your SmartScore is based on inaccurate information, request a review via your dashboard or email privacy@aiformstudio.com. AiForm will recalculate based on corrected data.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-content mb-2">Compliance Information Dispute</h4>
                  <p className="text-secondary text-sm">If government verification data (SARS, CIPC, etc.) is shown incorrectly on your profile, AiForm can request live re-verification from authorities. Email privacy@aiformstudio.com to request re-verification.</p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">13. Marketing Communications</h2>

              <h3 className="text-lg font-semibold mb-3">13.1 What We Send</h3>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li>Platform updates and service announcements (transactional — not optional)</li>
                <li>New features and maintenance notifications</li>
                <li>Opportunity matches (if you opt in)</li>
                <li>Procurement tips and industry insights (if you opt in)</li>
                <li>Surveys and feedback requests (if you opt in)</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">13.2 Opt-Out</h3>
              <div className="mb-6">
                <p className="text-content font-semibold mb-2">How to Unsubscribe:</p>
                <ol className="list-decimal list-inside space-y-1 text-content">
                  <li>Click "Unsubscribe" link in any marketing email</li>
                  <li>Go to Account Settings → Communication Preferences</li>
                  <li>Email <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link></li>
                </ol>
              </div>

              <p className="text-content mb-3 font-semibold">What You Can't Unsubscribe From:</p>
              <ul className="list-disc list-inside space-y-1 text-content">
                <li>Transactional emails (order confirmations, password resets, legal notices)</li>
                <li>Security alerts and fraud notifications</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">14. Policy Updates</h2>

              <h3 className="text-lg font-semibold mb-3">14.1 Changes to This Policy</h3>
              <ul className="list-disc list-inside space-y-1 text-content mb-6">
                <li>AiForm may update this policy from time to time</li>
                <li>Significant changes will be notified via email or platform announcement</li>
                <li>Continued use of AiForm after changes constitutes acceptance</li>
                <li>Material adverse changes will provide at least 30 days' notice</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">14.2 Version History</h3>
              <table className="w-full border-collapse border border-secondary mb-6">
                <thead>
                  <tr className="bg-panel">
                    <th className="border border-secondary p-2 text-left">Date</th>
                    <th className="border border-secondary p-2 text-left">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-secondary p-2">1 Nov 2026</td>
                    <td className="border border-secondary p-2">Initial production version</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mt-8 mb-4">15. Contact Us</h2>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-content mb-2">Questions About This Policy</h3>
                  <p className="text-secondary text-sm"><strong>Email:</strong> <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link></p>
                  <p className="text-secondary text-sm"><strong>Subject:</strong> "Privacy Policy Question"</p>
                </div>

                <div>
                  <h3 className="font-semibold text-content mb-2">Data Subject Access Requests</h3>
                  <p className="text-secondary text-sm"><strong>Email:</strong> <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link></p>
                  <p className="text-secondary text-sm"><strong>Subject:</strong> "Data Access Request" or "Data Deletion Request" or "Data Portability Request"</p>
                </div>

                <div>
                  <h3 className="font-semibold text-content mb-2">Report a Privacy Breach</h3>
                  <p className="text-secondary text-sm"><strong>Email:</strong> <Link href="mailto:privacy@aiformstudio.com" className="text-accent hover:underline">privacy@aiformstudio.com</Link></p>
                  <p className="text-secondary text-sm"><strong>Subject:</strong> "Security Incident Report"</p>
                  <p className="text-secondary text-sm"><strong>Response Time:</strong> Within 3 business days</p>
                </div>

                <div>
                  <h3 className="font-semibold text-content mb-2">Information Regulator (SA)</h3>
                  <p className="text-secondary text-sm">If you have concerns that cannot be resolved through AiForm:</p>
                  <ul className="list-disc list-inside space-y-1 text-secondary text-sm mt-2">
                    <li><strong>Website:</strong> <Link href="https://www.justice.gov.za/inforeg/" className="text-accent hover:underline">https://www.justice.gov.za/inforeg/</Link></li>
                    <li><strong>Email:</strong> complaints.ir@justice.gov.za</li>
                    <li><strong>Phone:</strong> +27 10 023 5400</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12 pt-8 border-t border-secondary">
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
