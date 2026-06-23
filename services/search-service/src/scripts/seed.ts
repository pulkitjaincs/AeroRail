import { prisma } from '../config/db.js';
import { driver, checkNeo4jConnection } from '../config/neo4j.js';
import { logger } from '@aerorail/logger';
import crypto from 'crypto';

// 20 Major Stations in India
const STATIONS = [
  { code: 'NDLS', name: 'New Delhi', city: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra', lat: 18.9696, lng: 72.8193 },
  { code: 'MAS', name: 'MGR Chennai Central', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal', lat: 22.5834, lng: 88.3385 },
  { code: 'SBC', name: 'KSR Bengaluru City', city: 'Bengaluru', state: 'Karnataka', lat: 12.9780, lng: 77.5696 },
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { code: 'PNBE', name: 'Patna Junction', city: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { code: 'BPL', name: 'Bhopal Junction', city: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { code: 'GKP', name: 'Gorakhpur Junction', city: 'Gorakhpur', state: 'Uttar Pradesh', lat: 26.7606, lng: 83.3731 },
  { code: 'PUNE', name: 'Pune Junction', city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  { code: 'AGC', name: 'Agra Cantt', city: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081 },
  { code: 'NGP', name: 'Nagpur Junction', city: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { code: 'VSKP', name: 'Visakhapatnam Junction', city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  { code: 'JAT', name: 'Jammu Tawi', city: 'Jammu', state: 'Jammu & Kashmir', lat: 32.7266, lng: 74.8570 },
  { code: 'GHY', name: 'Guwahati Junction', city: 'Guwahati', state: 'Assam', lat: 26.1158, lng: 91.7086 },
  { code: 'DDU', name: 'Pt. DD Upadhyaya Junction', city: 'Mughalsarai', state: 'Uttar Pradesh', lat: 25.2816, lng: 83.1225 }
];

// Define 5 Main Trunk Routes
const ROUTES = [
  {
    name: 'North-East Express Route',
    stops: ['NDLS', 'CNB', 'DDU', 'PNBE', 'HWH'],
    distances: [0, 440, 780, 1000, 1450] // cumulative km
  },
  {
    name: 'West Coast Route',
    stops: ['NDLS', 'JP', 'ADI', 'MMCT'],
    distances: [0, 300, 790, 1380]
  },
  {
    name: 'North-South Corridor',
    stops: ['NDLS', 'AGC', 'BPL', 'NGP', 'HYB', 'MAS'],
    distances: [0, 200, 700, 1090, 1600, 2180]
  },
  {
    name: 'South-West Link',
    stops: ['MMCT', 'PUNE', 'SBC'],
    distances: [0, 190, 1020]
  },
  {
    name: 'Eastern Coastal Route',
    stops: ['HWH', 'VSKP', 'MAS'],
    distances: [0, 880, 1660]
  }
];

const SEED_DATES = [
  '2026-06-01',
  '2026-06-15',
  '2026-06-23', // Current Local Time
  '2026-06-24',
  '2026-06-25',
  '2026-06-26',
  '2026-06-30',
  '2026-07-01'
];

async function cleanDatabases() {
  logger.info('🧹 Cleaning up existing data in PostgreSQL and Neo4j...');

  // 1. Clean PostgreSQL (Order matters for FK constraints)
  await prisma.booking_legs.deleteMany();
  await prisma.bookings.deleteMany();
  await prisma.payments.deleteMany();
  await prisma.refresh_tokens.deleteMany();
  await prisma.users.deleteMany();
  await prisma.berths.deleteMany();
  await prisma.coaches.deleteMany();
  await prisma.schedule_stops.deleteMany();
  await prisma.trains.deleteMany();
  await prisma.stations.deleteMany();
  logger.info('✅ PostgreSQL clean complete');

  // 2. Clean Neo4j
  const session = driver.session();
  try {
    await session.run('MATCH (n) DETACH DELETE n');
    logger.info('✅ Neo4j clean complete');
  } finally {
    await session.close();
  }
}

async function seedStations() {
  logger.info('🚀 Seeding stations into PostgreSQL and Neo4j...');
  const session = driver.session();

  try {
    for (const st of STATIONS) {
      // Postgres
      await prisma.stations.create({
        data: {
          station_code: st.code,
          station_name: st.name,
          city: st.city,
          state: st.state,
          lat: st.lat,
          lng: st.lng,
          timezone: 'Asia/Kolkata'
        }
      });

      // Neo4j
      await session.run(
        `CREATE (s:Station {
          code: $code,
          name: $name,
          city: $city,
          state: $state,
          lat: $lat,
          lng: $lng,
          timezone: "Asia/Kolkata"
        })`,
        st
      );
    }
    logger.info(`✅ Successfully seeded ${STATIONS.length} stations.`);
  } finally {
    await session.close();
  }
}

async function seedTrainsAndSchedules() {
  logger.info('🚀 Generating and seeding 50 trains...');
  const session = driver.session();

  // Accumulator lists for bulk insertions
  const trainsData: any[] = [];
  const stopsDataList: any[] = [];
  const coachesData: any[] = [];
  const berthsData: any[] = [];

  try {
    let trainCounter = 1;

    // Generate 10 trains for each of the 5 routes
    for (let rIdx = 0; rIdx < ROUTES.length; rIdx++) {
      const route = ROUTES[rIdx];
      
      for (let t = 0; t < 10; t++) {
        const trainId = crypto.randomUUID();
        const isForward = t % 2 === 0;
        
        // Train naming variables
        const baseTrainNum = 12000 + (rIdx + 1) * 100 + t;
        const trainNumber = baseTrainNum.toString();
        
        const prefix = isForward ? 'UP' : 'DN';
        const trainType = t < 2 ? 'RAJDHANI' : t < 4 ? 'SHATABDI' : 'EXPRESS';
        const trainName = `${route.name.split(' ')[0]} ${trainType} (${prefix})`;
        const operator = 'Indian Railways (IR)';

        // Setup route stop sequence
        const stopsOrder = isForward ? [...route.stops] : [...route.stops].reverse();
        const distOrder = isForward ? [...route.distances] : [...route.distances].reverse();

        // Calculate absolute distance offsets
        const actualDistances: number[] = [];
        const startDist = distOrder[0];
        for (let d of distOrder) {
          actualDistances.push(Math.abs(d - startDist));
        }

        // Add to Trains List
        trainsData.push({
          train_id: trainId,
          train_number: trainNumber,
          train_name: trainName,
          train_type: trainType,
          operator: operator
        });

        // Generate schedule details
        const baseHour = 6 + (t * 1.5); // Spread train departures during the day
        const stopsData = [];

        for (let s = 0; s < stopsOrder.length; s++) {
          const stationCode = stopsOrder[s];
          const dist = actualDistances[s];
          
          let arrivalTime: string | null = null;
          let departureTime: string | null = null;
          let dayOffset = 0;

          // Compute travel time based on distance (avg 75 km/h)
          const travelHours = dist / 75;
          const stopTimeMinutes = baseHour * 60 + travelHours * 60;
          
          const totalHours = Math.floor(stopTimeMinutes / 60);
          dayOffset = Math.floor(totalHours / 24);
          
          const hourPart = totalHours % 24;
          const minPart = Math.floor(stopTimeMinutes % 60);
          
          const timeStr = `${hourPart.toString().padStart(2, '0')}:${minPart.toString().padStart(2, '0')}`;

          if (s === 0) {
            departureTime = timeStr;
          } else if (s === stopsOrder.length - 1) {
            arrivalTime = timeStr;
          } else {
            // intermediate stops have a 5-minute halt
            arrivalTime = timeStr;
            const depTotalMin = stopTimeMinutes + 5;
            const depTotalHrs = Math.floor(depTotalMin / 60);
            const depHour = depTotalHrs % 24;
            const depMin = Math.floor(depTotalMin % 60);
            departureTime = `${depHour.toString().padStart(2, '0')}:${depMin.toString().padStart(2, '0')}`;
          }

          const stopId = crypto.randomUUID();

          // Add to Stops List
          stopsDataList.push({
            stop_id: stopId,
            train_id: trainId,
            station_code: stationCode,
            sequence_no: s + 1,
            arrival_time: arrivalTime,
            departure_time: departureTime,
            day_offset: dayOffset,
            distance_km: dist
          });

          stopsData.push({
            sequence: s + 1,
            stationCode,
            arrivalTime,
            departureTime,
            dayOffset,
            distance: dist
          });
        }

        // Seed Coach and Berth Inventory in Postgres
        const coachConfigs = [
          { type: '1A', prefix: 'H', count: 1, berthsPerCoach: 10 },
          { type: '3A', prefix: 'B', count: 2, berthsPerCoach: 30 },
          { type: 'SL', prefix: 'S', count: 3, berthsPerCoach: 40 }
        ];

        const berthPositions = ['LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER'];

        for (const config of coachConfigs) {
          for (let c = 1; c <= config.count; c++) {
            const coachId = crypto.randomUUID();
            const coachNumber = `${config.prefix}${c}`;

            coachesData.push({
              coach_id: coachId,
              train_id: trainId,
              coach_number: coachNumber,
              coach_type: config.type,
              total_berths: config.berthsPerCoach
            });

            // Seed individual berths
            for (let b = 1; b <= config.berthsPerCoach; b++) {
              const berthId = crypto.randomUUID();
              const berthPosition = berthPositions[(b - 1) % berthPositions.length];
              const hasWindow = b % 3 === 0;
              const hasCharging = b % 2 === 0;

              berthsData.push({
                berth_id: berthId,
                coach_id: coachId,
                berth_number: b,
                berth_position: berthPosition,
                has_window: hasWindow,
                has_charging: hasCharging,
                is_ladies_quota: b % 10 === 0 // 10% ladies quota
              });
            }
          }
        }

        // Seed TrainRuns for each date in Neo4j
        for (const date of SEED_DATES) {
          const runId = crypto.randomUUID();
          
          await session.run(
            `CREATE (tr:TrainRun {
              run_id: $runId,
              train_number: $trainNumber,
              train_name: $trainName,
              train_type: $trainType,
              departure_date: $date,
              classes: $classes
            })`,
            {
              runId,
              trainNumber,
              trainName,
              trainType,
              date,
              classes: ['1A', '3A', 'SL']
            }
          );

          for (const stop of stopsData) {
            const arrivalDt = stop.arrivalTime ? `${date}T${stop.arrivalTime}:00Z` : null;
            const departureDt = stop.departureTime ? `${date}T${stop.departureTime}:00Z` : null;

            await session.run(
              `MATCH (tr:TrainRun {run_id: $runId}), (s:Station {code: $stationCode})
               CREATE (tr)-[:STOPS_AT {
                 sequence: $sequence,
                 arrival: $arrivalTime,
                 departure: $departureTime,
                 arrival_dt: $arrivalDt,
                 departure_dt: $departureDt,
                 day_offset: $dayOffset,
                 distance_from_origin: $distance
               }]->(s)`,
              {
                runId,
                stationCode: stop.stationCode,
                sequence: stop.sequence,
                arrivalTime: stop.arrivalTime,
                departureTime: stop.departureTime,
                arrivalDt,
                departureDt,
                dayOffset: stop.dayOffset,
                distance: stop.distance
              }
            );
          }
        }

        logger.debug(`Generated train ${trainCounter++}/50: ${trainNumber} (${trainName})`);
      }
    }

    logger.info('💾 Writing all generated records to PostgreSQL in bulk...');
    
    // Perform bulk inserts
    await prisma.trains.createMany({ data: trainsData });
    logger.info(`✅ Seeded ${trainsData.length} trains in PostgreSQL`);

    await prisma.schedule_stops.createMany({ data: stopsDataList });
    logger.info(`✅ Seeded ${stopsDataList.length} schedule stops in PostgreSQL`);

    await prisma.coaches.createMany({ data: coachesData });
    logger.info(`✅ Seeded ${coachesData.length} coaches in PostgreSQL`);

    await prisma.berths.createMany({ data: berthsData });
    logger.info(`✅ Seeded ${berthsData.length} berths in PostgreSQL`);

    logger.info('✅ Successfully seeded 50 trains, schedules, coaches, berths, and graph connections.');
  } finally {
    await session.close();
  }
}

async function run() {
  const startTime = Date.now();
  logger.info('🏁 Starting database seed process...');

  try {
    const neo4jConnected = await checkNeo4jConnection();
    if (!neo4jConnected) {
      logger.error('❌ Failed to establish a Neo4j connection. Exiting...');
      process.exit(1);
    }

    await cleanDatabases();
    await seedStations();
    await seedTrainsAndSchedules();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`🎉 Seeding complete in ${duration} seconds!`);
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '❌ Critical seeding error occurred');
    process.exit(1);
  }
}

run();
