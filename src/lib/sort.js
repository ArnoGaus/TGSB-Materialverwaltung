export function extractLastNumber(name) {
  const m = String(name || "").match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

export function extractPairNumber(name) {
  const m = String(name || "").match(/(\d+)\s*-\s*(Backbord|Steuerbord)\s*$/i);
  return m ? Number(m[1]) : null;
}

export function sideOrder(side) {
  const s = String(side || "").toLowerCase();
  if (s === "backbord") return 0;
  if (s === "steuerbord") return 1;
  return 2;
}