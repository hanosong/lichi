const fs = require("fs");
const zlib = require("zlib");

const pdfPath = process.argv[2];
const outPath = process.argv[3];
const buf = fs.readFileSync(pdfPath);

function inflate(bytes) {
  try { return zlib.inflateSync(bytes); } catch (e) {
    try { return zlib.inflateRawSync(bytes); } catch (e2) { return null; }
  }
}

function extractLiteral(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== "\\") { out += s[i]; continue; }
    const n = s[i + 1];
    const map = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
    if (map[n] !== undefined) { out += map[n]; i++; }
    else if (/[0-7]/.test(n)) {
      let oct = n, j = 1;
      while (j < 3 && /[0-7]/.test(s[i + 1 + j])) { oct += s[i + 1 + j]; j++; }
      out += String.fromCharCode(parseInt(oct, 8));
      i += j;
    } else i++;
  }
  return out;
}

function parseTJ(inner) {
  let str = "";
  const parts = inner.match(/\((?:\\.|[^\\)])*\)|<[^>]+>|[-+]?\d*\.?\d+/g) || [];
  for (const p of parts) {
    if (p.startsWith("(")) str += extractLiteral(p.slice(1, -1));
    else if (p.startsWith("<")) {
      const h = p.slice(1, -1).replace(/\s+/g, "");
      for (let i = 0; i < h.length; i += 2) {
        const cp = parseInt(h.slice(i, i + 2), 16);
        if (cp >= 32 && cp < 127) str += String.fromCharCode(cp);
      }
    }
  }
  return str;
}

function parseContent(text, streamId) {
  const items = [];
  let x = 0, y = 0, scale = 10;
  // Walk operators sequentially
  const re = /(?:([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+Tm)|(?:([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+Td)|(?:\/[A-Za-z0-9._]+\s+([-+]?\d*\.?\d+)\s+Tf)|(?:\((?:\\.|[^\\)])*\)\s*Tj)|(?:\[(?:[^\]]*)\]\s*TJ)/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1] !== undefined) {
      scale = Math.abs(parseFloat(m[1])) || scale;
      x = parseFloat(m[5]);
      y = parseFloat(m[6]);
      continue;
    }
    if (m[7] !== undefined) {
      x += parseFloat(m[7]);
      y += parseFloat(m[8]);
      continue;
    }
    if (m[9] !== undefined) continue;
    let str = "";
    const full = m[0];
    if (/\sTJ$/.test(full) || full.endsWith("TJ")) {
      str = parseTJ(full.slice(full.indexOf("[") + 1, full.lastIndexOf("]")));
    } else {
      str = extractLiteral(full.replace(/\s*Tj$/, "").slice(1, -1));
    }
    str = str.replace(/\s+/g, " ").trim();
    if (str) items.push({ stream: streamId, x: +x.toFixed(1), y: +y.toFixed(1), scale: +scale.toFixed(1), str });
  }
  return items;
}

let idx = 0;
const needle = Buffer.from("stream");
const all = [];
let streamId = 0;
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
  if (!/(?:Tj|TJ)/.test(t) || !/\sTm\b/.test(t)) continue;
  const items = parseContent(t, streamId++);
  all.push(...items);
}

fs.writeFileSync(outPath, all.map(x => JSON.stringify(x)).join("\n"));
const labels = all.filter(i => /Calcium|Taurine|Phosphorus|Protein\*?$|TABLE III/.test(i.str));
console.log(JSON.stringify({ items: all.length, streams: streamId, labels: labels.slice(0, 40) }, null, 2));
