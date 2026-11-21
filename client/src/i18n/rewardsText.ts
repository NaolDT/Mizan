import type {
  LanguageCode,
  RedeemBlockReason,
  RedeemOptionId,
  RewardEventType,
  SubscriptionPlan,
} from "@mizan/shared";

export interface RewardsText {
  tab: string;
  voiceTitle: string;
  usedOf: string; // {used} {total}
  bonusReplies: string; // {n}
  resetsOn: string; // {date}
  trialUntil: string; // {date}
  quotaPill: string; // {n}
  quotaOut: string;
  quotaOutAction: string;
  plansTitle: string;
  planNames: Record<SubscriptionPlan, string>;
  etbPerMonth: string; // {price}
  free: string;
  repliesPerMonth: string; // {n}
  currentPlan: string;
  choose: string;
  billingDemoNote: string;
  billingUnavailable: string;
  buyPack: string; // {n} {price}
  discountActive: string; // {pct}
  charged: string; // {amount}
  inviteTitle: string;
  inviteBody: string; // {referrer} {referred} {txs} {days}
  yourCode: string;
  copyLink: string;
  copied: string;
  invitedShops: string;
  noInvites: string;
  referralStatus: Record<"PENDING" | "QUALIFIED" | "REJECTED", string>;
  progress: string; // {done} {total}
  rejection: Record<string, string>;
  joinedWithInvite: string;
  pointsTitle: string;
  pointsNote: string;
  pts: string; // {n}
  earnTitle: string;
  earnFirst: string; // {n} {pts}
  earnStreak: string; // {days} {pts}
  earnReferral: string; // {pts}
  redeemTitle: string;
  redeemOptions: Record<RedeemOptionId, { name: string; description: string }>;
  redeemButton: string;
  blocked: Record<RedeemBlockReason, string>;
  redeemed: string;
  historyTitle: string;
  noHistory: string;
  events: Record<RewardEventType, string>;
  loading: string;
  loadFailed: string;
  inviteCodeLabel: string;
  inviteCodeHint: string;
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

const en: RewardsText = {
  tab: "Rewards",
  voiceTitle: "Spoken replies",
  usedOf: "{used} of {total} used this month",
  bonusReplies: "+{n} bonus replies",
  resetsOn: "Resets on {date}",
  trialUntil: "Starter trial until {date}",
  quotaPill: "{n} spoken left",
  quotaOut: "You have used all your spoken replies. Answers still appear as text.",
  quotaOutAction: "Get more replies",
  plansTitle: "Plans",
  planNames: { FREE: "Free", STARTER: "Starter", PRO: "Pro", BUSINESS: "Business" },
  etbPerMonth: "{price} ETB / month",
  free: "Free",
  repliesPerMonth: "{n} spoken replies / month",
  currentPlan: "Current plan",
  choose: "Choose",
  billingDemoNote: "Online payment is not connected yet. In this demo a plan switches instantly and nothing is charged.",
  billingUnavailable: "Online payment is coming soon. Contact Mizan to change your plan.",
  buyPack: "Add {n} replies for {price} ETB",
  discountActive: "{pct}% off your next plan payment is active",
  charged: "Amount due: {amount} ETB",
  inviteTitle: "Invite a shop, earn points",
  inviteBody:
    "Share your code. When the shop you invite records {txs} transactions within {days} days, you get {referrer} points and they get {referred} points.",
  yourCode: "Your invite code",
  copyLink: "Copy invite link",
  copied: "Copied",
  invitedShops: "Shops you invited",
  noInvites: "No invites yet.",
  referralStatus: { PENDING: "In progress", QUALIFIED: "Rewarded", REJECTED: "Closed" },
  progress: "{done} / {total} transactions",
  rejection: {
    WINDOW_EXPIRED: "The time window ended before enough transactions were recorded.",
    REFERRER_LIMIT: "The monthly invite reward limit was reached.",
  },
  joinedWithInvite: "You joined with an invite",
  pointsTitle: "Your points",
  pointsNote: "Points are not money. Use them for the rewards below.",
  pts: "{n} pts",
  earnTitle: "How to earn",
  earnFirst: "Record your first {n} transactions: +{pts} pts",
  earnStreak: "Record transactions {days} days in a row: +{pts} pts",
  earnReferral: "Each shop you invite that starts using Mizan: +{pts} pts",
  redeemTitle: "Use your points",
  redeemOptions: {
    EXTRA_VOICE: { name: "10 extra spoken replies", description: "Added right away." },
    DISCOUNT_10: { name: "10% off next plan payment", description: "Applies once to your next paid plan." },
    STARTER_WEEK: { name: "7 days of Starter", description: "Free plan only. Once every 90 days." },
  },
  redeemButton: "Redeem",
  blocked: {
    NOT_ENOUGH_POINTS: "Not enough points yet",
    ALREADY_ACTIVE: "Already active",
    COOLDOWN: "Available again later",
  },
  redeemed: "Reward added",
  historyTitle: "Points history",
  noHistory: "No points yet. Record a few transactions to start.",
  events: {
    EARN_FIRST_TRANSACTIONS: "First transactions recorded",
    EARN_STREAK_7: "7-day recording streak",
    EARN_REFERRAL_REFERRER: "A shop you invited joined",
    EARN_REFERRAL_WELCOME: "Welcome bonus for joining with an invite",
    REDEEM_EXTRA_VOICE: "Redeemed: extra spoken replies",
    REDEEM_DISCOUNT: "Redeemed: plan discount",
    REDEEM_STARTER_WEEK: "Redeemed: Starter week",
  },
  loading: "Loading...",
  loadFailed: "Could not load. Please try again.",
  inviteCodeLabel: "Invite code (optional)",
  inviteCodeHint: "From a shop owner who invited you",
};

const am: RewardsText = {
  tab: "ሽልማቶች",
  voiceTitle: "የድምፅ መልሶች",
  usedOf: "በዚህ ወር {used} ከ{total} ተጠቅመዋል",
  bonusReplies: "+{n} ተጨማሪ መልሶች",
  resetsOn: "{date} ላይ ይታደሳል",
  trialUntil: "የጀማሪ ሙከራ እስከ {date}",
  quotaPill: "{n} የድምፅ መልስ ቀርቷል",
  quotaOut: "የድምፅ መልሶችዎ አልቀዋል። መልሶች በጽሑፍ መታየታቸውን ይቀጥላሉ።",
  quotaOutAction: "ተጨማሪ መልሶች ያግኙ",
  plansTitle: "ፕላኖች",
  planNames: { FREE: "ነፃ", STARTER: "ጀማሪ", PRO: "ፕሮ", BUSINESS: "ቢዝነስ" },
  etbPerMonth: "{price} ብር / በወር",
  free: "ነፃ",
  repliesPerMonth: "{n} የድምፅ መልሶች / በወር",
  currentPlan: "የአሁኑ ፕላን",
  choose: "ምረጥ",
  billingDemoNote: "የኦንላይን ክፍያ ገና አልተገናኘም። በዚህ ማሳያ ፕላን ወዲያውኑ ይቀየራል፤ ምንም አይከፈልም።",
  billingUnavailable: "የኦንላይን ክፍያ በቅርቡ ይመጣል። ፕላን ለመቀየር ሚዛንን ያነጋግሩ።",
  buyPack: "{n} መልሶችን በ{price} ብር ይጨምሩ",
  discountActive: "በቀጣዩ የፕላን ክፍያዎ ላይ {pct}% ቅናሽ ተዘጋጅቷል",
  charged: "የሚከፈል መጠን፦ {amount} ብር",
  inviteTitle: "ሱቅ ይጋብዙ፣ ነጥብ ያግኙ",
  inviteBody:
    "ኮድዎን ያጋሩ። የጋበዙት ሱቅ በ{days} ቀናት ውስጥ {txs} ግብይቶችን ሲመዘግብ እርስዎ {referrer} ነጥብ፣ እነሱ {referred} ነጥብ ያገኛሉ።",
  yourCode: "የእርስዎ የመጋበዣ ኮድ",
  copyLink: "የመጋበዣ ሊንክ ቅዳ",
  copied: "ተቀድቷል",
  invitedShops: "የጋበዟቸው ሱቆች",
  noInvites: "እስካሁን ምንም ግብዣ የለም።",
  referralStatus: { PENDING: "በሂደት ላይ", QUALIFIED: "ተሸልሟል", REJECTED: "ተዘግቷል" },
  progress: "{done} / {total} ግብይቶች",
  rejection: {
    WINDOW_EXPIRED: "በቂ ግብይቶች ሳይመዘገቡ የጊዜ ገደቡ አልቋል።",
    REFERRER_LIMIT: "የወሩ የግብዣ ሽልማት ገደብ ደርሷል።",
  },
  joinedWithInvite: "በግብዣ ተቀላቅለዋል",
  pointsTitle: "ነጥቦችዎ",
  pointsNote: "ነጥብ ገንዘብ አይደለም። ከታች ላሉት ሽልማቶች ይጠቀሙበት።",
  pts: "{n} ነጥብ",
  earnTitle: "እንዴት ያገኛሉ",
  earnFirst: "የመጀመሪያዎቹን {n} ግብይቶች ይመዝግቡ፦ +{pts} ነጥብ",
  earnStreak: "ለ{days} ቀናት በተከታታይ ግብይት ይመዝግቡ፦ +{pts} ነጥብ",
  earnReferral: "ሚዛንን መጠቀም የጀመረ እያንዳንዱ የጋበዙት ሱቅ፦ +{pts} ነጥብ",
  redeemTitle: "ነጥብዎን ይጠቀሙ",
  redeemOptions: {
    EXTRA_VOICE: { name: "10 ተጨማሪ የድምፅ መልሶች", description: "ወዲያውኑ ይጨመራል።" },
    DISCOUNT_10: { name: "በቀጣዩ ፕላን ክፍያ 10% ቅናሽ", description: "በሚቀጥለው የሚከፈል ፕላን ላይ አንድ ጊዜ ይተገበራል።" },
    STARTER_WEEK: { name: "7 ቀን የጀማሪ ፕላን", description: "ለነፃ ፕላን ብቻ። በ90 ቀን አንድ ጊዜ።" },
  },
  redeemButton: "ተጠቀም",
  blocked: {
    NOT_ENOUGH_POINTS: "ነጥብ በቂ አይደለም",
    ALREADY_ACTIVE: "አስቀድሞ ንቁ ነው",
    COOLDOWN: "ቆይቶ እንደገና ይገኛል",
  },
  redeemed: "ሽልማቱ ተጨምሯል",
  historyTitle: "የነጥብ ታሪክ",
  noHistory: "እስካሁን ነጥብ የለም። ለመጀመር ጥቂት ግብይቶችን ይመዝግቡ።",
  events: {
    EARN_FIRST_TRANSACTIONS: "የመጀመሪያ ግብይቶች ተመዝግበዋል",
    EARN_STREAK_7: "የ7 ቀን ተከታታይ ምዝገባ",
    EARN_REFERRAL_REFERRER: "የጋበዙት ሱቅ ተቀላቅሏል",
    EARN_REFERRAL_WELCOME: "በግብዣ ለመቀላቀል የእንኳን ደህና መጡ ጉርሻ",
    REDEEM_EXTRA_VOICE: "ተጠቅመዋል፦ ተጨማሪ የድምፅ መልሶች",
    REDEEM_DISCOUNT: "ተጠቅመዋል፦ የፕላን ቅናሽ",
    REDEEM_STARTER_WEEK: "ተጠቅመዋል፦ የጀማሪ ሳምንት",
  },
  loading: "በመጫን ላይ...",
  loadFailed: "መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
  inviteCodeLabel: "የመጋበዣ ኮድ (አማራጭ)",
  inviteCodeHint: "ከጋበዘዎ የሱቅ ባለቤት",
};

const om: RewardsText = {
  tab: "Badhaasa",
  voiceTitle: "Deebii sagalee",
  usedOf: "Ji'a kana {used} kan {total} fayyadamteetta",
  bonusReplies: "+{n} deebii dabalataa",
  resetsOn: "{date} irratti haaromfama",
  trialUntil: "Yaalii Jalqabaa hanga {date}",
  quotaPill: "{n} deebii sagalee hafe",
  quotaOut: "Deebiiwwan sagalee kee dhumaniiru. Deebiin barreeffamaan ni mul'ata.",
  quotaOutAction: "Deebii dabalataa argadhu",
  plansTitle: "Karoorota",
  planNames: { FREE: "Bilisaa", STARTER: "Jalqabaa", PRO: "Pro", BUSINESS: "Daldala" },
  etbPerMonth: "{price} Birrii / ji'a",
  free: "Bilisaa",
  repliesPerMonth: "{n} deebii sagalee / ji'a",
  currentPlan: "Karoora ammaa",
  choose: "Filadhu",
  billingDemoNote: "Kaffaltiin toora interneetii ammallee hin walqabatne. Agarsiisa kana keessatti karooriin battalumatti jijjiirama; homtuu hin kaffalamu.",
  billingUnavailable: "Kaffaltiin toora interneetii dhiyaachuuf jira. Karoora jijjiiruuf Mizan qunnamaa.",
  buyPack: "Deebii {n} Birrii {price}n dabaluu",
  discountActive: "Kaffaltii karoora itti aanu irratti hir'ina {pct}% qophaa'eera",
  charged: "Hanga kaffalamu: Birrii {amount}",
  inviteTitle: "Suuqii affeeri, qabxii argadhu",
  inviteBody:
    "Koodii kee qoodi. Suuqiin ati affeerte guyyaa {days} keessatti daldala {txs} yoo galmeessite, ati qabxii {referrer}, isaan qabxii {referred} argatu.",
  yourCode: "Koodii affeerraa kee",
  copyLink: "Linkii affeerraa waraabi",
  copied: "Waraabameera",
  invitedShops: "Suuqota ati affeerte",
  noInvites: "Ammaaf affeerraan hin jiru.",
  referralStatus: { PENDING: "Adeemsa irra", QUALIFIED: "Badhaafameera", REJECTED: "Cufameera" },
  progress: "Daldala {done} / {total}",
  rejection: {
    WINDOW_EXPIRED: "Daldalli gahaan osoo hin galmaa'in yeroon dhume.",
    REFERRER_LIMIT: "Daangaan badhaasa affeerraa ji'aa gaheera.",
  },
  joinedWithInvite: "Affeerraadhaan makamteetta",
  pointsTitle: "Qabxii kee",
  pointsNote: "Qabxiin maallaqa miti. Badhaasa armaan gadiif fayyadami.",
  pts: "Qabxii {n}",
  earnTitle: "Akkamitti argatamu",
  earnFirst: "Daldala jalqabaa {n} galmeessi: +{pts} qabxii",
  earnStreak: "Guyyaa {days} walitti aanuun daldala galmeessi: +{pts} qabxii",
  earnReferral: "Suuqiin ati affeerte tokko Mizan fayyadamuu jalqabe hundaaf: +{pts} qabxii",
  redeemTitle: "Qabxii kee fayyadami",
  redeemOptions: {
    EXTRA_VOICE: { name: "Deebii sagalee dabalataa 10", description: "Battalumatti dabalama." },
    DISCOUNT_10: { name: "Kaffaltii karoora itti aanu irratti hir'ina 10%", description: "Karoora kaffalamu itti aanu irratti altokko hojiirra oola." },
    STARTER_WEEK: { name: "Guyyaa 7 Karoora Jalqabaa", description: "Karoora bilisaaf qofa. Guyyaa 90 keessatti altokko." },
  },
  redeemButton: "Fayyadami",
  blocked: {
    NOT_ENOUGH_POINTS: "Qabxiin ammaaf hin gahu",
    ALREADY_ACTIVE: "Duraanuu hojiirra jira",
    COOLDOWN: "Booda deebi'ee argama",
  },
  redeemed: "Badhaasni dabalameera",
  historyTitle: "Seenaa qabxii",
  noHistory: "Ammaaf qabxiin hin jiru. Jalqabuuf daldala muraasa galmeessi.",
  events: {
    EARN_FIRST_TRANSACTIONS: "Daldala jalqabaa galmaa'e",
    EARN_STREAK_7: "Galmee guyyaa 7 walitti aanu",
    EARN_REFERRAL_REFERRER: "Suuqiin ati affeerte makame",
    EARN_REFERRAL_WELCOME: "Badhaasa affeerraadhaan makamuu",
    REDEEM_EXTRA_VOICE: "Fayyadame: deebii sagalee dabalataa",
    REDEEM_DISCOUNT: "Fayyadame: hir'ina karooraa",
    REDEEM_STARTER_WEEK: "Fayyadame: torbee Jalqabaa",
  },
  loading: "Fe'aa jira...",
  loadFailed: "Fe'uun hin danda'amne. Maaloo irra deebi'ii yaali.",
  inviteCodeLabel: "Koodii affeerraa (barbaachisaa miti)",
  inviteCodeHint: "Abbaa suuqii si affeerete irraa",
};

export const REWARDS_TEXT: Record<LanguageCode, RewardsText> = { am, om, en };
