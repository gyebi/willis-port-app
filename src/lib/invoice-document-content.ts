export type InvoicePaymentInstruction = {
  label: string;
  lines: string[];
};

export type InvoiceTerm = {
  title: string;
  text: string;
};

export const approvedInvoicePaymentInstructions: InvoicePaymentInstruction[] = [
  {
    label: "Bank",
    lines: [
      "Fidelity Bank",
      "Haatso Branch",
      "Account Name: WillisPort Logistics - Francisca Lynn Willis",
      "Account No.: 2400192871318",
    ],
  },
  {
    label: "Mobile Money",
    lines: [
      "Name: WillisPort Logistics - Francisca Lynn Willis",
      "Number: 0596482800",
    ],
  },
];

export const approvedInvoiceTerms: InvoiceTerm[] = [
  {
    title: "Payment Due",
    text: "All invoices are due upon receipt. The applicable payment period begins from the date the invoice is sent to the client's WhatsApp or official communication channel.",
  },
  {
    title: "Air Shipping",
    text: "Air invoices must be settled within 3 days of the invoice date. Unpaid invoices after the due date may attract an administrative processing charge and applicable storage charges.",
  },
  {
    title: "Sea Shipping",
    text: "Sea invoices must be settled within 10 days of the invoice date. After the 10-day payment period, GH¢20 per day will apply as a storage charge.",
  },
  {
    title: "Minimum Weight",
    text: "Goods weighing below 1 kg are charged as 1 kg. Air freight is calculated using the applicable billable weight, rounded upward to the nearest 0.5 kg where applicable.",
  },
  {
    title: "Minimum Sea Volume",
    text: "Sea freight has a minimum chargeable volume of 0.10 CBM per container. If the total goods in a container are below 0.10 CBM, the minimum charge of 0.10 CBM will apply. Individual tracking numbers are not separately rounded to 0.10 CBM; the applicable CBM is calculated from the total volume.",
  },
  {
    title: "Customs & Clearance",
    text: "Goods may be opened, inspected, examined or detained by Customs or other competent authorities where required. Customs duties, taxes, inspection, clearance, port, storage and other applicable charges are not included unless expressly stated on the invoice.",
  },
  {
    title: "Special Goods",
    text: "Goods requiring special handling, licensing, regulatory approval or additional clearance requirements may attract special rates and/or additional charges. Clients are responsible for accurately declaring their goods.",
  },
  {
    title: "Exchange Rate",
    text: "Please confirm the applicable WillisPort Logistics exchange rate before payment, as rates may change.",
  },
  {
    title: "Payment Confirmation",
    text: "Clients are required to send proof of payment after making payment so the transaction can be properly identified and processed.",
  },
  {
    title: "Acceptance of Terms",
    text: "By instructing a supplier to send goods to WillisPort Logistics warehouse, the client confirms their acceptance of all applicable WillisPort Logistics terms, conditions, rates, policies and charges communicated through our official sales channels.",
  },
];
