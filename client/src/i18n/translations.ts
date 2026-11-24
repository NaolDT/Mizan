import type {
  BusinessCategory,
  LanguageCode,
  PaymentMethod,
  TransactionCategory,
} from "@mizan/shared";

export interface UiDictionary {
  appName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  tapToSpeak: string;
  stopAndSend: string;
  listeningNow: string;
  processingVoice: string;
  uploadingVoice: string;
  hearingVoice: string;
  thinkingVoice: string;
  speakingVoice: string;
  openDemoShop: string;
  getStarted: string;
  signIn: string;
  registerShop: string;
  signOut: string;
  dashboardTab: string;
  ledgerTab: string;
  inventoryTab: string;
  customersTab: string;
  shopSettings: string;
  todayIncome: string;
  todayExpenses: string;
  todayProfit: string;
  periodNetCashFlow: string;
  operatingProfitHint: string;
  creditReceivableHint: string;
  tillTitle: string;
  tillHint: string;
  tillEmpty: string;
  cashPositionTitle: string;
  cashPositionHint: string;
  cashCollected: string;
  cashSpent: string;
  collectionsLabel: string;
  creditSalesLabel: string;
  netCashMovement: string;
  outstandingNow: string;
  advisorTitle: string;
  advisorPositives: string;
  advisorProblems: string;
  advisorActions: string;
  noticesTitle: string;
  dismissNotice: string;
  creditsRemaining: string;
  rangeToday: string;
  rangeWeek: string;
  rangeMonth: string;
  rangeAll: string;
  recordIncome: string;
  recordExpense: string;
  askMizan: string;
  capturePhoto: string;
  cashFlowChartTitle: string;
  expenseBreakdownTitle: string;
  recentTransactionsTitle: string;
  allFilter: string;
  incomeFilter: string;
  expenseFilter: string;
  creditFilter: string;
  noTransactionsYet: string;
  confirmAction: string;
  editAction: string;
  cancelAction: string;
  confirmedBadge: string;
  cancelledBadge: string;
  pendingReviewTitle: string;
  amountLabel: string;
  categoryLabel: string;
  descriptionLabel: string;
  paymentMethodLabel: string;
  counterpartyLabel: string;
  dateLabel: string;
  saveChanges: string;
  voidEntry: string;
  exportCsv: string;
  searchPlaceholder: string;
  assistantTitle: string;
  assistantSubtitle: string;
  chatPlaceholder: string;
  autoSpeakLabel: string;
  replayAudio: string;
  ownerNameLabel: string;
  phoneLabel: string;
  emailLabel: string;
  identifierLabel: string;
  passwordLabel: string;
  shopNameLabel: string;
  shopCategoryLabel: string;
  locationLabel: string;
  preferredLangLabel: string;
  samplePrompts: string[];
  categories: Record<TransactionCategory, string>;
  paymentMethods: Record<PaymentMethod, string>;
  businessCategories: Record<BusinessCategory, string>;
}

export const TRANSLATIONS: Record<LanguageCode, UiDictionary> = {
  am: {
    appName: "Mizan",
    tagline: "በድምፅ የሚሰራ የንግድ እና የፋይናንስ ረዳት",
    heroTitle: "የሱቅዎን ገቢ፣ ወጪ እና ትርፍ በአማርኛ በድምፅ ብቻ ያስተዳድሩ",
    heroSubtitle:
      "የሂሳብ እውቀት ወይም ውስብስብ መተየብ አያስፈልግም። ለ Mizan የሸጡትን እና ያወጡትን ይንገሩት፤ ትክክለኛ ትርፍዎን ወዲያውኑ ያሳይዎታል።",
    tapToSpeak: "ተጭነው ይናገሩ",
    stopAndSend: "አቁም እና ላክ",
    listeningNow: "እያዳመጥኩ ነው... ይናገሩ",
    processingVoice: "ድምፅ በመተንተን ላይ...",
    uploadingVoice: "ድምፅ በመላክ ላይ",
    hearingVoice: "የተናገሩትን በማንበብ ላይ",
    thinkingVoice: "Mizan እያሰበ ነው",
    speakingVoice: "Mizan እየተናገረ ነው",
    openDemoShop: "የሙከራ ሱቅ ክፈት (መርካቶ ሚኒ ማርት)",
    getStarted: "አዲስ ሱቅ ይመዝግቡ",
    signIn: "ግባ",
    registerShop: "ሱቅ መዝግብ",
    signOut: "ውጣ",
    dashboardTab: "ዳሽቦርድ",
    ledgerTab: "የሂሳብ መዝገብ",
    inventoryTab: "እቃዎች",
    customersTab: "ደንበኞች",
    shopSettings: "የሱቅ መቼት",
    todayIncome: "የዛሬ ገቢ",
    todayExpenses: "የዛሬ ወጪ",
    todayProfit: "የዛሬ የተጣራ ትርፍ",
    periodNetCashFlow: "የወቅቱ የተጣራ ገንዘብ ፍሰት",
    operatingProfitHint: "የሥራ ትርፍ (ከዕቃ ግዢ በፊት)",
    creditReceivableHint: "በዱቤ የሚጠበቅ ገንዘብ",
    tillTitle: "ገቢ እንዴት ገባ",
    tillHint: "ጥሬ ገንዘብ እና ቴሌብር በሱቁ ውስጥ ናቸው። ዱቤ ገና አልተከፈለም።",
    tillEmpty: "በዚህ ጊዜ በዚህ ዘዴ የተመዘገበ ገቢ የለም።",
    cashPositionTitle: "የገንዘብ አቋም",
    cashPositionHint: "ዱቤ ሽያጭ ገቢ ነው እንጂ በሱቁ ውስጥ ያለ ገንዘብ አይደለም። የደንበኛ ክፍያ ወደ ሱቁ ይገባል እንጂ አዲስ ሽያጭ አይደለም።",
    cashCollected: "የተሰበሰበ ገንዘብ",
    cashSpent: "የወጣ ገንዘብ",
    collectionsLabel: "የዱቤ ክፍያ",
    creditSalesLabel: "ዱቤ ሽያጭ",
    netCashMovement: "የተጣራ የገንዘብ እንቅስቃሴ",
    outstandingNow: "አሁን የሚቀረው ዱቤ",
    advisorTitle: "የንግድ አማካሪ",
    advisorPositives: "ጥሩ እድገት",
    advisorProblems: "ሊጠበቁ የሚገቡ",
    advisorActions: "የሚመከሩ እርምጃዎች",
    noticesTitle: "የሱቅ ማስጠንቀቂያዎች",
    dismissNotice: "ደብቅ",
    creditsRemaining: "AI ክሬዲት",
    rangeToday: "ዛሬ",
    rangeWeek: "ባለፉት 7 ቀናት",
    rangeMonth: "በዚህ ወር",
    rangeAll: "ሁሉም",
    recordIncome: "ገቢ መዝግብ",
    recordExpense: "ወጪ መዝግብ",
    askMizan: "Mizan ን በድምፅ ጠይቅ",
    capturePhoto: "ፎቶ አንሳ",
    cashFlowChartTitle: "የዕለታዊ ገቢ እና ወጪ እንቅስቃሴ (ETB)",
    expenseBreakdownTitle: "የወጪ ክፍፍል በምድብ",
    recentTransactionsTitle: "የቅርብ ጊዜ እንቅስቃሴዎች",
    allFilter: "ሁሉም",
    incomeFilter: "ገቢ",
    expenseFilter: "ወጪ",
    creditFilter: "ዱቤ (ብድር)",
    noTransactionsYet: "ምንም የተመዘገበ እንቅስቃሴ የለም።",
    confirmAction: "አጽድቅ እና መዝግብ",
    editAction: "አስተካክል",
    cancelAction: "ሰርዝ",
    confirmedBadge: "ተመዝግቧል",
    cancelledBadge: "ተሰርዟል",
    pendingReviewTitle: "የሂሳብ ማረጋገጫ ቅድመ-ዕይታ",
    amountLabel: "መጠን (ETB)",
    categoryLabel: "ምድብ",
    descriptionLabel: "መግለጫ",
    paymentMethodLabel: "የክፍያ ዘዴ",
    counterpartyLabel: "ደንበኛ / አቅራቢ (አማራጭ)",
    dateLabel: "ቀን",
    saveChanges: "መዝግብ",
    voidEntry: "ሰርዝ (Void)",
    exportCsv: "CSV አውርድ",
    searchPlaceholder: "ግብይት ፈልግ...",
    assistantTitle: "Mizan የንግድ ረዳት",
    assistantSubtitle: "በድምፅ ወይም በጽሑፍ ገቢ/ወጪ ይመዝግቡ፣ ትርፍዎን ይጠይቁ",
    chatPlaceholder: "ለምሳሌ፦ ዛሬ 2,500 ብር ሸጫለሁ...",
    autoSpeakLabel: "የድምፅ ምላሽ",
    replayAudio: "ድምፅ ድገም",
    ownerNameLabel: "የባለቤት ስም",
    phoneLabel: "ስልክ ቁጥር (+251...)",
    emailLabel: "ኢሜይል (አማራጭ)",
    identifierLabel: "ስልክ ቁጥር ወይም ኢሜይል",
    passwordLabel: "የይለፍ ቃል",
    shopNameLabel: "የንግድ / የሱቅ ስም",
    shopCategoryLabel: "የንግድ ዘርፍ",
    locationLabel: "አካባቢ / አድራሻ",
    preferredLangLabel: "ተመራጭ ቋንቋ",
    samplePrompts: [
      "ዛሬ ከሽያጭ 3,500 ብር አግኝቻለሁ",
      "ለትራንስፖርት 450 ብር አውጥቻለሁ",
      "የዚህ ወር የተጣራ ትርፌ ስንት ነው?",
      "ምን ያህል ዘይት ቀርቷል?",
      "አበበ ስንት ብር ይቀረኛል?",
    ],
    categories: {
      SALES: "ሽያጭ",
      SERVICE_INCOME: "የአገልግሎት ገቢ",
      OTHER_INCOME: "ሌላ ገቢ",
      INVENTORY_PURCHASE: "የዕቃ ግዢ (ክምችት)",
      TRANSPORT: "ትራንስፖርት",
      RENT: "የሱቅ ኪራይ",
      UTILITIES: "መብራት፣ ውሃ እና ስልክ",
      SALARY: "ደመወዝ",
      FOOD: "ምግብ እና መስተንግዶ",
      MARKETING: "ማስታወቂያ",
      OTHER_EXPENSE: "ሌላ ወጪ",
    },
    paymentMethods: {
      CASH: "ጥሬ ገንዘብ",
      TELEBIRR: "ቴሌብር",
      BANK: "ባንክ ዝውውር",
      CREDIT: "ዱቤ (ብድር)",
    },
    businessCategories: {
      GROCERY: "ሸቀጣሸቀጥ / ሚኒ ማርት",
      RETAIL: "ችርቻሮ ሱቅ",
      CAFE_RESTAURANT: "ካፌ እና ሬስቶራንት",
      TRADER: "ነጋዴ / ገበያተኛ",
      WHOLESALE: "ጅምላ አከፋፋይ",
      SERVICE: "አገልግሎት ሰጪ",
      OTHER: "ሌላ ንግድ",
    },
  },
  om: {
    appName: "Mizan",
    tagline: "Gargaaraa Daldalaa fi Faayinaansii Sagaleen Hojjetu",
    heroTitle: "Galii, Baasii fi Bu'aa Suuqii Keessanii Sagalee Qofaan To'adhaa",
    heroSubtitle:
      "Beekumsi herregaa ykn barreessuun ulfaataan hin barbaachisu. Waan gurgurtanii fi baastan Afaan Oromootiin Mizan-tti himaa; bu'aa keessan battalumatti isiniif shallaga.",
    tapToSpeak: "Tuqiitii Dubbadhu",
    stopAndSend: "Dhaabiitii Ergi",
    listeningNow: "Dhaggeeffachaa jira... dubbadhaa",
    processingVoice: "Sagalee xiinxalaa jira...",
    uploadingVoice: "Sagalee ergaa jira",
    hearingVoice: "Waan dubbatan dhaggeeffachaa jira",
    thinkingVoice: "Mizan yaadaa jira",
    speakingVoice: "Mizan dubbachaa jira",
    openDemoShop: "Suuqii Yaalii Bani (Merkato Mini-Mart)",
    getStarted: "Suuqii Haaraa Galmeessi",
    signIn: "Seeni",
    registerShop: "Suuqii Galmeessi",
    signOut: "Ba'i",
    dashboardTab: "Daashboordii",
    ledgerTab: "Galmee Herregaa",
    inventoryTab: "Meeshaalee",
    customersTab: "Maamiltoota",
    shopSettings: "Qindaa'ina Suuqii",
    todayIncome: "Galii Har'aa",
    todayExpenses: "Baasii Har'aa",
    todayProfit: "Bu'aa Har'aa",
    periodNetCashFlow: "Sochii Maallaqaa Qulqulluu",
    operatingProfitHint: "Bu'aa Hojii (Bittaa meeshaa dura)",
    creditReceivableHint: "Maallaqa Liqaadhaan Eegamu",
    tillTitle: "Galii akkamitti seene",
    tillHint: "Maallaqni fi Telebirr suuqii keessa jiru. Liqaan amma hin kaffalamne.",
    tillEmpty: "Yeroo kana karaa kanaan galii hin galmaa'in.",
    cashPositionTitle: "Haala maallaqaa",
    cashPositionHint: "Gurgurtaa liqaa galii dha, maallaqa suuqii keessa jiru miti. Kaffaltiin maamila suuqii seena, gurgurtaa haaraa miti.",
    cashCollected: "Maallaqa walitti qabame",
    cashSpent: "Maallaqa bahu",
    collectionsLabel: "Kaffaltii liqaa",
    creditSalesLabel: "Gurgurtaa liqaa",
    netCashMovement: "Sochii maallaqaa qulqulluu",
    outstandingNow: "Liqaa amma hafaa",
    advisorTitle: "Gorsaa daldalaa",
    advisorPositives: "Guddina gaarii",
    advisorProblems: "Kan eegamuu qabu",
    advisorActions: "Tarkaanfii gorfamaa",
    noticesTitle: "Akeekkachiisa suuqii",
    dismissNotice: "Dhoksi",
    creditsRemaining: "AI kirediitii",
    rangeToday: "Har'a",
    rangeWeek: "Guyyoota 7 Darban",
    rangeMonth: "Ji'a Kana",
    rangeAll: "Hunda",
    recordIncome: "Galii Galmeessi",
    recordExpense: "Baasii Galmeessi",
    askMizan: "Mizan Sagaleen Gaafadhu",
    capturePhoto: "Suuraa kaasi",
    cashFlowChartTitle: "Sochii Galii fi Baasii Guyyaa (ETB)",
    expenseBreakdownTitle: "Qoqqoodinsa Baasii Ramaddiidhaan",
    recentTransactionsTitle: "Sochiilee Dhihoo",
    allFilter: "Hunda",
    incomeFilter: "Galii",
    expenseFilter: "Baasii",
    creditFilter: "Liqa (Dubee)",
    noTransactionsYet: "Sochiin galmaa'e hin jiru.",
    confirmAction: "Mirkaneessi & Olkaa'i",
    editAction: "Sirreessi",
    cancelAction: "Haqi",
    confirmedBadge: "Galmaa'eera",
    cancelledBadge: "Haqameera",
    pendingReviewTitle: "Mirkaneessa Galmee Herregaa",
    amountLabel: "Hanga (ETB)",
    categoryLabel: "Ramaddii",
    descriptionLabel: "Ibsa",
    paymentMethodLabel: "Haala Kaffaltii",
    counterpartyLabel: "Maamila / Dhiyeessaa",
    dateLabel: "Guyyaa",
    saveChanges: "Olkaa'i",
    voidEntry: "Haqi (Void)",
    exportCsv: "CSV buusi",
    searchPlaceholder: "Daldala barbaadi...",
    assistantTitle: "Gargaaraa Daldalaa Mizan",
    assistantSubtitle: "Sagalee ykn barreeffamaan galii/baasii galmeessaa, bu'aa gaafadhaa",
    chatPlaceholder: "Fkn: Har'a gurgurtaarraa qarshii 2,500 argadheera...",
    autoSpeakLabel: "Deebii Sagalee",
    replayAudio: "Irra Deebi'ii Dhageessisi",
    ownerNameLabel: "Maqaa Abbaa Daldalaa",
    phoneLabel: "Lakkoofsa Bilbilaa (+251...)",
    emailLabel: "Imeelii (Dirqama miti)",
    identifierLabel: "Bilbila ykn Imeelii",
    passwordLabel: "Jecha Darbii",
    shopNameLabel: "Maqaa Suuqii / Daldalaa",
    shopCategoryLabel: "Gosa Daldalaa",
    locationLabel: "Iddoo / Teessoo",
    preferredLangLabel: "Afaan Filatamaa",
    samplePrompts: [
      "Har'a gurgurtaarraa qarshii 3,500 argadheera",
      "Geejjibaaf qarshii 450 baaseera",
      "Bu'aan koo ji'a kanaa meeqa?",
      "Zayitii meeqatu hafe?",
      "Abebe birrii meeqa na hafaa?",
    ],
    categories: {
      SALES: "Gurgurtaa",
      SERVICE_INCOME: "Galii Tajaajilaa",
      OTHER_INCOME: "Galii Biroo",
      INVENTORY_PURCHASE: "Bittaa Meeshaa",
      TRANSPORT: "Geejjiba",
      RENT: "Kiraa Suuqii",
      UTILITIES: "Ibsaa, Bishaan & Bilbila",
      SALARY: "Mindaa",
      FOOD: "Nyaata",
      MARKETING: "Beeksisa",
      OTHER_EXPENSE: "Baasii Biroo",
    },
    paymentMethods: {
      CASH: "Maallaqa Harkaa",
      TELEBIRR: "Telebirr",
      BANK: "Baankii",
      CREDIT: "Liqa (Dubee)",
    },
    businessCategories: {
      GROCERY: "Suuqii Mi'a Nyaataa / Mini-Mart",
      RETAIL: "Suuqii Qinxaaboo",
      CAFE_RESTAURANT: "Kaaffee fi Mana Nyaataa",
      TRADER: "Daldalaa",
      WHOLESALE: "Raabsaa Jumlaa",
      SERVICE: "Tajaajila",
      OTHER: "Daldala Biroo",
    },
  },
  en: {
    appName: "Mizan",
    tagline: "Voice-First Business & Financial Assistant",
    heroTitle: "Manage Your Shop's Sales, Expenses & Profit Naturally by Voice",
    heroSubtitle:
      "Built for Ethiopian merchants and micro-businesses. Speak in Amharic, Afaan Oromo, or English—Mizan records validated transactions and calculates exact real-time profit.",
    tapToSpeak: "Tap & Speak",
    stopAndSend: "Stop & Send",
    listeningNow: "Listening... Speak clearly",
    processingVoice: "Processing speech...",
    uploadingVoice: "Sending your voice",
    hearingVoice: "Reading what you said",
    thinkingVoice: "Mizan is thinking",
    speakingVoice: "Mizan is speaking",
    openDemoShop: "Open Demo Shop (Merkato Mini-Mart)",
    getStarted: "Create Shop Account",
    signIn: "Sign In",
    registerShop: "Create Shop",
    signOut: "Sign Out",
    dashboardTab: "Dashboard",
    ledgerTab: "Transactions",
    inventoryTab: "Inventory",
    customersTab: "Customers",
    shopSettings: "Shop Settings",
    todayIncome: "Today's Income",
    todayExpenses: "Today's Expenses",
    todayProfit: "Today's Net Profit",
    periodNetCashFlow: "Period Net Cash Flow",
    operatingProfitHint: "Operating Profit (excl. restock)",
    creditReceivableHint: "Uncollected Credit Sales",
    tillTitle: "How money came in",
    tillHint: "Cash and Telebirr are in the shop. Credit sales are still owed.",
    tillEmpty: "No income recorded this way in this period.",
    cashPositionTitle: "Cash position",
    cashPositionHint: "A credit sale is income, not money in the shop. A customer payment is cash in, not a new sale.",
    cashCollected: "Cash collected",
    cashSpent: "Cash spent",
    collectionsLabel: "Debt collections",
    creditSalesLabel: "Credit sales",
    netCashMovement: "Net cash movement",
    outstandingNow: "Still owed to you",
    advisorTitle: "Business advisor",
    advisorPositives: "Going well",
    advisorProblems: "Watch these",
    advisorActions: "Recommended actions",
    noticesTitle: "Shop alerts",
    dismissNotice: "Dismiss",
    creditsRemaining: "AI credits",
    rangeToday: "Today",
    rangeWeek: "Last 7 Days",
    rangeMonth: "This Month",
    rangeAll: "All Time",
    recordIncome: "Record Income",
    recordExpense: "Record Expense",
    askMizan: "Voice / Ask Mizan",
    capturePhoto: "Capture photo",
    cashFlowChartTitle: "Daily Income vs. Expenses (ETB)",
    expenseBreakdownTitle: "Expense Breakdown by Category",
    recentTransactionsTitle: "Recent Transactions",
    allFilter: "All",
    incomeFilter: "Income",
    expenseFilter: "Expenses",
    creditFilter: "Credit IOUs",
    noTransactionsYet: "No transactions recorded for this filter yet.",
    confirmAction: "Confirm & Save",
    editAction: "Edit",
    cancelAction: "Cancel",
    confirmedBadge: "Saved to Ledger",
    cancelledBadge: "Cancelled",
    pendingReviewTitle: "Confirm Transaction Preview",
    amountLabel: "Amount (ETB)",
    categoryLabel: "Category",
    descriptionLabel: "Description",
    paymentMethodLabel: "Payment Method",
    counterpartyLabel: "Customer / Supplier (Optional)",
    dateLabel: "Date",
    saveChanges: "Save Entry",
    voidEntry: "Void",
    exportCsv: "Export CSV",
    searchPlaceholder: "Search transactions...",
    assistantTitle: "Mizan Business Assistant",
    assistantSubtitle: "Speak or type to record sales/expenses and ask about your shop",
    chatPlaceholder: "e.g., I sold 2,500 birr of goods today...",
    autoSpeakLabel: "Voice Replies",
    replayAudio: "Replay Voice",
    ownerNameLabel: "Owner Full Name",
    phoneLabel: "Phone Number (+251...)",
    emailLabel: "Email (Optional)",
    identifierLabel: "Phone Number or Email",
    passwordLabel: "Password",
    shopNameLabel: "Business / Shop Name",
    shopCategoryLabel: "Business Category",
    locationLabel: "Location / Market",
    preferredLangLabel: "Preferred Language",
    samplePrompts: [
      "I earned 3,500 birr from sales today",
      "I spent 450 birr on transportation",
      "What is my net profit this month?",
      "How many bottles of oil do I have?",
      "How much does Abebe owe me?",
    ],
    categories: {
      SALES: "Product Sales",
      SERVICE_INCOME: "Service Revenue",
      OTHER_INCOME: "Other Income",
      INVENTORY_PURCHASE: "Inventory Restock",
      TRANSPORT: "Transportation",
      RENT: "Shop Rent",
      UTILITIES: "Utilities & Data",
      SALARY: "Salaries",
      FOOD: "Food & Refreshments",
      MARKETING: "Marketing",
      OTHER_EXPENSE: "Other Expense",
    },
    paymentMethods: {
      CASH: "Cash",
      TELEBIRR: "Telebirr",
      BANK: "Bank Transfer",
      CREDIT: "Credit (IOU)",
    },
    businessCategories: {
      GROCERY: "Grocery / Mini-Mart",
      RETAIL: "Retail Shop",
      CAFE_RESTAURANT: "Cafe & Restaurant",
      TRADER: "Market Trader",
      WHOLESALE: "Wholesaler",
      SERVICE: "Service Business",
      OTHER: "Other Business",
    },
  },
};

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  am: "አማርኛ",
  om: "Afaan Oromoo",
  en: "English",
};
