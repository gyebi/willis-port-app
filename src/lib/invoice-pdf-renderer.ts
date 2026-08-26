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
  dateReceived?: Date | string | null;
  estimatedLoadingDate?: Date | string | null;
  eta?: Date | string | null;
  collectionDate?: Date | string | null;
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
  basis: string;
  quantity: string;
  unitPriceUsd: string;
  amountUsd: string;
};

type PreparedShipmentSection = {
  title: string;
  leftLines: string[];
  rightLines: string[];
};

type PreparedInvoiceTotals = {
  handlingUsd: string;
  documentationUsd: string;
  specialHandlingUsd: string;
  deliveryUsd: string;
  otherUsd: string;
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
  totals: PreparedInvoiceTotals;
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
const DEFAULT_FONT_SIZE = 9.2;

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

  renderer.drawFullHeader(
    prepared.business,
    prepared.invoiceNumber
  );

  renderer.drawCustomerAndInvoiceDetails(
    prepared.customerLines,
    prepared.invoiceDetailLines
  );

  renderer.drawChargesTable(
    prepared.chargeRows
  );

  renderer.drawPaymentSummary(
    prepared.subtotalUsd,
    prepared.exchangeRate,
    prepared.totalGhs
  );

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

    if (shipment.dateReceived) {
      leftLines.push(`Date Received: ${formatDate(shipment.dateReceived)}`);
    }

    if (shipment.estimatedLoadingDate) {
      leftLines.push(
        `Effective Loading Date: ${formatDate(shipment.estimatedLoadingDate)}`
      );
    }

    if (shipment.eta) {
      leftLines.push(`ETA / Arrival: ${formatDate(shipment.eta)}`);
    }

    if (shipment.collectionDate) {
      leftLines.push(`Collection Date: ${formatDate(shipment.collectionDate)}`);
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

  const chargeRows = lines.map((line) => {
    const shipment = line.shipment ?? null;

    const isFreightLine =
      line.lineType === "SHIPMENT" ||
      line.lineType === "FREIGHT";

    const pricingBasis = resolvePricingBasis(
      line.pricingBasis ?? invoice.pricingBasis ?? null,
      shipment?.shippingMode ?? null
    );

    const quantity =
      line.billableQuantity !== null &&
        line.billableQuantity !== undefined
        ? formatAmount(line.billableQuantity)
        : "";

    const unitPrice =
      line.unitRateUsd !== null &&
        line.unitRateUsd !== undefined
        ? formatMoney(line.unitRateUsd)
        : "";

    return {
      tracking:
        shipment?.trackingNumber ??
        shipment?.shipmentNumber ??
        null,

      description: formatChargeDescription(line, {
        pricingBasis,
        shippingMode: shipment?.shippingMode ?? "UNKNOWN",
        isFreightLine,
      }),

      basis:
        pricingBasis === "CBM"
          ? "CBM"
          : pricingBasis === "KG"
            ? "KG"
            : pricingBasis === "MANUAL"
              ? "Manual"
              : "",

      quantity,

      unitPriceUsd: unitPrice,

      amountUsd: formatMoney(line.lineTotalUsd),
    };
  });

  const customerLines = buildCustomerLines(invoice.customer);
  const invoiceDetailLines = [
    `Invoice #: ${invoice.invoiceNumber}`,
    `Invoice Date: ${formatDate(invoice.createdAt)}`,
    `Valid Until: ${formatDate(invoice.validUntil)}`,
    //`Status: ${formatEnumLabel(invoice.status)}`,
  ];

  const totals: PreparedInvoiceTotals = {
    handlingUsd: sumLineTotals(lines, "HANDLING"),
    documentationUsd: sumLineTotals(lines, "DOCUMENTATION"),
    specialHandlingUsd: sumLineTotals(lines, "SPECIAL_HANDLING"),
    deliveryUsd: sumLineTotals(lines, "DELIVERY"),
    otherUsd: sumLineTotals(lines, "OTHER"),
  };

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceStatusLabel: formatEnumLabel(invoice.status),
    createdAt: formatDate(invoice.createdAt),
    validUntil: formatDate(invoice.validUntil),
    customerLines,
    invoiceDetailLines,
    shipments,
    chargeRows,
    totals,
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
    return getFreightLabel(context.shippingMode);
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

function sumLineTotals(
  lines: InvoiceLineSource[],
  lineType: InvoiceLineType
) {
  const total = lines.reduce((sum, line) => {
    if (line.lineType !== lineType) {
      return sum;
    }

    return sum + toNumeric(line.lineTotalUsd);
  }, 0);

  return formatMoney(total);
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
    dateReceived: existing.dateReceived ?? incoming.dateReceived ?? null,
    estimatedLoadingDate:
      existing.estimatedLoadingDate ??
      incoming.estimatedLoadingDate ??
      null,
    eta: existing.eta ?? incoming.eta ?? null,
    collectionDate: existing.collectionDate ?? incoming.collectionDate ?? null,
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
    this.page.drawText("Customer Information", {
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

   drawShipmentSummaryBox(
    shipments: PreparedShipmentSection[]
  ) {
    if (shipments.length === 0) {
      return;
    }

    this.ensureSpace(86);

    const boxHeight = shipments.length === 1 ? 76 : 94;
    const boxY = this.y - boxHeight;

    this.page.drawRectangle({
      x: PAGE_MARGIN,
      y: boxY,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: rgb(0.97, 0.97, 0.97),
      borderColor: LINE,
      borderWidth: 0.8,
    });

    this.page.drawText("Shipment Details", {
      x: PAGE_MARGIN + 12,
      y: this.y - 20,
      size: 12,
      font: this.boldFont,
      color: TEXT,
    });

    const shipment = shipments[0];

    const combinedLines = [
      ...shipment.leftLines,
      ...shipment.rightLines,
    ];

    const tracking =
      combinedLines.find((line) =>
        line.startsWith("Tracking:")
      ) ?? "";

    const container =
      combinedLines.find((line) =>
        line.startsWith("Container:")
      ) ?? "";

    const loading =
      combinedLines.find((line) =>
        line.startsWith("Effective Loading Date:")
      ) ?? "";

    const eta =
      combinedLines.find((line) =>
        line.startsWith("ETA / Arrival:")
      ) ?? "";

    const collection =
      combinedLines.find((line) =>
        line.startsWith("Collection Date:")
      ) ?? "";

    const firstRowY = this.y - 43;

    if (tracking) {
      this.page.drawText(tracking, {
        x: PAGE_MARGIN + 12,
        y: firstRowY,
        size: 9.5,
        font: this.boldFont,
        color: TEXT,
      });
    }

    if (container) {
      this.page.drawText(container, {
        x: PAGE_MARGIN + CONTENT_WIDTH * 0.38,
        y: firstRowY,
        size: 9.5,
        font: this.boldFont,
        color: TEXT,
      });
    }

    if (loading) {
      this.page.drawText(loading, {
        x: PAGE_MARGIN + 12,
        y: firstRowY - 18,
        size: 9,
        font: this.regularFont,
        color: TEXT,
      });
    }

    if (eta) {
      this.page.drawText(eta, {
        x: PAGE_MARGIN + CONTENT_WIDTH * 0.38,
        y: firstRowY - 18,
        size: 9,
        font: this.regularFont,
        color: TEXT,
      });
    }

    if (collection) {
      this.page.drawText(collection, {
        x: PAGE_MARGIN + CONTENT_WIDTH * 0.69,
        y: firstRowY - 18,
        size: 9,
        font: this.regularFont,
        color: TEXT,
      });
    }

    this.y = boxY - 20;
  }

  drawShipmentSections(shipments: PreparedShipmentSection[]) {
    for (const [index, shipment] of shipments.entries()) {
      const required = Math.max(
        measureLines(shipments[index].leftLines, this.regularFont, 8.1, CONTENT_WIDTH * 0.44),
        measureLines(
          shipments[index].rightLines,
          this.regularFont,
          9.0,
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

    this.ensureSpace(90);

    this.page.drawText("Item / Charge Details", {
      x: PAGE_MARGIN,
      y: this.y,
      size: 11,
      font: this.boldFont,
      color: TEXT,
    });

    this.y -= 16;

    const columns = {
      tracking: 105,
      description: 180,
      basisQty: 80,
      unitPrice: 70,
      amount: 76,
    };

    const headerHeight = 26;

    this.page.drawRectangle({
      x: PAGE_MARGIN,
      y: this.y - headerHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: rgb(0.16, 0.23, 0.30),
    });

    let x = PAGE_MARGIN;

    const headers = [
      ["Tracking", columns.tracking],
      ["Description", columns.description],
      ["Basis / Qty", columns.basisQty],
      ["Unit Price", columns.unitPrice],
      ["Amount", columns.amount],
    ] as const;

    for (const [label, width] of headers) {
      this.page.drawText(label, {
        x: x + 6,
        y: this.y - 17,
        size: 8.5,
        font: this.boldFont,
        color: rgb(1, 1, 1),
      });

      x += width;
    }

    this.y -= headerHeight;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];

      this.ensureSpace(30);

      const rowHeight = 28;

      if (index % 2 === 0) {
        this.page.drawRectangle({
          x: PAGE_MARGIN,
          y: this.y - rowHeight,
          width: CONTENT_WIDTH,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.98),
        });
      }

      let columnX = PAGE_MARGIN;

      this.page.drawText(
        row.tracking ?? "",
        {
          x: columnX + 6,
          y: this.y - 18,
          size: 8.4,
          font: this.regularFont,
          color: TEXT,
        }
      );

      columnX += columns.tracking;

      this.page.drawText(
        row.description,
        {
          x: columnX + 6,
          y: this.y - 18,
          size: 8.4,
          font: this.regularFont,
          color: TEXT,
        }
      );

      columnX += columns.description;

      const basisQty =
        row.quantity
          ? `${row.basis} ${row.quantity}`
          : row.basis;

      this.page.drawText(
        basisQty,
        {
          x: columnX + 6,
          y: this.y - 18,
          size: 8.4,
          font: this.regularFont,
          color: TEXT,
        }
      );

      columnX += columns.basisQty;

      this.page.drawText(
        row.unitPriceUsd
          ? `$${row.unitPriceUsd}`
          : "",
        {
          x: columnX + 6,
          y: this.y - 18,
          size: 8.4,
          font: this.regularFont,
          color: TEXT,
        }
      );

      columnX += columns.unitPrice;

      this.page.drawText(
        `$${row.amountUsd}`,
        {
          x: columnX + 6,
          y: this.y - 18,
          size: 8.5,
          font: this.boldFont,
          color: TEXT,
        }
      );

      this.page.drawLine({
        start: {
          x: PAGE_MARGIN,
          y: this.y - rowHeight,
        },
        end: {
          x: PAGE_WIDTH - PAGE_MARGIN,
          y: this.y - rowHeight,
        },
        thickness: 0.5,
        color: LINE,
      });

      this.y -= rowHeight;
    }

    this.y -= 18;
  }

  drawTotals(
    subtotalUsd: string,
    totals: PreparedInvoiceTotals,
    exchangeRate: string,
    totalGhs: string
  ) {
    this.ensureSpace(72);

    const labelX = PAGE_MARGIN;
    const valueX = PAGE_WIDTH - PAGE_MARGIN;

    this.page.drawText("Invoice Totals", {
      x: labelX,
      y: this.y,
      size: 9.5,
      font: this.boldFont,
      color: TEXT,
    });
    this.y -= 13;

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

    const detailRows = [
      { label: "Handling", value: totals.handlingUsd },
      { label: "Documentation", value: totals.documentationUsd },
      { label: "Special Handling", value: totals.specialHandlingUsd },
      { label: "Delivery", value: totals.deliveryUsd },
      { label: "Other approved charges", value: totals.otherUsd },
    ].filter((row) => row.value !== "0.00");

    for (const row of detailRows) {
      this.page.drawText(row.label, {
        x: labelX,
        y: this.y,
        size: 8.25,
        font: this.regularFont,
        color: TEXT,
      });
      this.page.drawText(`USD ${row.value}`, {
        x: valueX - 120,
        y: this.y,
        size: 8.25,
        font: this.boldFont,
        color: TEXT,
      });
      this.y -= 12;
    }

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

    this.page.drawText("Total USD", {
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

  drawPaymentSummary(
  subtotalUsd: string,
  exchangeRate: string,
  totalGhs: string
) {
  const paymentBlocks =
    approvedInvoicePaymentInstructions.map(
      (instruction) => [
        instruction.label,
        ...instruction.lines,
      ]
    );

  const leftBlock = paymentBlocks[0] ?? [];
  const middleBlock = paymentBlocks[1] ?? [];

  const boxHeight = 112;

  this.ensureSpace(boxHeight + 20);

  const boxY = this.y - boxHeight;

  this.page.drawRectangle({
    x: PAGE_MARGIN,
    y: boxY,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: rgb(0.16, 0.23, 0.30),
    borderWidth: 1.2,
  });

  this.page.drawText("PAYMENT INFORMATION", {
    x: PAGE_MARGIN + 12,
    y: this.y - 20,
    size: 10.5,
    font: this.boldFont,
    color: TEXT,
  });

  const contentY = this.y - 42;

  this.drawBlock(
    leftBlock,
    PAGE_MARGIN + 12,
    contentY,
    CONTENT_WIDTH * 0.30,
    8.5
  );

  this.drawBlock(
    middleBlock,
    PAGE_MARGIN + CONTENT_WIDTH * 0.36,
    contentY,
    CONTENT_WIDTH * 0.27,
    8.5
  );

  const summaryX =
    PAGE_MARGIN + CONTENT_WIDTH * 0.70;

  this.page.drawText("PAYMENT SUMMARY", {
    x: summaryX,
    y: contentY,
    size: 10,
    font: this.boldFont,
    color: TEXT,
  });

  this.page.drawText(
    `Subtotal: USD ${subtotalUsd}`,
    {
      x: summaryX,
      y: contentY - 22,
      size: 9,
      font: this.regularFont,
      color: TEXT,
    }
  );

  this.page.drawText(
    `Rate: USD 1 = GHS ${exchangeRate}`,
    {
      x: summaryX,
      y: contentY - 38,
      size: 8.5,
      font: this.regularFont,
      color: MUTED,
    }
  );

  this.page.drawText(
    `GHS ${totalGhs}`,
    {
      x: summaryX,
      y: contentY - 62,
      size: 16,
      font: this.boldFont,
      color: ACCENT,
    }
  );

  this.y = boxY - 22;
}

  drawPaymentDetails() {
    const paymentBlocks = approvedInvoicePaymentInstructions.map((instruction) => [
      instruction.label,
      ...instruction.lines,
    ]);

    const leftBlock = paymentBlocks[0] ?? [];
    const rightBlock = paymentBlocks[1] ?? [];
    const maxHeight = Math.max(
      measureLines(leftBlock, this.regularFont, 8.8, CONTENT_WIDTH * 0.44),
      measureLines(rightBlock, this.regularFont, 8.8, CONTENT_WIDTH * 0.44)
    );

    this.ensureSpace(maxHeight + 34);
    this.page.drawText("Payment Details", {
      x: PAGE_MARGIN,
      y: this.y,
      size: 10.5,
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
  const notes =
    buildCompactTerms(
      invoiceModes,
      hasSpecialGoods
    );

  if (notes.length === 0) {
    return;
  }

  const noteFontSize = 9.0;
  const textWidth = CONTENT_WIDTH - 48;

  const textHeight =
    measureLines(
      notes,
      this.regularFont,
      noteFontSize,
      textWidth
    );

  const boxHeight =
    Math.max(100, textHeight + 56);

  this.ensureSpace(boxHeight + 20);

  const boxY = this.y - boxHeight;

  this.page.drawRectangle({
    x: PAGE_MARGIN,
    y: boxY,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: rgb(1.0, 0.96, 0.84),
    borderColor: rgb(0.96, 0.82, 0.45),
    borderWidth: 0.8,
  });

  this.page.drawText(
    "IMPORTANT REMARKS",
    {
      x: PAGE_MARGIN + 18,
      y: this.y - 26,
      size: 12,
      font: this.boldFont,
      color: rgb(0.45, 0.34, 0.08),
    }
  );

  this.drawTextLines(
    notes,
    PAGE_MARGIN + 30,
    this.y - 52,
    textWidth,
    noteFontSize,
    {
      bullet: true,
      muted: false,
    }
  );

  this.y = boxY - 14;
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
      size: 11,
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
        size: 8.7,
        font: this.boldFont,
        color: TEXT,
      });
      this.page.drawText("Description", {
        x: table.x + table.trackingWidth + 3,
        y: bottomY + 3,
        size: 8.7,
        font: this.boldFont,
        color: TEXT,
      });
    } else {
      this.page.drawText("Description", {
        x: table.x + 1,
        y: bottomY + 3,
        size: 8.7,
        font: this.boldFont,
        color: TEXT,
      });
    }

    this.page.drawText("USD", {
      x: table.x + table.width - table.amountWidth + 6,
      y: bottomY + 3,
      size: 8.7,
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
        8.8
      );
    }

    this.drawTextLines(
      [row.description],
      descriptionX,
      topY,
      table.descriptionWidth - 8,
      8.8
    );

    this.page.drawText(row.amountUsd, {
      x: amountX,
      y: topY,
      size: 9.0,
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
      8.8,
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
