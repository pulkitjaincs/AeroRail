import { prisma } from '@aerorail/db';

function generatePNR(): string {
  // Generate a random 10-digit PNR
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

export async function handlePaymentCompleted(payload: any) {
  const { bookingId, paymentId, status } = payload;
  
  if (status !== 'SUCCESSFUL') return;

  const booking = await prisma.bookings.findUnique({
    where: { booking_id: bookingId }
  });

  if (!booking || booking.status === 'CONFIRMED') {
    return;
  }

  // Update booking status to CONFIRMED and generate PNR
  const pnr = generatePNR();
  
  await prisma.$transaction(async (tx: any) => {
    await tx.bookings.update({
      where: { booking_id: bookingId },
      data: {
        status: 'CONFIRMED',
        pnr: pnr,
        updated_at: new Date(),
      }
    });
    
    // Also update any related booking legs or seats if necessary
    // In our simplified schema we'll just set booking to CONFIRMED.
  });
  
  console.log(`Booking ${bookingId} confirmed with PNR ${pnr}`);
}
