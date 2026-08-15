import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import xlsx from "xlsx";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workbookPath = path.join(__dirname, "../data/WILLISPORT TRACKER.xlsx");

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");

const normalizeKey = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const toText = (value) => {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const toNumber = (value) => {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const excelDateToDate = (value) => {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const parts = xlsx.SSF.parse_date_code(value);
    return parts
      ? new Date(
          Date.UTC(
            parts.y,
            parts.m - 1,
            parts.d,
            parts.H,
            parts.M,
            parts.S
          )
        )
      : null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseShippingMode = (value) => {
  const text = String(value ?? "").trim().toUpperCase();
  if (text.includes("AIR")) return "AIR";
  if (text.includes("SEA")) return "SEA";
  return "UNKNOWN";
};

const parseShipmentStatus = (value) => {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return "RECEIVED";
  if (text.includes("DELIVER")) return "WAREHOUSE";
  if (text.includes("WAREHOUSE")) return "WAREHOUSE";
  if (text.includes("TRANSIT")) return "IN_TRANSIT";
  if (text.includes("LOADING")) return "LOADING_SCHEDULED";
  if (text.includes("CLEARANCE")) return "CUSTOMS_CLEARANCE";
  if (text.includes("ORIGIN")) return "ORIGIN";
  if (text.includes("CANCEL")) return "CANCELLED";
  return "RECEIVED";
};

const pick = (row, aliases) => {
  for (const alias of aliases) {
    if (alias in row && row[alias] !== "") return row[alias];
  }
  return null;
};

const workbook = xlsx.readFile(workbookPath);
const sheetNames = ["Sheet1", "Sheet2"].filter((name) => workbook.Sheets[name]);

const rows = [];
for (const sheetName of sheetNames) {
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: "", raw: true });
  if (!rawRows.length) continue;

  for (const row of rawRows) {
    const normalized = {};
    for (const key of Object.keys(row)) {
      normalized[normalizeKey(key)] = row[key];
    }

    const customerName = toText(
      pick(normalized, ["client", "customer", "customername", "name"])
    );
    const trackingNumber = toText(
      pick(normalized, ["trackingnumber", "tracking"])
    );
    const description = toText(
      pick(normalized, ["discription", "description", "goodsdescription"])
    );
    const goodsType = toText(pick(normalized, ["goodstype", "goodscategory"]));
    const shippingMode = parseShippingMode(
      pick(normalized, ["shippingmode", "shipping"])
    );
    const status = parseShipmentStatus(pick(normalized, ["status"]));
    const containerNumber = toText(pick(normalized, ["container"]));
    const shipmentNumber =
      `IMP-${sheetName.toUpperCase()}-${String(rows.length + 1).padStart(5, "0")}`;

    rows.push({
      sheetName,
      customerName,
      trackingNumber,
      description,
      goodsType,
      shippingMode,
      status,
      weightKg: toNumber(pick(normalized, ["weight"])),
      declaredCbm: toNumber(pick(normalized, ["cbm"])),
      actualCbm: toNumber(pick(normalized, ["actualcbm"])),
      chargeableCbm: toNumber(pick(normalized, ["chargablecbm", "chargeablecbm"])),
      dateReceived: excelDateToDate(pick(normalized, ["datereceived"])),
      estimatedLoadingDate: excelDateToDate(
        pick(normalized, ["estimatedloadingdate"])
      ),
      eta: excelDateToDate(pick(normalized, ["etaarrival", "eta"])),
      containerNumber,
      shipmentNumber,
      sourceRow: normalized,
    });
  }
}

if (!rows.length) {
  console.log(`No rows found in ${path.basename(workbookPath)}`);
  process.exit(0);
}

const nonEmptyRows = rows.filter((row) => row.customerName || row.trackingNumber || row.description);

const uniqueCustomers = new Set(
  nonEmptyRows
    .map((row) => row.customerName?.trim().toUpperCase())
    .filter(Boolean)
);

const rowsWithoutCustomer = nonEmptyRows.filter((row) => !row.customerName);

const rowsWithoutTracking = nonEmptyRows.filter((row) => !row.trackingNumber);

const unknownShippingMode = nonEmptyRows.filter(
  (row) => row.shippingMode === "UNKNOWN"
);

const seaShipments = nonEmptyRows.filter((row) => row.shippingMode === "SEA");

const airShipments = nonEmptyRows.filter((row) => row.shippingMode === "AIR");

const rowsWithContainer = nonEmptyRows.filter((row) => row.containerNumber);

const trackingNumbers = nonEmptyRows
  .map((row) => row.trackingNumber)
  .filter(Boolean);

const duplicateTrackingNumbers = [
  ...new Set(
    trackingNumbers.filter(
      (trackingNumber, index) => trackingNumbers.indexOf(trackingNumber) !== index
    )
  ),
];

console.log("\n--- IMPORT SUMMARY ---");
console.log(`Candidate shipments: ${nonEmptyRows.length}`);
console.log(`Unique customer names: ${uniqueCustomers.size}`);
console.log(`Without customer name: ${rowsWithoutCustomer.length}`);
console.log(`Without tracking number: ${rowsWithoutTracking.length}`);
console.log(`SEA: ${seaShipments.length}`);
console.log(`AIR: ${airShipments.length}`);
console.log(`UNKNOWN shipping mode: ${unknownShippingMode.length}`);
console.log(`Assigned to container: ${rowsWithContainer.length}`);
console.log(`Duplicate tracking numbers: ${duplicateTrackingNumbers.length}`);

if (duplicateTrackingNumbers.length > 0) {
  console.log("Duplicate tracking examples:", duplicateTrackingNumbers.slice(0, 10));
}

if (duplicateTrackingNumbers.length > 0) {
  console.log("\n--- DUPLICATE TRACKING DETAILS ---");

  for (const trackingNumber of duplicateTrackingNumbers) {
    const matches = nonEmptyRows.filter(
      (row) => row.trackingNumber === trackingNumber
    );

    console.log(`\nTracking: ${trackingNumber}`);

    for (const match of matches) {
      console.log({
        sheet: match.sheetName,
        customer: match.customerName,
        description: match.description,
        shippingMode: match.shippingMode,
        dateReceived: match.dateReceived,
        container: match.containerNumber,
        shipmentNumber: match.shipmentNumber,
      });
    }
  }
}

if (!shouldWrite) {
  console.log(`Loaded ${nonEmptyRows.length} candidate shipment rows from ${path.basename(workbookPath)}`);
  console.log(
    JSON.stringify(
      nonEmptyRows.slice(0, 5).map(({ sourceRow, ...row }) => row),
      null,
      2
    )
  );
  process.exit(0);
}

const imported = await prisma.$transaction(async (tx) => {
  let count = 0;

  for (const row of nonEmptyRows) {
    if (!row.customerName) {
      console.warn(`Skipping ${row.shipmentNumber}: customer name is missing`);
      continue;
    }

    const customerName = row.customerName;
    const existingCustomer = await tx.customer.findFirst({
      where: {
        name: {
          equals: customerName,
          mode: "insensitive",
        },
      },
    });
    const customer =
      existingCustomer ??
      (await tx.customer.create({
        data: {
          name: customerName,
          phone: null,
        },
      }));

    let containerId = null;
    if (row.containerNumber) {
      const container = await tx.container.upsert({
        where: { containerNumber: row.containerNumber },
        update: {
          shippingMode: row.shippingMode,
        },
        create: {
          containerNumber: row.containerNumber,
          shippingMode: row.shippingMode,
          status: "PLANNING",
        },
      });
      containerId = container.id;
    }

    await tx.shipment.upsert({
      where: { shipmentNumber: row.shipmentNumber },
      update: {
        customerId: customer.id,
        trackingNumber: row.trackingNumber,
        description: row.description,
        shippingMode: row.shippingMode,
        goodsType: row.goodsType,
        weightKg: row.weightKg,
        declaredCbm: row.declaredCbm,
        actualCbm: row.actualCbm,
        chargeableCbm: row.chargeableCbm,
        dateReceived: row.dateReceived,
        estimatedLoadingDate: row.estimatedLoadingDate,
        eta: row.eta,
        status: row.status,
        containerId,
      },
      create: {
        shipmentNumber: row.shipmentNumber,
        customerId: customer.id,
        trackingNumber: row.trackingNumber,
        description: row.description,
        shippingMode: row.shippingMode,
        goodsType: row.goodsType,
        weightKg: row.weightKg,
        declaredCbm: row.declaredCbm,
        actualCbm: row.actualCbm,
        chargeableCbm: row.chargeableCbm,
        dateReceived: row.dateReceived,
        estimatedLoadingDate: row.estimatedLoadingDate,
        eta: row.eta,
        status: row.status,
        containerId,
      },
    });

    count += 1;
  }

  return count;
});

try {
  console.log(
    `Imported ${imported} shipment rows from ${path.basename(workbookPath)}`
  );
} finally {
  await prisma.$disconnect();
}
