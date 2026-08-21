import path from "path";
import { readFile } from "fs/promises";

import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";

import {
  approvedInvoicePaymentInstructions,
  approvedInvoiceTerms,
} from "./invoice-document-content";

type DecimalLike =
  | string
  | number
  | bigint
  | { toString(): string }
  | null
  | undefined;

type ContactSettings = {
  businessName: string;
  tagline?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
};

type ShipmentMode = "SEA" | "AIR" | "UNKNOWN";
type PricingBasis = "CBM" | "KG" | "WEIGHT" | "MANUAL" | null;
type InvoiceLineType =
  | "SHIPMENT"
  | "FREIGHT"
  | "HANDLING"
  | "DOCUMENTATION"
  | "SPECIAL_HANDLING"
  | "DELIVERY"
  | "OTHER";

type InvoiceLineSource = {
  id?: string;
  lineType: InvoiceLineType | string;
  shipmentId?: string | null;
  shipmentPricingId?: string | null;
  description: string;
  pricingBasis?: PricingBasis;
  billableQuantity?: DecimalLike;
  unitRateUsd?: DecimalLike;
  lineTotalUsd: DecimalLike;
  lineTotalGhs: DecimalLike;
  shipment?: ShipmentSource | null;
};

type ShipmentSource = {
  id: string;
  shipmentNumber: string;
  trackingNumber?: string | null;
  description?: string | null;
  shippingMode: ShipmentMode;
  serviceType: "STANDARD" | "EXPRESS" | string;
  goodsCategory: "NORMAL" | "SPECIAL" | string;
  goodsType?: string | null;
  weightKg?: DecimalLike;
  chargeableWeightKg?: DecimalLike;
  declaredCbm?: DecimalLike;
  actualCbm?: DecimalLike;
  chargeableCbm?: DecimalLike;
  container?:
    | {
        containerNumber: string;
      }
    | null;
};

export type InvoiceSource = {
  invoiceNumber: string;
  status: string;
  createdAt: Date | string;
  validUntil: Date | string;
  exchangeRate: DecimalLike;
  subtotalUsd: DecimalLike;
  totalGhs: DecimalLike;
  pricingBasis?: PricingBasis;
  customer: {
    name: string;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    address?: string | null;
  };
  lines: InvoiceLineSource[];
};

type PreparedChargeRow = {
  tracking: string | null;
  description: string;
  amountUsd: string;
};

type PreparedShipmentSection = {
  title: string;
  leftLines: string[];
  rightLines: string[];
};

type PreparedInvoiceInput = {
  invoiceNumber: string;
  invoiceStatusLabel: string;
  createdAt: string;
  validUntil: string;
  customerLines: string[];
  invoiceDetailLines: string[];
  shipments: PreparedShipmentSection[];
  chargeRows: PreparedChargeRow[];
  subtotalUsd: string;
  exchangeRate: string;
  totalGhs: string;
  business: ContactSettings;
  invoiceModes: ShipmentMode[];
  hasSpecialGoods: boolean;
  hasMultipleShipments: boolean;
};

type ReceiptPdfInput = {
  receiptNumber: string;
  paidAt: string;
  paymentMethod: string;
  paymentReference?: string | null;
  amountGhs: string;
  invoiceNumber: string;
  customerName: string;
  business: ContactSettings;
};

const A4: [number, number] = [595.28, 841.89];
const PAGE_MARGIN = 42;
const PAGE_WIDTH = A4[0];
const PAGE_HEIGHT = A4[1];
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const ACCENT = rgb(0.98, 0.56, 0.10);
const TEXT = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.37, 0.37, 0.37);
const LINE = rgb(0.83, 0.83, 0.83);
const SOFT = rgb(0.95, 0.95, 0.95);
const DEFAULT_FONT_SIZE = 8.4;

type ChargesTableMetrics = {
  x: number;
  width: number;
  trackingWidth: number;
  amountWidth: number;
  headerHeight: number;
  rowGap: number;
  descriptionWidth: number;
};

export async function generateIssuedInvoicePdf(
  invoice: InvoiceSource,
  businessSettings?: ContactSettings | null
) {
  const prepared = prepareInvoiceInput(invoice, businessSettings);
  const renderer = await createRenderer(prepared.business.businessName);

  renderer.drawFullHeader(prepared.business, prepared.invoiceNumber);
  renderer.drawCustomerAndInvoiceDetails(
    prepared.customerLines,
    prepared.invoiceDetailLines
  );

  if (prepared.shipments.length > 0) {
    renderer.drawShipmentSections(prepared.shipments);
  }

  renderer.drawChargesTable(prepared.chargeRows);
  renderer.drawTotals(
    prepared.subtotalUsd,
    prepared.exchangeRate,
    prepared.totalGhs
  );
  renderer.drawPaymentDetails();
  renderer.drawCompactTerms(
    prepared.invoiceModes,
    prepared.hasSpecialGoods
  );

  return renderer.save();
}

export async function generateReceiptPdf(
  input: ReceiptPdfInput
) {
  const renderer = await createRenderer(input.business.businessName);

  renderer.drawReceiptHeader(input.business, input.receiptNumber);
  renderer.drawReceiptBody(input);

  return renderer.save();
}

export function prepareInvoiceInput(
  invoice: InvoiceSource,
  businessSettings?: ContactSettings | null
): PreparedInvoiceInput {
  const business = normalizeBusiness(businessSettings);
  const lines = invoice.lines ?? [];
  const shipmentsById = new Map<string, ShipmentSource>();
  const baseLineByShipmentId = new Map<string, InvoiceLineSource>();
  const modeSet = new Set<ShipmentMode>();

  for (const line of lines) {
    const shipment = line.shipment ?? null;

    if (!shipment) {
      continue;
    }

    const existingShipment = shipmentsById.get(shipment.id);
    if (!existingShipment) {
      shipmentsById.set(shipment.id, shipment);
    } else {
      shipmentsById.set(shipment.id, mergeShipment(existingShipment, shipment));
    }

    if (
      line.lineType === "SHIPMENT" ||
      line.lineType === "FREIGHT"
    ) {
      baseLineByShipmentId.set(shipment.id, line);
    }

    if (shipment.shippingMode === "SEA" || shipment.shippingMode === "AIR") {
      modeSet.add(shipment.shippingMode);
    }
  }

  const shipments = [...shipmentsById.values()].map((shipment, index) => {
    const shipmentLines = lines.filter((line) => {
      const shipmentId = line.shipmentId ?? line.shipment?.id ?? null;
      return shipmentId === shipment.id;
    });

    const baseLine =
      baseLineByShipmentId.get(shipment.id) ?? shipmentLines[0] ?? null;
    const pricingBasis = resolvePricingBasis(
      baseLine?.pricingBasis ?? invoice.pricingBasis ?? null,
      shipment.shippingMode
    );

    const leftLines: string[] = [];
    const rightLines: string[] = [];

    leftLines.push(
      `Tracking: ${shipment.trackingNumber ?? "Pending"}`
    );

    if (shipment.description) {
      leftLines.push(`Description: ${shipment.description}`);
    }

    leftLines.push(
      `Shipping Mode: ${formatModeLabel(shipment.shippingMode)}`
    );

    if (shipment.serviceType && shipment.serviceType !== "STANDARD") {
      leftLines.push(
        `Service Type: ${formatEnumLabel(shipment.serviceType)}`
      );
    }

    leftLines.push(
      `Goods Category: ${formatEnumLabel(shipment.goodsCategory)}`
    );

    if (shipment.container?.containerNumber) {
      leftLines.push(`Container: ${shipment.container.containerNumber}`);
    }

    if (pricingBasis === "CBM") {
      const actualCbm = shipment.actualCbm ? formatAmount(shipment.actualCbm) : null;
      const chargeableCbm = shipment.chargeableCbm
        ? formatAmount(shipment.chargeableCbm)
        : null;
      const billableQuantity = baseLine?.billableQuantity
        ? formatAmount(baseLine.billableQuantity)
        : chargeableCbm ?? actualCbm;
      const rate = baseLine?.unitRateUsd
        ? formatMoney(baseLine.unitRateUsd)
        : null;

      rightLines.push(
        `Actual CBM: ${actualCbm ?? "Pending"}`
      );
      if (chargeableCbm) {
        rightLines.push(`Chargeable CBM: ${chargeableCbm}`);
      }
      if (billableQuantity) {
        rightLines.push(`Billable Quantity: ${billableQuantity} CBM`);
      }
      if (rate) {
        rightLines.push(`Rate per CBM: USD ${rate}`);
      }
    } else if (pricingBasis === "KG") {
      const actualWeight = shipment.weightKg
        ? formatAmount(shipment.weightKg)
        : null;
      const chargeableWeight = shipment.chargeableWeightKg
        ? formatAmount(shipment.chargeableWeightKg)
        : null;
      const billableQuantity = baseLine?.billableQuantity
        ? formatAmount(baseLine.billableQuantity)
        : chargeableWeight ?? actualWeight;
      const rate = baseLine?.unitRateUsd
        ? formatMoney(baseLine.unitRateUsd)
        : null;

      rightLines.push(
        `Actual Weight: ${actualWeight ?? "Pending"} kg`
      );
      if (chargeableWeight) {
        rightLines.push(
          `Chargeable Weight: ${chargeableWeight} kg`
        );
      }
      if (billableQuantity) {
        rightLines.push(
          `Billable Quantity: ${billableQuantity} kg`
        );
      }
      if (rate) {
        rightLines.push(`Rate per KG: USD ${rate}`);
      }
    } else {
      const manualAmount = baseLine?.lineTotalUsd
        ? formatMoney(baseLine.lineTotalUsd)
        : null;
      if (baseLine?.description) {
        rightLines.push(`Description: ${baseLine.description}`);
      }
      if (manualAmount) {
        rightLines.push(`Approved Amount: USD ${manualAmount}`);
      }
    }

    if (rightLines.length === 0) {
      rightLines.push("Charge details: Pending");
    }

    return {
      title:
        shipmentsById.size > 1
          ? `Shipment ${index + 1}`
          : "Shipment Details",
      leftLines,
      rightLines,
    };
  });

  const chargeRows = lines
  .filter(
    (line) =>
      line.lineType !== "SHIPMENT" &&
      line.lineType !== "FREIGHT"
  )
  .map((line) => {
    const shipment = line.shipment ?? null;
    const isFreightLine =
      line.lineType === "SHIPMENT" || line.lineType === "FREIGHT";
    const pricingBasis = resolvePricingBasis(
      line.pricingBasis ?? invoice.pricingBasis ?? null,
      shipment?.shippingMode ?? null
    );

    return {
      tracking:
        shipmentsById.size > 1
          ? shipment?.trackingNumber ?? shipment?.shipmentNumber ?? null
          : null,
      description: formatChargeDescription(line, {
        pricingBasis,
        shippingMode: shipment?.shippingMode ?? "UNKNOWN",
        isFreightLine,
      }),
      amountUsd: formatMoney(line.lineTotalUsd),
    };
  });

  const customerLines = buildCustomerLines(invoice.customer);
  const invoiceDetailLines = [
    `Invoice #: ${invoice.invoiceNumber}`,
    `Date: ${formatDate(invoice.createdAt)}`,
    `Valid Until: ${formatDate(invoice.validUntil)}`,
    //`Status: ${formatEnumLabel(invoice.status)}`,
  ];

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceStatusLabel: formatEnumLabel(invoice.status),
    createdAt: formatDate(invoice.createdAt),
    validUntil: formatDate(invoice.validUntil),
    customerLines,
    invoiceDetailLines,
    shipments,
    chargeRows,
    subtotalUsd: formatMoney(invoice.subtotalUsd),
    exchangeRate: formatExchangeRate(invoice.exchangeRate),
    totalGhs: formatMoney(invoice.totalGhs),
    business,
    invoiceModes: [...modeSet],
    hasSpecialGoods: [...shipmentsById.values()].some(
      (shipment) => shipment.goodsCategory === "SPECIAL"
    ),
    hasMultipleShipments: shipmentsById.size > 1,
  };
}

function formatChargeDescription(
  line: InvoiceLineSource,
  context: {
    pricingBasis: PricingBasis;
    shippingMode: ShipmentMode;
    isFreightLine: boolean;
  }
) {
  if (context.isFreightLine) {
    const label = getFreightLabel(context.shippingMode);

    if (context.pricingBasis === "CBM") {
      const quantity = line.billableQuantity
        ? formatAmount(line.billableQuantity)
        : null;
      const rate = line.unitRateUsd ? formatMoney(line.unitRateUsd) : null;

      if (quantity && rate) {
        return `${label} - ${quantity} CBM @ USD ${rate}`;
      }

      if (quantity) {
        return `${label} - ${quantity} CBM`;
      }

      if (rate) {
        return `${label} @ USD ${rate}`;
      }

      return label;
    }

    if (context.pricingBasis === "KG") {
      const quantity = line.billableQuantity
        ? formatAmount(line.billableQuantity)
        : null;
      const rate = line.unitRateUsd ? formatMoney(line.unitRateUsd) : null;

      if (quantity && rate) {
        return `${label} - ${quantity} kg @ USD ${rate}`;
      }

      if (quantity) {
        return `${label} - ${quantity} kg`;
      }

      if (rate) {
        return `${label} @ USD ${rate}`;
      }

      return label;
    }

    if (line.description?.trim()) {
      return line.description.trim();
    }

    return "Manual Charge";
  }

  switch (line.lineType) {
    case "HANDLING":
      return "Handling";
    case "DOCUMENTATION":
      return "Documentation";
    case "SPECIAL_HANDLING":
      return "Special Handling";
    case "DELIVERY":
      return "Delivery";
    case "OTHER":
      return line.description?.trim() || "Other";
    default:
      return line.description?.trim() || "Charge";
  }
}

function getFreightLabel(mode: ShipmentMode) {
  if (mode === "SEA") {
    return "Sea Freight";
  }

  if (mode === "AIR") {
    return "Air Freight";
  }

  return "Freight";
}

function buildCustomerLines(customer: InvoiceSource["customer"]) {
  const lines = [customer.name];

  if (customer.phone) {
    lines.push(`Phone: ${customer.phone}`);
  }

  if (customer.whatsapp) {
    lines.push(`WhatsApp: ${customer.whatsapp}`);
  }

  if (customer.email) {
    lines.push(`Email: ${customer.email}`);
  }

  if (customer.address) {
    lines.push(`Address: ${customer.address}`);
  }

  return lines;
}

function resolvePricingBasis(
  value: PricingBasis | string | null | undefined,
  shippingMode: ShipmentMode | null
): PricingBasis {
  if (value === "CBM" || value === "KG" || value === "MANUAL") {
    return value;
  }

  if (value === "WEIGHT") {
    return "KG";
  }

  if (shippingMode === "SEA") {
    return "CBM";
  }

  if (shippingMode === "AIR") {
    return "KG";
  }

  return null;
}

function formatModeLabel(value: string) {
  return value === "SEA"
    ? "SEA"
    : value === "AIR"
      ? "AIR"
      : value.toUpperCase();
}

function formatEnumLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: Date | string) {
  const isoDate =
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [year, month, day] = isoDate.split("-");

  if (!year || !month || !day) {
    return String(value);
  }

  return `${day}/${month}/${year}`;
}

function formatExchangeRate(value: DecimalLike) {
  return formatAmount(value, 2);
}

function formatMoney(value: DecimalLike) {
  return formatAmount(value, 2);
}

function formatAmount(value: DecimalLike, fractionDigits = 2) {
  const numeric = toNumeric(value);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numeric);
}

function toNumeric(value: DecimalLike) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  const parsed = Number(value.toString());

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBusiness(
  businessSettings?: ContactSettings | null
): ContactSettings {
  return {
    businessName: businessSettings?.businessName?.trim() || "WILLIS PORT",
    tagline: businessSettings?.tagline?.trim() || "Shipping & Logistics",
    phone: businessSettings?.phone?.trim() || null,
    whatsapp: businessSettings?.whatsapp?.trim() || null,
    email: businessSettings?.email?.trim() || null,
    address: businessSettings?.address?.trim() || null,
  };
}

function mergeShipment(
  existing: ShipmentSource,
  incoming: ShipmentSource
): ShipmentSource {
  return {
    ...existing,
    trackingNumber: existing.trackingNumber ?? incoming.trackingNumber ?? null,
    description: existing.description ?? incoming.description ?? null,
    shippingMode: existing.shippingMode ?? incoming.shippingMode,
    serviceType: existing.serviceType ?? incoming.serviceType,
    goodsCategory: existing.goodsCategory ?? incoming.goodsCategory,
    goodsType: existing.goodsType ?? incoming.goodsType ?? null,
    weightKg: existing.weightKg ?? incoming.weightKg ?? null,
    chargeableWeightKg:
      existing.chargeableWeightKg ?? incoming.chargeableWeightKg ?? null,
    declaredCbm: existing.declaredCbm ?? incoming.declaredCbm ?? null,
    actualCbm: existing.actualCbm ?? incoming.actualCbm ?? null,
    chargeableCbm: existing.chargeableCbm ?? incoming.chargeableCbm ?? null,
    container: existing.container ?? incoming.container ?? null,
  };
}

async function createRenderer(businessName: string) {
  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await loadLogoImage(pdf);
  const renderer = new InvoicePdfRenderer(
    pdf,
    regularFont,
    boldFont,
    logoImage,
    businessName
  );

  return renderer;
}

async function loadLogoImage(pdf: PDFDocument) {
  try {
    const logoBytes = await readFile(
      path.join(process.cwd(), "public", "willis-log.png")
    );

    return await pdf.embedPng(logoBytes);
  } catch {
    return null;
  }
}

class InvoicePdfRenderer {
  private readonly pdf: PDFDocument;
  private readonly regularFont: PDFFont;
  private readonly boldFont: PDFFont;
  private readonly logoImage: PDFImage | null;
  private readonly businessName: string;
  private page: PDFPage;
  private y: number;

  constructor(
    pdf: PDFDocument,
    regularFont: PDFFont,
    boldFont: PDFFont,
    logoImage: PDFImage | null,
    businessName: string
  ) {
    this.pdf = pdf;
    this.regularFont = regularFont;
    this.boldFont = boldFont;
    this.logoImage = logoImage;
    this.businessName = businessName;
    this.page = pdf.addPage(A4);
    this.y = PAGE_HEIGHT - PAGE_MARGIN;
  }

  drawFullHeader(business: ContactSettings, invoiceNumber: string) {
    const logoSize = 42;
    const logoTop = PAGE_HEIGHT - PAGE_MARGIN - logoSize + 2;
    const textX = PAGE_MARGIN + logoSize + 12;
    const textRight = PAGE_WIDTH - PAGE_MARGIN;

    if (this.logoImage) {
      this.page.drawImage(this.logoImage, {
        x: PAGE_MARGIN,
        y: logoTop,
        width: logoSize,
        height: logoSize,
      });
    }

    const businessTop = PAGE_HEIGHT - PAGE_MARGIN - 4;
    this.page.drawText(business.businessName || this.businessName, {
      x: textX,
      y: businessTop,
      size: 16,
      font: this.boldFont,
      color: TEXT,
    });

    const brandLines = [
      business.tagline,
      business.phone ? `Phone: ${business.phone}` : null,
      business.whatsapp ? `WhatsApp: ${business.whatsapp}` : null,
      business.email ? `Email: ${business.email}` : null,
      business.address ? `Address: ${business.address}` : null,
    ].filter((line): line is string => Boolean(line));

    let brandY = businessTop - 14;
    for (const line of brandLines) {
      this.page.drawText(line, {
        x: textX,
        y: brandY,
        size: 9,
        font: this.regularFont,
        color: line === business.email ? MUTED : TEXT,
      });
      brandY -= 11.5;
    }

    this.page.drawText("INVOICE", {
      x: textRight - 86,
      y: businessTop + 1,
      size: 18,
      font: this.boldFont,
      color: TEXT,
    });

    this.page.drawText(invoiceNumber, {
      x: textRight - 122,
      y: businessTop - 18,
      size: 11,
      font: this.boldFont,
      color: MUTED,
    });

    const dividerY = Math.min(brandY - 8, PAGE_HEIGHT - PAGE_MARGIN - 78);
    this.drawHorizontalRule(dividerY);
    this.y = dividerY - 16;
  }

  drawReceiptHeader(business: ContactSettings, title: string) {
    const logoSize = 42;
    const logoTop = PAGE_HEIGHT - PAGE_MARGIN - logoSize + 2;
    const textX = PAGE_MARGIN + logoSize + 12;

    if (this.logoImage) {
      this.page.drawImage(this.logoImage, {
        x: PAGE_MARGIN,
        y: logoTop,
        width: logoSize,
        height: logoSize,
      });
    }

    const brandTop = PAGE_HEIGHT - PAGE_MARGIN - 4;
    this.page.drawText(business.businessName || this.businessName, {
      x: textX,
      y: brandTop,
      size: 16,
      font: this.boldFont,
      color: TEXT,
    });

    if (business.tagline) {
      this.page.drawText(business.tagline, {
        x: textX,
        y: brandTop - 14,
        size: 7.6,
        font: this.regularFont,
        color: TEXT,
      });
    }

    this.page.drawText(title, {
      x: PAGE_WIDTH - PAGE_MARGIN - 110,
      y: brandTop + 1,
      size: 18,
      font: this.boldFont,
      color: TEXT,
    });

    const dividerY = PAGE_HEIGHT - PAGE_MARGIN - 80;
    this.drawHorizontalRule(dividerY);
    this.y = dividerY - 18;
  }

  drawCustomerAndInvoiceDetails(
    customerLines: string[],
    invoiceDetailLines: string[]
  ) {
    this.ensureSpace(86);
    this.page.drawText("Bill To", {
      x: PAGE_MARGIN,
      y: this.y,
      size: 11,
      font: this.boldFont,
      color: TEXT,
    });
    this.page.drawText("Invoice Details", {
      x: PAGE_MARGIN + CONTENT_WIDTH * 0.56,
      y: this.y,
      size: 11,
      font: this.boldFont,
      color: TEXT,
    });
    this.y -= 13;

    const leftWidth = CONTENT_WIDTH * 0.50;
    const rightWidth = CONTENT_WIDTH * 0.40;
    const blockTop = this.y;

    const leftBottom = this.drawTextLines(
      customerLines,
      PAGE_MARGIN,
      blockTop,
      leftWidth
    );
    const rightBottom = this.drawTextLines(
      invoiceDetailLines,
      PAGE_MARGIN + CONTENT_WIDTH * 0.56,
      blockTop,
      rightWidth
    );

    this.y = Math.min(leftBottom, rightBottom) - 10;
    this.drawHorizontalRule(this.y);
    this.y -= 16;
  }

  drawShipmentSections(shipments: PreparedShipmentSection[]) {
    for (const [index, shipment] of shipments.entries()) {
      const required = Math.max(
        measureLines(shipments[index].leftLines, this.regularFont, 8.1, CONTENT_WIDTH * 0.44),
        measureLines(
          shipments[index].rightLines,
          this.regularFont,
          8.1,
          CONTENT_WIDTH * 0.44
        )
      );

      this.ensureSpace(required + 28);

      this.page.drawText(shipment.title, {
        x: PAGE_MARGIN,
        y: this.y,
        size: 9.3,
        font: this.boldFont,
        color: TEXT,
      });
      this.y -= 10;

      const startY = this.y;
      const leftBottom = this.drawTextLines(
        shipment.leftLines,
        PAGE_MARGIN,
        startY,
        CONTENT_WIDTH * 0.44,
        8.1
      );
      const rightBottom = this.drawTextLines(
        shipment.rightLines,
        PAGE_MARGIN + CONTENT_WIDTH * 0.52,
        startY,
        CONTENT_WIDTH * 0.44,
        8.1
      );

      this.y = Math.min(leftBottom, rightBottom) - 8;
      this.drawHorizontalRule(this.y);
      this.y -= 14;
    }
  }

  drawChargesTable(rows: PreparedChargeRow[]) {
    if (rows.length === 0) {
      return;
    }

    this.ensureSpace(70);
    this.page.drawText("Charges", {
      x: PAGE_MARGIN,
      y: this.y,
      size: 9.5,
      font: this.boldFont,
      color: TEXT,
    });
    this.y -= 12;

    const tableHasTracking = rows.some((row) => row.tracking);
    const table: ChargesTableMetrics = {
      x: PAGE_MARGIN,
      width: CONTENT_WIDTH,
      trackingWidth: tableHasTracking ? 88 : 0,
      amountWidth: 76,
      headerHeight: 16,
      rowGap: 7,
      descriptionWidth: 0,
    };
    table.descriptionWidth =
      table.width - table.amountWidth - (tableHasTracking ? table.trackingWidth : 0);

    this.drawChargesTableHeader(table, tableHasTracking);

    for (const row of rows) {
      const rowHeight = this.measureChargeRowHeight(
        row,
        table,
        tableHasTracking
      );
      this.ensureSpace(rowHeight + 3, () =>
        this.drawChargesTableHeader(table, tableHasTracking)
      );

      this.drawChargeRow(row, table, tableHasTracking, rowHeight);
      this.y -= rowHeight + table.rowGap;
    }

    this.y += 5;
    this.drawHorizontalRule(this.y);
    this.y -= 16;
  }

  drawTotals(
    subtotalUsd: string,
    exchangeRate: string,
    totalGhs: string
  ) {
    this.ensureSpace(72);

    const labelX = PAGE_MARGIN;
    const valueX = PAGE_WIDTH - PAGE_MARGIN;

    this.page.drawText("Subtotal USD", {
      x: labelX,
      y: this.y,
      size: 8.5,
      font: this.regularFont,
      color: TEXT,
    });
    this.page.drawText(`USD ${subtotalUsd}`, {
      x: valueX - 120,
      y: this.y,
      size: 8.5,
      font: this.boldFont,
      color: TEXT,
    });
    this.y -= 13;

    this.page.drawText("Exchange Rate", {
      x: labelX,
      y: this.y,
      size: 8.5,
      font: this.regularFont,
      color: TEXT,
    });
    this.page.drawText(`USD 1 = GHS ${exchangeRate}`, {
      x: valueX - 120,
      y: this.y,
      size: 8.5,
      font: this.boldFont,
      color: TEXT,
    });
    this.y -= 14;

    const barHeight = 24;
    this.page.drawRectangle({
      x: PAGE_MARGIN,
      y: this.y - 2,
      width: CONTENT_WIDTH,
      height: barHeight,
      color: ACCENT,
    });

    this.page.drawText("GRAND TOTAL / AMOUNT PAYABLE", {
      x: PAGE_MARGIN + 10,
      y: this.y + 5,
      size: 9.5,
      font: this.boldFont,
      color: TEXT,
    });
    this.page.drawText(`GHS ${totalGhs}`, {
      x: PAGE_WIDTH - PAGE_MARGIN - 92,
      y: this.y + 5,
      size: 10,
      font: this.boldFont,
      color: TEXT,
    });

    this.y -= 20;
  }

  drawPaymentDetails() {
    const paymentBlocks = approvedInvoicePaymentInstructions.map((instruction) => [
      instruction.label,
      ...instruction.lines,
    ]);

    const leftBlock = paymentBlocks[0] ?? [];
    const rightBlock = paymentBlocks[1] ?? [];
    const maxHeight = Math.max(
      measureLines(leftBlock, this.regularFont, 7.8, CONTENT_WIDTH * 0.44),
      measureLines(rightBlock, this.regularFont, 7.8, CONTENT_WIDTH * 0.44)
    );

    this.ensureSpace(maxHeight + 34);
    this.page.drawText("Payment Details", {
      x: PAGE_MARGIN,
      y: this.y,
      size: 9.4,
      font: this.boldFont,
      color: TEXT,
    });
    this.y -= 11;

    const leftBottom = this.drawBlock(
      leftBlock,
      PAGE_MARGIN,
      this.y,
      CONTENT_WIDTH * 0.44,
      7.8
    );
    const rightBottom = this.drawBlock(
      rightBlock,
      PAGE_MARGIN + CONTENT_WIDTH * 0.52,
      this.y,
      CONTENT_WIDTH * 0.44,
      7.8
    );

    this.y = Math.min(leftBottom, rightBottom) - 12;
    this.drawHorizontalRule(this.y);
    this.y -= 16;
  }

  drawCompactTerms(
    invoiceModes: ShipmentMode[],
    hasSpecialGoods: boolean
  ) {
    const notes = buildCompactTerms(invoiceModes, hasSpecialGoods);

    if (notes.length === 0) {
      return;
    }

    const required = measureLines(notes, this.regularFont, 7.4, CONTENT_WIDTH);
    this.ensureSpace(required + 32);

    this.page.drawText("Notes", {
      x: PAGE_MARGIN,
      y: this.y,
      size: 9.2,
      font: this.boldFont,
      color: TEXT,
    });
    this.y -= 11;

    this.y = this.drawTextLines(notes, PAGE_MARGIN, this.y, CONTENT_WIDTH, 7.4, {
      bullet: true,
      muted: true,
    }) - 4;
  }

  drawReceiptBody(input: ReceiptPdfInput) {
    this.ensureSpace(120);

    const leftLines = [
      `Receipt #: ${input.receiptNumber}`,
      `Invoice #: ${input.invoiceNumber}`,
      `Customer: ${input.customerName}`,
      `Paid At: ${input.paidAt}`,
      `Method: ${input.paymentMethod}`,
      input.paymentReference
        ? `Reference: ${input.paymentReference}`
        : null,
    ].filter((line): line is string => Boolean(line));

    this.drawTextLines(leftLines, PAGE_MARGIN, this.y, CONTENT_WIDTH, 9.3);
    this.y -= 8;

    const barHeight = 28;
    this.page.drawRectangle({
      x: PAGE_MARGIN,
      y: this.y - 2,
      width: CONTENT_WIDTH,
      height: barHeight,
      color: ACCENT,
    });

    this.page.drawText("AMOUNT RECEIVED", {
      x: PAGE_MARGIN + 10,
      y: this.y + 6,
      size: 9.5,
      font: this.boldFont,
      color: TEXT,
    });
    this.page.drawText(`GHS ${input.amountGhs}`, {
      x: PAGE_WIDTH - PAGE_MARGIN - 82,
      y: this.y + 6,
      size: 10,
      font: this.boldFont,
      color: TEXT,
    });
  }

  save() {
    return this.pdf.save();
  }

  private drawChargesTableHeader(
    table: {
      x: number;
      width: number;
      trackingWidth: number;
      amountWidth: number;
      headerHeight: number;
      rowGap: number;
      descriptionWidth: number;
    },
    tableHasTracking: boolean
  ) {
    const headerY = this.y;
    const bottomY = headerY - table.headerHeight;
    this.page.drawLine({
      start: { x: table.x, y: headerY + 2 },
      end: { x: table.x + table.width, y: headerY + 2 },
      thickness: 0.6,
      color: LINE,
    });

    if (tableHasTracking) {
      this.page.drawText("Tracking", {
        x: table.x + 1,
        y: bottomY + 3,
        size: 7.5,
        font: this.boldFont,
        color: TEXT,
      });
      this.page.drawText("Description", {
        x: table.x + table.trackingWidth + 3,
        y: bottomY + 3,
        size: 7.5,
        font: this.boldFont,
        color: TEXT,
      });
    } else {
      this.page.drawText("Description", {
        x: table.x + 1,
        y: bottomY + 3,
        size: 7.5,
        font: this.boldFont,
        color: TEXT,
      });
    }

    this.page.drawText("USD", {
      x: table.x + table.width - table.amountWidth + 6,
      y: bottomY + 3,
      size: 7.5,
      font: this.boldFont,
      color: TEXT,
    });

    this.page.drawLine({
      start: { x: table.x, y: bottomY - 3 },
      end: { x: table.x + table.width, y: bottomY - 3 },
      thickness: 0.55,
      color: LINE,
    });

    this.y = bottomY - 8;
  }

  private drawChargeRow(
    row: PreparedChargeRow,
    table: {
      x: number;
      width: number;
      trackingWidth: number;
      amountWidth: number;
      headerHeight: number;
      rowGap: number;
      descriptionWidth: number;
    },
    tableHasTracking: boolean,
    rowHeight: number
  ) {
    const topY = this.y;
    const descriptionX = table.x + (tableHasTracking ? table.trackingWidth : 0) + 3;
    const amountX = table.x + table.width - table.amountWidth + 6;

    if (tableHasTracking && row.tracking) {
      this.drawTextLines(
        [row.tracking],
        table.x + 1,
        topY,
        table.trackingWidth - 4,
        7.6
      );
    }

    this.drawTextLines(
      [row.description],
      descriptionX,
      topY,
      table.descriptionWidth - 8,
      7.6
    );

    this.page.drawText(row.amountUsd, {
      x: amountX,
      y: topY,
      size: 7.8,
      font: this.boldFont,
      color: TEXT,
    });

    this.page.drawLine({
      start: { x: table.x, y: topY - rowHeight - 1 },
      end: { x: table.x + table.width, y: topY - rowHeight - 1 },
      thickness: 0.35,
      color: SOFT,
    });
  }

  private measureChargeRowHeight(
    row: PreparedChargeRow,
    table: {
      x: number;
      width: number;
      trackingWidth: number;
      amountWidth: number;
      headerHeight: number;
      rowGap: number;
      descriptionWidth: number;
    },
    tableHasTracking: boolean
  ) {
    const descriptionWidth =
      table.descriptionWidth - 8;
    const descHeight = measureParagraphHeight(
      row.description,
      this.regularFont,
      7.6,
      descriptionWidth
    );
    const trackingHeight = tableHasTracking && row.tracking
      ? measureParagraphHeight(row.tracking, this.regularFont, 7.6, table.trackingWidth - 4)
      : 0;

    return Math.max(descHeight, trackingHeight, 12);
  }

  private drawTextLines(
    lines: string[],
    x: number,
    y: number,
    width: number,
    size = DEFAULT_FONT_SIZE,
    options?: { bullet?: boolean; muted?: boolean }
  ) {
    return this.drawBlock(lines, x, y, width, size, options);
  }

  private drawBlock(
    lines: string[],
    x: number,
    y: number,
    width: number,
    size = DEFAULT_FONT_SIZE,
    options?: { bullet?: boolean; muted?: boolean }
  ) {
    let currentY = y;
    const lineHeight = size + 1.7;

    for (const line of lines) {
      const text = options?.bullet ? `- ${line}` : line;
      const wrapped = wrapText(
        text,
        options?.muted ? this.regularFont : this.regularFont,
        size,
        width
      );

      for (const segment of wrapped) {
        this.page.drawText(segment, {
          x,
          y: currentY,
          size,
          font: this.regularFont,
          color: options?.muted ? MUTED : TEXT,
        });
        currentY -= lineHeight;
      }
    }

    return currentY;
  }

  private drawHorizontalRule(y: number) {
    this.page.drawLine({
      start: { x: PAGE_MARGIN, y },
      end: { x: PAGE_WIDTH - PAGE_MARGIN, y },
      thickness: 0.6,
      color: LINE,
    });
  }

  private ensureSpace(required: number, onBreak?: () => void) {
    if (this.y - required >= PAGE_MARGIN + 10) {
      return;
    }

    this.page = this.pdf.addPage(A4);
    this.y = PAGE_HEIGHT - PAGE_MARGIN;

    if (onBreak) {
      onBreak();
    }
  }
}

function buildCompactTerms(
  invoiceModes: ShipmentMode[],
  hasSpecialGoods: boolean
) {
  const termsByTitle = new Map(
    approvedInvoiceTerms.map((term) => [term.title, term.text])
  );
  const notes: string[] = [];
  const hasSea = invoiceModes.includes("SEA");
  const hasAir = invoiceModes.includes("AIR");

  notes.push(
    termsByTitle.get("Payment Due") ??
      "Payment is due upon receipt of the invoice."
  );

  if (hasAir) {
    notes.push(
      termsByTitle.get("Air Shipping") ??
        "Air invoices must be settled within 3 days of the invoice date."
    );
    notes.push(
      termsByTitle.get("Minimum Weight") ??
        "Goods below 1 kg are charged as 1 kg; billable weight rules apply where relevant."
    );
  }

  if (hasSea) {
    notes.push(
      termsByTitle.get("Sea Shipping") ??
        "Sea invoices must be settled within 10 days of the invoice date."
    );
    notes.push(
      termsByTitle.get("Minimum Sea Volume") ??
        "Sea freight carries a minimum chargeable volume of 0.10 CBM where applicable."
    );
  }

  if (hasSpecialGoods) {
    notes.push(
      termsByTitle.get("Special Goods") ??
        "Special or regulated goods may attract additional handling or clearance charges."
    );
  }

  notes.push(
    termsByTitle.get("Customs & Clearance") ??
      "Customs duties, taxes, inspection and clearance charges are excluded unless stated on the invoice."
  );
  notes.push(
    termsByTitle.get("Payment Confirmation") ??
      "Please send proof of payment after making payment."
  );

  return notes;
}

function measureLines(
  lines: string[],
  font: PDFFont,
  size: number,
  width: number
) {
  return lines.reduce((total, line) => {
    return total + measureParagraphHeight(line, font, size, width) + 1;
  }, 0);
}

function measureParagraphHeight(
  text: string,
  font: PDFFont,
  size: number,
  width: number
) {
  const wrapped = wrapText(text, font, size, width);
  return wrapped.length * (size + 1.7);
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  width: number
) {
  const normalized = normalizeWhitespace(text);

  if (!normalized) {
    return [""];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (font.widthOfTextAtSize(word, size) <= width) {
      current = word;
      continue;
    }

    const segments = breakLongWord(word, font, size, width);
    lines.push(...segments.slice(0, -1));
    current = segments.at(-1) ?? "";
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [normalized];
}

function breakLongWord(
  word: string,
  font: PDFFont,
  size: number,
  width: number
) {
  const segments: string[] = [];
  let chunk = "";

  for (const char of word) {
    const next = chunk + char;
    if (font.widthOfTextAtSize(next, size) <= width) {
      chunk = next;
      continue;
    }

    if (chunk) {
      segments.push(chunk);
    }
    chunk = char;
  }

  if (chunk) {
    segments.push(chunk);
  }

  return segments.length > 0 ? segments : [word];
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
