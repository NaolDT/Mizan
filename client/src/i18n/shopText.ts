import type { LanguageCode } from "@mizan/shared";

export interface ShopText {
  insightsTitle: string;
  noInsights: string;
  addProduct: string;
  productName: string;
  unit: string;
  quantity: string;
  threshold: string;
  sellingPrice: string;
  costPrice: string;
  save: string;
  cancel: string;
  restock: string;
  reduce: string;
  adjustQty: string;
  lowStock: string;
  emptyProducts: string;
  movements: string;
  addCustomer: string;
  customerName: string;
  phone: string;
  notes: string;
  owes: string;
  settled: string;
  recordPayment: string;
  paymentAmount: string;
  emptyCustomers: string;
  history: string;
  confirmStock: string;
  confirmPayment: string;
  productLabel: string;
  qtySoldLabel: string;
  noProduct: string;
}

const en: ShopText = {
  insightsTitle: "Business insights",
  noInsights: "Insights appear after you record a few transactions.",
  addProduct: "Add product",
  productName: "Product name",
  unit: "Unit",
  quantity: "In stock",
  threshold: "Low-stock at",
  sellingPrice: "Selling price",
  costPrice: "Cost",
  save: "Save",
  cancel: "Cancel",
  restock: "Add stock",
  reduce: "Remove stock",
  adjustQty: "Quantity",
  lowStock: "Low stock",
  emptyProducts: "No products yet. Add cooking oil, sugar or anything you sell.",
  movements: "Recent stock changes",
  addCustomer: "Add customer",
  customerName: "Customer name",
  phone: "Phone",
  notes: "Notes",
  owes: "Owes",
  settled: "Settled",
  recordPayment: "Record payment",
  paymentAmount: "Amount paid",
  emptyCustomers: "No customers yet. Credit sales will create a customer from the name you enter.",
  history: "History",
  confirmStock: "Stock change",
  confirmPayment: "Customer payment",
  productLabel: "Product (optional)",
  qtySoldLabel: "Quantity",
  noProduct: "No product",
};

const am: ShopText = {
  insightsTitle: "የንግድ ግንዛቤዎች",
  noInsights: "ጥቂት ግብይቶች ከተመዘገቡ በኋላ ግንዛቤዎች ይታያሉ።",
  addProduct: "እቃ ጨምር",
  productName: "የእቃው ስም",
  unit: "መለኪያ",
  quantity: "በክምችት",
  threshold: "ዝቅተኛ ክምችት",
  sellingPrice: "የሽያጭ ዋጋ",
  costPrice: "የግዢ ዋጋ",
  save: "አስቀምጥ",
  cancel: "ሰርዝ",
  restock: "ክምችት ጨምር",
  reduce: "ክምችት ቀንስ",
  adjustQty: "ብዛት",
  lowStock: "ዝቅተኛ ክምችት",
  emptyProducts: "እስካሁን እቃ የለም። የሚሸጡትን ዘይት፣ ስኳር ወይም ሌላ እቃ ይጨምሩ።",
  movements: "የቅርብ ጊዜ የክምችት ለውጦች",
  addCustomer: "ደንበኛ ጨምር",
  customerName: "የደንበኛ ስም",
  phone: "ስልክ",
  notes: "ማስታወሻ",
  owes: "የሚቀረው",
  settled: "ተከፍሏል",
  recordPayment: "ክፍያ መዝግብ",
  paymentAmount: "የተከፈለ መጠን",
  emptyCustomers: "እስካሁን ደንበኛ የለም። በዱቤ ሲሸጡ ከስሙ ደንበኛ ይፈጠራል።",
  history: "ታሪክ",
  confirmStock: "የክምችት ለውጥ",
  confirmPayment: "የደንበኛ ክፍያ",
  productLabel: "እቃ (አማራጭ)",
  qtySoldLabel: "ብዛት",
  noProduct: "እቃ የለም",
};

const om: ShopText = {
  insightsTitle: "Hubannoo daldalaa",
  noInsights: "Daldala muraasa erga galmeessitee booda hubannoon ni mul'ata.",
  addProduct: "Meeshaa dabali",
  productName: "Maqaa meeshaa",
  unit: "Safartuu",
  quantity: "Kuufama keessa",
  threshold: "Gadi aanaa",
  sellingPrice: "Gatii gurgurtaa",
  costPrice: "Gatii bitaa",
  save: "Ol kaa'i",
  cancel: "Haqi",
  restock: "Kuufama dabali",
  reduce: "Kuufama hir'isi",
  adjustQty: "Baay'ina",
  lowStock: "Kuufama gadi aanaa",
  emptyProducts: "Ammaaf meeshaan hin jiru. Zayita, shukkaara ykn waan gurgurtu dabali.",
  movements: "Jijjiirama kuufamaa dhiyoo",
  addCustomer: "Maamila dabali",
  customerName: "Maqaa maamila",
  phone: "Bilbila",
  notes: "Yaadannoo",
  owes: "Kan hafaa",
  settled: "Kaffalameera",
  recordPayment: "Kaffaltii galmeessi",
  paymentAmount: "Hanga kaffalame",
  emptyCustomers: "Ammaaf maamilaan hin jiru. Gurgurtaa liqaan maqaa irraa maamila uuma.",
  history: "Seenaa",
  confirmStock: "Jijjiirama kuufamaa",
  confirmPayment: "Kaffaltii maamila",
  productLabel: "Meeshaa (filannoo)",
  qtySoldLabel: "Baay'ina",
  noProduct: "Meeshaan hin jiru",
};

export const SHOP_TEXT: Record<LanguageCode, ShopText> = { am, om, en };
