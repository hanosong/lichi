/**
 * Minimal PDF text extractor using only Node stdlib.
 * Inflates FlateDecode streams and recovers BT/ET text with Tm/Td coordinates.
 */
const fs = require("fs");
const zlib = require("zlib");

const pdfPath = process.argv[2];
const outPath = process.argv[3];
if (!pdfPath || !outPath) {
  console.error("usage: node extract_pdf_coords.js <pdf> <out.jsonl>");
  process.exit(1);
}

const buf = fs.readFileSync(pdfPath);

function inflateStream(bytes) {
  try {
    return zlib.inflateSync(bytes);
  } catch (e) {
    try {
      return zlib.inflateRawSync(bytes);
    } catch (e2) {
      return null;
    }
  }
}

function extractLiteral(s) {
  // PDF literal string ( ... ) with escapes
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") {
      const n = s[i + 1];
      const map = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
      if (map[n] !== undefined) {
        out += map[n];
        i++;
      } else if (/[0-7]/.test(n)) {
        let oct = n;
        let j = 1;
        while (j < 3 && /[0-7]/.test(s[i + 1 + j])) {
          oct += s[i + 1 + j];
          j++;
        }
        out += String.fromCharCode(parseInt(oct, 8));
        i += j;
      } else {
        i++;
      }
    } else {
      out += c;
    }
  }
  return out;
}

function hexToText(hex) {
  const h = hex.replace(/\s+/g, "");
  let out = "";
  if (h.length % 4 === 0 && h.length > 4) {
    // likely UTF-16BE
    for (let i = 0; i < h.length; i += 4) {
      const cp = parseInt(h.slice(i, i + 4), 16);
      if (cp) out += String.fromCharCode(cp);
    }
    return out;
  }
  for (let i = 0; i < h.length; i += 2) {
    const cp = parseInt(h.slice(i, i + 2), 16);
    if (cp) out += String.fromCharCode(cp);
  }
  return out;
}

function parseContent(text, pageIndex) {
  const items = [];
  let x = 0, y = 0, fontSize = 10;
  const ops = text.match(/BT[\s\S]*?ET/g) || [];
  for (const block of ops) {
    const re = /(?:([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+Tm)|(?:([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s+Td)|(?:\/[A-Za-z0-9]+\s+([-+]?\d*\.?\d+)\s+Tf)|(?:\((?:\\.|[^\\)])*\)\s*Tj)|(?:\[(?:[^\]]*)\]\s*TJ)|(?:<([0-9A-Fa-f\s]+)>\s*Tj)/g;
    let m;
    while ((m = re.exec(block))) {
      if (m[1] !== undefined) {
        x = parseFloat(m[5]);
        y = parseFloat(m[6]);
        continue;
      }
      if (m[7] !== undefined) {
        x += parseFloat(m[7]);
        y += parseFloat(m[8]);
        continue;
      }
      if (m[9] !== undefined) {
        fontSize = parseFloat(m[9]);
        continue;
      }
      let str = "";
      const full = m[0];
      if (full.includes(" TJ")) {
        const inner = full.slice(full.indexOf("[") + 1, full.lastIndexOf("]"));
        const parts = inner.match(/\((?:\\.|[^\\)])*\)|<[^>]+>|[-+]?\d*\.?\d+/g) || [];
        for (const p of parts) {
          if (p.startsWith("(")) str += extractLiteral(p.slice(1, -1));
          else if (p.startsWith("<")) str += hexToText(p.slice(1, -1));
        }
      } else if (full.includes(" Tj") && full.startsWith("(")) {
        str = extractLiteral(full.replace(/\s*Tj$/, "").slice(1, -1));
      } else if (m[10]) {
        str = hexToText(m[10]);
      }
      str = str.replace(/\s+/g, " ").trim();
      if (str) items.push({ page: pageIndex, x: +x.toFixed(1), y: +y.toFixed(1), fontSize, str });
    }
  }
  return items;
}

// Split on "stream\n" ... "endstream"
const streams = [];
const needle = Buffer.from("stream");
let idx = 0;
while (idx < buf.length) {
  const s = buf.indexOf(needle, idx);
  if (s < 0) break;
  // skip optional \r
  let start = s + 6;
  if (buf[start] === 0x0d) start++;
  if (buf[start] === 0x0a) start++;
  const e = buf.indexOf(Buffer.from("endstream"), start);
  if (e < 0) break;
  const raw = buf.slice(start, e);
  const inflated = inflateStream(raw);
  if (inflated && inflated.length > 50) {
    const t = inflated.toString("latin1");
    if (t.includes(" BT") || t.includes("\nBT") || t.startsWith("BT") || t.includes("Tj") || t.includes("TJ")) {
      streams.push(t);
    }
  }
  idx = e + 9;
}

const all = [];
streams.forEach((t, i) => {
  const items = parseContent(t, i);
  if (items.length) all.push(...items);
});

fs.writeFileSync(outPath, all.map((x) => JSON.stringify(x)).join("\n"), "utf8");
console.log(JSON.stringify({ streams: streams.length, items: all.length, sample: all.slice(0, 8) }, null, 2));
