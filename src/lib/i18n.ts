"use client"

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export const LANGUAGE_STORAGE_KEY = "monate-language"

export const languages = [
  { code: "en", name: "English" },
  { code: "af", name: "Afrikaans" },
  { code: "nr", name: "isiNdebele" },
  { code: "xh", name: "isiXhosa" },
  { code: "zu", name: "isiZulu" },
  { code: "nso", name: "Sepedi" },
  { code: "st", name: "Sesotho" },
  { code: "tn", name: "Setswana" },
  { code: "ss", name: "siSwati" },
  { code: "ve", name: "Tshivenda" },
  { code: "ts", name: "Xitsonga" },
] as const

export type LanguageCode = (typeof languages)[number]["code"]

export type TranslationKey =
  | "home"
  | "dashboard"
  | "rfqs"
  | "quotes"
  | "myQuotes"
  | "supplierDirectory"
  | "supplierProfile"
  | "verification"
  | "createRFQ"
  | "quoteReview"
  | "verificationReview"
  | "analytics"
  | "activityLog"
  | "purchaseOrders"
  | "savedSuppliers"
  | "savedRFQs"
  | "supplierLogin"
  | "registerSupplier"
  | "logout"
  | "submitQuote"
  | "viewRFQ"
  | "viewProfile"
  | "search"
  | "filter"
  | "status"
  | "province"
  | "industry"
  | "budget"
  | "deadline"
  | "amount"
  | "workingDays"
  | "uploadDocument"
  | "save"
  | "cancel"
  | "language"

export const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: {
    home: "Home",
    dashboard: "Dashboard",
    rfqs: "RFQs",
    quotes: "Quotes",
    myQuotes: "My Quotes",
    supplierDirectory: "Supplier Directory",
    supplierProfile: "Supplier Profile",
    verification: "Verification",
    createRFQ: "Create RFQ",
    quoteReview: "Quote Review",
    verificationReview: "Verification Review",
    analytics: "Analytics",
    activityLog: "Activity Log",
    purchaseOrders: "Purchase Orders",
    savedSuppliers: "Saved Suppliers",
    savedRFQs: "Saved RFQs",
    supplierLogin: "Supplier Login",
    registerSupplier: "Register Supplier",
    logout: "Logout",
    submitQuote: "Submit Quote",
    viewRFQ: "View RFQ",
    viewProfile: "View Profile",
    search: "Search",
    filter: "Filter",
    status: "Status",
    province: "Province",
    industry: "Industry",
    budget: "Budget",
    deadline: "Deadline",
    amount: "Amount",
    workingDays: "Working days",
    uploadDocument: "Upload Document",
    save: "Save",
    cancel: "Cancel",
    language: "Language",
  },
  af: {
    home: "Tuis",
    dashboard: "Kontrolepaneel",
    rfqs: "RFQ's",
    quotes: "Kwotasies",
    myQuotes: "My Kwotasies",
    supplierDirectory: "Verskaffersgids",
    supplierProfile: "Verskafferprofiel",
    verification: "Verifikasie",
    createRFQ: "Skep RFQ",
    quoteReview: "Kwotasie-oorsig",
    verificationReview: "Verifikasie-oorsig",
    analytics: "Analise",
    activityLog: "Aktiwiteitslog",
    purchaseOrders: "Aankoopbestellings",
    savedSuppliers: "Gestoorde Verskaffers",
    savedRFQs: "Gestoorde RFQs",
    supplierLogin: "Verskaffer-aanmelding",
    registerSupplier: "Registreer Verskaffer",
    logout: "Meld af",
    submitQuote: "Dien Kwotasie In",
    viewRFQ: "Bekyk RFQ",
    viewProfile: "Bekyk Profiel",
    search: "Soek",
    filter: "Filter",
    status: "Status",
    province: "Provinsie",
    industry: "Bedryf",
    budget: "Begroting",
    deadline: "Sperdatum",
    amount: "Bedrag",
    workingDays: "Werksdae",
    uploadDocument: "Laai Dokument Op",
    save: "Stoor",
    cancel: "Kanselleer",
    language: "Taal",
  },
  nr: {
    home: "Ekhaya",
    dashboard: "Ideshibhodi",
    rfqs: "Ama-RFQ",
    quotes: "Amakhowuthi",
    myQuotes: "Amakhowuthi Wami",
    supplierDirectory: "Irhelo Labanikeli",
    supplierProfile: "Iphrofayela Yomnikeli",
    verification: "Ukuqinisekiswa",
    createRFQ: "Yakha i-RFQ",
    quoteReview: "Ukubuyekezwa Kwekhowuthi",
    verificationReview: "Ukubuyekezwa Kokuqinisekiswa",
    analytics: "Ukuhlaziya",
    activityLog: "Irekhodi Lomsebenzi",
    purchaseOrders: "Ama-oda Wokuthenga",
    savedSuppliers: "Abanikeli Abagciniwe",
    savedRFQs: "Ama-RFQ Agciniwe",
    supplierLogin: "Ukungena Komnikeli",
    registerSupplier: "Bhalisa Umnikeli",
    logout: "Phuma",
    submitQuote: "Thumela Ikhowuthi",
    viewRFQ: "Buka i-RFQ",
    viewProfile: "Buka Iphrofayela",
    search: "Sesha",
    filter: "Hlunga",
    status: "Isimo",
    province: "Isifundazwe",
    industry: "Imboni",
    budget: "Ibhajethi",
    deadline: "Umnqamulajuqu",
    amount: "Inani",
    workingDays: "Amalanga wokusebenza",
    uploadDocument: "Layisha Idokhumenti",
    save: "Gcina",
    cancel: "Khansela",
    language: "Ilimi",
  },
  xh: {
    home: "Ekhaya",
    dashboard: "Ideshibhodi",
    rfqs: "Ii-RFQ",
    quotes: "Iikowuti",
    myQuotes: "Iikowuti Zam",
    supplierDirectory: "Uluhlu Lwababoneleli",
    supplierProfile: "Iprofayili Yomboneleli",
    verification: "Uqinisekiso",
    createRFQ: "Yenza i-RFQ",
    quoteReview: "Uphononongo Lwekowuti",
    verificationReview: "Uphononongo Loqinisekiso",
    analytics: "Uhlalutyo",
    activityLog: "Ingxelo Yomsebenzi",
    purchaseOrders: "Iiodolo Zokuthenga",
    savedSuppliers: "Ababoneleli Abagciniweyo",
    savedRFQs: "ii-RFQ Ezigciniweyo",
    supplierLogin: "Ngena Njengomboneleli",
    registerSupplier: "Bhalisa Umboneleli",
    logout: "Phuma",
    submitQuote: "Ngenisa Ikowuti",
    viewRFQ: "Jonga i-RFQ",
    viewProfile: "Jonga Iprofayili",
    search: "Khangela",
    filter: "Hluza",
    status: "Isimo",
    province: "Iphondo",
    industry: "Ishishini",
    budget: "Uhlahlo-lwabiwo",
    deadline: "Umhla wokugqibela",
    amount: "Isixa",
    workingDays: "Iintsuku zokusebenza",
    uploadDocument: "Layisha Uxwebhu",
    save: "Gcina",
    cancel: "Rhoxisa",
    language: "Ulwimi",
  },
  zu: {
    home: "Ekhaya",
    dashboard: "Ideshibhodi",
    rfqs: "Ama-RFQ",
    quotes: "Amakhotheshini",
    myQuotes: "Amakhotheshini Ami",
    supplierDirectory: "Uhlu Lwabaphakeli",
    supplierProfile: "Iphrofayela Yomphakeli",
    verification: "Ukuqinisekisa",
    createRFQ: "Dala i-RFQ",
    quoteReview: "Ukubuyekezwa Kwekhotheshini",
    verificationReview: "Ukubuyekezwa Kokuqinisekisa",
    analytics: "Ukuhlaziya",
    activityLog: "Ilogi Yomsebenzi",
    purchaseOrders: "Ama-oda Okuthenga",
    savedSuppliers: "Abaphakeli Abagciniwe",
    savedRFQs: "Ama-RFQ Agciniwe",
    supplierLogin: "Ukungena Komphakeli",
    registerSupplier: "Bhalisa Umphakeli",
    logout: "Phuma",
    submitQuote: "Thumela Ikhotheshini",
    viewRFQ: "Buka i-RFQ",
    viewProfile: "Buka Iphrofayela",
    search: "Sesha",
    filter: "Hlunga",
    status: "Isimo",
    province: "Isifundazwe",
    industry: "Imboni",
    budget: "Isabelomali",
    deadline: "Umnqamulajuqu",
    amount: "Inani",
    workingDays: "Izinsuku zokusebenza",
    uploadDocument: "Layisha Idokhumenti",
    save: "Londoloza",
    cancel: "Khansela",
    language: "Ulimi",
  },
  nso: {
    home: "Gae",
    dashboard: "Letlapa la Taolo",
    rfqs: "Di-RFQ",
    quotes: "Dikhoutheishene",
    myQuotes: "Dikhoutheishene Tsaka",
    supplierDirectory: "Lenaneo la Bafepedi",
    supplierProfile: "Profaele ya Mofepedi",
    verification: "Netefatso",
    createRFQ: "Hlama RFQ",
    quoteReview: "Tshekatsheko ya Khoutheishene",
    verificationReview: "Tshekatsheko ya Netefatso",
    analytics: "Tshekatsheko ya Datha",
    activityLog: "Loge ya Mediro",
    purchaseOrders: "Ditaelo tsa Theko",
    savedSuppliers: "Bafepedi ba Bolokilwego",
    savedRFQs: "Di-RFQ tse Bolokilwego",
    supplierLogin: "Tsena bjalo ka Mofepedi",
    registerSupplier: "Ngwadisa Mofepedi",
    logout: "Tswa",
    submitQuote: "Romela Khoutheishene",
    viewRFQ: "Lebelela RFQ",
    viewProfile: "Lebelela Profaele",
    search: "Nyaka",
    filter: "Sefa",
    status: "Maemo",
    province: "Profense",
    industry: "Intasteri",
    budget: "Tekanyetsokabo",
    deadline: "Letsatsi la mafelelo",
    amount: "Tshelete",
    workingDays: "Matsatsi a mosomo",
    uploadDocument: "Laetsa Tokumente",
    save: "Boloka",
    cancel: "Khansela",
    language: "Leleme",
  },
  st: {
    home: "Lapeng",
    dashboard: "Boto ya Taolo",
    rfqs: "Di-RFQ",
    quotes: "Dikhoutheishene",
    myQuotes: "Dikhoutheishene Tsa Ka",
    supplierDirectory: "Lenane la Bafani",
    supplierProfile: "Profaele ya Mofani",
    verification: "Netefatso",
    createRFQ: "Theha RFQ",
    quoteReview: "Tlhahlobo ya Khoutheishene",
    verificationReview: "Tlhahlobo ya Netefatso",
    analytics: "Tshekatsheko",
    activityLog: "Log ya Mesebetsi",
    purchaseOrders: "Ditaelo tsa Theko",
    savedSuppliers: "Bafani ba Bolokilweng",
    savedRFQs: "Di-RFQ tse Bolokilweng",
    supplierLogin: "Kena Jwalo ka Mofani",
    registerSupplier: "Ngodisa Mofani",
    logout: "Tsoa",
    submitQuote: "Romela Khoutheishene",
    viewRFQ: "Sheba RFQ",
    viewProfile: "Sheba Profaele",
    search: "Batla",
    filter: "Sefa",
    status: "Boemo",
    province: "Porofense",
    industry: "Indasteri",
    budget: "Tekanyetso",
    deadline: "Nako ya ho qetela",
    amount: "Chelete",
    workingDays: "Matsatsi a mosebetsi",
    uploadDocument: "Kenya Tokomane",
    save: "Boloka",
    cancel: "Hlakola",
    language: "Puo",
  },
  tn: {
    home: "Gae",
    dashboard: "Boto ya Taolo",
    rfqs: "Di-RFQ",
    quotes: "Dikhoute",
    myQuotes: "Dikhoute Tsa Me",
    supplierDirectory: "Lenane la Batlamedi",
    supplierProfile: "Porofaele ya Motlamedi",
    verification: "Netefatso",
    createRFQ: "Tlhama RFQ",
    quoteReview: "Tshekatsheko ya Khoute",
    verificationReview: "Tshekatsheko ya Netefatso",
    analytics: "Tshekatsheko",
    activityLog: "Loko ya Ditiro",
    purchaseOrders: "Ditaelo tsa Theko",
    savedSuppliers: "Batlamedi ba ba Bolokilweng",
    savedRFQs: "Di-RFQ tse Bolokilweng",
    supplierLogin: "Tsena jaaka Motlamedi",
    registerSupplier: "Kwadisa Motlamedi",
    logout: "Tswa",
    submitQuote: "Romela Khoute",
    viewRFQ: "Leba RFQ",
    viewProfile: "Leba Porofaele",
    search: "Batla",
    filter: "Sefa",
    status: "Maemo",
    province: "Porofense",
    industry: "Indasteri",
    budget: "Tekanyetsokabo",
    deadline: "Letlha la bofelo",
    amount: "Palogotlhe",
    workingDays: "Malatsi a tiro",
    uploadDocument: "Tsenya Tokomane",
    save: "Boloka",
    cancel: "Khansela",
    language: "Puo",
  },
  ss: {
    home: "Ekhaya",
    dashboard: "Ideshibhodi",
    rfqs: "Ema-RFQ",
    quotes: "Ema khotheyishini",
    myQuotes: "Ema khotheyishini Ami",
    supplierDirectory: "Luhla Lwebahlinzeki",
    supplierProfile: "Iphrofayili Yemhlinzeki",
    verification: "Kucinisekiswa",
    createRFQ: "Dala i-RFQ",
    quoteReview: "Kubuyeketa Ikhotheyishini",
    verificationReview: "Kubuyeketa Kucinisekiswa",
    analytics: "Kuhlatiya",
    activityLog: "Ilogi Yemsebenti",
    purchaseOrders: "Ema-oda Ekutsenga",
    savedSuppliers: "Bahlinzeki Labagciniwe",
    savedRFQs: "Ema-RFQ Lagciniwe",
    supplierLogin: "Ngena Njengemhlinzeki",
    registerSupplier: "Bhalisa Umhlinzeki",
    logout: "Phuma",
    submitQuote: "Tfumelela Ikhotheyishini",
    viewRFQ: "Buka i-RFQ",
    viewProfile: "Buka Iphrofayili",
    search: "Sesha",
    filter: "Hlunga",
    status: "Simo",
    province: "Sifundza",
    industry: "Imboni",
    budget: "Sabelomali",
    deadline: "Umncele wesikhatsi",
    amount: "Inani",
    workingDays: "Emalanga ekusebenta",
    uploadDocument: "Layisha Idokhumenti",
    save: "Gcina",
    cancel: "Khansela",
    language: "Lulwimi",
  },
  ve: {
    home: "Hayani",
    dashboard: "Bodo ya Ndangulo",
    rfqs: "Dzi-RFQ",
    quotes: "Dzi khotheisheni",
    myQuotes: "Dzi khotheisheni Dzanga",
    supplierDirectory: "Mutevhe wa Vhanetshedzi",
    supplierProfile: "Phurofaili ya Munetshedzi",
    verification: "U Khwathisedza",
    createRFQ: "Sika RFQ",
    quoteReview: "U Sedzulusa Khotheisheni",
    verificationReview: "U Sedzulusa Khwathisedzo",
    analytics: "Tsenguluso",
    activityLog: "Logi ya Mishumo",
    purchaseOrders: "Oda dza u Renga",
    savedSuppliers: "Vhanetshedzi vho Vhulungwaho",
    savedRFQs: "Dzi-RFQ dzo Vhulungwaho",
    supplierLogin: "U Dzhena ha Munetshedzi",
    registerSupplier: "Nwalisa Munetshedzi",
    logout: "Buda",
    submitQuote: "Rumelani Khotheisheni",
    viewRFQ: "Lavhelesa RFQ",
    viewProfile: "Lavhelesa Phurofaili",
    search: "Toda",
    filter: "Sefa",
    status: "Tshiimo",
    province: "Vundu",
    industry: "Indasitiri",
    budget: "Mugaganyagwama",
    deadline: "Datumu ya u fhedza",
    amount: "Mutengo",
    workingDays: "Maduvha a mushumo",
    uploadDocument: "Longelani Dokhumente",
    save: "Vhulunga",
    cancel: "Fhelisani",
    language: "Luambo",
  },
  ts: {
    home: "Kaya",
    dashboard: "Bodo ya Vulawuri",
    rfqs: "Ti-RFQ",
    quotes: "Tikowuti",
    myQuotes: "Tikowuti Ta Mina",
    supplierDirectory: "Nxaxamelo wa Vaphakeri",
    supplierProfile: "Phurofayili ya Muphakeri",
    verification: "Ku Tiyisisa",
    createRFQ: "Endla RFQ",
    quoteReview: "Nkambisiso wa Kowuti",
    verificationReview: "Nkambisiso wa Ku Tiyisisa",
    analytics: "Nxopaxopo",
    activityLog: "Logi ya Mintirho",
    purchaseOrders: "Ti-oda ta ku Xava",
    savedSuppliers: "Vaphakeri lava Hlayisiweke",
    savedRFQs: "Ti-RFQ ta Hlayisiweke",
    supplierLogin: "Nghena tani hi Muphakeri",
    registerSupplier: "Tsarisa Muphakeri",
    logout: "Huma",
    submitQuote: "Rhumela Kowuti",
    viewRFQ: "Languta RFQ",
    viewProfile: "Languta Phurofayili",
    search: "Lava",
    filter: "Sefa",
    status: "Xiyimo",
    province: "Xifundzankulu",
    industry: "Indasitiri",
    budget: "Mpimanyeto",
    deadline: "Siku ro hetelela",
    amount: "Ntsengo",
    workingDays: "Masiku ya ntchito",
    uploadDocument: "Layisha Dokhumente",
    save: "Hlayisa",
    cancel: "Khansela",
    language: "Ririmi",
  },
}

type I18nContextValue = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function isLanguageCode(value: string | null): value is LanguageCode {
  return languages.some((language) => language.code === value)
}

export function getLanguageName(code: LanguageCode): string {
  return languages.find((language) => language.code === code)?.name ?? "English"
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en")

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)

    if (isLanguageCode(storedLanguage)) {
      setLanguageState(storedLanguage)
      document.documentElement.lang = storedLanguage
    }
  }, [])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (
        event.key === LANGUAGE_STORAGE_KEY &&
        isLanguageCode(event.newValue)
      ) {
        setLanguageState(event.newValue)
        document.documentElement.lang = event.newValue
      }
    }

    window.addEventListener("storage", handleStorage)

    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const value = useMemo<I18nContextValue>(() => {
    function setLanguage(nextLanguage: LanguageCode) {
      setLanguageState(nextLanguage)
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
      document.documentElement.lang = nextLanguage
    }

    function t(key: TranslationKey) {
      return translations[language][key] ?? translations.en[key]
    }

    return {
      language,
      setLanguage,
      t,
    }
  }, [language])

  return createElement(I18nContext.Provider, { value }, children)
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.")
  }

  return context
}
