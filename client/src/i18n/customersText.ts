import type { CustomerSegment, LanguageCode } from "@mizan/shared";

export interface CustomersIntelText {
  spend: string;
  sales: string;
  points: string;
  lastBuy: string;
  neverBought: string;
  redeem: string;
  redeemHint: string;
  purchases: string;
  loyaltyHistory: string;
  filterAll: string;
  loyaltyEnabled: string;
  loyaltyRule: string;
  segment: Record<CustomerSegment, string>;
}

const en: CustomersIntelText = {
  spend: "Lifetime spend",
  sales: "Sales",
  points: "Shop points",
  lastBuy: "Last purchase",
  neverBought: "No purchases yet",
  redeem: "Redeem points",
  redeemHint: "Points are a shop stamp card, not Mizan AI credits.",
  purchases: "Purchases",
  loyaltyHistory: "Points history",
  filterAll: "All",
  loyaltyEnabled: "Award shop points on named sales",
  loyaltyRule: "ETB per point",
  segment: {
    NEW: "New",
    REGULAR: "Regular",
    FREQUENT: "Frequent",
    INACTIVE: "Inactive",
    OWING: "Owes you",
  },
};

const am: CustomersIntelText = {
  spend: "ጠቅላላ ግዢ",
  sales: "ሽያጭ",
  points: "የሱቅ ነጥብ",
  lastBuy: "መጨረሻ ግዢ",
  neverBought: "እስካሁን ግዢ የለም",
  redeem: "ነጥብ ተጠቀም",
  redeemHint: "ይህ የሱቅ ማህተም ነው እንጂ የ Mizan AI ክሬዲት አይደለም።",
  purchases: "ግዢዎች",
  loyaltyHistory: "የነጥብ ታሪክ",
  filterAll: "ሁሉም",
  loyaltyEnabled: "በስም ሽያጭ የሱቅ ነጥብ ስጥ",
  loyaltyRule: "በአንድ ነጥብ የሚያስፈልግ ብር",
  segment: {
    NEW: "አዲስ",
    REGULAR: "መደበኛ",
    FREQUENT: "ተደጋጋሚ",
    INACTIVE: "የቆየ",
    OWING: "ዱቤ አለበት",
  },
};

const om: CustomersIntelText = {
  spend: "Bittaa waliigalaa",
  sales: "Gurgurtaa",
  points: "Qabxii suuqii",
  lastBuy: "Bittaa dhiyoo",
  neverBought: "Ammaaf bittaan hin jiru",
  redeem: "Qabxii fayyadami",
  redeemHint: "Kun staampii suuqii ti, krediti Mizan AI miti.",
  purchases: "Bittaa",
  loyaltyHistory: "Seenaa qabxii",
  filterAll: "Hunda",
  loyaltyEnabled: "Gurgurtaa maqaa qabu irratti qabxii suuqii kenni",
  loyaltyRule: "ETB qabxii tokkoof",
  segment: {
    NEW: "Haaraa",
    REGULAR: "Idilee",
    FREQUENT: "Yeroo yeroo",
    INACTIVE: "Dhiisame",
    OWING: "Liqaa qaba",
  },
};

export const CUSTOMERS_INTEL_TEXT: Record<LanguageCode, CustomersIntelText> = { am, om, en };
