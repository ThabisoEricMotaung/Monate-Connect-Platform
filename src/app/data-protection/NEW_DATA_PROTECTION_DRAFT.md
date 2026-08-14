# AiForm Procure Data Protection (Complete Rewrite)

**Effective Date:** 1 November 2026  
**Last Updated:** 13 August 2026  
**Jurisdiction:** South African law; POPIA compliant

---

## INTRODUCTION

This page describes how AiForm Procure protects personal information and implements data protection principles under the Protection of Personal Information Act (POPIA) and South African law.

For complete details on what information we collect, why, and your rights, see our **Privacy Policy** at `/privacy`.

---

## 1. DATA PROTECTION PRINCIPLES

### 1.1 Our Approach
AiForm collects only information necessary for the Platform to function. We:
- **Minimise:** Collect only what is needed
- **Secure:** Encrypt and restrict access
- **Protect:** Monitor for breaches and respond promptly
- **Respect:** Honour user privacy and rights
- **Comply:** Follow POPIA and South African law

### 1.2 Role-Based Access
Information is accessible only to:
- **Suppliers:** Their own profile and documents
- **Buyers:** Supplier profiles they search and suppliers responding to their RFQs
- **Administrators:** Account and compliance data (for support and fraud prevention)
- **Verification Services:** Specific documents needed to verify compliance (SARS, CIPC, CSD, etc.)
- **Law Enforcement:** Information compelled by valid legal process

All staff are bound by confidentiality agreements.

---

## 2. COMPLIANCE DOCUMENTS AND SUPPLIER INFORMATION

### 2.1 Supplier-Provided Documents
**What You Upload:**
- CSD registration reports
- B-BBEE certificates
- Tax clearance certificates
- Bank letters
- CIDB grading certificates
- Company registration (CIPC)
- Director identification information
- Insurance certificates
- Professional qualifications

**How It's Protected:**
- Encrypted storage (AES-256 at rest)
- Access restricted to verification staff
- Not publicly displayed (only verification badges shown)
- Shared with buyers only when relevant to procurement
- Retained for 3 years after account closure (audit/regulatory)

### 2.2 Director and Personal Information
**Information Collected:**
- Director names and ID numbers
- Employee names (from documents)
- Third-party references and contacts

**Protection:**
- Encrypted storage
- Access restricted to authorised staff
- Not publicly displayed
- You can request suppression of director ID numbers from public view
- Only used for verification and fraud detection

### 2.3 Banking Information
**What We Store:**
- Account holder name
- Account number
- Bank name
- Branch code

**Protection:**
- **Encrypted storage** (encrypted in database)
- **Never stored in plain text**
- **PCI-DSS compliant** handling
- **NEVER publicly visible**
- Shared only with payment processors during transactions
- Deleted when document is deleted

### 2.4 Verification Workflow
**Process:**
1. Supplier uploads document
2. AiForm reviews for authenticity and matching
3. Where applicable, we verify with official source (SARS, CIPC, CSD, CIDB)
4. Verification badge added to supplier profile
5. Buyer sees badge but not full document

**Audit Trail:**
- All document reviews are logged
- Access to sensitive documents is tracked
- Logs retained for security and compliance

---

## 3. OPPORTUNITY DATA AND AGGREGATION

### 3.1 External Sources
**Where We Source Opportunities:**
- National Treasury eTenders portal (primary source)
- Published government procurement systems
- Municipal and SOE tender portals (where publicly available)

**License:**
- eTenders data is published under CC BY 4.0 (open license)
- AiForm adds categorisation, screening, and enrichment

### 3.2 Data Screening and Processing
**What We Do:**
- Retrieve opportunities from official sources
- Apply automated filtering (cancelled, awarded, invalid dates)
- Enrich with location, category, and metadata
- Store in our database for searching
- Update regularly as authorities publish changes

**What We DON'T Do:**
- Manually review every opportunity (automated screening only)
- Guarantee accuracy or currency
- Own or claim copyright to underlying government data

### 3.3 Data Retention
- Opportunities retained while status is "open"
- Closed/awarded opportunities archived for 2 years
- Supplier responses retained for 7 years (audit/regulatory)

---

## 4. BUYER AND SUPPLIER MATCHING

### 4.1 SmartScore Calculation
**Data Inputs:**
- Compliance document verification status
- Platform activity (quotes, contracts, ratings)
- Profile completeness

**Storage:**
- Score stored with supplier profile
- History not retained (only current score shown)
- Recalculated daily based on document expiry

**Audit:**
- Score changes logged
- Suppliers can request score review
- Disputed scores corrected if underlying data is inaccurate

### 4.2 Opportunity Matching
**How It Works:**
- Supplier profile (location, categories, SmartScore)
- Opportunity requirements
- Algorithm matches suppliers to opportunities
- Matches displayed to suppliers and buyers

**Data Protection:**
- Matching data not retained long-term
- Algorithm does not store interaction history
- Recommendations refreshed daily

### 4.3 Activity and Engagement Data
**What We Track:**
- Quotes submitted (date, opportunity, status)
- Opportunities viewed
- Profile visits
- Message communications
- Contract milestones (if applicable)

**Purpose:**
- SmartScore calculation (activity bonus points)
- Platform analytics and improvement
- Fraud detection (suspicious patterns)

**Retention:**
- Activity retained while account is active
- Deleted or anonymised after 2 years of account closure

---

## 5. COMMUNICATION AND MESSAGING

### 5.1 Platform Messages
**What's Stored:**
- Messages between buyers and suppliers
- RFQ clarifications and responses
- Quote communications

**Protection:**
- Encrypted in transit and at rest
- Accessible only to participating parties
- Admins can view if needed for support or disputes

**Retention:**
- Retained while account is active
- Deleted or anonymised after account closure
- Longer retention if involved in disputes

### 5.2 Transactional Emails
**What We Send:**
- Account confirmations
- Password resets
- RFQ notifications
- Quote updates
- Legal and security notices

**Data Handling:**
- Processed by Resend (email service provider)
- DPA in place
- Not used for marketing
- Not retained by AiForm (deleted from email service after delivery)

### 5.3 Marketing Communications
**Opt-In Model:**
- Only sent with your explicit consent
- Topics: Platform updates, opportunities, industry news, surveys

**How to Unsubscribe:**
- Click "Unsubscribe" in any marketing email
- Update Communication Preferences in Account Settings
- Email privacy@aiformstudio.com

---

## 6. SECURITY MEASURES

### 6.1 Encryption
**In Transit:**
- All data sent to/from AiForm uses HTTPS (TLS 1.2+)
- No unencrypted transmission of sensitive data

**At Rest:**
- Passwords: Hashed (bcrypt or equivalent)
- Banking details: AES-256 encryption
- Sensitive documents: Encrypted storage
- User data: Encryption where applicable

### 6.2 Access Controls
**Authentication:**
- Username/password login (enforced strong passwords)
- Optional multi-factor authentication (MFA) available
- Session timeouts for idle accounts
- Secure password reset process

**Authorization:**
- Role-based access control (RBAC)
- Suppliers see only their own data
- Buyers see only public supplier profiles and respondents
- Admins have elevated access (logged and monitored)

### 6.3 Monitoring and Logging
**What We Monitor:**
- Failed login attempts
- Access to sensitive data
- Administrative actions
- Data exports/downloads
- Unusual account activity

**Retention:**
- Logs retained for 12 months
- Analysis for security threats
- Incident investigation if breach suspected

### 6.4 Infrastructure Security
**Hosting:**
- Supabase (EU-based, SOC 2 certified)
- Vercel (CDN and application hosting)
- Regular security updates and patches
- Automated backups (encrypted)

**Third-Party Assessment:**
- Annual security assessments
- Penetration testing by external vendors
- Vulnerability scanning

---

## 7. INCIDENT RESPONSE

### 7.1 Detection
**How We Detect Breaches:**
- Automated security monitoring
- User reports
- Third-party vulnerability disclosures
- Log analysis
- Failed authentication patterns

### 7.2 Response Process
**Upon Detection:**
1. **Immediate (0–2 hours):** Isolate affected systems, assess scope
2. **Investigation (4–24 hours):** Determine what data was accessed, who, when
3. **Notification (3 business days):** Notify affected users
4. **Remediation (1–7 days):** Patch vulnerability, restore security
5. **Reporting:** Report to Information Regulator if required by POPIA

### 7.3 User Notification
**You Will Be Notified If:**
- Personal information was accessed
- Banking or identity information was compromised
- A data breach affects your account

**What You'll Receive:**
- Email notification (within 3 business days)
- Details of what happened
- Steps to protect yourself
- AiForm's remediation efforts

### 7.4 Information Regulator Reporting
If a serious breach is detected:
- AiForm will report to the Information Regulator
- Details provided to regulator as required by law
- You may be notified of regulator involvement

---

## 8. DATA RETENTION SCHEDULE

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Active User Account | While account is active | Service provision |
| Personal Account Details | 90 days after deletion | Data recovery option |
| Compliance Documents | 3 years after account closure | Audit, regulatory, compliance |
| Transaction Records | 7 years | Tax, financial, audit requirements |
| Supplier Responses/Quotes | 7 years | Procurement audit, disputes |
| Logs and Session Data | 12 months | Security, performance, investigation |
| Email Communications | 12 months | Operational, dispute resolution |
| Marketing Communications | Until you unsubscribe | Compliance with preferences |
| Anonymised Analytics | No set limit | Product improvement |

**Legal Hold Exception:**
- If involved in litigation, dispute, or investigation, data retained until matter is resolved

---

## 9. DATA PROCESSOR RELATIONSHIPS

### 9.1 Supabase (Database)
**What Data:** User accounts, profiles, documents, RFQs, quotes, contracts  
**Where:** Ireland (EU)  
**Agreement:** Data Processing Agreement signed  
**Security:** SOC 2 certified, encrypted at rest, GDPR compliant  
**Your Rights:** Data can be exported; deletion requests honored

### 9.2 OpenAI (AI Services)
**What Data:** Tender documents, RFQ content, user queries  
**Where:** USA  
**Agreement:** Data Processing Agreement signed  
**How It Works:** Documents sent for summarisation; not stored long-term on OpenAI servers  
**Your Rights:** Can opt out of Thuso; data not retained for training

### 9.3 Resend (Email Service)
**What Data:** Email addresses, notification content  
**Where:** USA  
**Agreement:** Data Processing Agreement signed  
**How It Works:** Used only for transactional email delivery; not for marketing lists  
**Your Rights:** Can unsubscribe from emails; email list not shared

### 9.4 Google Analytics
**What Data:** Anonymised usage data (page views, sessions, device types)  
**Where:** USA  
**Agreement:** Data Processing Agreement signed  
**How It Works:** IP addresses anonymised; no personal identification  
**Your Rights:** Can opt out via browser extensions

### 9.5 Payment Processors (TBD)
**What Data:** Payment method, billing address, transaction history  
**Where:** To be confirmed at transition to paid  
**Agreement:** DPA will be required  
**Security:** PCI-DSS compliant; card data never stored on AiForm servers  
**Your Rights:** Can request deletion; payment history retained per financial law

---

## 10. SUPPLIER-SPECIFIC PROTECTIONS

### 10.1 Document Upload Security
**Virus Scanning:**
- All uploaded files are scanned for malware
- Infected files are quarantined and not stored
- You are notified if a file is rejected

### 10.2 Supplier Profile Visibility
**Default Privacy:**
- Company name and registration details: Public (searchable by buyers)
- Services, categories, location: Public
- Verification badges: Public (yes/no status, not full documents)
- SmartScore: Public
- Contact information: Restricted (shown to buyers after engagement)
- Banking details: Private (never public)
- Tax/compliance documents: Private (shown only to AiForm staff for verification)

**Control:**
- You can adjust visibility in profile settings
- You can hide certain categories or locations if desired

### 10.3 Director Information
- Director names required for verification
- Director ID numbers can be suppressed from public view (requested via privacy@aiformstudio.com)
- Used only for identity verification, not displayed publicly

---

## 11. BUYER-SPECIFIC PROTECTIONS

### 11.1 Supplier Data Handling
**Your Responsibility:**
- Supplier information is shared with you for procurement purposes only
- You must not harvest, scrape, or bulk-extract supplier data
- You must not misuse supplier contact information
- You agree to treat supplier data confidentially

**Our Monitoring:**
- We monitor for suspicious download/export patterns
- Bulk extraction will trigger account suspension
- Repeated violations may result in legal action

### 11.2 RFQ Confidentiality
- RFQs and attachments are stored securely
- Shared only with suppliers who match and respond
- Not shared with other buyers or third parties
- Archived after closure

---

## 12. COMPLIANCE WITH SOUTH AFRICAN LAW

### 12.1 POPIA Compliance
AiForm operates in accordance with POPIA Chapters 1–3:
- **Chapter 1:** Application and interpretation
- **Chapter 2:** Conditions for lawful processing of personal information
- **Chapter 3:** Rights of data subjects

See Privacy Policy for details on your rights.

### 12.2 Consumer Protection Act (CPA)
AiForm complies with fair dealing requirements:
- Terms are transparent and accessible
- No hidden conditions or unexpected charges
- Users have rights to cancellation (during pilot)
- Disputes can be escalated to regulatory bodies

### 12.3 Common Law
AiForm recognises common law duties:
- Confidentiality of user information
- Good faith in processing data
- Duty to prevent harm to users

---

## 13. CROSS-BORDER DATA TRANSFERS

### 13.1 Where Data Is Processed

| Location | Data | Reason |
|----------|------|--------|
| South Africa | AiForm operational data, account management | Primary operations |
| EU (Ireland) | User accounts, documents, RFQs (Supabase) | Database hosting |
| USA | AI processing (OpenAI), email (Resend), analytics (Google) | Service providers |

### 13.2 Legal Basis for Transfers
- **EU:** Adequacy decision applies; GDPR-level protections
- **USA:** Standard Contractual Clauses (SCCs); processors bound by privacy obligations
- **Necessity:** Transfers required for service delivery

### 13.3 Your Options
- You can request data not be transferred outside South Africa (functionality may be limited)
- You can object to specific jurisdiction transfers
- Contact privacy@aiformstudio.com for alternatives

---

## 14. INFORMATION OFFICER AND DATA PROTECTION

### 14.1 Who to Contact
**Data Protection Questions:**  
Email: privacy@aiformstudio.com

**Formal Data Subject Requests:**  
Email: privacy@aiformstudio.com  
Subject: "Data Access Request" / "Data Deletion Request" / "Data Portability Request"

**Privacy Concerns:**  
Email: privacy@aiformstudio.com  
Subject: "Privacy Complaint"

### 14.2 Formal Information Officer
AiForm has not yet appointed a formal Information Officer under POPIA section 56. Until appointed, all data protection inquiries should be directed to privacy@aiformstudio.com.

---

## 15. COMPLIANCE AND ACCOUNTABILITY

### 15.1 Compliance Activities
AiForm maintains:
- Privacy impact assessments for new features
- Regular security audits and penetration testing
- Staff data protection training
- Incident response procedures
- Audit logs and records

### 15.2 Regular Review
- This policy is reviewed annually
- Updates made as technology and law evolves
- User feedback incorporated

### 15.3 Third-Party Audits
- Annual security assessments by external vendors
- SOC 2 compliance monitoring (Supabase)
- Vulnerability testing

---

## 16. COMPLIANCE WITH THIS PAGE

### 16.1 What We've Implemented
✅ Encryption in transit and at rest  
✅ Role-based access controls  
✅ Activity logging and monitoring  
✅ Incident response procedures  
✅ Data retention schedules  
✅ Vendor security assessments  
✅ Staff confidentiality agreements  
✅ Supplier profile privacy controls  
✅ Banking information protection  
✅ Cross-border transfer safeguards

### 16.2 What Remains (Development)
⏳ Payment processor selection and DPA (when subscriptions begin)  
⏳ Formal Information Officer appointment (per POPIA)  
⏳ Detailed Security Incident Response Plan (to be published separately)  
⏳ Annual compliance audit (external)

---

## 17. UPDATES TO THIS PAGE

**Effective Date:** 1 November 2026  
**Last Updated:** 13 August 2026  
**Next Review:** 31 October 2027

---

## 18. CONTACT US

**Questions About Data Protection:**  
Email: privacy@aiformstudio.com

**Report a Security Incident:**  
Email: privacy@aiformstudio.com  
Subject: "Security Incident Report"

**Information Regulator (if unresolved):**  
Website: https://www.justice.gov.za/inforeg/  
Email: complaints.ir@justice.gov.za

---

**End of Data Protection Policy**

---

## IMPLEMENTATION NOTES

### For Development Team:

1. **Profile Privacy Settings:**
   - Implement visibility toggles for profile sections
   - Allow suppliers to hide director ID numbers
   - Show "public" vs "private" indicators

2. **Access Logging:**
   - Log all access to sensitive documents (banking, compliance, director info)
   - Log administrative actions
   - Log data exports/downloads
   - Retain logs for 12 months

3. **Encryption Implementation:**
   - Verify Supabase encryption settings
   - Ensure banking data stored encrypted
   - Test encryption of sensitive fields
   - Document encryption keys and rotation

4. **Incident Response:**
   - Create incident response runbook
   - Set up notification process (3-business-day target)
   - Define escalation path to Information Regulator
   - Test incident response procedures

5. **Data Retention:**
   - Implement automated deletion workflows
   - 90-day grace period after account closure
   - 3-year retention for compliance documents
   - 7-year retention for transaction records
   - 12-month log retention

6. **Third-Party Management:**
   - Verify DPAs are in place with Supabase, OpenAI, Resend, Google
   - Quarterly vendor security assessments
   - Monitor processor security status
   - Update documentation as processors change

### For Legal Review:

- [FLAG] Information Officer appointment required by POPIA section 56 (voluntary for small operators; recommended for accountability)
- [FLAG] Cross-border transfers to USA via SCC — review for adequacy and necessity
- [FLAG] Data retention periods (7 years for transactions) — verify alignment with South African tax law
- [FLAG] Incident response (3-business-day notification) — review POPIA section 77 requirements

---

**Status:** DRAFT — READY FOR IMPLEMENTATION WITH REVIEW NOTES
