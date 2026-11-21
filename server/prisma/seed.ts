import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@mizan.et";
const DEMO_PHONE = "+251911223344";

async function main() {
  console.log("Seeding Mizan AI demo merchant (Merkato Mini-Mart)...");

  const passwordHash = await bcrypt.hash("MizanDemo2026!", 12);

  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: "Abebe Kebede",
      phone: DEMO_PHONE,
      preferredLanguage: "am",
    },
    create: {
      name: "Abebe Kebede",
      email: DEMO_EMAIL,
      phone: DEMO_PHONE,
      passwordHash,
      preferredLanguage: "am",
      role: "OWNER",
    },
  });

  let demoBusiness = await prisma.business.findFirst({
    where: { ownerId: demoUser.id },
  });

  if (!demoBusiness) {
    demoBusiness = await prisma.business.create({
      data: {
        ownerId: demoUser.id,
        name: "Merkato Mini-Mart (መርካቶ ሚኒ ማርት)",
        category: "GROCERY",
        location: "Merkato, Addis Ababa",
        currency: "ETB",
        preferredLanguage: "am",
        plan: "FREE",
      },
    });
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const sampleTransactions = [
    {
      key: "seed-tx-1",
      daysAgo: 0,
      type: "INCOME" as const,
      category: "SALES" as const,
      amount: "4200.00",
      description: "Morning teff flour, cooking oil, and sugar retail sales",
      paymentMethod: "CASH" as const,
      source: "VOICE" as const,
      counterpartyName: null,
    },
    {
      key: "seed-tx-2",
      daysAgo: 0,
      type: "INCOME" as const,
      category: "SALES" as const,
      amount: "1850.00",
      description: "Coffee beans & household essentials via Telebirr",
      paymentMethod: "TELEBIRR" as const,
      source: "MANUAL" as const,
      counterpartyName: "Tigist T.",
    },
    {
      key: "seed-tx-3",
      daysAgo: 0,
      type: "EXPENSE" as const,
      category: "TRANSPORT" as const,
      amount: "650.00",
      description: "Bajaj & minivan delivery from wholesale depot",
      paymentMethod: "CASH" as const,
      source: "VOICE" as const,
      counterpartyName: null,
    },
    {
      key: "seed-tx-4",
      daysAgo: 1,
      type: "INCOME" as const,
      category: "SALES" as const,
      amount: "6900.00",
      description: "Daily grocery and bottled water sales",
      paymentMethod: "CASH" as const,
      source: "VOICE" as const,
      counterpartyName: null,
    },
    {
      key: "seed-tx-5",
      daysAgo: 1,
      type: "EXPENSE" as const,
      category: "INVENTORY_PURCHASE" as const,
      amount: "3400.00",
      description: "Wholesale restock: 5L cooking oil cartons & pasta",
      paymentMethod: "BANK" as const,
      source: "CHAT" as const,
      counterpartyName: "Bole Wholesale PLC",
    },
    {
      key: "seed-tx-6",
      daysAgo: 2,
      type: "INCOME" as const,
      category: "SALES" as const,
      amount: "5400.00",
      description: "Mid-week shop sales",
      paymentMethod: "CASH" as const,
      source: "MANUAL" as const,
      counterpartyName: null,
    },
    {
      key: "seed-tx-7",
      daysAgo: 2,
      type: "INCOME" as const,
      category: "SALES" as const,
      amount: "1200.00",
      description: "Credit grocery purchase (to be collected Friday)",
      paymentMethod: "CREDIT" as const,
      source: "VOICE" as const,
      counterpartyName: "Dawit Bekele",
    },
    {
      key: "seed-tx-8",
      daysAgo: 3,
      type: "EXPENSE" as const,
      category: "RENT" as const,
      amount: "4500.00",
      description: "Monthly shop stall rent allocation",
      paymentMethod: "BANK" as const,
      source: "MANUAL" as const,
      counterpartyName: null,
    },
    {
      key: "seed-tx-9",
      daysAgo: 4,
      type: "INCOME" as const,
      category: "SALES" as const,
      amount: "7600.00",
      description: "Weekend market rush sales",
      paymentMethod: "CASH" as const,
      source: "VOICE" as const,
      counterpartyName: null,
    },
    {
      key: "seed-tx-10",
      daysAgo: 5,
      type: "EXPENSE" as const,
      category: "UTILITIES" as const,
      amount: "480.00",
      description: "Shop electricity & mobile data bundle",
      paymentMethod: "TELEBIRR" as const,
      source: "MANUAL" as const,
      counterpartyName: null,
    },
  ];

  for (const item of sampleTransactions) {
    await prisma.transaction.upsert({
      where: {
        businessId_idempotencyKey: {
          businessId: demoBusiness.id,
          idempotencyKey: item.key,
        },
      },
      update: {},
      create: {
        businessId: demoBusiness.id,
        recordedById: demoUser.id,
        type: item.type,
        category: item.category,
        amount: new Prisma.Decimal(item.amount),
        currency: "ETB",
        description: item.description,
        paymentMethod: item.paymentMethod,
        counterpartyName: item.counterpartyName,
        transactionDate: new Date(now - item.daysAgo * dayMs),
        source: item.source,
        idempotencyKey: item.key,
        status: "COMPLETED",
      },
    });
  }

  console.log(`Seeded demo user (${DEMO_EMAIL}) & business (${demoBusiness.name}) with ${sampleTransactions.length} transactions.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
