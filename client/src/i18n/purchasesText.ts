import type { LanguageCode, PurchaseOrderStatus } from "@mizan/shared";

export interface PurchasesText {
  tab: string;
  suppliersTitle: string;
  addSupplier: string;
  supplierName: string;
  emptySuppliers: string;
  owed: string;
  settled: string;
  ordersTitle: string;
  newOrder: string;
  emptyOrders: string;
  receive: string;
  cancelOrder: string;
  quantity: string;
  unitCost: string;
  addLine: string;
  placeOrder: string;
  receiveHint: string;
  confirmReceive: string;
  paySupplier: string;
  paymentAmount: string;
  orderNotes: string;
  status: Record<PurchaseOrderStatus, string>;
}

const en: PurchasesText = {
  tab: "Purchases",
  suppliersTitle: "Suppliers",
  addSupplier: "Add supplier",
  supplierName: "Supplier name",
  emptySuppliers: "No suppliers yet. Add the people you buy stock from.",
  owed: "You owe",
  settled: "Settled",
  ordersTitle: "Purchase orders",
  newOrder: "New order",
  emptyOrders: "No purchase orders yet. Ordering does not change stock until you receive it.",
  receive: "Receive stock",
  cancelOrder: "Cancel order",
  quantity: "Qty",
  unitCost: "Unit cost",
  addLine: "Add product",
  placeOrder: "Place order",
  receiveHint: "Stock and purchase cost are recorded only when you confirm receiving.",
  confirmReceive: "Confirm receive",
  paySupplier: "Record supplier payment",
  paymentAmount: "Amount paid",
  orderNotes: "Notes",
  status: {
    ORDERED: "Ordered",
    PARTIAL: "Part received",
    RECEIVED: "Received",
    CANCELLED: "Cancelled",
  },
};

const am: PurchasesText = {
  tab: "ግዢዎች",
  suppliersTitle: "አቅራቢዎች",
  addSupplier: "አቅራቢ ጨምር",
  supplierName: "የአቅራቢ ስም",
  emptySuppliers: "እስካሁን አቅራቢ የለም። እቃ የሚገዙትን ይጨምሩ።",
  owed: "የሚቀረው",
  settled: "ተከፍሏል",
  ordersTitle: "የግዢ ትዕዛዞች",
  newOrder: "አዲስ ትዕዛዝ",
  emptyOrders: "እስካሁን የግዢ ትዕዛዝ የለም። እስኪቀበሉ ድረስ ክምችት አይጨምርም።",
  receive: "ክምችት ተቀበል",
  cancelOrder: "ትዕዛዝ ሰርዝ",
  quantity: "ብዛት",
  unitCost: "የአንዱ ዋጋ",
  addLine: "እቃ ጨምር",
  placeOrder: "ትዕዛዝ አስገባ",
  receiveHint: "ክምችትና የግዢ ወጪ የሚመዘገበው ሲቀበሉ ብቻ ነው።",
  confirmReceive: "መቀበል አጽድቅ",
  paySupplier: "የአቅራቢ ክፍያ መዝግብ",
  paymentAmount: "የተከፈለ መጠን",
  orderNotes: "ማስታወሻ",
  status: {
    ORDERED: "ታዝዟል",
    PARTIAL: "በከፊል ተቀብሏል",
    RECEIVED: "ተቀብሏል",
    CANCELLED: "ተሰርዟል",
  },
};

const om: PurchasesText = {
  tab: "Bittaa",
  suppliersTitle: "Dhiyeessitoota",
  addSupplier: "Dhiyeessaa dabali",
  supplierName: "Maqaa dhiyeessaa",
  emptySuppliers: "Ammaaf dhiyeessaan hin jiru. Nama irraa meeshaa bittu dabali.",
  owed: "Kan hafaa",
  settled: "Kaffalameera",
  ordersTitle: "Ajaja bittaa",
  newOrder: "Ajaja haaraa",
  emptyOrders: "Ammaaf ajajni bittaa hin jiru. Hanga fudhattutti kuufamni hin dabalu.",
  receive: "Kuufama fudhadhu",
  cancelOrder: "Ajaja haqi",
  quantity: "Baay'ina",
  unitCost: "Gatii tokkoo",
  addLine: "Meeshaa dabali",
  placeOrder: "Ajaja galchi",
  receiveHint: "Kuufamni fi baasiin bittaa yeroo fudhattu qofa galmaa'a.",
  confirmReceive: "Fudhachuu mirkaneessi",
  paySupplier: "Kaffaltii dhiyeessaa galmeessi",
  paymentAmount: "Hanga kaffalame",
  orderNotes: "Yaadannoo",
  status: {
    ORDERED: "Ajajameera",
    PARTIAL: "Giddu galeessa fudhatame",
    RECEIVED: "Fudhatameera",
    CANCELLED: "Haqameera",
  },
};

export const PURCHASES_TEXT: Record<LanguageCode, PurchasesText> = { am, om, en };
