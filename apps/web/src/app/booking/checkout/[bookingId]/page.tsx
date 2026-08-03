"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage({ params }: { params: { bookingId: string } }) {
  const router = useRouter();

  useEffect(() => {
    // Dynamically load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    try {
      // Create an order via our Payment Service
      const res = await fetch('http://localhost:8000/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: params.bookingId,
          amount: 1200, // mock amount
          currency: 'INR'
        }),
      });

      if (!res.ok) throw new Error('Failed to create order');
      const data = await res.json();

      const options = {
        key: 'rzp_test_mock', // Replace with RAZORPAY_KEY_ID in real deployment
        amount: data.amount * 100,
        currency: data.currency,
        name: 'AeroRail',
        description: `Booking ${params.bookingId}`,
        order_id: data.orderId,
        handler: function (response: { razorpay_payment_id: string }) {
          // On successful payment, redirect to My Bookings
          alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
          router.push('/my-bookings');
        },
        prefill: {
          name: 'Passenger',
          email: 'passenger@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#2563eb'
        }
      };

      // @ts-expect-error - Razorpay is dynamically loaded
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: { error: { description: string } }) {
        alert('Payment Failed: ' + response.error.description);
      });
      rzp.open();
    } catch {
      alert('Error initiating payment');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <h1 className="text-3xl font-bold mb-4 text-gray-900">Complete Your Booking</h1>
      <p className="text-gray-600 mb-8">Booking Reference: {params.bookingId}</p>
      
      <div className="bg-white shadow-sm border rounded-xl p-8 mb-8 text-left max-w-md mx-auto">
        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Fare Breakdown</h3>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Ticket Fare</span>
          <span>₹ 1150</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Convenience Fee</span>
          <span>₹ 50</span>
        </div>
        <div className="flex justify-between font-bold border-t pt-2 mt-2">
          <span>Total</span>
          <span>₹ 1200</span>
        </div>
      </div>

      <button
        onClick={handlePayment}
        className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
      >
        Pay ₹ 1200
      </button>
    </div>
  );
}
