import type { LanguageCode } from "@mizan/shared";

export interface PosText {
  tab: string;
  search: string;
  emptyCart: string;
  emptyProducts: string;
  cart: string;
  charge: string;
  customer: string;
  walkIn: string;
  discount: string;
  subtotal: string;
  total: string;
  receipt: string;
  newSale: string;
  noPrice: string;
  stock: string;
}

const en: PosText = {
  tab: "Sell",
  search: "Search name or barcode",
  emptyCart: "Tap a product to start a sale.",
  emptyProducts: "Add products with a selling price before using the till.",
  cart: "Cart",
  charge: "Charge",
  customer: "Customer",
  walkIn: "Walk-in",
  discount: "Discount",
  subtotal: "Subtotal",
  total: "Total",
  receipt: "Sale recorded",
  newSale: "New sale",
  noPrice: "Set a selling price first",
  stock: "In stock",
};

const am: PosText = {
  tab: "ሽያጭ",
  search: "ስም ወይም ባርኮድ ፈልግ",
  emptyCart: "ሽያጭ ለመጀመር እቃ ይንኩ።",
  emptyProducts: "የሽያጭ ዋጋ ያላቸው እቃዎች ካስገቡ በኋላ ይሸጡ።",
  cart: "ጋሪ",
  charge: "ክፈል",
  customer: "ደንበኛ",
  walkIn: "ያለ ስም",
  discount: "ቅናሽ",
  subtotal: "ንዑስ ድምር",
  total: "ድምር",
  receipt: "ሽያጩ ተመዝግቧል",
  newSale: "አዲስ ሽያጭ",
  noPrice: "መጀመሪያ የሽያጭ ዋጋ ያስገቡ",
  stock: "ክምችት",
};

const om: PosText = {
  tab: "Gurgurtaa",
  search: "Maqaa ykn baarkoodii barbaadi",
  emptyCart: "Gurgurtaa jalqabuuf meeshaa tuqi.",
  emptyProducts: "Gatii gurgurtaa qaban galchitee booda gurguri.",
  cart: "Gaarii",
  charge: "Kaffalsi",
  customer: "Maamila",
  walkIn: "Maqaa malee",
  discount: "Hir'ina",
  subtotal: "Ida'a giddugaleessa",
  total: "Ida'a",
  receipt: "Gurgurtaa galmaa'eera",
  newSale: "Gurgurtaa haaraa",
  noPrice: "Dura gatii gurgurtaa galchi",
  stock: "Kuufama",
};

export const POS_TEXT: Record<LanguageCode, PosText> = { am, om, en };
