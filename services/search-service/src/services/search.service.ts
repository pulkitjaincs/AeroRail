import { driver } from '../config/neo4j.js';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { logger } from '@aerorail/logger';
import neo4j from 'neo4j-driver';
export interface SearchResult {
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
}

export class SearchService {
    static async getAvailability(trainNumber: string, classCode: string, dateStr: string): Promise<number> {
        const cacheKey = `avail:${trainNumber}:${classCode}:${dateStr}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            return parseInt(cached, 10);
        }
        const train = await prisma.trains.findUnique({
            where: { train_number: trainNumber },
            include: {
                coaches: {
                    where: { coach_type: classCode }
                }
            }
        });
        if (!train) {
            return 0;
        }
        const totalBerths = train.coaches.reduce((acc, coach) => acc + coach.total_berths, 0);
        const dateStart = new Date(`${dateStr}T00:00:00.000Z`);
        const dateEnd = new Date(`${dateStr}T23:59:59.999Z`);
        const bookedCount = await prisma.booking_legs.count({
            where: {
                train_id: train.train_id,
                seat_status: 'CONFIRMED',
                departure_dt: {
                    gte: dateStart,
                    lte: dateEnd,
                },
                berths: {
                    coaches: {
                        coach_type: classCode
                    }
                }
            }
        });
        const available = Math.max(0, totalBerths - bookedCount);
        await redis.setex(cacheKey, 600, available.toString());
        return available;
    }
    static async searchTrains(from: string, to: string, dateStr: string, classCode?: string): Promise<SearchResult[]> {
        const cacheKey = `search:${from}:${to}:${dateStr}:${classCode || 'ALL'}`;
        const cachedResults = await redis.get(cacheKey);
        if (cachedResults) {
            logger.debug({ cacheKey }, '🔍 Search results cache hit');
            return JSON.parse(cachedResults);
        }
        logger.debug({ from, to, dateStr }, '🛰️ Executing Neo4j direct train routing query');
        const session = driver.session();
        try {
            const query = `MATCH (origin:Station {code: $from})<-[s1:STOPS_AT]-(run:TrainRun)-[s2:STOPS_AT]->(dest:Station {code: $to})
        WHERE run.departure_date = $dateStr AND s1.sequence < s2.sequence
        RETURN run, s1, s2
        ORDER BY s1.departure ASC`;
            const result = await session.run(query, { from, to, dateStr });
            const searchResults: SearchResult[] = [];
            for (const record of result.records) {
                const runNode = record.get('run');
                const stop1 = record.get('s1');
                const stop2 = record.get('s2');
                const trainNumber = runNode.properties.train_number;
                const trainName = runNode.properties.train_name;
                const trainType = runNode.properties.train_type || 'EXPRESS';


                const classes: string[] = Array.isArray(runNode.properties.classes)
                    ? runNode.properties.classes
                    : ['3A', 'SL'];

                if (classCode && !classes.includes(classCode)) {
                    continue;
                }
                const departureTime = stop1.properties.departure;
                const arrivalTime = stop2.properties.arrival;
                const distanceKm = Number(stop2.properties.distance_from_origin) - Number(stop1.properties.distance_from_origin);

                const [depH, depM] = departureTime.split(':').map(Number);
                const [arrH, arrM] = arrivalTime.split(':').map(Number);
                const dayOffset = Number(stop2.properties.day_offset || 0) - Number(stop1.properties.day_offset || 0);

                const depMinutes = depH * 60 + depM;
                const arrMinutes = arrH * 60 + arrM + dayOffset * 24 * 60;
                const durationMinutes = arrMinutes - depMinutes;

                const availability: Record<string, number> = {};
                const classesToFetch = classCode ? [classCode] : classes;
                for (const cl of classesToFetch) {
                    availability[cl] = await this.getAvailability(trainNumber, cl, dateStr);
                }
                searchResults.push({
                    trainNumber,
                    trainName,
                    trainType,
                    departureTime,
                    arrivalTime,
                    durationMinutes,
                    originStation: from,
                    destStation: to,
                    distanceKm: Math.round(distanceKm * 100) / 100,
                    classes: classesToFetch,
                    availability,
                });
            }
            await redis.setex(cacheKey, 600, JSON.stringify(searchResults));
            return searchResults;
        } finally {
            await session.close();
        }
    }
}