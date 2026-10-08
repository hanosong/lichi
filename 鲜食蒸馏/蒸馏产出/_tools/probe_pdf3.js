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
const stats = { Tj:0, TJ:0, Td:0, Tm:0, quote:0, BT:0, Tf:0, hexTj:0 };
const snips = [];
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
  const add = (k, re) => { const n = (t.match(re) || []).length; stats[k]+=n; return n; };
  const nTj = add("Tj", /Tj/g);
  add("TJ", /TJ/g);
  add("Td", /\sTd\b/g);
  add("Tm", /\sTm\b/g);
  add("quote", /'/g);
  add("BT", /\bBT\b/g);
  add("Tf", /\sTf\b/g);
  if (nTj > 20 && snips.length < 3) {
    const i = t.indexOf("Tj");
    snips.push(t.slice(Math.max(0, i-60), i+80));
  }
}
console.log(stats);
console.log(snips.map(s => JSON.stringify(s)));
