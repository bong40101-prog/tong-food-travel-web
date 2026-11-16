export function compareRatings(a, b) {
  const rated = r => Number.isFinite(r?.average) && r.average >= 1 && r.average <= 5 && Number.isInteger(r?.count) && r.count > 0;
  const ar = rated(a), br = rated(b);
  return Number(br) - Number(ar) || (ar && br ? b.average - a.average || b.count - a.count : 0);
}
