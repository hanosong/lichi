const fs = require("fs");
const zlib = require("zlib");
const buf = fs.readFileSync(process.argv[2]);
function inflate(bytes) {
  try { return zlib.inflateSync(bytes); } catch (e) {
    try { return zlib.inflateRawSync(bytes); } catch (e2) { return null; }
  }
}

// Find a content stream that looks like a table page: many Tm and (numbers)
let idx = 0;
const needle = Buffer.from("stream");
let found = 0;
while (idx < buf.length && found < 5) {
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
  if ((t.match(/\sTm\b/g) || []).length > 80 && t.includes("Tj")) {
    found++;
    const out = t.replace(/\r/g, "");
    // keep operators only sample around numeric-looking hex TJ
    const hex = out.match(/<[^>]{2,20}>\s*Tj|\[[^\]]{0,80}\]\s*TJ/g);
    console.log("\n==== STREAM", found, "len", t.length, "Tm", (t.match(/\sTm\b/g)||[]).length);
    console.log("hex/TJ samples", (hex || []).slice(0, 15).join(" | "));
    const i = out.indexOf("21");
    console.log("around 21:", JSON.stringify(out.slice(Math.max(0, (out.search(/21\.00|18\.00|Calcium|Protein/) || 0) - 40), 200)));
    console.log("head", JSON.stringify(out.slice(0, 400)));
  }
}
