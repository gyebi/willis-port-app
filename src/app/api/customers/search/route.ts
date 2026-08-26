import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type CustomerSearchResult = {
  id: string;
  customerId: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  matchedShipmentNumber: string | null;
  _count: {
    shipments: number;
  };
};

function buildCustomerResult(input: {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  shipments: number;
  matchedShipmentNumber?: string | null;
}): CustomerSearchResult {
  return {
    id: input.id,
    customerId: input.id,
    name: input.name,
    phone: input.phone,
    whatsapp: input.whatsapp,
    email: input.email,
    address: input.address,
    matchedShipmentNumber: input.matchedShipmentNumber ?? null,
    _count: {
      shipments: input.shipments,
    },
  };
}

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

    const [customerMatches, shipmentMatches] = await Promise.all([
      prisma.customer.findMany({
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
      }),
      prisma.shipment.findMany({
        where: {
          shipmentNumber: {
            contains: query,
            mode: "insensitive",
          },
        },
        select: {
          shipmentNumber: true,
          customer: {
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
          },
        },
        orderBy: {
          shipmentNumber: "asc",
        },
        take: 10,
      }),
    ]);

    const customers = new Map<string, CustomerSearchResult>();

    for (const customer of customerMatches) {
      customers.set(
        customer.id,
        buildCustomerResult({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          whatsapp: customer.whatsapp,
          email: customer.email,
          address: customer.address,
          shipments: customer._count.shipments,
        })
      );
    }

    for (const shipment of shipmentMatches) {
      const customer = shipment.customer;

      if (!customers.has(customer.id)) {
        customers.set(
          customer.id,
          buildCustomerResult({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            whatsapp: customer.whatsapp,
            email: customer.email,
            address: customer.address,
            shipments: customer._count.shipments,
            matchedShipmentNumber: shipment.shipmentNumber,
          })
        );
      }
    }

    return NextResponse.json({
      ok: true,
      customers: Array.from(customers.values()).slice(0, 10),
    });
  } catch (error) {
    console.error("Failed to search customers:", error);

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
