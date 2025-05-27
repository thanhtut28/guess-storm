import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
   try {
      const { searchParams } = new URL(request.url);
      const year = searchParams.get("year");
      const basin = searchParams.get("basin");

      const where: { year?: number; basin?: string } = {};
      if (year) where.year = parseInt(year);
      if (basin) where.basin = basin;

      const seasons = await prisma.season.findMany({
         where,
         orderBy: {
            year: "desc",
         },
      });

      return NextResponse.json({
         data: seasons,
         count: seasons.length,
      });
   } catch (error) {
      console.error("Error fetching seasons:", error);
      return NextResponse.json({ error: "Failed to fetch seasons" }, { status: 500 });
   }
}

export async function POST(request: NextRequest) {
   try {
      const body = await request.json();

      const season = await prisma.season.create({
         data: body,
      });

      return NextResponse.json({ data: season });
   } catch (error) {
      console.error("Error creating season:", error);
      return NextResponse.json({ error: "Failed to create season" }, { status: 500 });
   }
}
