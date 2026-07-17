"use client"

import {
  IconAlertCircle,
  IconArticle,
  IconBolt,
  IconBook,
  IconBuildingStore,
  IconChartBar,
  IconChevronDown,
  IconClipboardCheck,
  IconFileAnalytics,
  IconFileCertificate,
  IconHelpCircle,
  IconIdBadge2,
  IconMessageCircleQuestion,
  IconRobot,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconUsers,
  IconWorld,
  type Icon,
} from "@tabler/icons-react"
import { useMemo, useRef, useState } from "react"

type GuideType = "user" | "admin"
type Language = "en" | "zu" | "af"
type Localized<T> = Record<Language, T>
type Faq = { question: string; answer: string }
type Guidance = { heading: string; body: string }
type HelpSection = {
  id: string
  guide: GuideType
  title: Localized<string>
  description: Localized<string>
  icon: Icon
  steps: Localized<string[]>
  guidance: Localized<Guidance[]>
  faqs: Localized<Faq[]>
  pdfHref: string
}

const userGuidePdf = "/help/user-guide.pdf"
const adminGuidePdf = "/help/admin-guide.pdf"
const helpSections: HelpSection[] = [
  {
    id: "getting-started",
    guide: "user",
    title: { en: "Getting Started", zu: "Ukuqala", af: "Aan die begin" },
    description: {
      en: "Registration, phone OTP verification, and choosing your role.",
      zu: "Ukubhalisa, ukuqinisekisa i-OTP yocingo, nokukhetha indima yakho.",
      af: "Registrasie, telefoon-OTP-verifikasie, en keuse van jou rol.",
    },
    icon: IconIdBadge2,
    steps: {
      en: [
        "Go to the AiForm Procure platform and click Sign Up.",
        "Enter your business email address and create a secure password with at least 8 characters, uppercase, lowercase, and a number.",
        "Select your role: Supplier to list your business, or Buyer to source suppliers.",
        "Enter your South African mobile number. A 6-digit OTP will be sent via SMS.",
        "Enter the OTP within 10 minutes to verify your account.",
        "Complete your business profile to activate your account fully.",
      ],
      zu: [
        "Iya ku-AiForm Procure bese uchofoza Bhalisa.",
        "Faka ikheli lakho le-imeyili lebhizinisi bese wenza iphasiwedi evikelekile.",
        "Khetha indima yakho: Umhlinzeki noma Umthenga.",
        "Faka inombolo yakho yaseNingizimu Afrika. Ikhodi ye-OTP enama-digits ayi-6 izothunyelwa nge-SMS.",
        "Faka i-OTP phakathi kwemizuzu eyi-10 ukuze uqinisekise i-akhawunti yakho.",
        "Gcwalisa iphrofayela yakho yebhizinisi ukuze uqalise i-akhawunti yakho ngokuphelele.",
      ],
      af: [
        "Gaan na AiForm Procure en klik Registreer.",
        "Voer jou besigheids-e-posadres in en skep 'n veilige wagwoord.",
        "Kies jou rol: Verskaffer of Koper.",
        "Voer jou Suid-Afrikaanse selfoonnommer in. 'n 6-syfer OTP sal per SMS gestuur word.",
        "Voer die OTP binne 10 minute in om jou rekening te verifieer.",
        "Voltooi jou besigheidsprofiel om jou rekening volledig te aktiveer.",
      ],
    },
    guidance: {
      en: [
        { heading: "Phone format", body: "Use the South African +27 format, for example +27821234567. OTP codes expire after 10 minutes and can be resent after the cooldown." },
        { heading: "Choosing a role", body: "Suppliers manage profiles, documents, RFQs, quotes, and awards. Buyers source suppliers, publish RFQs, and review procurement activity." },
      ],
      zu: [
        { heading: "Ifomethi yocingo", body: "Sebenzisa ifomethi yaseNingizimu Afrika ethi +27, isibonelo +27821234567. Amakhodi e-OTP aphelelwa yisikhathi ngemva kwemizuzu eyi-10 futhi angaphinde athunyelwe ngemva kwesikhathi sokulinda." },
        { heading: "Ukukhetha indima", body: "Abahlinzeki baphatha amaphrofayeli, amadokhumenti, ama-RFQ, ama-quote, nemiklomelo. Abathengi bafuna abahlinzeki, bashicilele ama-RFQ, futhi babuyekeze umsebenzi wokuthenga." },
      ],
      af: [
        { heading: "Telefoonformaat", body: "Gebruik die Suid-Afrikaanse +27-formaat, byvoorbeeld +27821234567. OTP-kodes verval na 10 minute en kan weer gestuur word na die afkoeltyd." },
        { heading: "Kies 'n rol", body: "Verskaffers bestuur profiele, dokumente, RFQ's, kwotasies, en toekennings. Kopers vind verskaffers, publiseer RFQ's, en hersien verkrygingsaktiwiteit." },
      ],
    },
    faqs: {
      en: [
        { question: "I didn't receive my OTP. What do I do?", answer: "Wait 60 seconds and click Resend code. Check that your number is in +27 format. If the issue persists, contact support." },
        { question: "Can I sign up with Google, Microsoft, or LinkedIn?", answer: "Yes. Click Continue with Google, Continue with Microsoft, or Continue with LinkedIn on the login page. Phone verification is not required for OAuth sign-ins." },
        { question: "I forgot my password. How do I reset it?", answer: "Click Forgot password on the login page. A reset link will be sent to your email." },
      ],
      zu: [
        { question: "Angiyitholanga i-OTP yami. Ngenzeni?", answer: "Linda imizuzwana engu-60 bese uchofoza Thumela ikhodi futhi. Hlola ukuthi inombolo yakho isefomethini ethi +27. Uma inkinga iqhubeka, xhumana ne-support." },
        { question: "Ngingabhalisa nge-Google, Microsoft, noma LinkedIn?", answer: "Yebo. Chofoza Continue with Google, Continue with Microsoft, noma Continue with LinkedIn ekhasini lokungena. Ukuqinisekiswa kocingo akudingeki uma ungena nge-OAuth." },
        { question: "Ngikhohlwe iphasiwedi yami. Ngiyisetha kanjani kabusha?", answer: "Chofoza Forgot password ekhasini lokungena. Isixhumanisi sokusetha kabusha sizothunyelwa ku-imeyili yakho." },
      ],
      af: [
        { question: "Ek het nie my OTP ontvang nie. Wat doen ek?", answer: "Wag 60 sekondes en klik Stuur kode weer. Maak seker jou nommer is in +27-formaat. Kontak ondersteuning as die probleem voortduur." },
        { question: "Kan ek met Google, Microsoft of LinkedIn registreer?", answer: "Ja. Klik Continue with Google, Continue with Microsoft of Continue with LinkedIn op die aanmeldblad. Telefoonverifikasie is nie nodig vir OAuth-aanmeldings nie." },
        { question: "Ek het my wagwoord vergeet. Hoe stel ek dit terug?", answer: "Klik Forgot password op die aanmeldblad. 'n Herstelskakel sal na jou e-pos gestuur word." },
      ],
    },
    pdfHref: userGuidePdf,
  },  {
    id: "profile",
    guide: "user",
    title: { en: "Your Profile", zu: "Iphrofayeli Yakho", af: "Jou Profiel" },
    description: {
      en: "Complete your business profile, company logo, and cover photo.",
      zu: "Gcwalisa iphrofayeli yakho yebhizinisi, ilogo yenkampani, nesithombe sesembozo.",
      af: "Voltooi jou besigheidsprofiel, maatskappylogo, en omslagfoto.",
    },
    icon: IconBuildingStore,
    steps: {
      en: ["Open Dashboard -> Business profile.", "Add your registered business name, industry, province, phone number, and website.", "Upload a company logo and cover photo for your public supplier profile.", "Save your changes and review the profile preview."],
      zu: ["Vula iDashboard -> Iphrofayeli yebhizinisi.", "Faka igama lakho lebhizinisi elisobhalisiwe, umkhakha, isifunda, inombolo yocingo, newebhusayithi.", "Layisha ilogo yenkampani nesithombe sesembozo sephrofayeli yakho yomhlinzeki womphakathi.", "Gcina izinguquko zakho bese ubuyekeza isibonelo sephrofayeli."],
      af: ["Maak Dashboard -> Besigheidsprofiel oop.", "Voeg jou geregistreerde besigheidsnaam, bedryf, provinsie, telefoonnommer, en webwerf by.", "Laai 'n maatskappylogo en omslagfoto op vir jou openbare verskaffersprofiel.", "Stoor jou veranderinge en hersien die profielvoorskou."],
    },
    guidance: {
      en: [
        { heading: "Profile quality", body: "A complete profile gives buyers confidence and improves your visibility when procurement teams search supplier records." },
        { heading: "Images", body: "Use a clear logo and professional cover image so your business stands out in supplier directories and buyer shortlists." },
      ],
      zu: [
        { heading: "Ikhwalithi Yephrofayeli", body: "Iphrofayeli ephelele inika abenzi bezinqumo ukwethemba futhi ithuthukise ukubonakala kwakho lapho amajenqa okuthengwa efuna amarekhodi omhlinzeki." },
        { heading: "Izithombe", body: "Sebenzisa ilogo ecacile nesithombe sesembozo esifanelekile ukuze ibhizinisi lakho libe ngcono kuhla lwabahlinzeki namajenqa abenzi bezinqumo." },
      ],
      af: [
        { heading: "Profielkwaliteit", body: "'n Volledige profiel gee kopers vertroue en verbeter jou sigbaarheid wanneer verkrygingspanne verskaffersrekords soek." },
        { heading: "Beelde", body: "Gebruik 'n duidelike logo en professionele omslagbeeld sodat jou besigheid uitstaan in verskaffersgroepe en koperslysies." },
      ],
    },
    faqs: {
      en: [
        { question: "Do I need a company logo?", answer: "It is not mandatory, but it helps significantly. Buyers are more likely to consider suppliers with complete profiles." },
        { question: "Can I change my business details at any time?", answer: "Yes. Go to Dashboard -> Business profile and click Edit any time." },
      ],
      zu: [
        { question: "Ingabe ngidinga ilogo yenkampani?", answer: "Akudingekile, kodwa kusiza kakhulu. Amajenqa acabanga ngomhlinzeki onephrofayeli ephelele." },
        { question: "Ingabe ngingashintsha imininingwane yami yebhizinisi noma nini?", answer: "Yebo - iya ku-Dashboard -> Iphrofayeli yebhizinisi bese uchofoza Hlela noma nini." },
      ],
      af: [
        { question: "Het ek 'n maatskappylogo nodig?", answer: "Dit is nie verpligtend nie, maar dit help aansienlik. Kopers is meer geneig om verskaffers met volledige profiele te oorweeg." },
        { question: "Kan ek my besigheidsbesonderhede enige tyd verander?", answer: "Ja - gaan na Dashboard -> Besigheidsprofiel en klik Wysig enige tyd." },
      ],
    },
    pdfHref: userGuidePdf,
  },
  {
    id: "supplier-documents",
    guide: "user",
    title: { en: "Supplier Documents", zu: "Amadokhumenti Omhlinzeki", af: "Verskafferdokumente" },
    description: {
      en: "Upload CSD, tax clearance, BBBEE certificate, and banking details.",
      zu: "Layisha i-CSD, intela ecacile, isitifiketi se-BBBEE, nezinombolo zebhange.",
      af: "Laai CSD, belastingklaring, BBBEE-sertifikaat, en bankbesonderhede op.",
    },
    icon: IconFileCertificate,
    steps: {
      en: ["Go to Dashboard -> Business profile -> Documents.", "Upload your tax clearance certificate from SARS.", "Upload your BBBEE certificate.", "Enter your banking details and director contact information.", "Save - your SmartScore will update automatically."],
      zu: ["Iya ku-Dashboard -> Iphrofayeli yebhizinisi -> Amadokhumenti.", "Layisha isitifiketi sakho sentela esicacile esivela ku-SARS.", "Layisha isitifiketi sakho se-BBBEE.", "Faka imininingwane yakho yebhange kanye necingo lombusi.", "Gcina - i-SmartScore yakho izobuyekezwa ngokuzenzakalelayo."],
      af: ["Gaan na Dashboard -> Besigheidsprofiel -> Dokumente.", "Laai jou belastingklaringsertifikaat van SARS op.", "Laai jou BBBEE-sertifikaat op.", "Voer jou bankbesonderhede en direkteurskontakinligting in.", "Stoor - jou SmartScore sal outomaties opdateer."],
    },
    guidance: {
      en: [
        { heading: "Accepted evidence", body: "Procurement teams commonly check CSD registration, tax clearance, BBBEE certificate or declaration, and banking confirmation letters." },
        { heading: "Keeping documents current", body: "Replace expired documents promptly. Expired or missing records can delay verification, awards, invoices, and payment processing." },
      ],
      zu: [
        { heading: "Ubufakazi obamukelekayo", body: "Amaqembu okuthenga avame ukuhlola ukubhaliswa kwe-CSD, intela ecacile, isitifiketi noma isimemezelo se-BBBEE, nezincwadi zokuqinisekisa ibhange." },
        { heading: "Ukugcina amadokhumenti esesikhathini", body: "Shintsha amadokhumenti aphelelwe yisikhathi ngokushesha. Amarekhodi aphelelwe yisikhathi noma angekho angabambezela ukuqinisekiswa, imiklomelo, ama-invoice, nokucutshungulwa kwezinkokhelo." },
      ],
      af: [
        { heading: "Aanvaarde bewys", body: "Verkrygingspanne kontroleer gewoonlik CSD-registrasie, belastingklaring, BBBEE-sertifikaat of verklaring, en bankbevestigingsbriewe." },
        { heading: "Hou dokumente op datum", body: "Vervang vervalde dokumente dadelik. Vervalde of ontbrekende rekords kan verifikasie, toekennings, fakture, en betalingsverwerking vertraag." },
      ],
    },
    faqs: {
      en: [
        { question: "Which documents are required?", answer: "Tax clearance certificate, BBBEE certificate, bank confirmation, and CSD number. The CSD number is required for verification." },
        { question: "Are my documents secure?", answer: "Yes - documents are only visible to authorised institutions and are not stored outside the platform." },
      ],
      zu: [
        { question: "Yimaphi amadokhumenti adingekayo?", answer: "Isitifiketi sentela esicacile, isitifiketi se-BBBEE, ukuqinisekiswa kwebhange, kanye nenombolo ye-CSD. Inombolo ye-CSD idingekile ukuze uqinisekiswe." },
        { question: "Amadokhumenti ami avikelekile?", answer: "Yebo - amadokhumenti ayabukwa kuphela yizikhungo ezigunyaziwe futhi awagcinwa ngaphandle kweplatform." },
      ],
      af: [
        { question: "Watter dokumente word benodig?", answer: "Belastingklaringsertifikaat, BBBEE-sertifikaat, bankbevestiging, en CSD-nommer. Die CSD-nommer is vereis vir verifikasie." },
        { question: "Is my dokumente veilig?", answer: "Ja - dokumente is slegs sigbaar vir gemagtigde instansies en word nie buite die platform gestoor nie." },
      ],
    },
    pdfHref: userGuidePdf,
  },
  {
    id: "smartscore",
    guide: "user",
    title: { en: "SmartScore", zu: "I-SmartScore", af: "SmartScore" },
    description: {
      en: "How scoring works, how to improve it, and what buyers see.",
      zu: "Indlela ukubalwa kwayo, ukuyithuthukisa, nokuthi abenzi bezinqumo babona ini.",
      af: "Hoe telling werk, hoe om dit te verbeter, en wat kopers sien.",
    },
    icon: IconBolt,
    steps: {
      en: ["Complete your business profile (20 points).", "Get your CSD registration verified (20 points).", "Get your BBBEE level verified (20 points for Levels 1-4, 10 points for Levels 5-8).", "Get your tax clearance verified (15 points).", "Get your banking details verified (10 points).", "Complete director verification (10 points).", "Upload a company profile or capability statement (5 points)."],
      zu: ["Gcwalisa iphrofayeli yakho yebhizinisi (amapointe angu-20).", "Faka inombolo yakho ye-CSD (amapointe angu-20).", "Layisha isitifiketi sentela esicacile (amapointe angu-15).", "Layisha isitifiketi se-BBBEE (amapointe angu-15).", "Faka imininingwane yebhange (amapointe angu-15).", "Gcwalisa imininingwane yomqondisi (amapointe angu-10).", "Layisha isithombe sephrofayeli (amapointe angu-5)."],
      af: ["Voltooi jou besigheidsprofiel (20 punte).", "Voer jou CSD-nommer in (20 punte).", "Laai belastingklaringsertifikaat op (15 punte).", "Laai BBBEE-sertifikaat op (15 punte).", "Voer bankbesonderhede in (15 punte).", "Voltooi direkteursinligting (10 punte).", "Laai profielfoto op (5 punte)."],
    },
    guidance: {
      en: [
        { heading: "How it works", body: "SmartScore is a 0-100 rating that shows buyers how verified and trustworthy your supplier profile is. It's driven mainly by actual verification — CSD, BBBEE, tax, banking, and director checks — plus a smaller bonus for platform activity over time." },
        { heading: "Score breakdown", body: "Business profile: 20 points. CSD registration: 20 points. BBBEE verification: 20 points for Levels 1-4 or 10 points for Levels 5-8. Tax clearance: 15 points. Banking details: 10 points. Director verification: 10 points. Company profile or capability statement: 5 points. A smaller capped activity bonus can add to this over time." },
      ],
      zu: [
        { heading: "Isebenza kanjani", body: "I-SmartScore iyisilinganiso esingu-0 kuya ku-100 esibonisa abathengi ukuthi iphrofayeli yakho yomhlinzeki iphelele futhi ithembekile kangakanani. Ibalwa ngokuzenzakalelayo uma iphrofayeli yakho ibuyekezwa." },
        { heading: "Ukuhlukaniswa kwamaphuzu", body: "Iphrofayeli yebhizinisi: 20. Inombolo ye-CSD: 20. Intela ecacile: 15. Isitifiketi se-BBBEE: 15. Imininingwane yebhange: 15. Imininingwane yomqondisi: 10. Isithombe sephrofayeli: 5." },
      ],
      af: [
        { heading: "Hoe dit werk", body: "SmartScore is 'n 0-100 telling wat kopers wys hoe volledig en betroubaar jou verskaffersprofiel is. Dit word outomaties bereken wanneer jou profiel opgedateer word." },
        { heading: "Tellingsverdeling", body: "Besigheidsprofiel: 20 punte. CSD-nommer: 20 punte. Belastingklaring: 15 punte. BBBEE-sertifikaat: 15 punte. Bankbesonderhede: 15 punte. Direkteursinligting: 10 punte. Profielfoto: 5 punte." },
      ],
    },
    faqs: {
      en: [
        { question: "Why is my SmartScore 0?", answer: "Your score is built from real verification, not just uploaded documents. Complete your business profile and get your CSD, BBBEE, tax, banking, and director details verified by an admin to raise your score — simply uploading a document earns a little credit, but verification is what moves it the most." },
        { question: "Do buyers see my SmartScore?", answer: "Yes - your SmartScore is visible on your public supplier profile and in search results." },
      ],
      zu: [
        { question: "Kungani i-SmartScore yami ingama-0?", answer: "I-score ibalwa lapho iphrofayeli igcinwa. Gcwalisa iphrofayeli yakho yebhizinisi bese ulayisha amadokhumenti akho ukuyithuthukisa." },
        { question: "Abenzi bezinqumo bayibona i-SmartScore yami?", answer: "Yebo - i-SmartScore yakho ibonakala kuphrofayeli yakho yomhlinzeki womphakathi nasemiphumeleni yokusesha." },
      ],
      af: [
        { question: "Hoekom is my SmartScore 0?", answer: "Die telling word bereken wanneer die profiel gestoor word. Voltooi jou besigheidsprofiel en laai dokumente op om dit te verhoog." },
        { question: "Sien kopers my SmartScore?", answer: "Ja - jou SmartScore is sigbaar op jou openbare verskaffersprofiel en in soekresultate." },
      ],
    },
    pdfHref: userGuidePdf,
  },  {
    id: "rfqs-quoting",
    guide: "user",
    title: { en: "RFQs & Quoting", zu: "Ama-RFQ Nokuquota", af: "RFQ's en Kwotasies" },
    description: {
      en: "Find RFQs, submit quotes, and track status.",
      zu: "Thola ama-RFQ, faka izicelo, ulandele isimo.",
      af: "Vind RFQ's, dien kwotasies in, volg status.",
    },
    icon: IconClipboardCheck,
    steps: {
      en: ["Go to Dashboard -> RFQs.", "Browse open RFQs that match your business.", "Click an RFQ to see the full requirements.", "Click Submit quote and complete the quote form.", "Upload required documents and enter your price.", "Submit and wait for a response from the buyer."],
      zu: ["Iya ku-Dashboard -> Ama-RFQ.", "Bhrowuza ama-RFQ avulekile afanelekile nebhizinisi lakho.", "Chofoza i-RFQ ukuze ubone izidingo ezigcwele.", "Chofoza Faka isilinganiso bese ugcwalisa ifomu lesilinganiso.", "Layisha amadokhumenti adingekayo ufake inani lakho.", "Thumela bese ulinda impendulo evela kumthengisi."],
      af: ["Gaan na Dashboard -> RFQ's.", "Blaai deur oop RFQ's wat by jou besigheid pas.", "Klik op 'n RFQ om die volledige vereistes te sien.", "Klik Dien kwotasie in en vul die kwotasievorm in.", "Laai vereiste dokumente op en voer jou prys in.", "Dien in en wag vir 'n reaksie van die koper."],
    },
    guidance: {
      en: [
        { heading: "Before submitting", body: "Check closing dates carefully and confirm that your business can meet the scope, location, and compliance requirements." },
        { heading: "After submission", body: "Quotes may move through submitted, shortlisted, awarded, or declined states depending on buyer review and procurement decisions." },
      ],
      zu: [
        { heading: "Ngaphambi kokuthumela", body: "Hlola izinsuku zokuvala ngokucophelela futhi uqinisekise ukuthi ibhizinisi lakho lingahlangabezana nobubanzi bomsebenzi, indawo, nezidingo zokuhambisana." },
        { heading: "Ngemva kokuthumela", body: "Ama-quote angadlula ezimeni zokuthunyelwa, ukufakwa ohlwini olufushane, ukuklonyeliswa, noma ukwenqatshwa kuye ngokubuyekezwa komthengi nezinqumo zokuthenga." },
      ],
      af: [
        { heading: "Voor indiening", body: "Kontroleer sluitingsdatums noukeurig en bevestig dat jou besigheid aan die omvang, ligging, en nakomingsvereistes kan voldoen." },
        { heading: "Na indiening", body: "Kwotasies kan deur ingedien, gekortlys, toegeken, of afgekeur beweeg volgens koperhersiening en verkrygingsbesluite." },
      ],
    },
    faqs: {
      en: [
        { question: "How many RFQs can I see?", answer: "All verified suppliers can view and respond to all open RFQs matching their industries." },
        { question: "Can I change my quote after submitting it?", answer: "No - once a quote is submitted, it cannot be changed. Contact support if a correction is required." },
      ],
      zu: [
        { question: "Ngingabona ama-RFQ angaki?", answer: "Bonke abahlinzeki abaqinisekisiwe bangabona futhi basabele kuwo wonke ama-RFQ avulekile ahambelana nezimboni zabo." },
        { question: "Ngingashintsha isilinganiso sami ngemva kokusithuma?", answer: "Cha - uma isilinganiso sesithunyelwe, asikwazi ukushintshwa. Xhumana ne-support uma kudingeka ushintshiwe." },
      ],
      af: [
        { question: "Hoeveel RFQ's kan ek sien?", answer: "Alle geverifieerde verskaffers kan alle oop RFQ's wat by hul bedrywe pas, sien en daarop reageer." },
        { question: "Kan ek my kwotasie verander nadat ek dit ingedien het?", answer: "Nee - sodra 'n kwotasie ingedien is, kan dit nie verander word nie. Kontak ondersteuning as 'n wysiging nodig is." },
      ],
    },
    pdfHref: userGuidePdf,
  },
  {
    id: "procurement-wire",
    guide: "user",
    title: { en: "Procurement Wire", zu: "I-Procurement Wire", af: "Verkrygingsdraad" },
    description: {
      en: "What it is, how to use it, and how to view opportunities.",
      zu: "Yini le, ungayisebenzisa kanjani, nokubuka amathuba.",
      af: "Wat dit is, hoe om dit te gebruik, en geleenthede te sien.",
    },
    icon: IconArticle,
    steps: {
      en: ["Click the Procurement Wire button at the bottom of the screen.", "Browse the latest procurement opportunity notifications.", "Click a notification to see full details.", "Follow relevant opportunities to stay informed."],
      zu: ["Chofoza inkinobho ye-Procurement Wire ephansi kwesikrini.", "Bhrowuza izaziso zamuva zamathuba okuthengwa.", "Chofoza inaziso ukuze ubone imininingwane egcwele.", "Landela amathuba afanelekile ukuze uhlale unolwazi."],
      af: ["Klik die Verkrygingsdraad-knoppie onderaan die skerm.", "Blaai deur die nuutste verkrygingsgeleentheidskennisgewings.", "Klik op 'n kennisgewing om volledige besonderhede te sien.", "Volg relevante geleenthede om op hoogte te bly."],
    },
    guidance: {
      en: [
        { heading: "Best use", body: "Treat Procurement Wire as a quick awareness layer. It helps you notice activity without leaving your current dashboard task." },
        { heading: "Opportunity viewing", body: "When a wire item relates to an opportunity, open it and review the RFQ details before deciding whether to quote." },
      ],
      zu: [
        { heading: "Ukusetshenziswa okungcono", body: "Bheka i-Procurement Wire njengendlela esheshayo yokwazi okwenzekayo. Ikusiza ukubona umsebenzi ngaphandle kokushiya umsebenzi wakho wamanje ku-dashboard." },
        { heading: "Ukubuka amathuba", body: "Uma into ye-wire ihlobene nethuba, yivule bese ubuyekeza imininingwane ye-RFQ ngaphambi kokunquma ukuthi uzofaka i-quote yini." },
      ],
      af: [
        { heading: "Beste gebruik", body: "Gebruik Verkrygingsdraad as 'n vinnige bewusmakingslaag. Dit help jou om aktiwiteit raak te sien sonder om jou huidige dashboardtaak te verlaat." },
        { heading: "Geleenthede bekyk", body: "Wanneer 'n draaditem met 'n geleentheid verband hou, maak dit oop en hersien die RFQ-besonderhede voordat jy besluit of jy gaan kwoteer." },
      ],
    },
    faqs: {
      en: [
        { question: "Is Procurement Wire available to all users?", answer: "Yes - Procurement Wire is available to all signed-in suppliers and buyers." },
        { question: "How often are notifications updated?", answer: "New notifications can be added at any time as new opportunities arise." },
      ],
      zu: [
        { question: "Ingabe i-Procurement Wire ikhona kubo bonke abasebenzisi?", answer: "Yebo - i-Procurement Wire ikhona kubo bonke abahlinzeki nabathengisi abangena ngemvume." },
        { question: "Izaziso zibuyekezwa kangakanani?", answer: "Izaziso ezintsha zingeza noma nini njengoba amathuba entsha evela." },
      ],
      af: [
        { question: "Is die Verkrygingsdraad vir alle gebruikers beskikbaar?", answer: "Ja - die Verkrygingsdraad is beskikbaar vir alle aangemelde verskaffers en kopers." },
        { question: "Hoe gereeld word kennisgewings opgedateer?", answer: "Nuwe kennisgewings kan enige tyd bygevoeg word soos nuwe geleenthede ontstaan." },
      ],
    },
    pdfHref: userGuidePdf,
  },
  {
    id: "thuso-ai",
    guide: "user",
    title: { en: "Thuso AI Assistant", zu: "I-Thuso AI", af: "Thuso KI" },
    description: {
      en: "How to use Thuso, what it can help with, and its limitations.",
      zu: "Ukusebenzisa u-Thuso, lokho angakusiza ngakho, nezingcuphe.",
      af: "Hoe om Thuso te gebruik, waarmee dit kan help, en beperkings.",
    },
    icon: IconRobot,
    steps: {
      en: ["Click the Thuso button in the bottom-right corner.", "Type your question or description of your problem.", "Thuso will respond with relevant platform information.", "Use the suggested cards to start a conversation."],
      zu: ["Chofoza inkinobho ye-Thuso ekhoneni eliphansi kwesokudla.", "Bhala umbuzo wakho noma incazelo yenkinga yakho.", "U-Thuso uzophendula ngolwazi olufanelekile lweplatform.", "Sebenzisa izikhombisi ezihlonishiwe ukuze uqale ingxoxo."],
      af: ["Klik die Thuso-knoppie in die onderste regterkantste hoek.", "Tik jou vraag of beskrywing van jou probleem.", "Thuso sal reageer met relevante platform-inligting.", "Gebruik die voorgestelde kaartjies om 'n gesprek te begin."],
    },
    guidance: {
      en: [
        { heading: "What Thuso helps with", body: "Thuso can explain workflows, suggest next steps, help interpret platform status, and guide users through common tasks." },
        { heading: "Limitations", body: "Thuso does not replace official approvals, legal review, finance controls, or verified procurement records." },
      ],
      zu: [
        { heading: "Lokho u-Thuso akusiza ngakho", body: "U-Thuso angachaza imisebenzi, aphakamise izinyathelo ezilandelayo, asize ukuhumusha isimo seplatform, futhi aqondise abasebenzisi emisebenzini ejwayelekile." },
        { heading: "Imikhawulo", body: "U-Thuso akangeni esikhundleni sokuvunywa okusemthethweni, ukubuyekezwa kwezomthetho, izilawuli zezimali, noma amarekhodi okuthenga aqinisekisiwe." },
      ],
      af: [
        { heading: "Waarmee Thuso help", body: "Thuso kan werkvloeie verduidelik, volgende stappe voorstel, help om platformstatus te verstaan, en gebruikers deur algemene take lei." },
        { heading: "Beperkings", body: "Thuso vervang nie amptelike goedkeurings, regsbeoordeling, finansiële kontroles, of geverifieerde verkrygingsrekords nie." },
      ],
    },
    faqs: {
      en: [
        { question: "What can Thuso do?", answer: "Thuso can help with profile questions, SmartScore understanding, finding RFQs, and general platform issues." },
        { question: "Is Thuso intelligent?", answer: "Yes - Thuso uses AI to answer questions. It cannot make verification decisions or change profile data." },
      ],
      zu: [
        { question: "U-Thuso ungakwazi ukwenza ini?", answer: "U-Thuso angakusiza ngemibuzo yephrofayeli, ukuqonda i-SmartScore, ukuthola ama-RFQ, nezinkinga ezijwayelekile zeplatform." },
        { question: "U-Thuso unobuchwepheshe?", answer: "Yebo - u-Thuso usebenzisa i-AI ukuphendula imibuzo. Akakwazi ukwenza izinqumo zokuqinisekisa noma ukushintsha idata yephrofayeli." },
      ],
      af: [
        { question: "Wat kan Thuso doen?", answer: "Thuso kan jou help met profielvrae, SmartScore begrip, RFQ's vind, en algemene platformprobleme." },
        { question: "Is Thuso slim?", answer: "Ja - Thuso gebruik KI om vrae te beantwoord. Dit kan nie verifikasiebesluite neem of profieldata verander nie." },
      ],
    },
    pdfHref: userGuidePdf,
  },
  {
    id: "user-faqs",
    guide: "user",
    title: { en: "FAQs & Troubleshooting", zu: "Imibuzo Ejwayelekile Nezinkinga", af: "Algemene Vrae en Probleemoplossing" },
    description: {
      en: "Common issues, error messages, and contacting support.",
      zu: "Izinkinga ezijwayelekile, imiyalezo yamaphutha, nokuxhumana ne-support.",
      af: "Algemene probleme, foutboodskappe, en kontak ondersteuning.",
    },
    icon: IconMessageCircleQuestion,
    steps: {
      en: ["Search this Help Centre first.", "Check your internet connection and refresh the page.", "Confirm required fields are complete and documents are uploaded.", "Contact support with your email, business name, page, and exact error message."],
      zu: ["Qala ngokusesha kule Help Centre.", "Hlola uxhumano lwakho lwe-inthanethi bese uvuselela ikhasi.", "Qinisekisa ukuthi izinkambu ezidingekayo zigcwele futhi amadokhumenti alayishiwe.", "Xhumana ne-support nge-imeyili yakho, igama lebhizinisi, ikhasi, nomlayezo wephutha oqondile."],
      af: ["Soek eers in hierdie Help Centre.", "Kontroleer jou internetverbinding en herlaai die bladsy.", "Bevestig dat vereiste velde volledig is en dokumente opgelaai is.", "Kontak ondersteuning met jou e-pos, besigheidsnaam, bladsy, en presiese foutboodskap."],
    },
    guidance: {
      en: [
        { heading: "Helpful support details", body: "Include screenshots when possible, but do not send passwords, OTP codes, or private banking credentials." },
        { heading: "Common messages", body: "Missing profile, Supabase configuration, upload failure, or permission messages usually mean a required setup or access step is incomplete." },
      ],
      zu: [
        { heading: "Imininingwane esiza i-support", body: "Faka izithombe-skrini uma kungenzeka, kodwa ungathumeli amaphasiwedi, amakhodi e-OTP, noma imininingwane yakho yangasese yasebhange." },
        { heading: "Imiyalezo ejwayelekile", body: "Imiyalezo yephrofayeli engekho, ukulungiswa kwe-Supabase, ukwehluleka kokulayisha, noma imvume ivame ukusho ukuthi isinyathelo sokusetha noma ukufinyelela asikapheleli." },
      ],
      af: [
        { heading: "Nuttige ondersteuningsbesonderhede", body: "Sluit skermgrepe in waar moontlik, maar moenie wagwoorde, OTP-kodes, of private bankbesonderhede stuur nie." },
        { heading: "Algemene boodskappe", body: "Ontbrekende profiel-, Supabase-opstelling-, oplaai-mislukking-, of toestemmingboodskappe beteken gewoonlik dat 'n vereiste opstelling- of toegangstap onvolledig is." },
      ],
    },
    faqs: {
      en: [
        { question: "The platform is not working properly - what should I do?", answer: "Try clearing your browser cache and reload the page. If the problem continues, contact support at support@aiformprocure.co.za" },
        { question: "I want to change my email - how do I do it?", answer: "Go to Dashboard -> Settings -> Account and click Change email. You will need to confirm the new email address." },
        { question: "How do I delete my account?", answer: "Go to Dashboard -> Settings -> Account -> Delete account. Your data is retained for 30 days before permanent deletion." },
      ],
      zu: [
        { question: "Iplatform ayisebenzi kahle - ngenzeni?", answer: "Zama ukusula i-cache yesikhungo sakho, uphinde ulayishe ikhasi. Uma inkinga iqhubeka, xhumana ne-support ku-support@aiformprocure.co.za" },
        { question: "Ngifuna ukushintsha i-imeyili yami - ngingakwenza kanjani?", answer: "Iya ku-Dashboard -> Izilungiselelo -> I-akhawunti bese uchofoza Shintsha i-imeyili. Uzodinga ukuqinisekisa inombolo entsha ye-imeyili." },
        { question: "Ngingasusa i-akhawunti yami kanjani?", answer: "Iya ku-Dashboard -> Izilungiselelo -> I-akhawunti -> Susa i-akhawunti. Idata yakho izogcinwa izinsuku ezingama-30 ngaphambi kokususwa ngokuphelele." },
      ],
      af: [
        { question: "Die platform werk nie behoorlik nie - wat moet ek doen?", answer: "Probeer om jou blaaier se kas uit te vee en herlaai die bladsy. As die probleem voortduur, kontak ondersteuning by support@aiformprocure.co.za" },
        { question: "Ek wil my e-pos verander - hoe doen ek dit?", answer: "Gaan na Dashboard -> Instellings -> Rekening en klik Verander e-pos. Jy sal die nuwe e-posadres moet bevestig." },
        { question: "Hoe verwyder ek my rekening?", answer: "Gaan na Dashboard -> Instellings -> Rekening -> Verwyder rekening. Jou data word 30 dae bewaar voor permanente verwydering." },
      ],
    },
    pdfHref: userGuidePdf,
  },  {
    id: "glossary",
    guide: "user",
    title: { en: "Glossary", zu: "Isichazamazwi", af: "Woordelys" },
    description: {
      en: "Key terms and definitions used across AiForm Procure.",
      zu: "Amagama abalulekile nezincazelo ezisetshenziswa ku-AiForm Procure.",
      af: "Sleutelterme en definisies wat regdeur AiForm Procure gebruik word.",
    },
    icon: IconBook,
    steps: {
      en: ["Find a term in the glossary below.", "Read the definition to understand how it applies to procurement.", "Use these terms when completing your profile, submitting quotes, or reviewing RFQs.", "Contact support if a term is unclear or missing."],
      zu: ["Thola igama esichazamazwini ngezansi.", "Funda incazelo ukuze uqonde ukuthi isebenza kanjani ekuthengeni.", "Sebenzisa lamagama lapho ugcwalisa iphrofayeli yakho, uthumela amakhotheshini, noma ubuyekeza ama-RFQ.", "Xhumana nosekelo uma igama lingacaci noma lingekho."],
      af: ["Vind 'n term in die woordelys hieronder.", "Lees die definisie om te verstaan hoe dit op verkryging van toepassing is.", "Gebruik hierdie terme wanneer jy jou profiel voltooi, kwotasies indien, of RFQ's hersien.", "Kontak ondersteuning as 'n term onduidelik of afwesig is."],
    },
    guidance: {
      en: [
        { heading: "BBBEE", body: "Broad-Based Black Economic Empowerment. A South African government policy that measures the degree to which companies are owned, managed, and operated by Black South Africans. Suppliers are rated from Level 1 (highest) to Level 8 (lowest), with Level 1 offering the most procurement points to buyers." },
        { heading: "CSD", body: "Central Supplier Database. A national database managed by the South African National Treasury where all suppliers doing business with government must be registered. A valid CSD number is required for verification on AiForm Procure." },
        { heading: "SmartScore", body: "AiForm Procure's procurement readiness score. It's built mainly from actual verification — CSD registration, BBBEE level, tax clearance, banking details, and director confirmation — each checked and confirmed by an admin, not just self-reported. A smaller bonus reflects genuine platform activity over time. Higher scores improve your visibility to buyers." },
        { heading: "RFQ", body: "Request for Quotation. A formal document issued by a buyer inviting registered suppliers to submit a price and proposal for a specific product or service. Suppliers must be logged in to respond to an RFQ." },
        { heading: "Purchase Order (PO)", body: "A formal document issued by a buyer to a supplier after a quote is awarded. It confirms the scope, amount, and terms of the procurement. POs are tracked through the platform workflow." },
        { heading: "CIPC", body: "Companies and Intellectual Property Commission. The South African body responsible for registering companies. Your CIPC registration number is your company registration number (e.g. 2019/123456/07)." },
        { heading: "POPIA", body: "Protection of Personal Information Act. South African data protection legislation that governs how personal information is collected, stored, and used. AiForm Procure is aligned with POPIA requirements." },
        { heading: "EME", body: "Exempted Micro Enterprise. A business with an annual turnover below R10 million that is automatically Level 1 BBBEE compliant. EME status must be confirmed with a valid certificate." },
      ],
      zu: [
        { heading: "I-BBBEE", body: "Ukufakwa Kwezomnotho Okubanzi Kwabantu Abamnyama. Inqubomgomo kahulumeni waseNingizimu Afrika elinganisa izinga abantu abamnyama abanazo enkampanini. Abahlinzeki balinganiswa kusukela kuLevel 1 (ephezulu) kuya kuLevel 8 (ezansi)." },
        { heading: "I-CSD", body: "Idathabhesi Yababalekeli Bakazwelonke. Idathabhesi kazwelonke ephaethwe nguNgqongqoshe Wezimali WaseNingizimu Afrika lapho ababalekeli bonke abenza ibhizinisi nohulumeni kufanele babhaliswe khona." },
        { heading: "I-SmartScore", body: "Isikali sokuhlolwa kokulungela ukuthenga kwe-AiForm Procure. Ilinganisa ukuthi iphrofayeli yakho yomhlinzeki igcwele futhi iqinisekisiwe kangakanani." },
        { heading: "I-RFQ", body: "Isicelo Sokuquota. Idokhumenti esemthethweni lethwa umthengi emema ababalekeli ababhaliswe ukuthumela inani nesiphakamiso semkhiqizo noma isevisi ethile." },
        { heading: "I-PO (Purchase Order)", body: "Idokhumenti esemthethweni lethwa umthengi kumhlinzeki ngemva kokuphumelela kwekhotheshini. Iqinisekisa izinga, inani, nezimiso zokuthenga." },
        { heading: "I-CIPC", body: "Ikhomishini Yezinkampani Nempahla Yengqondo. Umzimba waseNingizimu Afrika obhekele ukubhalisa izinkampani." },
        { heading: "I-POPIA", body: "Umthetho Wokuvikelwa Kolwazi Lomuntu. Umthetho waseNingizimu Afrika wokuphathwa kolwazi lomuntu." },
        { heading: "I-EME", body: "Ibhizinisi Elincane Elikhululiwe. Ibhizinisi elinamabhizinisi ngaphansi kweR10 million ngonyaka elilungele ngoLevel 1 we-BBBEE ngokuzenzakalelayo." },
      ],
      af: [
        { heading: "BBBEE", body: "Breëbasis Swart Ekonomiese Bemagtiging. 'n Suid-Afrikaanse regeringsbeleid wat meet in watter mate maatskappye deur Swart Suid-Afrikaners besit, bestuur en bedryf word. Verskaffers word van Vlak 1 (hoogste) tot Vlak 8 (laagste) beoordeel." },
        { heading: "CSD", body: "Sentrale Verskaffer-databasis. 'n Nasionale databasis bestuur deur die Suid-Afrikaanse Nasionale Tesourie waar alle verskaffers wat besigheid met die regering doen, geregistreer moet wees." },
        { heading: "SmartScore", body: "AiForm Procure se verkrygingsgereedheidtelling. Dit meet hoe volledig en geverifieer jou verskaffer-profiel is op grond van faktore soos BBBEE-vlak, CSD-registrasie, belastingklaring en bankverifikasie." },
        { heading: "RFQ", body: "Versoek om Kwotasie. 'n Formele dokument uitgereik deur 'n koper wat geregistreerde verskaffers uitnooi om 'n prys en voorstel in te dien." },
        { heading: "Aankoopbevel (PO)", body: "'n Formele dokument uitgereik deur 'n koper aan 'n verskaffer nadat 'n kwotasie toegeken is. Dit bevestig die omvang, bedrag en voorwaardes van die verkryging." },
        { heading: "CIPC", body: "Kommissie vir Maatskappye en Intellektuele Eiendom. Die Suid-Afrikaanse liggaam verantwoordelik vir die registrasie van maatskappye." },
        { heading: "POPIA", body: "Wet op Beskerming van Persoonlike Inligting. Suid-Afrikaanse databeskermingswetgewing wat reguleer hoe persoonlike inligting ingesamel, gestoor en gebruik word." },
        { heading: "EME", body: "Vrygeskelde Mikro-onderneming. 'n Besigheid met 'n jaarlikse omset onder R10 miljoen wat outomaties Vlak 1 BBBEE-voldoend is." },
      ],
    },
    faqs: {
      en: [
        { question: "Is SmartScore the same as a credit score?", answer: "No. SmartScore measures procurement readiness and verified supplier trust, not creditworthiness. It helps buyers assess supplier reliability." },
        { question: "Do I need a CSD number to register?", answer: "You need a CSD number to complete supplier verification. You can register without one but your profile will remain unverified until it is added." },
        { question: "What is the difference between Level 1 and Level 8 BBBEE?", answer: "Level 1 is the highest BBBEE rating and offers buyers the most procurement recognition points. Level 8 is the lowest rated compliant level. Higher levels improve your chances of being shortlisted." },
        { question: "Where can I get my CSD number?", answer: "Register at the Central Supplier Database portal at csd.gov.za. Once registered, your supplier number will be issued and you can add it to your AiForm Procure profile." },
      ],
      zu: [
        { question: "I-SmartScore ifana yini nesikali sekhredithi?", answer: "Cha. I-SmartScore ilinganisa ukuhlolwa kokulungela ukuthenga nokugcwaliseka kwephrofayeli, hhayi ukufaneleka kwekhredithi." },
        { question: "Ngidinga inombolo ye-CSD ukubhalisa?", answer: "Udinga inombolo ye-CSD ukuqedela ukuqinisekiswa komhlinzeki. Ungabhaliswa ngaphandle kwayo kodwa iphrofayeli yakho izohlala ingaqinisekisiwe." },
        { question: "Umehluko phakathi kwe-Level 1 ne-Level 8 we-BBBEE uyini?", answer: "I-Level 1 iyisilinganiso se-BBBEE esiphezulu kakhulu futhi inikeza abantu abathengayo amaphuzu amaningi. I-Level 8 iyisilinganiso esiphansi kakhulu esilungile." },
        { question: "Ngikuthola kuphi inombolo yami ye-CSD?", answer: "Bhalisela ku-csd.gov.za. Ngemva kokubhalisa, inombolo yakho yomhlinzeki izokhishwa." },
      ],
      af: [
        { question: "Is SmartScore dieselfde as 'n kredietpunt?", answer: "Nee. SmartScore meet verkrygingsgereedheid en profielvolledigheid, nie kredietwaardigheid nie." },
        { question: "Benodig ek 'n CSD-nommer om te registreer?", answer: "Jy benodig 'n CSD-nommer om verskaffer-verifikasie te voltooi. Jy kan registreer sonder een maar jou profiel sal onverifieer bly." },
        { question: "Wat is die verskil tussen Vlak 1 en Vlak 8 BBBEE?", answer: "Vlak 1 is die hoogste BBBEE-gradering en bied kopers die meeste verkrygingserkennningspunte. Vlak 8 is die laagste voldoende vlak." },
        { question: "Waar kry ek my CSD-nommer?", answer: "Registreer by csd.gov.za. Nadat jy geregistreer het, sal jou verskaffer-nommer uitgereik word." },
      ],
    },
    pdfHref: userGuidePdf,
  },  {
    id: "admin-dashboard-overview",
    guide: "admin",
    title: { en: "Dashboard Overview", zu: "Ukubuka Konke KweDashboard", af: "Paneeloorsig" },
    description: { en: "Read metrics, understand stats, and navigate admin workspaces.", zu: "Funda izinkomba, uqonde izibalo, uphinde uqondise izindawo zomphathi.", af: "Lees statistieke, verstaan data, en navigeer admin werkspasies." },
    icon: IconChartBar,
    steps: {
      en: ["Open Dashboard -> Admin.", "Review headline cards for supplier, RFQ, quote, compliance, and finance activity.", "Use admin navigation to move into reports, verification, awards, settings, and workflow queues.", "Investigate unusual changes by opening the relevant report or activity log."],
      zu: ["Vula Dashboard -> Admin.", "Buyekeza amakhadi amakhulu omsebenzi wabahlinzeki, ama-RFQ, ama-quote, ukuhambisana, nezimali.", "Sebenzisa ukuzulazula komphathi ukuya ezingxenyeni zemibiko, ukuqinisekisa, imiklomelo, izilungiselelo, nemigqa yomsebenzi.", "Phenya ushintsho olungajwayelekile ngokuvula umbiko ofanele noma irekhodi lomsebenzi."],
      af: ["Maak Dashboard -> Admin oop.", "Hersien hoofkaarte vir verskaffer-, RFQ-, kwotasie-, nakomings-, en finansiële aktiwiteit.", "Gebruik adminnavigasie om na verslae, verifikasie, toekennings, instellings, en werkvloeiryke te beweeg.", "Ondersoek ongewone veranderinge deur die relevante verslag of aktiwiteitslog oop te maak."],
    },
    guidance: {
      en: [{ heading: "Metrics", body: "Dashboard numbers help admins spot bottlenecks in supplier readiness, quote volume, awards, and payments." }, { heading: "Follow-up", body: "Use reports for deeper analysis and activity logs for operational traceability." }],
      zu: [{ heading: "Izinkomba", body: "Izinombolo ze-dashboard zisiza abaphathi ukubona ukubambezeleka ekulungeleni kwabahlinzeki, umthamo wama-quote, imiklomelo, nezinkokhelo." }, { heading: "Ukulandela", body: "Sebenzisa imibiko ukuze uhlaziye ngokujulile namalogi omsebenzi ukuze kube nokulandeleka kokusebenza." }],
      af: [{ heading: "Maatstawwe", body: "Dashboardgetalle help admins om knelpunte in verskaffergereedheid, kwotasievolume, toekennings, en betalings raak te sien." }, { heading: "Opvolg", body: "Gebruik verslae vir dieper analise en aktiwiteitslogs vir operasionele naspeurbaarheid." }],
    },
    faqs: {
      en: [{ question: "Why are metrics empty?", answer: "The environment may not have seeded or live data yet, or the relevant Supabase table may need setup." }, { question: "Who can access admin pages?", answer: "Only users with admin or buyer-level access can open governed admin workspaces." }],
      zu: [{ question: "Kungani izinkomba zingenalutho?", answer: "Indawo kungenzeka ingakabi nedatha yokuqala noma ephilayo, noma itafula le-Supabase elifanele lingadinga ukusethwa." }, { question: "Ubani ongafinyelela amakhasi omphathi?", answer: "Abasebenzisi abanokufinyelela komphathi noma kwezinga lomthengi kuphela abangavula izindawo zomphathi ezilawulwayo." }],
      af: [{ question: "Hoekom is maatstawwe leeg?", answer: "Die omgewing het moontlik nog nie saad- of lewendige data nie, of die relevante Supabase-tabel moet dalk opgestel word." }, { question: "Wie kan adminbladsye gebruik?", answer: "Slegs gebruikers met admin- of kopervlaktoegang kan beheerde adminwerkspasies oopmaak." }],
    },
    pdfHref: adminGuidePdf,
  },
  {
    id: "supplier-verification",
    guide: "admin",
    title: { en: "Supplier Verification", zu: "Ukuqinisekiswa Komhlinzeki", af: "Verskaffersverifikasie" },
    description: { en: "Review applications, approve or reject suppliers, and manage queues.", zu: "Hlola izicelo, yamukela noma wenqabe abahlinzeki, uphinde uhole imigqa.", af: "Hersien aansoeke, keur verskaffers goed of verwerp hulle, en bestuur toue." },
    icon: IconShieldCheck,
    steps: {
      en: ["Go to Dashboard -> Verification Queue.", "Click Review supplier on any pending application.", "Check business details, uploaded documents, and CSD number.", "Click Approve to verify the supplier or Reject with a reason.", "Supplier receives an email notification of the decision."],
      zu: ["Iya ku-Dashboard -> Verification Queue.", "Chofoza Review supplier kunoma yisiphi isicelo esisalindile.", "Hlola imininingwane yebhizinisi, amadokhumenti alayishiwe, nenombolo ye-CSD.", "Chofoza Approve ukuze uqinisekise umhlinzeki noma Reject uhlanganise nesizathu.", "Umhlinzeki uthola i-imeyili yesaziso ngesinqumo."],
      af: ["Gaan na Dashboard -> Verification Queue.", "Klik Review supplier op enige hangende aansoek.", "Kontroleer besigheidsbesonderhede, opgelaaide dokumente, en CSD-nommer.", "Klik Approve om die verskaffer te verifieer of Reject met 'n rede.", "Die verskaffer ontvang 'n e-poskennisgewing van die besluit."],
    },
    guidance: {
      en: [{ heading: "Review checklist", body: "Confirm tax clearance, BBBEE certificate or declaration, CSD registration, business identity, and banking confirmation where required." }, { heading: "Decision quality", body: "Use rejection reasons that clearly explain what the supplier must fix before resubmission or manual follow-up." }],
      zu: [{ heading: "Uhlu lokuhlola", body: "Qinisekisa intela ecacile, isitifiketi noma isimemezelo se-BBBEE, ukubhaliswa kwe-CSD, ubunikazi bebhizinisi, nokuqinisekiswa kwebhange lapho kudingeka khona." }, { heading: "Ikhwalithi yesinqumo", body: "Sebenzisa izizathu zokwenqaba ezichaza ngokucacile lokho umhlinzeki okufanele akulungise ngaphambi kokuthumela futhi noma ukulandela mathupha." }],
      af: [{ heading: "Hersieningskontrolelys", body: "Bevestig belastingklaring, BBBEE-sertifikaat of verklaring, CSD-registrasie, besigheidsidentiteit, en bankbevestiging waar vereis." }, { heading: "Besluitkwaliteit", body: "Gebruik afkeuringsredes wat duidelik verduidelik wat die verskaffer moet regstel voor herindiening of handmatige opvolg." }],
    },
    faqs: {
      en: [{ question: "How do I re-open a rejected application?", answer: "Find the supplier in the user list and change their verification status back to Pending in the database." }, { question: "What documents should I check before approving?", answer: "Tax clearance certificate, BBBEE certificate, CSD registration, and banking confirmation letter." }],
      zu: [{ question: "Ngisivula kanjani futhi isicelo esenqatshiwe?", answer: "Thola umhlinzeki ohlwini lwabasebenzisi bese ubuyisela isimo sokuqinisekiswa ku-Pending kudatabase." }, { question: "Yimaphi amadokhumenti okufanele ngiwahlole ngaphambi kokuvuma?", answer: "Isitifiketi sentela esicacile, isitifiketi se-BBBEE, ukubhaliswa kwe-CSD, nencwadi yokuqinisekisa ibhange." }],
      af: [{ question: "Hoe maak ek 'n afgekeurde aansoek weer oop?", answer: "Vind die verskaffer in die gebruikerslys en verander hul verifikasiestatus terug na Pending in die databasis." }, { question: "Watter dokumente moet ek kontroleer voor goedkeuring?", answer: "Belastingklaringsertifikaat, BBBEE-sertifikaat, CSD-registrasie, en bankbevestigingsbrief." }],
    },
    pdfHref: adminGuidePdf,
  },
  {
    id: "user-management",
    guide: "admin",
    title: { en: "User Management", zu: "Ukuphathwa Komsebenzisi", af: "Gebruikerbestuur" },
    description: { en: "Manage accounts, roles, and deletion requests.", zu: "Phatha ama-akhawunti, izindima, nokususa abasebenzisi.", af: "Bestuur rekeninge, rolle, en verwyder gebruikers." },
    icon: IconUsers,
    steps: {
      en: ["Open the relevant admin user or supplier list.", "Search for the account by business name, user email, or profile status.", "Review role, registration status, verification status, and recent activity.", "Apply role changes or deletion flows only when authorised."],
      zu: ["Vula uhlu olufanele lwabasebenzisi bomphathi noma lwabahlinzeki.", "Sesha i-akhawunti ngegama lebhizinisi, i-imeyili yomsebenzisi, noma isimo sephrofayeli.", "Buyekeza indima, isimo sokubhalisa, isimo sokuqinisekisa, nomsebenzi wakamuva.", "Sebenzisa izinguquko zendima noma ukugeleza kokususa kuphela uma ugunyaziwe."],
      af: ["Maak die relevante admingebruiker- of verskafferslys oop.", "Soek vir die rekening volgens besigheidsnaam, gebruiker-e-pos, of profielstatus.", "Hersien rol, registrasiestatus, verifikasiestatus, en onlangse aktiwiteit.", "Pas rolveranderings of verwyderingsvloei slegs toe wanneer gemagtig."],
    },
    guidance: {
      en: [{ heading: "Access control", body: "Use the least privilege principle. Admin access should be limited to people who need governance, verification, or platform management rights." }, { heading: "Deletion care", body: "Deleting users can affect profiles, submissions, audit context, and active workflows. Confirm identity and intent before acting." }],
      zu: [{ heading: "Ukulawula ukufinyelela", body: "Sebenzisa umthetho wokunikeza amalungelo amancane adingekayo. Ukufinyelela komphathi kufanele kugcinelwe abantu abadinga amalungelo okulawula, ukuqinisekisa, noma ukuphatha iplatform." }, { heading: "Ukunakekela uma kususwa", body: "Ukususa abasebenzisi kungathinta amaphrofayeli, izicelo, umongo wokuhlola, nemisebenzi esebenzayo. Qinisekisa ubunikazi nenhloso ngaphambi kokwenza." }],
      af: [{ heading: "Toegangsbeheer", body: "Gebruik die beginsel van minste voorreg. Admintoegang moet beperk word tot mense wat bestuurs-, verifikasie-, of platformbestuursregte nodig het." }, { heading: "Versigtig met verwydering", body: "Gebruikersverwydering kan profiele, indienings, ouditkonteks, en aktiewe werkvloeie raak. Bevestig identiteit en bedoeling voor jy optree." }],
    },
    faqs: {
      en: [{ question: "Can a buyer become an admin?", answer: "Only an authorised admin should update roles after confirming governance approval." }, { question: "Can deleted users be restored?", answer: "Treat deletion as sensitive. Restoration depends on auth and database state, so escalate before deleting critical accounts." }],
      zu: [{ question: "Umthengi angaba umphathi?", answer: "Umphathi ogunyaziwe kuphela okufanele abuyekeze izindima ngemva kokuqinisekisa ukuvunywa kokulawula." }, { question: "Abasebenzisi abasusiwe bangabuyiselwa?", answer: "Phatha ukususa njengento ebucayi. Ukubuyisela kuncike ku-auth nesimo sedatabase, ngakho khuphula udaba ngaphambi kokususa ama-akhawunti abalulekile." }],
      af: [{ question: "Kan 'n koper 'n admin word?", answer: "Slegs 'n gemagtigde admin behoort rolle op te dateer nadat bestuursgoedkeuring bevestig is." }, { question: "Kan verwyderde gebruikers herstel word?", answer: "Behandel verwydering as sensitief. Herstel hang van auth en databasisstatus af, so eskaleer voordat kritieke rekeninge verwyder word." }],
    },
    pdfHref: adminGuidePdf,
  },  {
    id: "analytics-reports",
    guide: "admin",
    title: { en: "Analytics & Reports", zu: "Ukuhlaziywa Nezingxelo", af: "Analise en Verslae" },
    description: { en: "Use Spend Analysis, Compliance Report, and BBBEE Scorecard.", zu: "Sebenzisa i-Spend Analysis, i-Compliance Report, ne-BBBEE Scorecard.", af: "Gebruik Uitgawe-analise, Nakomingsverslag, en BBBEE Telkaart." },
    icon: IconFileAnalytics,
    steps: {
      en: ["Open Dashboard -> Reports or an analytics page.", "Choose Spend Analysis, Compliance Report, BBBEE Scorecard, or another report view.", "Filter by date, supplier, category, province, or status where available.", "Use report findings for review meetings, audit packs, and procurement planning."],
      zu: ["Vula Dashboard -> Reports noma ikhasi lokuhlaziya.", "Khetha Spend Analysis, Compliance Report, BBBEE Scorecard, noma omunye umbiko.", "Hlunga ngosuku, umhlinzeki, isigaba, isifunda, noma isimo lapho kutholakala khona.", "Sebenzisa okutholwe emibikweni emihlanganweni yokubuyekeza, amaphakethe okuhlola, nokuhlela ukuthenga."],
      af: ["Maak Dashboard -> Reports of 'n analiseblad oop.", "Kies Uitgawe-analise, Nakomingsverslag, BBBEE Telkaart, of 'n ander verslagbeeld.", "Filter volgens datum, verskaffer, kategorie, provinsie, of status waar beskikbaar.", "Gebruik verslagbevindinge vir hersieningsvergaderings, ouditpakke, en verkrygingsbeplanning."],
    },
    guidance: {
      en: [{ heading: "Spend Analysis", body: "Use spend views to understand supplier concentration, category distribution, and value movement across procurement activity." }, { heading: "Compliance and BBBEE", body: "Use compliance and BBBEE reporting to identify readiness gaps and support transformation-focused procurement decisions." }],
      zu: [{ heading: "Ukuhlaziywa kokusetshenziswa", body: "Sebenzisa ukubukwa kokusetshenziswa ukuze uqonde ukugxila kwabahlinzeki, ukusatshalaliswa kwezigaba, nokunyakaza kwenani emsebenzini wokuthenga." }, { heading: "Ukuhambisana ne-BBBEE", body: "Sebenzisa imibiko yokuhambisana ne-BBBEE ukubona izikhala zokulungela nokusekela izinqumo zokuthenga ezigxile ekuguqulweni." }],
      af: [{ heading: "Uitgawe-analise", body: "Gebruik uitgawe-aansigte om verskafferkonsentrasie, kategorieverspreiding, en waardebeweging oor verkrygingsaktiwiteit te verstaan." }, { heading: "Nakoming en BBBEE", body: "Gebruik nakomings- en BBBEE-verslae om gereedheidsgapings te identifiseer en transformasiegerigte verkrygingsbesluite te ondersteun." }],
    },
    faqs: {
      en: [{ question: "Why is a report empty?", answer: "The report depends on source data. Confirm RFQs, quotes, invoices, suppliers, or compliance records exist for the selected filters." }, { question: "Can I export reports?", answer: "Use available download or print flows where present. Some exports may be added as placeholders until report packs are finalised." }],
      zu: [{ question: "Kungani umbiko ungenalutho?", answer: "Umbiko uncike kudatha yomthombo. Qinisekisa ukuthi ama-RFQ, ama-quote, ama-invoice, abahlinzeki, noma amarekhodi okuhambisana akhona ezihlungini ezikhethiwe." }, { question: "Ngingakhipha imibiko?", answer: "Sebenzisa ukugeleza kokulanda noma ukuphrinta lapho kukhona. Okunye ukukhishwa kungase kufakwe njengezindawo zokubamba kuze kuphothulwe amaphakethe emibiko." }],
      af: [{ question: "Hoekom is 'n verslag leeg?", answer: "Die verslag hang van brondata af. Bevestig dat RFQ's, kwotasies, fakture, verskaffers, of nakomingsrekords vir die gekose filters bestaan." }, { question: "Kan ek verslae uitvoer?", answer: "Gebruik beskikbare aflaai- of drukvloei waar dit bestaan. Sommige uitvoere kan as plekhouers bygevoeg word totdat verslagpakke gefinaliseer is." }],
    },
    pdfHref: adminGuidePdf,
  },
  {
    id: "platform-settings",
    guide: "admin",
    title: { en: "Platform Settings", zu: "Izilungiselelo Zeplatform", af: "Platforminstellings" },
    description: { en: "Manage system settings, defaults, and email templates.", zu: "Phatha izilungiselelo zesistemu nezifanekiso ze-imeyili.", af: "Bestuur stelseline instellings en e-possjablone." },
    icon: IconSettings,
    steps: {
      en: ["Open Dashboard -> Admin -> Settings.", "Review procurement rules, supplier verification gates, SmartScore thresholds, notifications, finance controls, and appearance defaults.", "Change settings carefully and save.", "Document any policy change for audit and team awareness."],
      zu: ["Vula Dashboard -> Admin -> Settings.", "Buyekeza imithetho yokuthenga, amasango okuqinisekisa abahlinzeki, imikhawulo ye-SmartScore, izaziso, izilawuli zezimali, nezilungiselelo zokubukeka.", "Shintsha izilungiselelo ngokucophelela bese ugcina.", "Bhala noma yiluphi ushintsho lomgomo ukuze kube nokuhlolwa nokwazisa ithimba."],
      af: ["Maak Dashboard -> Admin -> Settings oop.", "Hersien verkrygingsreels, verskafferverifikasiehekke, SmartScore-drempels, kennisgewings, finansiele kontroles, en voorkomsstandaarde.", "Verander instellings versigtig en stoor.", "Dokumenteer enige beleidsverandering vir oudit en spanbewustheid."],
    },
    guidance: {
      en: [{ heading: "Governance", body: "Settings influence operational behaviour. Confirm approval before changing thresholds, payment gates, verification requirements, or notification rules." }, { heading: "Templates", body: "Email templates and message defaults should stay clear, factual, and aligned with procurement policy." }],
      zu: [{ heading: "Ukulawula", body: "Izilungiselelo zithinta indlela yokusebenza. Qinisekisa ukuvunywa ngaphambi kokushintsha imikhawulo, amasango okukhokha, izidingo zokuqinisekisa, noma imithetho yezaziso." }, { heading: "Izifanekiso", body: "Izifanekiso ze-imeyili nemilayezo emisiwe kufanele zihlale zicacile, zineqiniso, futhi zihambisana nomgomo wokuthenga." }],
      af: [{ heading: "Bestuur", body: "Instellings beinvloed operasionele gedrag. Bevestig goedkeuring voordat drempels, betalingshekke, verifikasievereistes, of kennisgewingreels verander word." }, { heading: "Sjablone", body: "E-possjablone en boodskapstandaarde moet duidelik, feitelik, en in lyn met verkrygingsbeleid bly." }],
    },
    faqs: {
      en: [{ question: "Why can I not save settings?", answer: "The platform_settings table may be missing, or your role may not have permission to update settings." }, { question: "Should settings be changed during live procurement?", answer: "Avoid changing controls mid-process unless there is a documented governance reason." }],
      zu: [{ question: "Kungani ngingakwazi ukugcina izilungiselelo?", answer: "Itafula le-platform_settings lingase lingekho, noma indima yakho ingase ingenayo imvume yokubuyekeza izilungiselelo." }, { question: "Izilungiselelo kufanele zishintshwe ngesikhathi sokuthenga okubukhoma?", answer: "Gwema ukushintsha izilawuli phakathi nenqubo ngaphandle uma kunesizathu sokulawula esibhaliwe." }],
      af: [{ question: "Hoekom kan ek nie instellings stoor nie?", answer: "Die platform_settings-tabel kan ontbreek, of jou rol het dalk nie toestemming om instellings op te dateer nie." }, { question: "Moet instellings tydens lewendige verkryging verander word?", answer: "Vermy beheerwysigings in die middel van 'n proses tensy daar 'n gedokumenteerde bestuursrede is." }],
    },
    pdfHref: adminGuidePdf,
  },
  {
    id: "admin-faqs",
    guide: "admin",
    title: { en: "Admin FAQs", zu: "Imibuzo Ejwayelekile Yomphathi", af: "Algemene Admin Vrae" },
    description: { en: "Admin-specific issues and escalation paths.", zu: "Izinkinga ezithinta umphathi nezindlela zokukhulisa.", af: "Admin-spesifieke probleme en eskaleringsroetes." },
    icon: IconAlertCircle,
    steps: {
      en: ["Confirm the user's role and the exact page they are using.", "Check whether required tables, storage buckets, or policies are configured.", "Review audit and activity records for recent changes.", "Escalate with screenshots, user ID, timestamps, and the exact error message."],
      zu: ["Qinisekisa indima yomsebenzisi nekhasi eliqondile alisebenzisayo.", "Hlola ukuthi amathebula adingekayo, ama-storage bucket, noma izinqubomgomo zilungisiwe yini.", "Buyekeza amarekhodi okuhlola nawomsebenzi ukuze ubone izinguquko zakamuva.", "Khuphula udaba ngezithombe-skrini, i-ID yomsebenzisi, izikhathi, nomlayezo wephutha oqondile."],
      af: ["Bevestig die gebruiker se rol en die presiese bladsy wat hulle gebruik.", "Kontroleer of vereiste tabelle, bergingsemers, of beleide opgestel is.", "Hersien oudit- en aktiwiteitsrekords vir onlangse veranderinge.", "Eskaleer met skermgrepe, gebruiker-ID, tydstempels, en die presiese foutboodskap."],
    },
    guidance: {
      en: [{ heading: "Escalation pack", body: "Include tenant/environment, user email, affected route, action attempted, timestamp, browser, and any Supabase or API error shown." }, { heading: "High-risk issues", body: "Escalate payment, deletion, role, verification, and award-decision issues immediately when production data is involved." }],
      zu: [{ heading: "Iphakethe lokukhuphula", body: "Faka i-tenant noma indawo, i-imeyili yomsebenzisi, umzila othintekile, isenzo esizanyiwe, isikhathi, isiphequluli, nanoma yiliphi iphutha le-Supabase noma le-API elibonisiwe." }, { heading: "Izinkinga ezinobungozi obukhulu", body: "Khuphula ngokushesha izinkinga zokukhokha, ukususa, izindima, ukuqinisekisa, nezinqumo zemiklomelo lapho kuthinteka idatha yokukhiqiza." }],
      af: [{ heading: "Eskaleringspakket", body: "Sluit tenant/omgewing, gebruiker-e-pos, geraakte roete, aksie wat probeer is, tydstempel, blaaier, en enige Supabase- of API-fout in." }, { heading: "Hoe-risiko kwessies", body: "Eskaleer betalings-, verwyderings-, rol-, verifikasie-, en toekenningsbesluitkwessies onmiddellik wanneer produksiedata betrokke is." }],
    },
    faqs: {
      en: [{ question: "Why is an admin redirected away?", answer: "The profile role may not be admin or buyer, or the auth session may have expired." }, { question: "What if a supplier disputes rejection?", answer: "Review the recorded reason, documents, and audit trail, then re-open or escalate according to policy." }],
      zu: [{ question: "Kungani umphathi eqondiswa kwenye indawo?", answer: "Indima yephrofayeli ingase ingabi admin noma buyer, noma iseshini ye-auth ingase iphelelwe yisikhathi." }, { question: "Kuthiwani uma umhlinzeki ephikisa ukwenqatshwa?", answer: "Buyekeza isizathu esirekhodiwe, amadokhumenti, nomkhondo wokuhlola, bese uvula futhi noma ukhuphule ngokomgomo." }],
      af: [{ question: "Hoekom word 'n admin weggestuur?", answer: "Die profielrol is dalk nie admin of koper nie, of die auth-sessie het dalk verval." }, { question: "Wat as 'n verskaffer afkeuring betwis?", answer: "Hersien die aangetekende rede, dokumente, en ouditspoor, en heropen of eskaleer volgens beleid." }],
    },
    pdfHref: adminGuidePdf,
  },
]

const guideLabels: { key: GuideType; label: string }[] = [
  { key: "user", label: "End User Guide" },
  { key: "admin", label: "Admin Guide" },
]
const languages: { key: Language; label: string }[] = [
  { key: "en", label: "EN" },
  { key: "zu", label: "ZU" },
  { key: "af", label: "AF" },
]

function sectionSearchText(section: HelpSection, language: Language) {
  return [
    section.title[language],
    section.description[language],
    ...section.steps[language],
    ...section.guidance[language].map((item) => `${item.heading} ${item.body}`),
    ...section.faqs[language].flatMap((faq) => [faq.question, faq.answer]),
  ].join(" ").toLowerCase()
}

export default function HelpCentrePage() {
  const [activeGuide, setActiveGuide] = useState<GuideType>("user")
  const [activeLanguage, setActiveLanguage] = useState<Language>("en")
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const expandedPanelRef = useRef<HTMLDivElement | null>(null)

  const visibleSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return helpSections.filter((section) => {
      if (section.guide !== activeGuide) return false
      if (!query) return true
      return sectionSearchText(section, activeLanguage).includes(query)
    })
  }, [activeGuide, activeLanguage, searchQuery])

  const activeSection = helpSections.find((section) => section.id === activeSectionId) ?? null
  const activeGuidePdfHref = activeGuide === "user" ? userGuidePdf : adminGuidePdf

  function openSection(sectionId: string) {
    setActiveSectionId(sectionId)
    window.setTimeout(() => {
      expandedPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
  }

  function switchGuide(guide: GuideType) {
    setActiveGuide(guide)
    setActiveSectionId(null)
    setSearchQuery("")
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] font-sans text-[#1a3a2a]">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-md border border-[#e3d8c5] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#c8a060]">AiForm Procure</p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[#1a3a2a]">Help Centre</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#53665c]">
                Everything you need to get the most out of AiForm Procure.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
              <div className="inline-flex rounded-md border border-[#1a3a2a]/15 bg-[#f0ebe0] p-1">
                {guideLabels.map((guide) => (
                  <button
                    key={guide.key}
                    type="button"
                    onClick={() => switchGuide(guide.key)}
                    className={`rounded px-4 py-2 text-sm font-bold transition ${
                      activeGuide === guide.key ? "bg-[#1a3a2a] text-[#c8a060]" : "text-[#1a3a2a] hover:bg-white"
                    }`}
                  >
                    {guide.label}
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center gap-1 rounded-md border border-[#1a3a2a]/15 bg-[#f0ebe0] p-1">
                <IconWorld className="ml-2 h-4 w-4 text-[#1a3a2a]" aria-hidden />
                {languages.map((language) => (
                  <button
                    key={language.key}
                    type="button"
                    onClick={() => setActiveLanguage(language.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      activeLanguage === language.key ? "bg-[#1a3a2a] text-[#c8a060]" : "text-[#1a3a2a] hover:bg-white"
                    }`}
                  >
                    {language.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="mt-6 block" htmlFor="help-search">
            <span className="sr-only">Search help centre</span>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6c7c72]" aria-hidden />
              <input
                id="help-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search guides, steps, FAQs, and troubleshooting..."
                className="w-full rounded-md border border-[#d8ccb8] bg-[#f8f4ec] py-3 pl-12 pr-4 text-sm font-semibold text-[#1a3a2a] outline-none transition placeholder:text-[#6c7c72] focus:border-[#5DCAA5] focus:ring-2 focus:ring-[#5DCAA5]/25"
              />
            </div>
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {visibleSections.map((section) => {
            const SectionIcon = section.icon
            const selected = activeSectionId === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => openSection(section.id)}
                className={`group rounded-md border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#c8a060] hover:shadow-md ${
                  selected ? "border-[#c8a060] ring-2 ring-[#c8a060]/20" : "border-[#e3d8c5]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5DCAA5] text-white">
                    <SectionIcon className="h-6 w-6" stroke={1.8} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-base font-semibold text-[#1a3a2a]">
                      {section.title[activeLanguage]}
                    </span>
                    <span className="mt-2 block text-[13px] leading-6 text-[#53665c]">{section.description[activeLanguage]}</span>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#c8a060] transition group-hover:gap-2">
                      View section <span aria-hidden>-&gt;</span>
                    </span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {visibleSections.length === 0 && (
          <div className="mt-6 rounded-md border border-[#e3d8c5] bg-white p-8 text-center shadow-sm">
            <IconHelpCircle className="mx-auto h-10 w-10 text-[#c8a060]" aria-hidden />
            <p className="mt-3 font-display text-xl font-semibold text-[#1a3a2a]">No help sections found</p>
            <p className="mt-2 text-sm text-[#53665c]">Try a broader search term or switch guide type.</p>
          </div>
        )}

        {activeSection && (
          <section ref={expandedPanelRef} className="mt-8 rounded-md border border-[#e3d8c5] bg-white p-5 shadow-sm sm:p-7">
            <button
              type="button"
              onClick={() => setActiveSectionId(null)}
              className="text-sm font-bold text-[#c8a060] underline-offset-4 transition hover:text-[#1a3a2a] hover:underline"
            >
              &larr; Back to Help Centre
            </button>

            <div className="mt-5 flex flex-col gap-4 border-b border-[#e3d8c5] pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#c8a060]">
                  {activeGuide === "user" ? "End User Guide" : "Admin Guide"}
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-[#1a3a2a]">
                  {activeSection.title[activeLanguage]}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-[#53665c]">{activeSection.description[activeLanguage]}</p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <a
                  href={activeGuidePdfHref}
                  target="_blank"
                  download
                  className="inline-flex w-fit items-center gap-2 rounded-md bg-[#1a3a2a] px-4 py-2.5 text-sm font-bold text-[#c8a060] transition hover:bg-[#123020]"
                >
                  <IconFileAnalytics className="h-4 w-4" aria-hidden />
                  Download PDF guide
                </a>
                <p className="max-w-xs text-xs leading-5 text-[#6c7c72] sm:text-right">
                  PDF available in English. In-app guide available in EN, ZU, and AF.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <h3 className="font-display text-xl font-semibold text-[#1a3a2a]">Steps</h3>
                <ol className="mt-4 space-y-4">
                  {activeSection.steps[activeLanguage].map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c8a060] text-sm font-bold text-[#1a3a2a]">
                        {index + 1}
                      </span>
                      <span className="pt-1 text-sm leading-7 text-[#38483f]">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-md border border-[#e3d8c5] bg-[#f8f4ec] p-5">
                <h3 className="font-display text-xl font-semibold text-[#1a3a2a]">Key guidance</h3>
                <div className="mt-4 space-y-4">
                  {activeSection.guidance[activeLanguage].map((item) => (
                    <div key={item.heading}>
                      <h4 className="text-sm font-bold text-[#1a3a2a]">{item.heading}</h4>
                      <p className="mt-1 text-sm leading-7 text-[#53665c]">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-[#e3d8c5] pt-6">
              <h3 className="font-display text-xl font-semibold text-[#1a3a2a]">FAQs & Troubleshooting</h3>
              <div className="mt-4 space-y-3">
                {activeSection.faqs[activeLanguage].map((faq) => (
                  <details key={faq.question} className="group rounded-md border border-[#e3d8c5] bg-white px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-[#1a3a2a]">
                      {faq.question}
                      <IconChevronDown className="h-4 w-4 shrink-0 text-[#c8a060] transition group-open:rotate-180" aria-hidden />
                    </summary>
                    <p className="mt-3 text-sm leading-7 text-[#53665c]">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

