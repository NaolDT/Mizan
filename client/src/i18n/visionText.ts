import type { LanguageCode } from "@mizan/shared";

export interface VisionText {
  capture: string;
  retake: string;
  analyze: string;
  analyzing: string;
  confirmSale: string;
  confirmPurchase: string;
  registerProduct: string;
  workflowSale: string;
  workflowStock: string;
  workflowReceipt: string;
  workflowIdentify: string;
  pickWorkflow: string;
  reviewTitle: string;
  unmatched: string;
  pickProduct: string;
  addUnmatched: string;
  total: string;
  customerOptional: string;
  cameraDenied: string;
  noItems: string;
  successSale: string;
  successPurchase: string;
  successProduct: string;
  permissionHelp: string;
  useCatalog: string;
  sellingPrice: string;
  unitCost: string;
  qty: string;
  lowConfidence: string;
  choosePhoto: string;
  removeItem: string;
  done: string;
  supplierOptional: string;
  lineTotal: string;
  liveBarcode: string;
  useBarcode: string;
  inStock: string;
}

const en: VisionText = {
  capture: "Capture",
  retake: "Retake",
  analyze: "Analyze photo",
  analyzing: "Mizan is looking at the photo...",
  confirmSale: "Confirm sale",
  confirmPurchase: "Confirm purchase",
  registerProduct: "Save as new product",
  workflowSale: "Quick sale",
  workflowStock: "Add stock",
  workflowReceipt: "Scan receipt",
  workflowIdentify: "Identify",
  pickWorkflow: "What is this photo for?",
  reviewTitle: "Review before saving",
  unmatched: "Not in catalog",
  pickProduct: "Choose product",
  addUnmatched: "Record amount only",
  total: "Total",
  customerOptional: "Customer (credit sales)",
  cameraDenied: "Camera permission is needed, or choose a photo from the gallery.",
  noItems: "Nothing was recognized. Add a product from your catalog or enter an amount.",
  successSale: "Sale saved to the ledger and stock was updated.",
  successPurchase: "Purchase saved and stock was increased.",
  successProduct: "Product saved to this shop's catalog.",
  permissionHelp: "Allow camera, or pick an image file.",
  useCatalog: "Your catalog",
  sellingPrice: "Selling price",
  unitCost: "Cost each",
  qty: "Qty",
  lowConfidence: "Not sure — pick the product or save as new.",
  choosePhoto: "Choose photo",
  removeItem: "Remove",
  done: "Done",
  supplierOptional: "Supplier (optional)",
  lineTotal: "Line total",
  liveBarcode: "Barcode",
  useBarcode: "Use this barcode",
  inStock: "In stock",
};

const am: VisionText = {
  capture: "ፎቶ አንሳ",
  retake: "እንደገና አንሳ",
  analyze: "ፎቶውን ተንትን",
  analyzing: "Mizan ፎቶውን እየተመለከተ ነው...",
  confirmSale: "ሽያጭ አጽድቅ",
  confirmPurchase: "ግዢ አጽድቅ",
  registerProduct: "እንደ አዲስ እቃ አስቀምጥ",
  workflowSale: "ፈጣን ሽያጭ",
  workflowStock: "ክምችት ጨምር",
  workflowReceipt: "ደረሰኝ ስካን",
  workflowIdentify: "እቃ ለይ",
  pickWorkflow: "ይህ ፎቶ ለምንድን ነው?",
  reviewTitle: "ከመቀመጡ በፊት ይመልከቱ",
  unmatched: "በካታሎግ ውስጥ የለም",
  pickProduct: "እቃ ምረጥ",
  addUnmatched: "መጠን ብቻ መዝግብ",
  total: "ድምር",
  customerOptional: "ደንበኛ (ዱቤ)",
  cameraDenied: "የካሜራ ፈቃድ ያስፈልጋል፣ ወይም ከጋለሪ ፎቶ ይምረጡ።",
  noItems: "ምንም አልታወቀም። ከካታሎግ እቃ ይጨምሩ ወይም መጠን ያስገቡ።",
  successSale: "ሽያጩ በመዝገብ ተቀምጧል፣ ክምችት ተቀንሷል።",
  successPurchase: "ግዢ ተቀምጧል፣ ክምችት ጨምሯል።",
  successProduct: "እቃው በዚህ ሱቅ ካታሎግ ተቀምጧል።",
  permissionHelp: "ካሜራ ይፍቀዱ ወይም ምስል ይምረጡ።",
  useCatalog: "የእርስዎ ካታሎግ",
  sellingPrice: "የሽያጭ ዋጋ",
  unitCost: "የአንዱ ወጪ",
  qty: "ብዛት",
  lowConfidence: "እርግጠኛ አይደለም — እቃ ይምረጡ ወይም አዲስ ያስቀምጡ።",
  choosePhoto: "ፎቶ ምረጥ",
  removeItem: "አስወግድ",
  done: "ተጠናቋል",
  supplierOptional: "አቅራቢ (አማራጭ)",
  lineTotal: "የመስመር ድምር",
  liveBarcode: "ባርኮድ",
  useBarcode: "ይህን ባርኮድ ተጠቀም",
  inStock: "በክምችት",
};

const om: VisionText = {
  capture: "Suuraa kaasi",
  retake: "Irra deebi'ii kaasi",
  analyze: "Suuraa xiinxali",
  analyzing: "Mizan suuraa ilaalaa jira...",
  confirmSale: "Gurgurtaa mirkaneessi",
  confirmPurchase: "Bittaa mirkaneessi",
  registerProduct: "Akkasuma meeshaa haaraa ol kaa'i",
  workflowSale: "Gurgurtaa saffisaa",
  workflowStock: "Kuufama dabali",
  workflowReceipt: "Risiitii scan godhi",
  workflowIdentify: "Adda baasi",
  pickWorkflow: "Suuraan kun maaliif?",
  reviewTitle: "Osoo hin kaa'in dura ilaali",
  unmatched: "Katalogii keessa hin jiru",
  pickProduct: "Meeshaa filadhu",
  addUnmatched: "Hanga qofa galmeessi",
  total: "Waliigala",
  customerOptional: "Maamila (liqa)",
  cameraDenied: "Hayyama kaameraa barbaachisa, ykn suuraa galmee keessaa filadhu.",
  noItems: "Waan beekame hin jiru. Katalogii irraa dabali ykn hanga galchi.",
  successSale: "Gurgurtaa galmaa'eera; kuufamni hir'ateera.",
  successPurchase: "Bittaan galmaa'eera; kuufamni dabaleera.",
  successProduct: "Meeshaan katalogii suuqii kanaa keessa kaa'ameera.",
  permissionHelp: "Kaameraa eeyyami, ykn faayila suuraa filadhu.",
  useCatalog: "Katalogii kee",
  sellingPrice: "Gatii gurgurtaa",
  unitCost: "Gatii tokkoo",
  qty: "Baay'ina",
  lowConfidence: "Hin mirkanaa'u — meeshaa filadhu ykn haaraa kaa'i.",
  choosePhoto: "Suuraa filadhu",
  removeItem: "Balleessi",
  done: "Xumurame",
  supplierOptional: "Dhiyeessaa (filannoo)",
  lineTotal: "Waliigala sararaa",
  liveBarcode: "Baarkoodii",
  useBarcode: "Baarkoodii kana fayyadami",
  inStock: "Kuufama keessa",
};

export const VISION_TEXT: Record<LanguageCode, VisionText> = { am, om, en };
