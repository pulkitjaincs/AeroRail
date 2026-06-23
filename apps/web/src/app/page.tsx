'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface TrainSearchResponse {
  data: {
    trainNumber: string;
    trainName: string;
    trainType: string;
    departureTime: string;
    arrivalTime: string;
    durationMinutes: number;
    originStation: string;
    destStation: string;
    distanceKm: number;
    classes: string[];
    availability: Record<string, number>;
  }[];
  meta: {
    request_id: string;
    timestamp: string;
    version: string;
  };
}

const STATIONS = [
  { code: 'NDLS', name: 'New Delhi', city: 'New Delhi', state: 'Delhi' },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'MAS', name: 'MGR Chennai Central', city: 'Chennai', state: 'Tamil Nadu' },
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal' },
  { code: 'SBC', name: 'KSR Bengaluru City', city: 'Bengaluru', state: 'Karnataka' },
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan' },
  { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', state: 'Telangana' },
  { code: 'PNBE', name: 'Patna Junction', city: 'Patna', state: 'Bihar' },
  { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat' },
  { code: 'BPL', name: 'Bhopal Junction', city: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', state: 'Uttar Pradesh' },
  { code: 'GKP', name: 'Gorakhpur Junction', city: 'Gorakhpur', state: 'Uttar Pradesh' },
  { code: 'PUNE', name: 'Pune Junction', city: 'Pune', state: 'Maharashtra' },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh' },
  { code: 'AGC', name: 'Agra Cantt', city: 'Agra', state: 'Uttar Pradesh' },
  { code: 'NGP', name: 'Nagpur Junction', city: 'Nagpur', state: 'Maharashtra' },
  { code: 'VSKP', name: 'Visakhapatnam Junction', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { code: 'JAT', name: 'Jammu Tawi', city: 'Jammu', state: 'Jammu & Kashmir' },
  { code: 'GHY', name: 'Guwahati Junction', city: 'Guwahati', state: 'Assam' },
  { code: 'DDU', name: 'Pt. DD Upadhyaya Junction', city: 'Mughalsarai', state: 'Uttar Pradesh' }
];

export default function Home() {
  const [fromStation, setFromStation] = useState('NDLS');
  const [toStation, setToStation] = useState('MMCT');
  const [journeyDate, setJourneyDate] = useState('2026-06-23'); // Default to seeded date
  const [classCode, setClassCode] = useState('ALL');
  
  const [searchResults, setSearchResults] = useState<TrainSearchResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Register service worker and listen for PWA install event
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          },
          (err) => {
            console.log('ServiceWorker registration failed: ', err);
          }
        );
      });
    }

    // Capture install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    });

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('AeroRail has been installed successfully.');
    });
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleSwapStations = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSearchResults(null);

    const classQuery = classCode !== 'ALL' ? `&class=${classCode}` : '';
    
    // First try Kong gateway port 8000, then fallback to direct port 3002
    const gateways = [
      `http://localhost:8000/search/trains?from=${fromStation}&to=${toStation}&date=${journeyDate}${classQuery}`,
      `http://localhost:3002/search/trains?from=${fromStation}&to=${toStation}&date=${journeyDate}${classQuery}`
    ];

    let success = false;

    for (const url of gateways) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
          throw new Error(`API returned HTTP ${response.status}`);
        }
        const result: TrainSearchResponse = await response.json();
        setSearchResults(result.data);
        success = true;
        break; // Break loop if fetch succeeds
      } catch (err: any) {
        console.warn(`Failed fetching from ${url}:`, err.message);
      }
    }

    if (!success) {
      setErrorMsg('Could not fetch search results. Ensure that either the Kong Gateway (port 8000) or the Search Service (port 3002) is running.');
    }
    setIsLoading(false);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Dynamic Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-black text-xl shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">AeroRail</h1>
            <p className="text-xs text-emerald-400/80 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Transit Engine Active
            </p>
          </div>
        </div>

        {isInstallable && (
          <button
            onClick={handleInstallApp}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-black text-sm font-semibold rounded-lg hover:brightness-110 active:scale-95 transition shadow-lg shadow-emerald-500/20"
          >
            Install App
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 z-10">
        {/* Hero Section */}
        <section className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-b from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
            Discover Your Next Rail Journey
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto text-base">
            Search schedules and seat availability across high-performance transit routing databases in real-time.
          </p>
        </section>

        {/* Search Card Form */}
        <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl mb-12">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
              {/* From Station */}
              <div className="md:col-span-3 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">From Station</label>
                <select
                  value={fromStation}
                  onChange={(e) => setFromStation(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  {STATIONS.map((station) => (
                    <option key={station.code} value={station.code}>
                      {station.city} ({station.code}) - {station.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center pb-1">
                <button
                  type="button"
                  onClick={handleSwapStations}
                  className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 flex items-center justify-center transition active:scale-90 hover:rotate-180 duration-300"
                  title="Swap Stations"
                >
                  ⇅
                </button>
              </div>

              {/* To Station */}
              <div className="md:col-span-3 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">To Station</label>
                <select
                  value={toStation}
                  onChange={(e) => setToStation(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  {STATIONS.map((station) => (
                    <option key={station.code} value={station.code}>
                      {station.city} ({station.code}) - {station.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Departure Date</label>
                <input
                  type="date"
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                />
              </div>

              {/* Class */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Travel Class</label>
                <select
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="ALL">All Classes (1A, 3A, SL)</option>
                  <option value="1A">AC First Class (1A)</option>
                  <option value="3A">AC 3 Tier (3A)</option>
                  <option value="SL">Sleeper Class (SL)</option>
                </select>
              </div>
            </div>

            {/* Action */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-bold rounded-xl hover:brightness-110 active:scale-98 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Searching Trains...' : 'Search Trains'}
              </button>
            </div>
          </form>
        </section>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-xl mb-8 flex gap-3 text-sm">
            <span className="font-bold">⚠️ Error:</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Skeletons while loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-6 w-48 bg-zinc-800 rounded-md" />
                  <div className="h-5 w-20 bg-zinc-800 rounded-full" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-8 bg-zinc-800/80 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results display */}
        {searchResults !== null && (
          <section className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xl font-bold tracking-tight text-zinc-100">
                Search Results ({searchResults.length} Trains Found)
              </h3>
              <span className="text-xs text-zinc-400 font-medium">
                Results cached for 10 minutes
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="bg-zinc-900/20 border border-zinc-800 rounded-2xl p-12 text-center">
                <div className="text-4xl mb-3">🚂</div>
                <h4 className="text-lg font-bold text-zinc-300">No Direct Trains Found</h4>
                <p className="text-zinc-500 text-sm mt-1 max-w-sm mx-auto">
                  Try swapping stations, choosing a different date (e.g. 2026-06-23), or looking for alternative routes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((train) => (
                  <div
                    key={train.trainNumber}
                    className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 hover:border-zinc-700/80 transition duration-300 shadow-lg relative overflow-hidden group"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-400 opacity-80" />

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      {/* Train Details */}
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20 uppercase tracking-wider">
                            {train.trainType}
                          </span>
                          <span className="text-sm font-semibold text-zinc-500">#{train.trainNumber}</span>
                        </div>
                        <h4 className="text-lg font-bold text-zinc-50">{train.trainName}</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Route: {train.originStation} → {train.destStation} | {train.distanceKm} km</p>
                      </div>

                      {/* Journey Timings */}
                      <div className="flex items-center gap-6 text-zinc-300">
                        <div className="text-center">
                          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Departs</p>
                          <p className="text-xl font-bold text-zinc-100">{train.departureTime}</p>
                          <p className="text-xs text-zinc-400">{train.originStation}</p>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{formatDuration(train.durationMinutes)}</span>
                          <div className="w-16 h-0.5 bg-zinc-800 relative my-1">
                            <div className="absolute w-1.5 h-1.5 rounded-full bg-zinc-600 top-[-2px] left-0" />
                            <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500 top-[-2px] right-0 animate-ping" />
                            <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 top-[-2px] right-0" />
                          </div>
                          <span className="text-[9px] text-emerald-400/80 font-semibold">Direct</span>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Arrives</p>
                          <p className="text-xl font-bold text-zinc-100">{train.arrivalTime}</p>
                          <p className="text-xs text-zinc-400">{train.destStation}</p>
                        </div>
                      </div>
                    </div>

                    {/* Classes Availability list */}
                    <div className="mt-6 pt-4 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {train.classes.map((cls) => {
                        const seats = train.availability[cls] ?? 0;
                        
                        let badgeStyle = "bg-red-500/10 border-red-500/20 text-red-400";
                        let statusText = "Sold Out";

                        if (seats >= 50) {
                          badgeStyle = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                          statusText = `Available (${seats})`;
                        } else if (seats > 0) {
                          badgeStyle = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                          statusText = `Running Low (${seats})`;
                        }

                        return (
                          <div
                            key={cls}
                            className={`flex flex-col p-3 rounded-xl border ${badgeStyle} justify-between gap-1`}
                          >
                            <span className="text-xs font-bold uppercase tracking-wider">{cls} Class</span>
                            <span className="text-sm font-semibold font-mono">{statusText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-8 px-6 text-center text-xs text-zinc-500 z-10">
        <p>© 2026 AeroRail. Designed for High-Concurrency National Scale Transit.</p>
      </footer>
    </div>
  );
}
