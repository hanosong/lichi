const fs = require("fs");
const zlib = require("zlib");
const buf = fs.readFileSync(process.argv[2]);
function inflate(bytes) {
  try { return zlib.inflateSync(bytes); } catch (e) {
    try { return zlib.inflateRawSync(bytes); } catch (e2) { return null; }
  }
}
let idx = 0;
const needle = Buffer.from("stream");
const keys = ["Calcium", "Taurine", "Phosphorus", "21.00", "Protein*"];
const hits = [];
while (idx < buf.length) {
  const s = buf.indexOf(needle, idx);
  if (s < 0) break;
  let start = s + 6;
  if (buf[start] === 0x0d) start++;
  if (buf[start] === 0x0a) start++;
  const e = buf.indexOf(Buffer.from("endstream"), start);
  if (e < 0) break;
  const inflated = inflate(buf.slice(start, e));
  idx = e + 9;
  if (!inflated) continue;
  const t = inflated.toString("latin1");
  for (const k of keys) {
    if (t.includes(k)) {
      const i = t.indexOf(k);
      hits.push({ k, len: t.length, Tm: (t.match(/\sTm\b/g)||[]).length, snippet: t.slice(Math.max(0,i-70), i+80).replace(/\s+/g," ") });
    }
  }
}
console.log("hits", hits.length);
hits.slice(0, 20).forEach(h => console.log(h.k, "Tm", h.Tm, "len", h.len, JSON.stringify(h.snippet)));
