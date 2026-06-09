// Users & Auth
export interface User {
  userId: string;
  email: string;
  passwordHash?: string; // Optional so it can be omitted when sending to clients
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Stations & Routing
export interface Station {
  stationCode: string;
  stationName: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  timezone: string;
}

export interface Train {
  trainId: string;
  trainNumber: string;
  trainName: string;
  trainType: string;
  operator: string;
}

export interface ScheduleStop {
  stopId: string;
  trainId: string;
  stationCode: string;
  sequenceNo: number;
  arrivalTime: string;   // e.g., "14:30"
  departureTime: string; // e.g., "14:45"
  dayOffset: number;
  distanceKm: number;
}

// Coaches & Berths
export interface Coach {
  coachId: string;
  trainId: string;
  coachNumber: string;
  coachType: string;
  totalBerths: number;
}

export interface Berth {
  berthId: string;
  coachId: string;
  berthNumber: number;
  berthPosition: string; // e.g., "LOWER", "UPPER", "SIDE_LOWER"
  hasWindow: boolean;
  hasCharging: boolean;
  isLadiesQuota: boolean;
}

// Bookings & Passengers
export interface Passenger {
  passengerId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
}

export interface Booking {
  bookingId: string;
  pnr: string;
  userId: string;
  journeyType: string;
  quotaType: string;
  status: string; // e.g., "CONFIRMED", "WAITLISTED", "CANCELLED"
  totalFare: number;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingLeg {
  legId: string;
  bookingId: string;
  legSequence: number;
  trainId: string;
  originStation: string;
  destStation: string;
  departureDt: Date;
  arrivalDt: Date;
  berthId: string;
  passengerId: string;
  seatStatus: string;
  wlPosition: number | null;
  fare: number;
}

// Payments
export interface Payment {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerTxId: string;
  createdAt: Date;
  updatedAt: Date;
}
