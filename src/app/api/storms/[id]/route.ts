import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   try {
      const { id } = await params;
      const storm = await prisma.storm.findUnique({
         where: {
            id,
         },
         include: {
            path: {
               orderBy: {
                  timestamp: "asc",
               },
            },
         },
      });

      if (!storm) {
         return NextResponse.json({ error: "Storm not found" }, { status: 404 });
      }

      return NextResponse.json({ data: storm });
   } catch (error) {
      console.error("Error fetching storm:", error);
      return NextResponse.json({ error: "Failed to fetch storm" }, { status: 500 });
   }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   try {
      const { id } = await params;
      const body = await request.json();
      const { ...stormData } = body;

      const updatedStorm = await prisma.storm.update({
         where: {
            id,
         },
         data: {
            ...stormData,
            startDate: stormData.startDate ? new Date(stormData.startDate) : undefined,
            endDate: stormData.endDate ? new Date(stormData.endDate) : undefined,
         },
         include: {
            path: {
               orderBy: {
                  timestamp: "asc",
               },
            },
         },
      });

      return NextResponse.json({ data: updatedStorm });
   } catch (error) {
      console.error("Error updating storm:", error);
      return NextResponse.json({ error: "Failed to update storm" }, { status: 500 });
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> }
) {
   try {
      const { id } = await params;
      await prisma.storm.delete({
         where: {
            id,
         },
      });

      return NextResponse.json({ message: "Storm deleted successfully" });
   } catch (error) {
      console.error("Error deleting storm:", error);
      return NextResponse.json({ error: "Failed to delete storm" }, { status: 500 });
   }
}
