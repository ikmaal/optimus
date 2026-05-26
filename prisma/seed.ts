import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const n = await prisma.car.count();
  if (n === 0) {
    await prisma.car.createMany({
      data: [
        {
          id: "optimus_car_red",
          label: "Red Car",
          plate: "SNB 9492 C",
          active: true,
          fuelLitres: 14,
          fuelTankLitres: 60,
        },
        {
          id: "optimus_car_black",
          label: "Black Car",
          plate: "SNC 3154 M",
          active: true,
          fuelLitres: 38,
          fuelTankLitres: 60,
        },
      ],
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
