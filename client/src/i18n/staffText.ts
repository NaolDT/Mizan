import type { LanguageCode, MembershipStatus, ShopRole } from "@mizan/shared";

export interface StaffText {
  tab: string;
  title: string;
  hint: string;
  add: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: string;
  status: Record<MembershipStatus, string>;
  roles: Record<Exclude<ShopRole, "OWNER">, string>;
  ownerRole: string;
  disable: string;
  enable: string;
  empty: string;
  save: string;
  auditTitle: string;
  emptyAudit: string;
}

const en: StaffText = {
  tab: "Team",
  title: "People in this shop",
  hint: "Staff sign in with this phone or email. They work in this shop only — a cashier login will not open a new business.",
  add: "Add teammate",
  name: "Name",
  phone: "Phone",
  email: "Email",
  password: "Password",
  role: "Role",
  status: { ACTIVE: "Active", DISABLED: "Disabled" },
  roles: {
    MANAGER: "Manager",
    CASHIER: "Cashier",
    INVENTORY: "Inventory",
    ACCOUNTANT: "Accountant",
  },
  ownerRole: "Owner",
  disable: "Disable",
  enable: "Enable",
  empty: "Only you can sign in until you add a teammate.",
  save: "Save",
  auditTitle: "Recent shop changes",
  emptyAudit: "No audited changes yet.",
};

const am: StaffText = {
  tab: "ቡድን",
  title: "የዚህ ሱቅ ሰዎች",
  hint: "ሰራተኞች በዚህ ስልክ ወይም ኢሜይል ይገባሉ። በዚህ ሱቅ ብቻ ይሰራሉ — የገንዘብ ተቀባይ መግቢያ አዲስ ንግድ አይከፍትም።",
  add: "ቡድን አባል ጨምር",
  name: "ስም",
  phone: "ስልክ",
  email: "ኢሜይል",
  password: "የይለፍ ቃል",
  role: "ሚና",
  status: { ACTIVE: "ንቁ", DISABLED: "ቆሟል" },
  roles: {
    MANAGER: "አስተዳዳሪ",
    CASHIER: "ገንዘብ ተቀባይ",
    INVENTORY: "ክምችት",
    ACCOUNTANT: "ሂሳብ ሹም",
  },
  ownerRole: "ባለቤት",
  disable: "አቁም",
  enable: "አንቃ",
  empty: "ቡድን አባል እስከሚጨምሩ ድረስ እርስዎ ብቻ ይገባሉ።",
  save: "አስቀምጥ",
  auditTitle: "የቅርብ ጊዜ ለውጦች",
  emptyAudit: "እስካሁን የተመዘገበ ለውጥ የለም።",
};

const om: StaffText = {
  tab: "Garee",
  title: "Namoota suuqii kanaa",
  hint: "Hojjettoonni bilbilaa ykn iimeelii kanaan seenu. Suuqa kana qofa keessatti hojjetu — seensii kasierii daldala haaraa hin banu.",
  add: "Miseensa dabali",
  name: "Maqaa",
  phone: "Bilbila",
  email: "Iimeelii",
  password: "Jecha iccitii",
  role: "Gahee",
  status: { ACTIVE: "Hojii irra", DISABLED: "Cufame" },
  roles: {
    MANAGER: "Hoogganaa",
    CASHIER: "Kasierii",
    INVENTORY: "Kuusaa",
    ACCOUNTANT: "Herrega",
  },
  ownerRole: "Abbaa qabeenyaa",
  disable: "Cufi",
  enable: "Bani",
  empty: "Hanga miseensa dabaltutti ati qofa seenta.",
  save: "Olkaa'i",
  auditTitle: "Jijjiirama dhihoo",
  emptyAudit: "Jijjiiramni galmaa'e hin jiru.",
};

export const STAFF_TEXT: Record<LanguageCode, StaffText> = { am, om, en };
