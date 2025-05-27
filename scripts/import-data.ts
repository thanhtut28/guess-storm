import { PrismaClient } from "../src/generated/prisma";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface StormData {
   id: string;
   name: string;
   year: number;
   season: string;
   maxWindSpeed: number;
   maxCategory: number;
   startDate: string;
   endDate: string;
   path: Array<{
      lat: number;
      lng: number;
      timestamp: string;
      windSpeed: number | null;
      pressure: number | null;
      category: number;
   }>;
   geojson?: object;
}

async function importStormData() {
   try {
      console.log("Starting data import...");

      // Read the JSON file
      const jsonPath = path.join(process.cwd(), "converted_storms.json");
      const rawData = fs.readFileSync(jsonPath, "utf-8");
      const storms: StormData[] = JSON.parse(rawData);

      console.log(`Found ${storms.length} storms to import`);

      // Clear existing data
      console.log("Clearing existing data...");
      await prisma.stormPoint.deleteMany();
      await prisma.storm.deleteMany();
      await prisma.season.deleteMany();

      // Import storms in batches
      const batchSize = 50;
      let imported = 0;

      for (let i = 0; i < storms.length; i += batchSize) {
         const batch = storms.slice(i, i + batchSize);

         for (const stormData of batch) {
            try {
               const { path, ...stormInfo } = stormData;

               // Ensure maxWindSpeed is not null/undefined
               const maxWindSpeed = stormInfo.maxWindSpeed || 0;

               // Create storm with path points
               await prisma.storm.create({
                  data: {
                     ...stormInfo,
                     maxWindSpeed,
                     startDate: new Date(stormInfo.startDate),
                     endDate: new Date(stormInfo.endDate),
                     path: {
                        create: path.map(point => ({
                           lat: point.lat,
                           lng: point.lng,
                           timestamp: new Date(point.timestamp),
                           windSpeed: point.windSpeed,
                           pressure: point.pressure,
                           category: point.category,
                        })),
                     },
                     geojson: stormData.geojson || undefined,
                  },
               });

               imported++;
               if (imported % 10 === 0) {
                  console.log(`Imported ${imported}/${storms.length} storms`);
               }
            } catch (error) {
               console.error(`Error importing storm ${stormData.id}:`, error);
            }
         }
      }

      console.log(`Successfully imported ${imported} storms`);

      // Generate season statistics
      console.log("Generating season statistics...");
      const seasons = await prisma.storm.groupBy({
         by: ["year", "season"],
         _count: {
            id: true,
         },
         _max: {
            maxCategory: true,
         },
      });

      for (const seasonData of seasons) {
         const majorHurricanes = await prisma.storm.count({
            where: {
               year: seasonData.year,
               season: seasonData.season,
               maxCategory: {
                  gte: 3,
               },
            },
         });

         // Calculate ACE index (simplified calculation)
         const storms = await prisma.storm.findMany({
            where: {
               year: seasonData.year,
               season: seasonData.season,
            },
            select: {
               maxWindSpeed: true,
            },
         });

         const aceIndex = storms.reduce((acc, storm) => {
            // Simplified ACE calculation: sum of squares of max wind speeds / 10000
            return acc + (storm.maxWindSpeed * storm.maxWindSpeed) / 10000;
         }, 0);

         await prisma.season.upsert({
            where: {
               year: seasonData.year,
            },
            update: {
               name: seasonData.season,
               totalStorms: seasonData._count.id,
               majorHurricanes,
               aceIndex: Math.round(aceIndex * 10) / 10,
               basin: seasonData.season.includes("Atlantic")
                  ? "Atlantic"
                  : seasonData.season.includes("Pacific")
                  ? "Pacific"
                  : "Other",
            },
            create: {
               year: seasonData.year,
               name: seasonData.season,
               totalStorms: seasonData._count.id,
               majorHurricanes,
               aceIndex: Math.round(aceIndex * 10) / 10,
               basin: seasonData.season.includes("Atlantic")
                  ? "Atlantic"
                  : seasonData.season.includes("Pacific")
                  ? "Pacific"
                  : "Other",
            },
         });
      }

      console.log(`Generated statistics for ${seasons.length} seasons`);
      console.log("Data import completed successfully!");
   } catch (error) {
      console.error("Error importing data:", error);
   } finally {
      await prisma.$disconnect();
   }
}

// Run the import
importStormData();
