const PRICING_TYPES = ["flat", "per_sqft", "per_sqinch", "per_rft"];

export function validateService(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rate = Number(body.rate);
  if (!name) return { error: "Service name is required" };
  if (!PRICING_TYPES.includes(body.pricing_type)) return { error: "Choose a valid pricing type" };
  if (!Number.isFinite(rate) || rate < 0) return { error: "Rate must be a number of 0 or more" };
  return {
    value: {
      name,
      category: typeof body.category === "string" ? body.category.trim() || null : null,
      pricing_type: body.pricing_type,
      rate,
      unit_label: typeof body.unit_label === "string" ? body.unit_label.trim() || null : null,
    },
  };
}
