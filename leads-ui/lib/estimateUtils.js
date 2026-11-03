// lib/estimateUtils.js
// Pure helper functions shared by the estimate preview and PDF generation logic.
// Keeping these separate from components means the same math can be reused
// server-side when generating the final PDF snapshot.

export function computeLineTotal(service, lineItem) {
  if (!service) return 0;

  switch (service.pricing_type) {
    case "flat":
      return round2(service.rate * (lineItem.quantity || 1));

    case "per_sqft":
    case "per_sqinch": {
      const area = (lineItem.length || 0) * (lineItem.width || 0);
      return round2(service.rate * area);
    }

    case "per_rft":
      return round2(service.rate * (lineItem.length || 0));

    default:
      return 0;
  }
}

export function computeArea(lineItem) {
  return round2((lineItem.length || 0) * (lineItem.width || 0));
}

export function isAreaPricing(pricingType) {
  return pricingType === "per_sqft" || pricingType === "per_sqinch";
}

export function isRunningFoot(pricingType) {
  return pricingType === "per_rft";
}

export function withLineTotals(items, servicesMaster) {
  return items.map((item) => {
    const service = servicesMaster.find((s) => s.id === item.service_id);
    return {
      ...item,
      pricing_type: service?.pricing_type ?? null,
      rate_at_time: service?.rate ?? 0,
      computed_area: isAreaPricing(service?.pricing_type) ? computeArea(item) : null,
      line_total: computeLineTotal(service, item),
    };
  });
}

export function computeEstimateTotals(lineItems, taxRate = 0) {
  const subtotal = round2(
    lineItems.reduce((sum, item) => sum + (item.line_total || 0), 0)
  );
  const tax = round2(subtotal * taxRate);
  const total = round2(subtotal + tax);
  return { subtotal, tax, total };
}

export function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export const STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  estimate_previewed: "Estimate Previewed",
  estimate_sent: "Estimate Sent",
  follow_up: "Follow-up",
  won: "Won",
  lost: "Lost",
};

export const STATUS_COLORS = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  estimate_previewed: "bg-amber-100 text-amber-700",
  estimate_sent: "bg-purple-100 text-purple-700",
  follow_up: "bg-orange-100 text-orange-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};
