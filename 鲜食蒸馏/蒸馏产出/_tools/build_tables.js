const fs = require("fs");
const items = fs.readFileSync(process.argv[2], "utf8").trim().split("\n").map(JSON.parse);

function tableFor(streamId) {
  const rows = items.filter(i => i.stream === streamId && i.scale <= 10);
  const headers = items.filter(i => i.stream === streamId && i.scale > 10);
  const byY = new Map();
  for (const it of rows) {
    const y = Math.round(it.y * 2) / 2; // 0.5 pt bin
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y).push(it);
  }
  const ys = [...byY.keys()].sort((a, b) => b - a);
  const lines = ys.map(y => {
    const cells = byY.get(y).sort((a, b) => a.x - b.x);
    return {
      y,
      cells: cells.map(c => ({ x: c.x, t: c.str }))
    };
  });
  return { headers: headers.map(h => h.str), lines };
}

const out = {};
for (const id of [14, 15, 16, 17, 18, 19]) {
  out["stream_" + id] = tableFor(id);
}
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2));
console.log("wrote", process.argv[3]);
for (const id of [14, 15, 16, 17, 18, 19]) {
  const t = out["stream_" + id];
  console.log("\n==== stream", id, "headers", t.headers.join(" | "), "rows", t.lines.length);
  t.lines.slice(0, 25).forEach(l => {
    console.log(String(l.y).padStart(6), l.cells.map(c => `${c.x}:${c.t}`).join(" || "));
  });
}
