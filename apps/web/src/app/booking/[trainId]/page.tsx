"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingPage({ params }: { params: { trainId: string } }) {
  const router = useRouter();
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [passengerDetails, setPassengerDetails] = useState({ name: '', age: '', gender: 'M' });

  // Mock coach layout: A grid of 12 seats for testing
  const [coachSeats] = useState(() => Array.from({ length: 12 }, (_, i) => ({
    id: `S${i + 1}`,
    status: Math.random() > 0.7 ? 'BOOKED' : 'AVAILABLE', // mock some booked seats
  })));

  const handleBook = async () => {
    if (!selectedSeat || !passengerDetails.name) {
      alert('Please select a seat and enter passenger details');
      return;
    }
    
    try {
      // Mock API call to create a booking
      const mockBookingId = `BKG-${Math.floor(Math.random() * 1000000)}`;
      
      // Proceed to checkout
      router.push(`/booking/checkout/${mockBookingId}`);
    } catch {
      alert('Booking failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Book Train {params.trainId}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Select a Seat</h2>
          <div className="grid grid-cols-4 gap-2 border p-4 rounded-lg bg-gray-50">
            {coachSeats.map(seat => (
              <button
                key={seat.id}
                disabled={seat.status === 'BOOKED'}
                onClick={() => setSelectedSeat(seat.id)}
                className={`p-3 rounded-md text-center font-medium transition-colors ${
                  seat.status === 'BOOKED'
                    ? 'bg-red-200 text-red-500 cursor-not-allowed'
                    : selectedSeat === seat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {seat.id}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center"><span className="w-4 h-4 bg-green-100 border inline-block mr-2"></span> Available</div>
            <div className="flex items-center"><span className="w-4 h-4 bg-red-200 border inline-block mr-2"></span> Booked</div>
            <div className="flex items-center"><span className="w-4 h-4 bg-blue-600 border inline-block mr-2"></span> Selected</div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Passenger Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                value={passengerDetails.name}
                onChange={e => setPassengerDetails({ ...passengerDetails, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                placeholder="John Doe"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Age</label>
                <input
                  type="number"
                  value={passengerDetails.age}
                  onChange={e => setPassengerDetails({ ...passengerDetails, age: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  placeholder="25"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  value={passengerDetails.gender}
                  onChange={e => setPassengerDetails({ ...passengerDetails, gender: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-white"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleBook}
              disabled={!selectedSeat || !passengerDetails.name || !passengerDetails.age}
              className="w-full mt-6 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
