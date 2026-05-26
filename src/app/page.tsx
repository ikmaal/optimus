import { Dashboard } from "@/components/dashboard/Dashboard";
import { listActiveFleetCars } from "@/lib/fleet/queries";
import { listUpcomingFleetBookings } from "@/lib/fleet/schedule";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const [cars, upcomingBookings] = await Promise.all([
    listActiveFleetCars(prisma),
    listUpcomingFleetBookings(prisma),
  ]);

  return <Dashboard cars={cars} upcomingBookings={upcomingBookings} />;
}
