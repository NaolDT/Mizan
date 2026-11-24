import type { AiCreditFeature, BillingNoticeKind, CreditSource, LanguageCode } from "@mizan/shared";

export interface BillingText {
  tab: string;
  title: string;
  remaining: string;
  expiring: string;
  sources: Record<CreditSource, string>;
  buyTitle: string;
  plansTitle: string;
  planNames: Record<"FREE" | "STARTER" | "PRO" | "BUSINESS", string>;
  planDescriptions: Record<"FREE" | "STARTER" | "PRO" | "BUSINESS", string>;
  packageNames: Record<string, string>;
  packageDescriptions: Record<string, string>;
  credits: string;
  bonus: string;
  validDays: string;
  perCredit: string;
  perMonth: string;
  free: string;
  payWith: string;
  noProviders: string;
  current: string;
  savings: string;
  suggest: string;
  history: string;
  emptyHistory: string;
  pricesTitle: string;
  features: Record<AiCreditFeature, string>;
  notices: Record<BillingNoticeKind, string>;
  devTitle: string;
  devBody: string;
  devSuccess: string;
  devFail: string;
  devCancel: string;
  devPending: string;
  checking: string;
  paid: string;
  pending: string;
  failed: string;
  cancelPlan: string;
  cancelScheduled: string;
  paidUntil: string;
  manualNote: string;
  gateTitle: string;
  gateBody: string;
  gateManual: string;
  buyCredits: string;
  recordByHand: string;
}

const en: BillingText = {
  tab: "AI Credits",
  title: "AI credits",
  remaining: "AI credits remaining",
  expiring: "{n} credits expire within 7 days",
  sources: {
    SUBSCRIPTION: "Monthly",
    PURCHASED: "Top-up",
    REFERRAL: "Invites",
    PROMO: "Promotions",
    ADMIN: "Adjustments",
  },
  buyTitle: "Buy credits",
  plansTitle: "Monthly plans",
  planNames: { FREE: "Free", STARTER: "Starter", PRO: "Pro", BUSINESS: "Business" },
  planDescriptions: {
    FREE: "Shop records, inventory and a small monthly AI allowance.",
    STARTER: "A monthly AI allowance for a shop that uses the assistant regularly.",
    PRO: "More AI credits for voice, camera and everyday questions.",
    BUSINESS: "The largest monthly AI allowance. Best value per credit.",
  },
  packageNames: {
    topup_50: "Small top-up",
    topup_100: "Medium top-up",
    topup_250: "Large top-up",
    topup_500: "Business top-up",
  },
  packageDescriptions: {
    topup_50: "A small pack for occasional AI use. Credits last 90 days.",
    topup_100: "For a busy week. Credits last 90 days.",
    topup_250: "For regular AI use without a monthly plan. Credits last 90 days.",
    topup_500: "The largest pack. A monthly plan is cheaper per credit.",
  },
  credits: "{n} credits",
  bonus: "+{n} extra",
  validDays: "Valid {n} days",
  perCredit: "{price} ETB / credit",
  perMonth: "{price} ETB / month",
  free: "Free",
  payWith: "Pay with {name}",
  noProviders: "Online payment is not set up on this server yet. The free monthly credits still work.",
  current: "Current",
  savings: "A monthly plan is about {pct}% cheaper per credit than the lowest top-up.",
  suggest: "You spent {amount} ETB on top-ups this month. {plan} may cost less for regular use.",
  history: "Credit history",
  emptyHistory: "No credit activity yet.",
  pricesTitle: "What uses credits",
  features: {
    TEXT_CHAT: "Text assistant",
    VOICE_TURN: "Voice question",
    TTS: "Spoken reply",
    VISION: "Camera",
    RECEIPT: "Receipt scan",
  },
  notices: {
    LOW_CREDITS: "You have {n} AI credits left.",
    TOPUP_PAID: "{n} top-up credits were added.",
    SUBSCRIPTION_PAID: "Your plan is active and {n} monthly credits were added.",
    CREDITS_EXPIRED: "{n} credits expired.",
    PAYMENT_FAILED: "The payment was not completed. No credits were added.",
    REFERRAL_CREDITS: "You received {n} invite credits.",
    PROMO_CREDITS: "You received {n} promotional credits.",
    SUBSCRIPTION_ENDED: "The paid plan ended. Your records stay. Free credits continue.",
  },
  devTitle: "Test payment",
  devBody: "This is a development payment. No money moves.",
  devSuccess: "Mark paid",
  devFail: "Mark failed",
  devCancel: "Mark cancelled",
  devPending: "Leave pending",
  checking: "Checking payment…",
  paid: "Payment verified. Credits are in the wallet.",
  pending: "Payment is still processing.",
  failed: "Payment was not completed.",
  cancelPlan: "Stop at period end",
  cancelScheduled: "This plan ends on {date}. Credits already bought stay until they expire.",
  paidUntil: "Paid until {date}",
  manualNote: "Choosing a plan here starts a real payment. The Rewards tab can still change a plan only when manual billing is on.",
  gateTitle: "Not enough AI credits",
  gateBody: "You have {available} credits. This needs {required}. Buy credits or use a monthly plan to continue with voice, chat or camera.",
  gateManual: "Recording a sale or expense by hand does not use AI credits.",
  buyCredits: "Buy credits",
  recordByHand: "Record by hand",
};

const am: BillingText = {
  tab: "AI ክሬዲት",
  title: "AI ክሬዲት",
  remaining: "የቀሩ AI ክሬዲቶች",
  expiring: "{n} ክሬዲት በ7 ቀን ውስጥ ያበቃል",
  sources: {
    SUBSCRIPTION: "ወርሃዊ",
    PURCHASED: "ቶፕ-አፕ",
    REFERRAL: "ግብዣ",
    PROMO: "ማስተዋወቂያ",
    ADMIN: "ማስተካከያ",
  },
  buyTitle: "ክሬዲት ግዛ",
  plansTitle: "ወርሃዊ እቅዶች",
  planNames: { FREE: "ነፃ", STARTER: "ስታርተር", PRO: "ፕሮ", BUSINESS: "ቢዝነስ" },
  planDescriptions: {
    FREE: "የሱቅ መዝገብ፣ እቃ እና ትንሽ ወርሃዊ AI ክሬዲት።",
    STARTER: "ረዳቱን በተደጋጋሚ ለሚጠቀም ሱቅ የወር AI ክሬዲት።",
    PRO: "ለድምጽ፣ ለካሜራ እና ለዕለታዊ ጥያቄ ተጨማሪ ክሬዲት።",
    BUSINESS: "በጣም ብዙ ወርሃዊ ክሬዲት። በክሬዲት ርካሽ።",
  },
  packageNames: {
    topup_50: "ትንሽ ቶፕ-አፕ",
    topup_100: "መካከለኛ ቶፕ-አፕ",
    topup_250: "ትልቅ ቶፕ-አፕ",
    topup_500: "የንግድ ቶፕ-አፕ",
  },
  packageDescriptions: {
    topup_50: "አልፎ አልፎ ለሚጠቀሙ። ክሬዲቱ ለ90 ቀን ይቆያል።",
    topup_100: "ለተጨናነቀ ሳምንት። ክሬዲቱ ለ90 ቀን ይቆያል።",
    topup_250: "ያለ ወር እቅድ ለተደጋጋሚ አጠቃቀም። ለ90 ቀን ይቆያል።",
    topup_500: "ትልቁ ጥቅል። ወርሃዊ እቅድ በክሬዲት ርካሽ ነው።",
  },
  credits: "{n} ክሬዲት",
  bonus: "+{n} ተጨማሪ",
  validDays: "ለ{n} ቀን ይሠራል",
  perCredit: "{price} ብር / ክሬዲት",
  perMonth: "{price} ብር / ወር",
  free: "ነፃ",
  payWith: "በ{name} ክፈል",
  noProviders: "የመስመር ላይ ክፍያ እስካሁን አልተዘጋጀም። ነፃ ወርሃዊ ክሬዲት ይቀጥላል።",
  current: "አሁን ያለው",
  savings: "ወርሃዊ እቅድ ከዝቅተኛው ቶፕ-አፕ በክሬዲት ወደ {pct}% ርካሽ ነው።",
  suggest: "በዚህ ወር {amount} ብር በቶፕ-አፕ አውጥተዋል። ለተደጋጋሚ አጠቃቀም {plan} ሊሆን ይችላል።",
  history: "የክሬዲት ታሪክ",
  emptyHistory: "እስካሁን የክሬዲት እንቅስቃሴ የለም።",
  pricesTitle: "ክሬዲት የሚጠቀመው",
  features: {
    TEXT_CHAT: "የጽሑፍ ረዳት",
    VOICE_TURN: "የድምጽ ጥያቄ",
    TTS: "የድምጽ መልስ",
    VISION: "ካሜራ",
    RECEIPT: "ደረሰኝ",
  },
  notices: {
    LOW_CREDITS: "{n} AI ክሬዲት ቀርቶዎታል።",
    TOPUP_PAID: "{n} የቶፕ-አፕ ክሬዲት ገብቷል።",
    SUBSCRIPTION_PAID: "እቅዱ በርቷል እና {n} ወርሃዊ ክሬዲት ገብቷል።",
    CREDITS_EXPIRED: "{n} ክሬዲት አልፏል።",
    PAYMENT_FAILED: "ክፍያው አልተጠናቀቀም። ክሬዲት አልገባም።",
    REFERRAL_CREDITS: "{n} የግብዣ ክሬዲት ተቀብለዋል።",
    PROMO_CREDITS: "{n} የማስተዋወቂያ ክሬዲት ተቀብለዋል።",
    SUBSCRIPTION_ENDED: "የተከፈለው እቅድ አልቋል። መዝገቦች ይቀራሉ። ነፃ ክሬዲት ይቀጥላል።",
  },
  devTitle: "የሙከራ ክፍያ",
  devBody: "ይህ የልማት ክፍያ ነው። ገንዘብ አይንቀሳቀስም።",
  devSuccess: "ተከፍሏል በል",
  devFail: "አልተሳካም በል",
  devCancel: "ተሰርዟል በል",
  devPending: "በመጠባበቅ ላይ ትተህ",
  checking: "ክፍያ በመረጋገጥ ላይ…",
  paid: "ክፍያ ተረጋግጧል። ክሬዲቱ በቦርሳው ውስጥ ነው።",
  pending: "ክፍያው እየተጠናቀቀ ነው።",
  failed: "ክፍያው አልተጠናቀቀም።",
  cancelPlan: "በጊዜው መጨረሻ አቁም",
  cancelScheduled: "ይህ እቅድ በ{date} ያበቃል። የተገዛ ክሬዲት እስኪያልቅ ይቆያል።",
  paidUntil: "እስከ {date} ተከፍሏል",
  manualNote: "እቅድ መምረጥ እውነተኛ ክፍያ ይጀምራል። የሽልማት ገጽ እቅድ የሚቀይረው በእጅ ክፍያ ሲበራ ብቻ ነው።",
  gateTitle: "በቂ AI ክሬዲት የለም",
  gateBody: "{available} ክሬዲት አለዎት። ይህ {required} ይፈልጋል። በድምጽ፣ በጽሑፍ ወይም በካሜራ ለመቀጠል ክሬዲት ይግዙ ወይም ወርሃዊ እቅድ ይምረጡ።",
  gateManual: "ገቢ ወይም ወጪ በእጅ መመዝገብ AI ክሬዲት አይጠቀምም።",
  buyCredits: "ክሬዲት ግዛ",
  recordByHand: "በእጅ መዝግብ",
};

const om: BillingText = {
  tab: "AI kirediitii",
  title: "AI kirediitii",
  remaining: "AI kirediitii hafe",
  expiring: "Kirediitiin {n} guyyoota 7 keessatti ni xumurama",
  sources: {
    SUBSCRIPTION: "Ji'aa",
    PURCHASED: "Top-up",
    REFERRAL: "Afeerraa",
    PROMO: "Beeksisa",
    ADMIN: "Sirreeffama",
  },
  buyTitle: "Kirediitii biti",
  plansTitle: "Karoora ji'aa",
  planNames: { FREE: "Bilisaa", STARTER: "Starter", PRO: "Pro", BUSINESS: "Business" },
  planDescriptions: {
    FREE: "Galmee suuqii, meeshaa fi kirediitii AI xiqqaa ji'aa.",
    STARTER: "Kirediitii ji'aa kan gargaaraa yeroo hunda fayyadamu.",
    PRO: "Kirediitii dabalataa sagalee, kaameraa fi gaaffii guyyaa.",
    BUSINESS: "Kirediitii ji'aa guddaan. Kirediitii tokkoof salphaadha.",
  },
  packageNames: {
    topup_50: "Top-up xiqqaa",
    topup_100: "Top-up giddu galeessaa",
    topup_250: "Top-up guddaa",
    topup_500: "Top-up daldalaa",
  },
  packageDescriptions: {
    topup_50: "Fayyadama yeroo muraasaa. Guyyaa 90 tura.",
    topup_100: "Torban hojii baay'eef. Guyyaa 90 tura.",
    topup_250: "Karoora ji'aa malee fayyadama yeroo hundaaf. Guyyaa 90 tura.",
    topup_500: "Paakkeejjii guddaan. Karoorri ji'aa salphaadha.",
  },
  credits: "Kirediitii {n}",
  bonus: "+{n} dabalataa",
  validDays: "Guyyaa {n} tajaajila",
  perCredit: "ETB {price} / kirediitii",
  perMonth: "ETB {price} / ji'a",
  free: "Bilisa",
  payWith: "{name} tiin kaffali",
  noProviders: "Kaffaltiin toora interneetii amma hin qindaa'in. Kirediitiin bilisaa ji'aa itti fufa.",
  current: "Ammaa",
  savings: "Karoorri ji'aa top-up gadi aanaa irraa kirediitii tokkoof gara {pct}% salphaadha.",
  suggest: "Ji'a kana top-up irratti ETB {amount} baaste. Fayyadama yeroo hundaaf {plan} gaarii ta'uu danda'a.",
  history: "Seenaa kirediitii",
  emptyHistory: "Sochii kirediitii amma hin jiru.",
  pricesTitle: "Kirediitii kan fayyadamu",
  features: {
    TEXT_CHAT: "Gargaaraa barreeffamaa",
    VOICE_TURN: "Gaaffii sagalee",
    TTS: "Deebii sagalee",
    VISION: "Kaameraa",
    RECEIPT: "Nagahee",
  },
  notices: {
    LOW_CREDITS: "AI kirediitiin {n} siif hafe.",
    TOPUP_PAID: "Kirediitiin top-up {n} dabalameera.",
    SUBSCRIPTION_PAID: "Karoorri ni hojjeta, kirediitiin ji'aa {n} dabalameera.",
    CREDITS_EXPIRED: "Kirediitiin {n} xumurameera.",
    PAYMENT_FAILED: "Kaffaltiin hin xumuramne. Kirediitiin hin dabalamne.",
    REFERRAL_CREDITS: "Kirediitii affeerraa {n} argatte.",
    PROMO_CREDITS: "Kirediitii beeksisaa {n} argatte.",
    SUBSCRIPTION_ENDED: "Karoorri kaffalame xumurameera. Galmeen ni hafa. Kirediitiin bilisaa itti fufa.",
  },
  devTitle: "Kaffaltii qorannoo",
  devBody: "Kun kaffaltii misoomaati. Maallaqni hin socho'u.",
  devSuccess: "Akka kaffalameetti",
  devFail: "Akka hin milkoofne",
  devCancel: "Akka haqameetti",
  devPending: "Akka eegamuutti",
  checking: "Kaffaltii mirkaneessaa jira…",
  paid: "Kaffaltiin mirkanaa'eera. Kirediitiin boorsaa keessa jira.",
  pending: "Kaffaltiin ammayyuu adeemsifamaa jira.",
  failed: "Kaffaltiin hin xumuramne.",
  cancelPlan: "Yeroo xumuraatti dhaabi",
  cancelScheduled: "Karoorri kun {date} tti ni xumurama. Kirediitiin bitame hamma xumuramutti tura.",
  paidUntil: "Hamma {date} kaffalame",
  manualNote: "Karoora filachuun kaffaltii dhugaa jalqaba. Fuulli badhaasa karoora yoo kaffaltiin harkaan baname qofa jijjiira.",
  gateTitle: "Kirediitii AI gahaa hin qabdu",
  gateBody: "Kirediitii {available} qabda. Kun {required} barbaada. Sagalee, barreeffama ykn kaameraa itti fufuuf kirediitii biti ykn karoora ji'aa filadhu.",
  gateManual: "Galii ykn baasii harkaan galmeessuun kirediitii AI hin fayyadamu.",
  buyCredits: "Kirediitii biti",
  recordByHand: "Harkaan galmeessi",
};

export const BILLING_TEXT: Record<LanguageCode, BillingText> = { en, am, om };

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
