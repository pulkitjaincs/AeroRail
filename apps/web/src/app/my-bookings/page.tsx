"use client";

import React, { useState, useEffect } from 'react';

// Define the shape of a booking
interface Booking {
  booking_id: string;
  pnr: string | null;
  status: string;
  date: string;
  trainName: string;
  amount: number;
}

import Link from 'next/link';

export default function MyBookingsPage() {
  const mockData = [
    {
      booking_id: 'BKG-849201',
      pnr: '2849201940',
      status: 'CONFIRMED',
      date: '2026-06-01',
      trainName: 'Rajdhani Express (12952)',
      amount: 1200
    },
    {
      booking_id: 'BKG-112044',
      pnr: null,
      status: 'PENDING',
      date: '2026-06-15',
      trainName: 'Shatabdi Express (12004)',
      amount: 900
    }
  ];

  const [bookings] = useState<Booking[]>(mockData);

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">My Bookings</h1>
      
      {bookings.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border">
          <p className="text-gray-500 mb-4">You have no upcoming journeys.</p>
          <Link href="/" className="text-blue-600 font-semibold hover:underline">Book a Ticket</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map(booking => (
            <div key={booking.booking_id} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-center p-6 border-b bg-gray-50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{booking.trainName}</h3>
                  <p className="text-gray-500 text-sm">{booking.date}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 
                    booking.status === 'WAITLISTED' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              </div>
              <div className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Booking Ref</p>
                  <p className="font-semibold">{booking.booking_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">PNR</p>
                  <p className="font-bold text-lg text-blue-700">{booking.pnr || 'Generating...'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-semibold">₹ {booking.amount}</p>
                </div>
                <div>
                  <button className="text-blue-600 font-semibold hover:underline">View Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
