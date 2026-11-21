import type { LanguageCode } from "@mizan/shared";

interface TitledText {
  title: string;
  body: string;
}

export interface LandingCopy {
  meta: { title: string; description: string };
  nav: {
    home: string;
    features: string;
    how: string;
    businesses: string;
    about: string;
    signIn: string;
    dashboard: string;
    getStarted: string;
    openMenu: string;
    closeMenu: string;
    language: string;
    mainNav: string;
    skip: string;
  };
  common: { illustrative: string; tryDemo: string; demoStarting: string; demoError: string };
  hero: {
    badge: string;
    title: [string, string, string];
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  preview: {
    shop: string;
    greeting: string;
    period: string;
    income: string;
    expenses: string;
    profit: string;
    transactions: string;
    assistant: string;
    userMessage: string;
    reply: string;
    draftType: string;
    draftCategory: string;
    confirm: string;
    stepVoice: string;
    stepUnderstand: string;
    stepRecord: string;
    stepInsight: string;
    insight: string;
  };
  valueStrip: [string, string, string, string, string];
  problem: { title: string; subtitle: string; cards: TitledText[] };
  solution: {
    title: string;
    subtitle: string;
    tabsLabel: string;
    tabs: { label: string; title: string; body: string }[];
    voiceExample: string;
    insightQuestion: string;
    insightAnswer: string;
    managementItems: TitledText[];
    sales: string;
    income: string;
  };
  how: { title: string; subtitle: string; step: string; steps: TitledText[] };
  voice: {
    title: string;
    body: string;
    points: string[];
    tap: string;
    listening: string;
    understanding: string;
    ready: string;
    confirm: string;
    recorded: string;
    amount: string;
    category: string;
    categoryValue: string;
    date: string;
    dateValue: string;
    again: string;
    utterance: string;
    demoNote: string;
    micLabel: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    chartTitle: string;
    days: string[];
    income: string;
    expenses: string;
    profit: string;
    transactions: string;
    recentTitle: string;
    recent: string[];
    insightsTitle: string;
    insights: string[];
    quickTitle: string;
    quick: string[];
    chartLabel: string;
  };
  benefits: { title: string; about: string; cards: TitledText[] };
  audience: { title: string; subtitle: string; cards: TitledText[] };
  referral: { title: string; body: string; steps: TitledText[]; note: string; cta: string };
  faq: { title: string; items: { q: string; a: string }[] };
  finalCta: { title: string; body: string; primary: string; secondary: string };
  footer: {
    description: string;
    navTitle: string;
    nav: { home: string; features: string; how: string; about: string };
    productTitle: string;
    product: { dashboard: string; assistant: string; tracking: string; voice: string };
    legalTitle: string;
    privacy: string;
    terms: string;
    copyright: string;
  };
  info: { privacyTitle: string; termsTitle: string; body: string; back: string };
}

const en: LandingCopy = {
  meta: {
    title: "Mizan AI | Your Intelligent Business Assistant",
    description:
      "Mizan helps Ethiopian businesses manage finances, track transactions, understand business performance, and interact with an intelligent business assistant in local languages.",
  },
  nav: {
    home: "Home",
    features: "Features",
    how: "How It Works",
    businesses: "For Businesses",
    about: "About Mizan",
    signIn: "Sign In",
    dashboard: "Dashboard",
    getStarted: "Get Started",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
    mainNav: "Main navigation",
    skip: "Skip to main content",
  },
  common: {
    illustrative: "Illustrative example",
    tryDemo: "or open the demo shop",
    demoStarting: "Opening demo shop...",
    demoError: "Could not open the demo shop. Please try again.",
  },
  hero: {
    badge: "Amharic · Afaan Oromo · English",
    title: ["Your Business.", "Your Language.", "Your Intelligence."],
    subtitle:
      "Mizan helps you understand your business finances, track transactions, manage daily operations, and make smarter decisions — using simple conversations in your own language, including Amharic and Afaan Oromo.",
    ctaPrimary: "Get Started Free",
    ctaSecondary: "Explore How It Works",
  },
  preview: {
    shop: "Your shop",
    greeting: "Good morning! Here's your business summary.",
    period: "This week",
    income: "Income",
    expenses: "Expenses",
    profit: "Net profit",
    transactions: "Transactions",
    assistant: "Mizan assistant",
    userMessage: "I bought 500 birr worth of stock today.",
    reply: "A 500 ETB expense is ready to record. Please confirm if it is correct.",
    draftType: "Expense",
    draftCategory: "Inventory purchase",
    confirm: "Confirm",
    stepVoice: "Voice input",
    stepUnderstand: "Understanding",
    stepRecord: "Record",
    stepInsight: "Insights",
    insight: "Spending looks steady compared with your income this week.",
  },
  valueStrip: [
    "Built for Ethiopian businesses",
    "Amharic & Afaan Oromo support",
    "Voice, camera and text",
    "Simple financial management",
    "AI-powered business insights",
  ],
  problem: {
    title: "Running a Business Shouldn't Be Complicated.",
    subtitle: "Many business owners do the hard work every day, but their tools don't speak their language.",
    cards: [
      {
        title: "Manual Record Keeping",
        body: "Many businesses still rely on notebooks, memory, or scattered records to track their money.",
      },
      {
        title: "Financial Confusion",
        body: "Knowing how much you earn, spend, and actually profit isn't always easy.",
      },
      {
        title: "Language Barriers",
        body: "Most business tools aren't designed around the languages people naturally speak.",
      },
      {
        title: "Limited Business Insights",
        body: "Business owners often make decisions without understanding their financial patterns.",
      },
    ],
  },
  solution: {
    title: "Meet Mizan — Your Intelligent Business Companion.",
    subtitle: "Everyday business management, made simple enough to do by talking.",
    tabsLabel: "Mizan features",
    tabs: [
      {
        label: "Voice recording",
        title: "Voice-Powered Financial Recording",
        body: "Record income and expenses with natural voice commands. Mizan understands what you said, shows you a clear entry, and records it once you confirm.",
      },
      {
        label: "Camera capture",
        title: "Photograph Products and Receipts",
        body: "Point the camera at products or a supplier receipt. Mizan matches items to this shop's catalog and prices, then waits for you to review and confirm before anything is recorded.",
      },
      {
        label: "Local languages",
        title: "Local Language AI",
        body: "Talk to Mizan the way you talk in your shop. Amharic and Afaan Oromo are supported, along with English, because the product is designed around local users and local business realities.",
      },
      {
        label: "Financial tracking",
        title: "Smart Financial Tracking",
        body: "Follow your income, expenses, profit, transactions and trends in one clear dashboard. Totals are calculated exactly by Mizan, never guessed by the AI.",
      },
      {
        label: "Business insights",
        title: "AI Business Insights",
        body: "Ask questions about your recorded numbers and get answers in plain language: daily summaries, expense patterns, income trends and more.",
      },
      {
        label: "Business management",
        title: "Business Management",
        body: "Keep your daily money activity organized in one place instead of notebooks and memory.",
      },
    ],
    voiceExample: "Today I sold products worth 2,500 birr.",
    insightQuestion: "How much did I earn this week?",
    insightAnswer: "Your recorded income this week is 18,500 ETB, with expenses of 6,200 ETB.",
    managementItems: [
      { title: "Transaction tracking", body: "Income and expenses with categories and payment methods." },
      { title: "Credit sales", body: "Keep track of money customers still owe you." },
      { title: "Daily summaries", body: "See how each day, week and month is going." },
      { title: "Edit and void", body: "Correct mistakes and keep a clear activity record." },
    ],
    sales: "Sales",
    income: "Income",
  },
  how: {
    title: "Start Managing Your Business in Minutes.",
    subtitle: "Three simple steps from sign-up to clear answers.",
    step: "Step",
    steps: [
      { title: "Create Your Account", body: "Create your Mizan account and set up your business." },
      {
        title: "Speak, Photograph or Type",
        body: "Record daily income and expenses with voice, a product photo, or text. You always review the entry before it is saved.",
      },
      {
        title: "Understand Your Business",
        body: "Get clear financial summaries, insights, and answers to your business questions.",
      },
    ],
  },
  voice: {
    title: "Your Voice Is Your Interface.",
    body: "Forget complicated forms and difficult financial terminology. Simply tell Mizan what happened in your business.",
    points: [
      "Speak in Amharic, Afaan Oromo or English",
      "You always confirm before anything is recorded",
      "Replies can be read aloud to you",
    ],
    tap: "Tap to try the demo",
    listening: "Listening...",
    understanding: "Understanding what you said...",
    ready: "Ready to record",
    confirm: "Confirm",
    recorded: "Income recorded successfully",
    amount: "Amount",
    category: "Category",
    categoryValue: "Sales",
    date: "Date",
    dateValue: "Today",
    again: "Play the demo again",
    utterance: "Today I received 1,200 birr from a customer.",
    demoNote: "This panel is a scripted preview. It is not connected to your account. Open the demo shop to try the real voice assistant.",
    micLabel: "Start the voice demo",
  },
  dashboard: {
    title: "Everything Your Business Needs to Know. In One Place.",
    subtitle: "Your money, your transactions and your trends, on one clear screen.",
    chartTitle: "Income vs expenses",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    income: "Total income",
    expenses: "Total expenses",
    profit: "Net profit",
    transactions: "Transactions",
    recentTitle: "Recent transactions",
    recent: ["Flour and oil sales", "Wholesale restock", "Coffee and sugar sales", "Transport"],
    insightsTitle: "Business insights",
    insights: ["Sales were strongest on Saturday.", "Stock purchases are your biggest expense."],
    quickTitle: "Quick actions",
    quick: ["Record income", "Record expense", "Ask Mizan"],
    chartLabel: "Bar chart comparing income and expenses for each day of the week",
  },
  benefits: {
    title: "Built Around the Way You Do Business.",
    about:
      "Mizan is an intelligent business companion for Ethiopian entrepreneurs. We believe good financial tools should speak your language and be simple enough for everyone.",
    cards: [
      { title: "Simple for Everyone", body: "No accounting expertise required." },
      { title: "Speak Naturally", body: "Use your own language to interact with your business assistant." },
      { title: "Know Your Numbers", body: "Understand your income, expenses, and business performance." },
      {
        title: "Save Time",
        body: "Reduce the effort spent recording and reviewing daily business transactions.",
      },
      {
        title: "Make Better Decisions",
        body: "Use financial information and business insights to better understand your business.",
      },
      {
        title: "Designed for Local Businesses",
        body: "Built with the needs and realities of Ethiopian entrepreneurs in mind.",
      },
    ],
  },
  audience: {
    title: "Made for Businesses Like Yours.",
    subtitle: "Whether you sell, trade or serve, Mizan fits the way you work.",
    cards: [
      { title: "Small Shop Owners", body: "Track daily sales, expenses, and profits." },
      { title: "Traders", body: "Understand business activity and financial performance." },
      {
        title: "Informal Businesses",
        body: "Manage business finances without complicated accounting software.",
      },
      { title: "Entrepreneurs", body: "Understand your business and make better decisions." },
      { title: "Service Providers", body: "Keep track of payments, expenses, and customers." },
      {
        title: "Growing Businesses",
        body: "Organize business records and improve financial visibility.",
      },
    ],
  },
  referral: {
    title: "Grow Together with Mizan.",
    body: "Invite other business owners to join Mizan and discover a smarter way to manage their businesses.",
    steps: [
      { title: "Invite", body: "Share your personal invite code from the Rewards tab." },
      { title: "They join", body: "A new shop signs up with your code and starts recording." },
      { title: "Reward unlocked", body: "Both of you earn points you can use inside Mizan." },
    ],
    note: "Rewards are earned when the invited shop starts using Mizan. Details are shown in your Rewards tab after you sign in.",
    cta: "Get your invite code",
  },
  faq: {
    title: "Frequently Asked Questions",
    items: [
      {
        q: "What is Mizan?",
        a: "Mizan is an AI-powered business and financial assistant designed to help business owners manage their daily financial activities, understand their business performance, and make smarter decisions.",
      },
      {
        q: "Who can use Mizan?",
        a: "Mizan is designed for small business owners, traders, entrepreneurs, informal businesses, and service providers.",
      },
      {
        q: "Can I use Mizan in my own language?",
        a: "Mizan is designed to support local-language interactions, including Amharic and Afaan Oromo, as well as English.",
      },
      {
        q: "Do I need accounting knowledge?",
        a: "No. Mizan aims to make financial management simple and accessible without requiring accounting expertise.",
      },
      {
        q: "How can I record transactions?",
        a: "You can record business transactions by typing, by chatting with the assistant, by using voice where supported, or by photographing products and receipts. Mizan shows you the entry first and records it only after you confirm.",
      },
      {
        q: "Is Mizan free?",
        a: "You can start for free. The free plan includes a monthly allowance of spoken replies. Plans with more spoken replies are available inside the app, and online payment is not connected yet.",
      },
      {
        q: "Is my business data secure?",
        a: "Mizan is designed with privacy and security in mind. Each business's records are kept separate and tied to its own account, and the AI cannot change your records without your confirmation.",
      },
    ],
  },
  finalCta: {
    title: "Your Business Deserves a Smarter Way.",
    body: "Start understanding your business better with Mizan — your intelligent financial companion.",
    primary: "Get Started",
    secondary: "Explore Mizan",
  },
  footer: {
    description:
      "An intelligent business companion helping entrepreneurs manage their finances and understand their businesses through simple, natural interactions.",
    navTitle: "Navigation",
    nav: { home: "Home", features: "Features", how: "How It Works", about: "About" },
    productTitle: "Product",
    product: {
      dashboard: "Business Dashboard",
      assistant: "AI Assistant",
      tracking: "Financial Tracking",
      voice: "Voice Interaction",
    },
    legalTitle: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    copyright: "© 2026 Mizan. All rights reserved.",
  },
  info: {
    privacyTitle: "Privacy Policy",
    termsTitle: "Terms of Service",
    body: "This page is being prepared. The full text will be published here before Mizan opens to the public.",
    back: "Back to Mizan",
  },
};

const am: LandingCopy = {
  meta: {
    title: "Mizan AI | ብልህ የንግድ ረዳትዎ",
    description:
      "Mizan የኢትዮጵያ ንግዶች ገንዘባቸውን እንዲያስተዳድሩ፣ ግብይቶችን እንዲመዘግቡ እና የንግዳቸውን አፈጻጸም በአካባቢያዊ ቋንቋዎች ከብልህ ረዳት ጋር እየተነጋገሩ እንዲረዱ ይረዳል።",
  },
  nav: {
    home: "መነሻ",
    features: "ባህሪያት",
    how: "እንዴት ይሰራል",
    businesses: "ለንግዶች",
    about: "ስለ Mizan",
    signIn: "ግባ",
    dashboard: "ዳሽቦርድ",
    getStarted: "ይጀምሩ",
    openMenu: "ምናሌ ክፈት",
    closeMenu: "ምናሌ ዝጋ",
    language: "ቋንቋ",
    mainNav: "ዋና ምናሌ",
    skip: "ወደ ዋናው ይዘት ዝለል",
  },
  common: {
    illustrative: "ለማሳያ የቀረበ ምሳሌ",
    tryDemo: "ወይም የማሳያ ሱቁን ይክፈቱ",
    demoStarting: "የማሳያ ሱቅ እየተከፈተ ነው...",
    demoError: "የማሳያ ሱቁን መክፈት አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
  },
  hero: {
    badge: "አማርኛ · Afaan Oromo · English",
    title: ["ንግድዎ።", "ቋንቋዎ።", "ብልህነትዎ።"],
    subtitle:
      "Mizan የንግድዎን ገንዘብ እንዲረዱ፣ ግብይቶችን እንዲመዘግቡ፣ የዕለት ተዕለት ሥራዎን እንዲያስተዳድሩ እና የተሻለ ውሳኔ እንዲወስኑ ይረዳዎታል — በራስዎ ቋንቋ፣ በአማርኛ እና በኦሮምኛ፣ በቀላል ውይይት።",
    ctaPrimary: "በነፃ ይጀምሩ",
    ctaSecondary: "እንዴት እንደሚሰራ ይመልከቱ",
  },
  preview: {
    shop: "የእርስዎ ሱቅ",
    greeting: "እንደምን አደሩ! የንግድዎ ማጠቃለያ እነሆ።",
    period: "በዚህ ሳምንት",
    income: "ገቢ",
    expenses: "ወጪ",
    profit: "የተጣራ ትርፍ",
    transactions: "ግብይቶች",
    assistant: "Mizan ረዳት",
    userMessage: "ዛሬ 500 ብር የሸቀጥ ግዢ አድርጌያለሁ",
    reply: "የ500 ብር ወጪ ለመመዝገብ ዝግጁ ነው። ትክክል ከሆነ ያረጋግጡ።",
    draftType: "ወጪ",
    draftCategory: "የዕቃ ግዢ",
    confirm: "አረጋግጥ",
    stepVoice: "የድምፅ ግብዓት",
    stepUnderstand: "መረዳት",
    stepRecord: "መመዝገብ",
    stepInsight: "ግንዛቤዎች",
    insight: "በዚህ ሳምንት ወጪዎ ከገቢዎ ጋር ሲነጻጸር የተረጋጋ ይመስላል።",
  },
  valueStrip: [
    "ለኢትዮጵያ ንግዶች የተሠራ",
    "የአማርኛ እና የኦሮምኛ ድጋፍ",
    "ድምፅ፣ ካሜራ እና ጽሑፍ",
    "ቀላል የገንዘብ አስተዳደር",
    "በAI የሚሰጥ የንግድ ግንዛቤ",
  ],
  problem: {
    title: "ንግድ መምራት ውስብስብ መሆን የለበትም።",
    subtitle: "ብዙ ባለንግዶች በየቀኑ ይደክማሉ፣ ነገር ግን መሣሪያዎቻቸው ቋንቋቸውን አይናገሩም።",
    cards: [
      {
        title: "በእጅ የሚያዝ መዝገብ",
        body: "ብዙ ንግዶች ገንዘባቸውን ለመከታተል አሁንም ደብተር፣ ትዝታ ወይም የተበታተኑ መዝገቦችን ይጠቀማሉ።",
      },
      {
        title: "የገንዘብ ግራ መጋባት",
        body: "ምን ያህል እንደሚያገኙ፣ እንደሚያወጡ እና በእርግጥ እንደሚያተርፉ ማወቅ ሁልጊዜ ቀላል አይደለም።",
      },
      {
        title: "የቋንቋ እንቅፋት",
        body: "አብዛኞቹ የንግድ መሣሪያዎች ሰዎች በተፈጥሮ በሚናገሩት ቋንቋ የተዘጋጁ አይደሉም።",
      },
      {
        title: "ውስን የንግድ ግንዛቤ",
        body: "ባለንግዶች ብዙ ጊዜ የገንዘብ ሁኔታቸውን ሳይረዱ ውሳኔ ይወስናሉ።",
      },
    ],
  },
  solution: {
    title: "Mizan ን ይተዋወቁ — ብልህ የንግድ ጓደኛዎ።",
    subtitle: "የዕለት ተዕለት የንግድ አስተዳደር፣ በመነጋገር ብቻ የሚደረግ ያህል ቀላል።",
    tabsLabel: "የ Mizan ባህሪያት",
    tabs: [
      {
        label: "የድምፅ ምዝገባ",
        title: "በድምፅ የሚደረግ የገንዘብ ምዝገባ",
        body: "ገቢና ወጪን በተፈጥሯዊ የድምፅ ትእዛዝ ይመዝግቡ። Mizan የተናገሩትን ተረድቶ ግልጽ ግቤት ያሳያል፤ ሲያረጋግጡ ይመዘግባል።",
      },
      {
        label: "በካሜራ መቅረጽ",
        title: "እቃዎችን እና ደረሰኞችን ፎቶ ያንሱ",
        body: "ካሜራውን ወደ እቃ ወይም የአቅራቢ ደረሰኝ ያዙሩ። Mizan እቃዎቹን ከዚህ ሱቅ ካታሎግና ዋጋ ጋር ያገናኛል፤ ከመመዝገቡ በፊት እንዲገመግሙና እንዲያረጋግጡ ይጠብቃል።",
      },
      {
        label: "የአካባቢ ቋንቋዎች",
        title: "በአካባቢ ቋንቋ የሚሰራ AI",
        body: "በሱቅዎ እንደሚናገሩት ከ Mizan ጋር ይነጋገሩ። አማርኛ እና ኦሮምኛ ከእንግሊዝኛ ጋር ይደገፋሉ፤ ምክንያቱም ምርቱ ለአካባቢው ተጠቃሚዎች እና ለአካባቢው የንግድ እውነታ የተነደፈ ነው።",
      },
      {
        label: "የገንዘብ ክትትል",
        title: "ብልህ የገንዘብ ክትትል",
        body: "ገቢዎን፣ ወጪዎን፣ ትርፍዎን፣ ግብይቶችዎን እና አዝማሚያዎችን በአንድ ግልጽ ዳሽቦርድ ይከታተሉ። ድምሮች በ Mizan በትክክል ይሰላሉ፤ በAI አይገመቱም።",
      },
      {
        label: "የንግድ ግንዛቤ",
        title: "AI የንግድ ግንዛቤዎች",
        body: "ስለተመዘገቡ ቁጥሮችዎ ይጠይቁ፤ በቀላል ቋንቋ መልስ ያገኛሉ፦ የዕለት ማጠቃለያ፣ የወጪ ቅርጽ፣ የገቢ አዝማሚያ እና ሌሎችም።",
      },
      {
        label: "የንግድ አስተዳደር",
        title: "የንግድ አስተዳደር",
        body: "የዕለት ተዕለት የገንዘብ እንቅስቃሴዎን ከደብተር እና ከትዝታ ይልቅ በአንድ ቦታ ተደራጅቶ ያስቀምጡ።",
      },
    ],
    voiceExample: "ዛሬ 2,500 ብር የሚያወጣ ሸቀጥ ሸጥኩ።",
    insightQuestion: "በዚህ ሳምንት ምን ያህል አገኘሁ?",
    insightAnswer: "በዚህ ሳምንት የተመዘገበ ገቢዎ 18,500 ብር ሲሆን ወጪዎ 6,200 ብር ነው።",
    managementItems: [
      { title: "የግብይት ክትትል", body: "ገቢና ወጪ ከምድብ እና ከክፍያ ዘዴ ጋር።" },
      { title: "የዱቤ ሽያጭ", body: "ደንበኞች ገና የሚከፍሉዎትን ገንዘብ ይከታተሉ።" },
      { title: "የዕለት ማጠቃለያ", body: "እያንዳንዱ ቀን፣ ሳምንት እና ወር እንዴት እንደሆነ ይመልከቱ።" },
      { title: "ማረም እና ማጥፋት", body: "ስህተቶችን ያርሙ፤ ግልጽ የእንቅስቃሴ መዝገብም ይኑርዎት።" },
    ],
    sales: "ሽያጭ",
    income: "ገቢ",
  },
  how: {
    title: "ንግድዎን በደቂቃዎች ውስጥ ማስተዳደር ይጀምሩ።",
    subtitle: "ከመመዝገብ እስከ ግልጽ መልስ ድረስ ሦስት ቀላል ደረጃዎች።",
    step: "ደረጃ",
    steps: [
      { title: "መለያዎን ይፍጠሩ", body: "የ Mizan መለያዎን ይፍጠሩ እና ንግድዎን ያዘጋጁ።" },
      {
        title: "ይናገሩ፣ ፎቶ ያንሱ ወይም ይጻፉ",
        body: "የዕለት ገቢና ወጪን በድምፅ፣ በእቃ ፎቶ ወይም በጽሑፍ ይመዝግቡ። ከመቀመጡ በፊት ሁልጊዜ ግቤቱን ይገመግማሉ።",
      },
      {
        title: "ንግድዎን ይረዱ",
        body: "ግልጽ የገንዘብ ማጠቃለያ፣ ግንዛቤዎች እና ለንግድ ጥያቄዎችዎ መልስ ያግኙ።",
      },
    ],
  },
  voice: {
    title: "ድምፅዎ መገናኛዎ ነው።",
    body: "ውስብስብ ቅጾችን እና አስቸጋሪ የገንዘብ ቃላትን ይርሱ። በንግድዎ ምን እንደተፈጠረ ለ Mizan ብቻ ይንገሩ።",
    points: [
      "በአማርኛ፣ በኦሮምኛ ወይም በእንግሊዝኛ ይናገሩ",
      "ማንኛውም ነገር ከመመዝገቡ በፊት ሁልጊዜ ያረጋግጣሉ",
      "መልሶች ጮክ ብለው ሊነበቡልዎ ይችላሉ",
    ],
    tap: "ማሳያውን ለመሞከር ይንኩ",
    listening: "እያዳመጠ ነው...",
    understanding: "የተናገሩትን እየተረዳ ነው...",
    ready: "ለመመዝገብ ዝግጁ",
    confirm: "አረጋግጥ",
    recorded: "ገቢው በተሳካ ሁኔታ ተመዝግቧል",
    amount: "መጠን",
    category: "ምድብ",
    categoryValue: "ሽያጭ",
    date: "ቀን",
    dateValue: "ዛሬ",
    again: "ማሳያውን እንደገና አጫውት",
    utterance: "ዛሬ ከአንድ ደንበኛ 1,200 ብር ተቀበልኩ።",
    demoNote: "ይህ ፓነል አስቀድሞ የተዘጋጀ ማሳያ ነው፤ ከመለያዎ ጋር አልተገናኘም። እውነተኛውን የድምፅ ረዳት ለመሞከር የማሳያ ሱቁን ይክፈቱ።",
    micLabel: "የድምፅ ማሳያውን ጀምር",
  },
  dashboard: {
    title: "ንግድዎ ማወቅ ያለበት ሁሉ። በአንድ ቦታ።",
    subtitle: "ገንዘብዎ፣ ግብይቶችዎ እና አዝማሚያዎችዎ በአንድ ግልጽ ማያ ገጽ ላይ።",
    chartTitle: "ገቢ እና ወጪ",
    days: ["ሰኞ", "ማክሰ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ", "እሁድ"],
    income: "ጠቅላላ ገቢ",
    expenses: "ጠቅላላ ወጪ",
    profit: "የተጣራ ትርፍ",
    transactions: "ግብይቶች",
    recentTitle: "የቅርብ ጊዜ ግብይቶች",
    recent: ["የዱቄት እና ዘይት ሽያጭ", "የጅምላ ግዢ", "የቡና እና ስኳር ሽያጭ", "ትራንስፖርት"],
    insightsTitle: "የንግድ ግንዛቤዎች",
    insights: ["ሽያጭ በቅዳሜ ከፍተኛ ነበር።", "የዕቃ ግዢ ትልቁ ወጪዎ ነው።"],
    quickTitle: "ፈጣን እርምጃዎች",
    quick: ["ገቢ መዝግብ", "ወጪ መዝግብ", "Mizan ን ጠይቅ"],
    chartLabel: "የሳምንቱን እያንዳንዱ ቀን ገቢ እና ወጪ የሚያወዳድር የአምድ ሰንጠረዥ",
  },
  benefits: {
    title: "ንግድ በሚሰሩበት መንገድ ዙሪያ የተሠራ።",
    about:
      "Mizan ለኢትዮጵያ ሥራ ፈጣሪዎች የተዘጋጀ ብልህ የንግድ ጓደኛ ነው። ጥሩ የገንዘብ መሣሪያዎች ቋንቋዎን መናገር እና ለሁሉም ቀላል መሆን አለባቸው ብለን እናምናለን።",
    cards: [
      { title: "ለሁሉም ቀላል", body: "የሂሳብ ባለሙያ መሆን አያስፈልግም።" },
      { title: "በተፈጥሮ ይናገሩ", body: "ከንግድ ረዳትዎ ጋር በራስዎ ቋንቋ ይነጋገሩ።" },
      { title: "ቁጥሮችዎን ይወቁ", body: "ገቢዎን፣ ወጪዎን እና የንግድዎን አፈጻጸም ይረዱ።" },
      { title: "ጊዜ ይቆጥቡ", body: "የዕለት ግብይቶችን ለመመዝገብ እና ለመገምገም የሚወስደውን ጥረት ይቀንሱ።" },
      {
        title: "የተሻለ ውሳኔ ይወስኑ",
        body: "የገንዘብ መረጃ እና የንግድ ግንዛቤዎችን በመጠቀም ንግድዎን በተሻለ ይረዱ።",
      },
      {
        title: "ለአካባቢ ንግዶች የተነደፈ",
        body: "የኢትዮጵያ ሥራ ፈጣሪዎችን ፍላጎት እና እውነታ በማሰብ የተሠራ።",
      },
    ],
  },
  audience: {
    title: "ለእንደ እርስዎ ያሉ ንግዶች የተሠራ።",
    subtitle: "ቢሸጡ፣ ቢነግዱ ወይም አገልግሎት ቢሰጡ፣ Mizan ከአሠራርዎ ጋር ይስማማል።",
    cards: [
      { title: "የአነስተኛ ሱቅ ባለቤቶች", body: "የዕለት ሽያጭ፣ ወጪ እና ትርፍ ይከታተሉ።" },
      { title: "ነጋዴዎች", body: "የንግድ እንቅስቃሴ እና የገንዘብ አፈጻጸም ይረዱ።" },
      {
        title: "መደበኛ ያልሆኑ ንግዶች",
        body: "ውስብስብ የሂሳብ ሶፍትዌር ሳይኖር የንግድ ገንዘብዎን ያስተዳድሩ።",
      },
      { title: "ሥራ ፈጣሪዎች", body: "ንግድዎን ይረዱ እና የተሻለ ውሳኔ ይወስኑ።" },
      { title: "አገልግሎት ሰጪዎች", body: "ክፍያዎችን፣ ወጪዎችን እና ደንበኞችን ይከታተሉ።" },
      { title: "እያደጉ ያሉ ንግዶች", body: "የንግድ መዝገቦችን ያደራጁ፤ የገንዘብ ግልጽነትን ያሻሽሉ።" },
    ],
  },
  referral: {
    title: "ከ Mizan ጋር አብረን እንደግ።",
    body: "ሌሎች ባለንግዶችን ወደ Mizan ይጋብዙ፤ ንግዳቸውን የሚያስተዳድሩበትን የተሻለ መንገድ ያግኙ።",
    steps: [
      { title: "ይጋብዙ", body: "የግል መጋበዣ ኮድዎን ከሽልማቶች ትር ያጋሩ።" },
      { title: "ይቀላቀላሉ", body: "አዲስ ሱቅ በኮድዎ ተመዝግቦ መመዝገብ ይጀምራል።" },
      { title: "ሽልማት ይከፈታል", body: "ሁለታችሁም በ Mizan ውስጥ የሚጠቀሙበት ነጥብ ታገኛላችሁ።" },
    ],
    note: "ሽልማቶች የሚገኙት የተጋበዘው ሱቅ Mizan ን መጠቀም ሲጀምር ነው። ዝርዝሩ ከገቡ በኋላ በሽልማቶች ትር ይታያል።",
    cta: "የመጋበዣ ኮድዎን ያግኙ",
  },
  faq: {
    title: "በተደጋጋሚ የሚጠየቁ ጥያቄዎች",
    items: [
      {
        q: "Mizan ምንድን ነው?",
        a: "Mizan ባለንግዶች የዕለት ተዕለት የገንዘብ እንቅስቃሴያቸውን እንዲያስተዳድሩ፣ የንግዳቸውን አፈጻጸም እንዲረዱ እና የተሻለ ውሳኔ እንዲወስኑ የተነደፈ በAI የሚሰራ የንግድ እና የገንዘብ ረዳት ነው።",
      },
      {
        q: "ማን Mizan ን መጠቀም ይችላል?",
        a: "Mizan ለአነስተኛ ንግድ ባለቤቶች፣ ነጋዴዎች፣ ሥራ ፈጣሪዎች፣ መደበኛ ላልሆኑ ንግዶች እና አገልግሎት ሰጪዎች የተነደፈ ነው።",
      },
      {
        q: "Mizan ን በራሴ ቋንቋ መጠቀም እችላለሁ?",
        a: "Mizan አማርኛ እና ኦሮምኛን ጨምሮ በአካባቢ ቋንቋዎች እንዲሁም በእንግሊዝኛ ለመነጋገር የተነደፈ ነው።",
      },
      {
        q: "የሂሳብ እውቀት ያስፈልገኛል?",
        a: "አያስፈልግም። Mizan የሂሳብ ሙያ ሳያስፈልግ የገንዘብ አስተዳደርን ቀላል እና ተደራሽ ለማድረግ ያለመ ነው።",
      },
      {
        q: "ግብይቶችን እንዴት መመዝገብ እችላለሁ?",
        a: "ግብይቶችን በመጻፍ፣ ከረዳቱ ጋር በመወያየት፣ በሚደገፍበት ቦታ በድምፅ፣ ወይም እቃና ደረሰኝ በፎቶ መመዝገብ ይችላሉ። Mizan መጀመሪያ ግቤቱን ያሳያል፤ ከእርስዎ ማረጋገጫ በኋላ ብቻ ይመዘግባል።",
      },
      {
        q: "Mizan ነፃ ነው?",
        a: "በነፃ መጀመር ይችላሉ። ነፃው ፕላን የወርሃዊ የድምፅ መልስ ድርሻ ያካትታል። ተጨማሪ የድምፅ መልስ ያላቸው ፕላኖች በመተግበሪያው ውስጥ አሉ፤ የኦንላይን ክፍያ ግን ገና አልተገናኘም።",
      },
      {
        q: "የንግድ መረጃዬ ደህንነቱ የተጠበቀ ነው?",
        a: "Mizan ግላዊነትን እና ደህንነትን ታሳቢ በማድረግ የተነደፈ ነው። የእያንዳንዱ ንግድ መዝገብ ተለይቶ ከራሱ መለያ ጋር ይያዛል፤ AI ያለ እርስዎ ማረጋገጫ መዝገብዎን መቀየር አይችልም።",
      },
    ],
  },
  finalCta: {
    title: "ንግድዎ የተሻለ መንገድ ይገባዋል።",
    body: "ንግድዎን በተሻለ መረዳት ይጀምሩ — ከ Mizan፣ ብልህ የገንዘብ ጓደኛዎ ጋር።",
    primary: "ይጀምሩ",
    secondary: "Mizan ን ያስሱ",
  },
  footer: {
    description:
      "ሥራ ፈጣሪዎች ገንዘባቸውን እንዲያስተዳድሩ እና ንግዳቸውን በቀላል፣ ተፈጥሯዊ ውይይት እንዲረዱ የሚያግዝ ብልህ የንግድ ጓደኛ።",
    navTitle: "ምናሌ",
    nav: { home: "መነሻ", features: "ባህሪያት", how: "እንዴት ይሰራል", about: "ስለ እኛ" },
    productTitle: "ምርት",
    product: {
      dashboard: "የንግድ ዳሽቦርድ",
      assistant: "AI ረዳት",
      tracking: "የገንዘብ ክትትል",
      voice: "የድምፅ ግንኙነት",
    },
    legalTitle: "ሕጋዊ",
    privacy: "የግላዊነት ፖሊሲ",
    terms: "የአገልግሎት ውል",
    copyright: "© 2026 Mizan. መብቱ በሕግ የተጠበቀ ነው።",
  },
  info: {
    privacyTitle: "የግላዊነት ፖሊሲ",
    termsTitle: "የአገልግሎት ውል",
    body: "ይህ ገጽ እየተዘጋጀ ነው። Mizan ለሕዝብ ክፍት ከመሆኑ በፊት ሙሉ ጽሑፉ እዚህ ይታተማል።",
    back: "ወደ Mizan ተመለስ",
  },
};

const om: LandingCopy = {
  meta: {
    title: "Mizan AI | Gargaaraa Daldalaa Ogummaa Qabu",
    description:
      "Mizan daldaltoonni Itoophiyaa maallaqa isaanii bulchuu, daldala galmeessuu fi raawwii daldala isaanii afaan naannoo isaaniitiin gargaaraa ogummaa qabu waliin haasa'uudhaan hubachuuf ni gargaara.",
  },
  nav: {
    home: "Mana",
    features: "Amaloota",
    how: "Akkamitti hojjeta",
    businesses: "Daldalootaaf",
    about: "Waa'ee Mizan",
    signIn: "Seeni",
    dashboard: "Daashboordii",
    getStarted: "Jalqabi",
    openMenu: "Menuu bani",
    closeMenu: "Menuu cufi",
    language: "Afaan",
    mainNav: "Menuu ijoo",
    skip: "Gara qabiyyee ijootti darbi",
  },
  common: {
    illustrative: "Fakkeenya agarsiisaa",
    tryDemo: "ykn suuqii agarsiisaa bani",
    demoStarting: "Suuqii agarsiisaa banaa jira...",
    demoError: "Suuqii agarsiisaa bananii hin danda'amne. Maaloo irra deebi'ii yaali.",
  },
  hero: {
    badge: "Afaan Oromoo · አማርኛ · English",
    title: ["Daldala kee.", "Afaan kee.", "Beekumsa kee."],
    subtitle:
      "Mizan haala maallaqa daldala kee hubachuu, daldala galmeessuu, hojii guyyaa guyyaa bulchuu fi murtee gaarii dabarsuuf si gargaara — afaan kee, Afaan Oromoo fi Amaaraa dabalatee, haasaa salphaadhaan.",
    ctaPrimary: "Bilisaan Jalqabi",
    ctaSecondary: "Akkamitti akka hojjetu ilaali",
  },
  preview: {
    shop: "Suuqii kee",
    greeting: "Akkam bultan! Cuunfaan daldala keetii asiin jira.",
    period: "Torban kana",
    income: "Galii",
    expenses: "Baasii",
    profit: "Bu'aa qulqulluu",
    transactions: "Daldala",
    assistant: "Gargaaraa Mizan",
    userMessage: "Har'a meeshaa daldalaa birr 500 bitadheera.",
    reply: "Baasiin birr 500 galmeessuuf qophaa'eera. Sirrii yoo ta'e mirkaneessi.",
    draftType: "Baasii",
    draftCategory: "Bitaa meeshaa",
    confirm: "Mirkaneessi",
    stepVoice: "Sagalee galchuu",
    stepUnderstand: "Hubachuu",
    stepRecord: "Galmeessuu",
    stepInsight: "Hubannoo",
    insight: "Torban kana baasiin kee galii kee wajjin wal bira qabamee tasgabbaa'aa fakkaata.",
  },
  valueStrip: [
    "Daldalootaaf Itoophiyaaf kan hojjetame",
    "Deeggarsa Afaan Oromoo fi Amaaraa",
    "Sagalee, kaameraa fi barreeffama",
    "Bulchiinsa maallaqaa salphaa",
    "Hubannoo daldalaa AI'n kennamu",
  ],
  problem: {
    title: "Daldala geggeessuun walxaxaa ta'uu hin qabu.",
    subtitle: "Daldaltoonni baay'een guyyaa guyyaan ulfinaan hojjetu, garuu meeshaaleen isaanii afaan isaanii hin dubbatan.",
    cards: [
      {
        title: "Galmee harkaan qabamu",
        body: "Daldalli baay'een maallaqa isaanii hordofuuf ammallee kitaaba, yaadannoo ykn galmee bittinnaa'e fayyadamu.",
      },
      {
        title: "Wal-makuu maallaqaa",
        body: "Meeqa akka argattu, akka baasuu fi dhugaan akka bu'aa argattu beekuun yeroo hundaa salphaa miti.",
      },
      {
        title: "Gufuu afaanii",
        body: "Meeshaaleen daldalaa baay'een afaan uumamaan namni dubbatuun kan qophaa'an miti.",
      },
      {
        title: "Hubannoo daldalaa daangeffame",
        body: "Daldaltoonni yeroo baay'ee haala maallaqa isaanii osoo hin hubatin murtee dabarsu.",
      },
    ],
  },
  solution: {
    title: "Mizan baraadhu — Hiriyyaa daldalaa ogummaa qabu.",
    subtitle: "Bulchiinsa daldalaa guyyaa guyyaa, haasa'uudhaan raawwatamuu danda'u ta'ee salphate.",
    tabsLabel: "Amaloota Mizan",
    tabs: [
      {
        label: "Galmee sagaleen",
        title: "Galmee maallaqaa sagaleen",
        body: "Galii fi baasii ajaja sagalee uumamaan galmeessi. Mizan waan jette hubatee galmee ifa ta'e si agarsiisa; yeroo mirkaneessitu galmeessa.",
      },
      {
        label: "Suuraa kaameraa",
        title: "Meeshaa fi risiitii suuraa kaasi",
        body: "Kaameraa gara meeshaa ykn risiitii dhiyeessaa geessi. Mizan meeshaalee katalogii fi gatii suuqii kanaa wajjin wal-bira qaba; osoo hin galmaa'in dura ilaaltee mirkaneessuu ni eeggata.",
      },
      {
        label: "Afaan naannoo",
        title: "AI Afaan Naannootiin",
        body: "Akkuma suuqii kee keessatti dubbattuu Mizan waliin haasa'i. Afaan Oromoo fi Amaaraan Ingliffaan wajjin ni deeggarama, sababni isaas oomishichi fayyadamtoota naannoo fi haala daldala naannootiif kan qophaa'e waan ta'eef.",
      },
      {
        label: "Hordoffii maallaqaa",
        title: "Hordoffii maallaqaa ogummaa qabu",
        body: "Galii, baasii, bu'aa, daldala fi adeemsa daashboordii ifa tokko keessatti hordofi. Walitti qabbiin Mizan'iin sirnaan herreegama; AI'n hin tilmaamu.",
      },
      {
        label: "Hubannoo daldalaa",
        title: "Hubannoo daldalaa AI",
        body: "Lakkoofsota galmaa'an irratti gaafadhu; deebii afaan salphaadhaan argadhu: cuunfaa guyyaa, haala baasii, adeemsa galii fi kkf.",
      },
      {
        label: "Bulchiinsa daldalaa",
        title: "Bulchiinsa daldalaa",
        body: "Sochii maallaqa guyyaa guyyaa kitaabaa fi yaadannoo bakka bu'ee bakka tokkotti qindeessi.",
      },
    ],
    voiceExample: "Har'a meeshaa gatiin isaa birr 2,500 ta'e gurgureera.",
    insightQuestion: "Torban kana meeqa argadhe?",
    insightAnswer: "Galiin torban kanaa kan galmaa'e Birrii 18,500 yoo ta'u, baasiin Birrii 6,200 dha.",
    managementItems: [
      { title: "Hordoffii daldalaa", body: "Galii fi baasii ramaddii fi mala kaffaltiitiin." },
      { title: "Gurgurtaa liqaan", body: "Maallaqa maamiltoonni ammallee si kaffalaa hordofi." },
      { title: "Cuunfaa guyyaa", body: "Guyyaan, torbaan fi ji'i akkam akka adeemu ilaali." },
      { title: "Sirreessuu fi haquu", body: "Dogoggora sirreessi; galmee sochii ifa ta'e qabadhu." },
    ],
    sales: "Gurgurtaa",
    income: "Galii",
  },
  how: {
    title: "Daqiiqaa muraasa keessatti daldala kee bulchuu jalqabi.",
    subtitle: "Galmee jalqabaa eegalee hanga deebii ifaatti tarkaanfii salphaa sadii.",
    step: "Tarkaanfii",
    steps: [
      { title: "Akkaawuntii kee uumi", body: "Akkaawuntii Mizan kee uumii daldala kee qopheessi." },
      {
        title: "Dubbadhu, suuraa kaasi ykn barreessi",
        body: "Galii fi baasii guyyaa sagalee, suuraa meeshaa ykn barreeffamaan galmeessi. Osoo hin kaa'in dura yeroo hundaa galmee ni ilaalta.",
      },
      {
        title: "Daldala kee hubadhu",
        body: "Cuunfaa maallaqaa ifa ta'e, hubannoo fi gaaffiiwwan daldala keetiif deebii argadhu.",
      },
    ],
  },
  voice: {
    title: "Sagaleen kee wal-qunnamtii kee dha.",
    body: "Unka walxaxaa fi jechoota maallaqaa ulfaataa dhiisi. Daldala kee keessatti waan ta'e Mizan'tti himi qofa.",
    points: [
      "Afaan Oromoo, Amaaraa ykn Ingliffaan dubbadhu",
      "Waan tokko osoo hin galmaa'in dura yeroo hundaa ni mirkaneessita",
      "Deebiin sagalee ol-kaasuun siif dubbifamuu danda'a",
    ],
    tap: "Agarsiisa yaaluuf tuqi",
    listening: "Dhaggeeffachaa jira...",
    understanding: "Waan jette hubachaa jira...",
    ready: "Galmeessuuf qophaa'eera",
    confirm: "Mirkaneessi",
    recorded: "Galiin milkaa'inaan galmaa'eera",
    amount: "Hanga",
    category: "Ramaddii",
    categoryValue: "Gurgurtaa",
    date: "Guyyaa",
    dateValue: "Har'a",
    again: "Agarsiisa irra deebi'ii taphachiisi",
    utterance: "Har'a maamila tokko irraa birr 1,200 fudhadheera.",
    demoNote: "Paanalli kun agarsiisa dursee qophaa'e dha; akkaawuntii kee waliin hin walqabatu. Gargaaraa sagalee dhuguma yaaluuf suuqii agarsiisaa bani.",
    micLabel: "Agarsiisa sagalee jalqabi",
  },
  dashboard: {
    title: "Waan daldalli kee beekuu qabu hundumtuu. Bakka tokko.",
    subtitle: "Maallaqni kee, daldalli kee fi adeemsi kee fuula ifa tokko irratti.",
    chartTitle: "Galii fi baasii",
    days: ["Wix", "Kib", "Rob", "Kam", "Jim", "Sam", "Dil"],
    income: "Galii waliigalaa",
    expenses: "Baasii waliigalaa",
    profit: "Bu'aa qulqulluu",
    transactions: "Daldala",
    recentTitle: "Daldala dhiyoo",
    recent: ["Gurgurtaa daakuu fi zayitaa", "Bitaa meeshaa hedduu", "Gurgurtaa bunaa fi shukkaaraa", "Geejjiba"],
    insightsTitle: "Hubannoo daldalaa",
    insights: ["Gurgurtaan Sanbataa irratti cimaa ture.", "Bitaan meeshaa baasii kee isa guddaa dha."],
    quickTitle: "Tarkaanfii saffisaa",
    quick: ["Galii galmeessi", "Baasii galmeessi", "Mizan gaafadhu"],
    chartLabel: "Chaartii galii fi baasii guyyaa torbanii tokkoon tokkoon wal bira qabu",
  },
  benefits: {
    title: "Haala ati itti daldaltu irratti kan hundaa'e.",
    about:
      "Mizan hiriyyaa daldalaa ogummaa qabu kan ogeeyyii daldalaa Itoophiyaaf qophaa'e dha. Meeshaaleen maallaqaa gaariin afaan kee dubbachuu fi nama hundaaf salphaa ta'uu qabu jennee amanna.",
    cards: [
      { title: "Nama hundaaf salphaa", body: "Ogummaa herregaa hin barbaachisu." },
      { title: "Uumamaan dubbadhu", body: "Gargaaraa daldalaa kee waliin afaan keetiin haasa'i." },
      { title: "Lakkoofsa kee beeki", body: "Galii, baasii fi raawwii daldala kee hubadhu." },
      { title: "Yeroo qusadhu", body: "Daldala guyyaa guyyaa galmeessuu fi sakatta'uuf carraaqqii ilaalchisu hir'isi." },
      {
        title: "Murtee gaarii dabarsi",
        body: "Odeeffannoo maallaqaa fi hubannoo daldalaa fayyadamuun daldala kee caalaatti hubadhu.",
      },
      {
        title: "Daldala naannootiif kan qophaa'e",
        body: "Fedhii fi haala daldaltoota Itoophiyaa yaadachuudhaan kan hojjetame.",
      },
    ],
  },
  audience: {
    title: "Daldala akka kee fakkaatuuf kan hojjetame.",
    subtitle: "Yoo gurgurtu, daldaltu ykn tajaajila kennitu, Mizan haala hojii keetiif ni mijata.",
    cards: [
      { title: "Abbootii suuqii xixiqqaa", body: "Gurgurtaa, baasii fi bu'aa guyyaa guyyaa hordofi." },
      { title: "Daldaltoota", body: "Sochii daldalaa fi raawwii maallaqaa hubadhu." },
      {
        title: "Daldala sirna hin qabne",
        body: "Sofitweerii herregaa walxaxaa malee maallaqa daldala kee bulchi.",
      },
      { title: "Ogeeyyii daldalaa", body: "Daldala kee hubadhu; murtee gaarii dabarsi." },
      { title: "Tajaajila kennitoota", body: "Kaffaltii, baasii fi maamiltoota hordofi." },
      { title: "Daldala guddachaa jiru", body: "Galmee daldalaa qindeessi; ifummaa maallaqaa fooyyessi." },
    ],
  },
  referral: {
    title: "Mizan wajjin waliin guddanna.",
    body: "Abbootii daldalaa biroo Mizan'itti affeeri; daldala isaanii bulchuuf karaa caalu argatan.",
    steps: [
      { title: "Affeeri", body: "Koodii affeerraa kee dhuunfaa Tab Badhaasaa irraa qoodi." },
      { title: "Ni makamu", body: "Suuqiin haaraan koodii keetiin galmaa'ee galmeessuu jalqaba." },
      { title: "Badhaasni banama", body: "Lamaan keessanuu Mizan keessatti qabxii argattu." },
    ],
    note: "Badhaasni kan argamu suuqiin affeeramee Mizan fayyadamuu yeroo jalqabu dha. Bal'inni isaa erga seentee booda Tab Badhaasaa keessatti mul'ata.",
    cta: "Koodii affeerraa kee argadhu",
  },
  faq: {
    title: "Gaaffiiwwan yeroo baay'ee gaafataman",
    items: [
      {
        q: "Mizan maali?",
        a: "Mizan gargaaraa daldalaa fi maallaqaa AI'n hojjetu yoo ta'u, abbootiin daldalaa sochii maallaqa guyyaa guyyaa isaanii bulchuu, raawwii daldala isaanii hubachuu fi murtee gaarii dabarsuuf kan qophaa'e dha.",
      },
      {
        q: "Eenyutu Mizan fayyadamuu danda'a?",
        a: "Mizan abbootii daldalaa xixiqqaa, daldaltoota, ogeeyyii daldalaa, daldala sirna hin qabne fi tajaajila kennitootaaf kan qophaa'e dha.",
      },
      {
        q: "Mizan afaan kootiin fayyadamuu nan danda'aa?",
        a: "Mizan Afaan Oromoo fi Amaaraa dabalatee afaan naannootiin, akkasumas Ingliffaan haasa'uuf kan qophaa'e dha.",
      },
      {
        q: "Beekumsi herregaa nan barbaachisaa?",
        a: "Lakki. Mizan ogummaa herregaa osoo hin barbaachisin bulchiinsa maallaqaa salphaa fi argamuu danda'u gochuuf kan kaayyeffate dha.",
      },
      {
        q: "Daldala akkamitti galmeessuu nan danda'a?",
        a: "Daldala barreessuudhaan, gargaaraa waliin haasa'uudhaan, bakka deeggaramutti sagaleen, ykn meeshaa fi risiitii suuraa kaasuudhaan galmeessuu ni dandeessa. Mizan dura galmee agarsiisa; erga ati mirkaneessitee booda qofa galmeessa.",
      },
      {
        q: "Mizan bilisaa dhaa?",
        a: "Bilisaan jalqabuu ni dandeessa. Karoorri bilisaa kuufama deebii sagalee ji'aa of keessaa qaba. Karoorota deebii sagalee dabalataa qaban app keessatti argamu; kaffaltiin toora interneetii garuu ammallee hin walqabatne.",
      },
      {
        q: "Odeeffannoon daldala koo eegamaa dhaa?",
        a: "Mizan dhuunfaa fi nageenya yaadachuudhaan kan qophaa'e dha. Galmeen daldala tokkoon tokkoo adda baafamee akkaawuntii mataa isaa waliin qabama; AI'n eenyummaa kee malee galmee kee jijjiiruu hin danda'u.",
      },
    ],
  },
  finalCta: {
    title: "Daldalli kee karaa caalu ni mudata.",
    body: "Daldala kee caalaatti hubachuu jalqabi — Mizan, hiriyyaa maallaqaa ogummaa qabu waliin.",
    primary: "Jalqabi",
    secondary: "Mizan qoradhu",
  },
  footer: {
    description:
      "Hiriyyaa daldalaa ogummaa qabu kan ogeeyyiin daldalaa maallaqa isaanii bulchuu fi daldala isaanii haasaa salphaa uumamaatiin hubachuuf gargaaru.",
    navTitle: "Menuu",
    nav: { home: "Mana", features: "Amaloota", how: "Akkamitti hojjeta", about: "Waa'ee keenya" },
    productTitle: "Oomisha",
    product: {
      dashboard: "Daashboordii Daldalaa",
      assistant: "Gargaaraa AI",
      tracking: "Hordoffii maallaqaa",
      voice: "Wal-qunnamtii sagalee",
    },
    legalTitle: "Seera",
    privacy: "Imaammata dhuunfaa",
    terms: "Haala tajaajilaa",
    copyright: "© 2026 Mizan. Mirgi eegameera.",
  },
  info: {
    privacyTitle: "Imaammata dhuunfaa",
    termsTitle: "Haala tajaajilaa",
    body: "Fuulli kun qophaa'aa jira. Mizan ummataaf osoo hin banamin dura barreeffamni guutuun asitti ni maxxanfama.",
    back: "Gara Mizan deebi'i",
  },
};

export const LANDING_COPY: Record<LanguageCode, LandingCopy> = { am, om, en };
