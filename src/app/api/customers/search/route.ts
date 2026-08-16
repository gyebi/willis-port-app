import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";



export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return NextResponse.json({
        ok: true,
        customers: [],
      });
    }

    
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: query,
            },
          },
          {
            whatsapp: {
              contains: query,
            },
          },
          {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },

      select: {
        id: true,
        name: true,
        phone: true,
        whatsapp: true,
        email: true,
        address: true,

        _count: {
          select: {
            shipments: true,
          },
        },
      },

      orderBy: {
        name: "asc",
      },

      take: 10,
    });

    return NextResponse.json({
      ok: true,
      customers,
    });
  } catch (error) {
    console.error(
      "Failed to search customers:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message: "Unable to search customers.",
      },
      {
        status: 500,
      }
    );
  }
}

