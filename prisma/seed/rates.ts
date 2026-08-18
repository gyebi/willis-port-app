import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  GoodsCategory,
  PrismaClient,
  ServiceType,
  ShippingMode,
  ShipmentPricingBasis,
} from "../../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

type SeedRate = {
  shippingMode: ShippingMode;
  serviceType: ServiceType;
  goodsCategory: GoodsCategory;
  pricingBasis: ShipmentPricingBasis;
  rateUsd: number;
  unit: string;
};

async function main() {
  const rates: SeedRate[] = [
    {
      shippingMode: ShippingMode.AIR,
      serviceType: ServiceType.STANDARD,
      goodsCategory: GoodsCategory.NORMAL,
      pricingBasis: ShipmentPricingBasis.KG,
      rateUsd: 17,
      unit: "$/kg",
    },
    {
      shippingMode: ShippingMode.AIR,
      serviceType: ServiceType.STANDARD,
      goodsCategory: GoodsCategory.SPECIAL,
      pricingBasis: ShipmentPricingBasis.KG,
      rateUsd: 22,
      unit: "$/kg",
    },
    {
      shippingMode: ShippingMode.AIR,
      serviceType: ServiceType.EXPRESS,
      goodsCategory: GoodsCategory.NORMAL,
      pricingBasis: ShipmentPricingBasis.KG,
      rateUsd: 20,
      unit: "$/kg",
    },
    {
      shippingMode: ShippingMode.AIR,
      serviceType: ServiceType.EXPRESS,
      goodsCategory: GoodsCategory.SPECIAL,
      pricingBasis: ShipmentPricingBasis.KG,
      rateUsd: 25,
      unit: "$/kg",
    },
    {
      shippingMode: ShippingMode.SEA,
      serviceType: ServiceType.STANDARD,
      goodsCategory: GoodsCategory.NORMAL,
      pricingBasis: ShipmentPricingBasis.CBM,
      rateUsd: 260,
      unit: "$/CBM",
    },
    {
      shippingMode: ShippingMode.SEA,
      serviceType: ServiceType.STANDARD,
      goodsCategory: GoodsCategory.SPECIAL,
      pricingBasis: ShipmentPricingBasis.CBM,
      rateUsd: 280,
      unit: "$/CBM",
    },
  ];

  for (const rate of rates) {
    const existingRate = await prisma.shippingRate.findFirst({
      where: {
        shippingMode: rate.shippingMode,
        serviceType: rate.serviceType,
        goodsCategory: rate.goodsCategory,
      },
    });

    if (existingRate) {
      await prisma.shippingRate.update({
        where: { id: existingRate.id },
        data: {
          pricingBasis: rate.pricingBasis,
          rateUsd: rate.rateUsd,
          unit: rate.unit,
        },
      });
      continue;
    }

    await prisma.shippingRate.create({
      data: rate,
    });
  }

  console.log("Willis Port shipping rates seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
