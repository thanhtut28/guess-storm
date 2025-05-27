import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export async function GET(request: NextRequest) {
   try {
      const { searchParams } = new URL(request.url);
      const year = searchParams.get("year");
      const season = searchParams.get("season");
      const category = searchParams.get("category");
      const name = searchParams.get("name");
      const limit = searchParams.get("limit");
      const offset = searchParams.get("offset");

      const where: Prisma.StormWhereInput = {};

      if (year) where.year = parseInt(year);
      if (season) where.season = { contains: season, mode: "insensitive" };
      if (category) where.maxCategory = parseInt(category);
      if (name) where.name = { contains: name, mode: "insensitive" };

      const storms = await prisma.storm.findMany({
         where,
         include: {
            path: {
               orderBy: {
                  timestamp: "asc",
               },
            },
         },
         orderBy: {
            startDate: "desc",
         },
         take: limit ? parseInt(limit) : undefined,
         skip: offset ? parseInt(offset) : undefined,
      });

      return NextResponse.json({
         data: storms,
         count: storms.length,
      });
   } catch (error) {
      console.error("Error fetching storms:", error);
      return NextResponse.json({ error: "Failed to fetch storms" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   try {
      const body = await request.json();
      const { storms } = body;

      if (!storms || !Array.isArray(storms)) {
         return NextResponse.json(
            { error: "Invalid data format. Expected array of storms." },
            { status: 400 }
         );
      }

      const results = [];

      for (const stormData of storms) {
         const { path, ...stormInfo } = stormData;

         // Create storm with path points
         const storm = await prisma.storm.create({
            data: {
               ...stormInfo,
               startDate: new Date(stormInfo.startDate),
               endDate: new Date(stormInfo.endDate),
               path: {
                  create: path.map(
                     (point: {
                        lat: number;
                        lng: number;
                        timestamp: string;
                        windSpeed?: number;
                        pressure?: number;
                        category: number;
                     }) => ({
                        lat: point.lat,
                        lng: point.lng,
                        timestamp: new Date(point.timestamp),
                        windSpeed: point.windSpeed,
                        pressure: point.pressure,
                        category: point.category,
                     })
                  ),
               },
               geojson: stormData.geojson || null,
            },
            include: {
               path: true,
            },
         });

         results.push(storm);
      }

      return NextResponse.json({
         message: `Successfully imported ${results.length} storms`,
         data: results,
      });
   } catch (error) {
      console.error("Error importing storms:", error);
      return NextResponse.json({ error: "Failed to import storms" }, { status: 500 });
   }
}
