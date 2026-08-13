export type ComplianceGuideSection = {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
  table?: { headers: string[]; rows: string[][] }
}

export type ComplianceGuide = {
  slug: string
  eyebrow: string
  title: string
  description: string
  summary: string
  distinction?: string
  sections: ComplianceGuideSection[]
  sources: { label: string; href: string }[]
}

export const complianceGuides: ComplianceGuide[] = [
  {
    slug: "csd",
    eyebrow: "Supplier registration",
    title: "CSD registration and status maintenance",
    description: "Learn how to register on South Africa's Central Supplier Database, complete supplier information, obtain a registration report, and keep your record current.",
    summary: "The Central Supplier Database is the South African government's single source of key supplier information. Suppliers self-register and maintain the information that organs of state use during procurement.",
    sections: [
      {
        heading: "Before you register",
        bullets: [
          "Have a valid email address and cellphone number available for account activation and one-time PINs.",
          "Gather company or supplier identification, contact, address, tax, banking, director or member, commodity, and relevant accreditation information.",
          "Use accurate commodity and delivery-location information so procurement officials can find the supplier for relevant requests.",
        ],
      },
      {
        heading: "Complete and submit the supplier record",
        bullets: [
          "Create and activate a CSD user account, then verify access with the requested OTP.",
          "Add the supplier and complete every applicable information section.",
          "Review the Overview tab for outstanding information and submit the completed record.",
          "Keep the supplier number and unique registration reference number issued after successful registration.",
        ],
      },
      {
        heading: "Maintain your CSD status",
        paragraphs: ["Update supplier details whenever company, contact, tax, banking, ownership, commodity, or accreditation information changes. Generate a current registration report from the CSD when a buyer or tender requires one."],
      },
    ],
    sources: [
      { label: "CSD: official registration process", href: "https://secure.csd.gov.za/Account/_RegistrationProcess" },
      { label: "Office of the Chief Procurement Officer: Central Supplier Database", href: "https://ocpo.treasury.gov.za/Suppliers_Area/Central%20Supplier%20Database/default.aspx" },
    ],
  },
  {
    slug: "pppfa",
    eyebrow: "Tender evaluation",
    title: "PPPFA preference-point scoring",
    description: "Understand South Africa's 80/20 and 90/10 tender scoring systems, specific goals, and why B-BBEE levels do not automatically determine preference points.",
    summary: "The PPPFA and Preferential Procurement Regulations govern how public tenders are scored. Under the 2022 Regulations, price is combined with measurable specific goals defined in each tender invitation.",
    distinction: "A B-BBEE status level does not automatically produce PPPFA preference points. The buyer must define the specific goals and their evidence in that tender. Applying the repealed B-BBEE lookup table is a compliance error and may result in an irregular tender or irregular expenditure.",
    sections: [
      {
        heading: "The two scoring systems",
        bullets: [
          "For contracts worth R50 million or less, the 80/20 system allocates 80 points to price and 20 points to specific goals.",
          "For contracts above R50 million, the 90/10 system allocates 90 points to price and 10 points to specific goals.",
          "The lowest acceptable price receives the maximum price points. Higher acceptable prices receive fewer points using the prescribed formula.",
        ],
      },
      {
        heading: "What specific goals mean",
        paragraphs: ["The organ of state must state its goals in the tender invitation. Those goals must be measurable and quantifiable."],
        bullets: [
          "Contracting with people historically disadvantaged by unfair discrimination on the basis of race, gender or disability.",
          "Implementing Reconstruction and Development Programme goals, such as job creation or support for a defined geographic area or local industry.",
        ],
      },
      {
        heading: "What suppliers should check",
        bullets: [
          "Read the specific-goals section of every tender instead of assuming the evidence or points will be the same across buyers.",
          "Submit exactly the proof requested for each goal.",
          "Do not calculate your preference points from your B-BBEE level alone.",
        ],
      },
    ],
    sources: [
      { label: "Preferential Procurement Policy Framework Act 5 of 2000", href: "https://www.gov.za/documents/preferential-procurement-policy-framework-act" },
      { label: "OCPO Implementation Guide: Preferential Procurement Regulations 2022", href: "https://ocpo.treasury.gov.za/Legislation/guidelines/IMPLEMENTATION%20GUIDE%20PPR%202022%20-%20MARCH%202023%20VERSION%201.pdf" },
    ],
  },
  {
    slug: "bbbee",
    eyebrow: "Transformation compliance",
    title: "B-BBEE Codes of Good Practice",
    description: "A plain-English guide to B-BBEE scorecard elements, EME and QSE categories, and the distinction between B-BBEE status and PPPFA tender points.",
    summary: "The B-BBEE Codes provide a framework for measuring broad-based black economic empowerment. They are a transformation measurement system, distinct from the PPPFA rules used to score a public tender.",
    distinction: "B-BBEE and PPPFA are separate systems. A tender may accept B-BBEE evidence as proof of a stated specific goal, such as black ownership, but your B-BBEE level is not automatically converted into PPPFA preference points under the 2022 Regulations.",
    sections: [
      {
        heading: "What the Codes measure",
        bullets: [
          "Ownership",
          "Management Control",
          "Skills Development",
          "Enterprise and Supplier Development",
          "Socio-Economic Development",
        ],
      },
      {
        heading: "Supplier categories",
        bullets: [
          "Exempted Micro Enterprises (EMEs) are generally businesses below the applicable annual-turnover threshold, commonly R10 million under the generic Codes. They ordinarily receive Level 4 status, Level 2 when at least 51% black-owned, or Level 1 when 100% black-owned.",
          "Qualifying Small Enterprises (QSEs) are mid-sized businesses measured under the applicable QSE rules. Sector-specific Codes can use different thresholds or requirements, so check which Code applies to your business.",
          "Eligible EMEs and certain black-owned QSEs can generally use a sworn affidavit instead of purchasing a full verification certificate.",
        ],
      },
      {
        heading: "What suppliers should keep current",
        paragraphs: ["Keep the affidavit or certificate that applies to your business current and make sure its ownership information agrees with your company records. Always follow the evidence requirements in the particular tender."],
      },
    ],
    sources: [
      { label: "dtic: Broad-Based Black Economic Empowerment", href: "https://www.thedtic.gov.za/financial-and-non-financial-support/b-bbee/broad-based-black-economic-empowerment/" },
      { label: "South African Government: B-BBEE Codes of Good Practice", href: "https://www.gov.za/xh/documents/notices/broad-based-black-economic-empowerment-act-codes-good-practice-09-feb-2007" },
    ],
  },
  {
    slug: "cidb-grading",
    eyebrow: "Construction procurement",
    title: "CIDB contractor grading",
    description: "Learn how CIDB grades are determined, the verified tender value limit for grades 2 to 9, and how annual updates and renewals work.",
    summary: "Public-sector construction contractors must be registered with the Construction Industry Development Board. A grade records the class and value of construction work for which a contractor is eligible.",
    sections: [
      {
        heading: "How grading is determined",
        bullets: [
          "Works capability considers relevant construction work or track record, including projects completed in the class of works during the previous five years.",
          "Financial capability considers turnover and available capital, including qualifying equity, retained income or financial sponsorship.",
          "Grade 1 has no qualifying criteria. Grades 2 to 9 require supporting evidence.",
        ],
      },
      {
        heading: "Tender value limits",
        table: {
          headers: ["CIDB grade", "Maximum tender value"],
          rows: [
            ["2", "R1,000,000"], ["3", "R3,000,000"], ["4", "R6,000,000"], ["5", "R10,000,000"],
            ["6", "R20,000,000"], ["7", "R60,000,000"], ["8", "R200,000,000"], ["9", "No limit"],
          ],
        },
      },
      {
        heading: "Updates and renewal",
        paragraphs: ["A CIDB grade is valid for three years. During that period, grades must be updated and the applicable fee paid annually. After three years, the contractor must apply for renewal."],
      },
    ],
    sources: [
      { label: "CIDB: Overview of the Register of Contractors", href: "https://www.cidb.org.za/contractors/register-of-contractors/overview/" },
      { label: "CIDB: Requirements for grading", href: "https://www.cidb.org.za/contractors/register-of-contractors/requirements-for-grading/" },
    ],
  },
  {
    slug: "coida-uif",
    eyebrow: "Employer compliance",
    title: "COIDA good standing and UIF registration",
    description: "Understand Compensation Fund Letters of Good Standing, UIF employer registration, and the UI-8 and UI-19 information requirements.",
    summary: "COIDA and UIF are separate employer obligations administered through the Department of Employment and Labour. Both become relevant when a business employs people.",
    sections: [
      {
        heading: "COIDA Letter of Good Standing",
        paragraphs: ["A Letter of Good Standing is issued by the Compensation Fund and confirms that an employer's account is in good standing under COIDA."],
        bullets: [
          "The employer must be registered with the Compensation Fund.",
          "Returns of Earnings and assessment payments must be up to date.",
          "Eligible registered employers can generate the letter using the Department's online Compensation Fund services.",
          "Buyers can validate a letter using its certificate number and should check its validity period.",
        ],
      },
      {
        heading: "UIF employer registration",
        paragraphs: ["Employers must register with the Unemployment Insurance Fund so that required contributions can support qualifying workers during unemployment or other covered periods."],
        bullets: [
          "Business employers register using form UI-8, through a UIF branch or an available online registration channel such as uFiling.",
          "A completed UI-19 containing employee information must accompany UI-8, unless the employer clearly indicates that employee information will be submitted electronically.",
        ],
      },
    ],
    sources: [
      { label: "Compensation Fund: employer obligations", href: "https://www.labour.gov.za/DocumentCenter/Pages/Compensation-Fund--obligations-of-the-employer-.aspx" },
      { label: "Compensation Fund: generating a Letter of Good Standing", href: "https://www.labour.gov.za/DocumentCenter/Publications/Compensation%20for%20Occupational%20Injuries%20and%20Diseases/Letter%20of%20good%20standing.pdf" },
      { label: "Department of Employment and Labour: How to register with UIF", href: "https://www.labour.gov.za/DocumentCenter/Pages/UIF_How_ToRegister-with-the-UIF.aspx" },
      { label: "Official UI-8 employer registration form", href: "https://www.labour.gov.za/DocumentCenter/Forms/Unemployment%20Insurance%20Fund/UI-8_application-for-registration-as-an-employer.pdf" },
    ],
  },
  {
    slug: "tax-compliance-status",
    eyebrow: "SARS compliance",
    title: "SARS Tax Compliance Status and TCS PINs",
    description: "Learn how to view My Compliance Profile, request a SARS TCS PIN, share it with a government buyer, and remedy non-compliance.",
    summary: "SARS's Tax Compliance Status system lets a taxpayer view its current compliance position and authorise a third party to verify that position using a TCS PIN.",
    sections: [
      {
        heading: "My Compliance Profile",
        paragraphs: ["My Compliance Profile on eFiling displays the taxpayer's electronic compliance position across registered tax types, such as Income Tax, VAT and PAYE."],
      },
      {
        heading: "Requesting and sharing a PIN",
        bullets: [
          "Activate the Tax Compliance Status service on eFiling and review My Compliance Profile.",
          "Submit a Tax Compliance Status request for Good Standing.",
          "Once approved, SARS issues a PIN that can be shared with the buyer.",
          "The PIN lets the authorised third party see the taxpayer's current overall status at the time of verification; it is not merely a snapshot from the PIN issue date.",
        ],
      },
      {
        heading: "Remedying non-compliance",
        paragraphs: ["My Compliance Profile identifies non-compliance such as outstanding returns or debt and provides guidance on the next action. Resolve the underlying item through the available SARS process, then recheck the live status."],
      },
    ],
    sources: [
      { label: "SARS: Guide to Tax Compliance Status on eFiling", href: "https://www.sars.gov.za/guide-to-the-tax-compliance-status-functionality-on-efiling/" },
      { label: "SARS: How to request your Tax Compliance Status", href: "https://www.sars.gov.za/individuals/manage-your-tax-compliance-status/how-to-request-your-tax-compliance-status/" },
    ],
  },
]

export function getComplianceGuide(slug: string) {
  return complianceGuides.find((guide) => guide.slug === slug)
}
