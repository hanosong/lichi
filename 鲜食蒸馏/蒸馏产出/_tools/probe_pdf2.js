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
let tjCount = 0, tjSamples = [];
let cmapSamples = [];
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
  if (t.includes("beginbfchar") || t.includes("beginbfrange")) {
    cmapSamples.push(t.slice(0, 500));
  }
  const nTj = (t.match(/\sTj/g) || []).length;
  const nTJ = (t.match(/\sTJ/g) || []).length;
  if (nTj + nTJ > 5) {
    tjCount++;
    if (tjSamples.length < 2) {
      const i = t.search(/\((?:\\.|[^\\)]){2,}\)\s*Tj|<\s*[0-9A-Fa-f]{4,}\s*>\s*Tj|\[\s*\(/);
      tjSamples.push({ nTj, nTJ, len: t.length, snippet: t.slice(Math.max(0, i - 80), i + 200) });
    }
  }
}
console.log("content-like streams", tjCount);
console.log(JSON.stringify(tjSamples, null, 2));
console.log("cmaps", cmapSamples.length);
if (cmapSamples[0]) console.log("CMAP0\n", cmapSamples[0]);
