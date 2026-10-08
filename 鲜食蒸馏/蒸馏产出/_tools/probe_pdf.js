const fs = require("fs");
const zlib = require("zlib");

const pdfPath = process.argv[2];
const buf = fs.readFileSync(pdfPath);

function inflate(bytes) {
  try { return zlib.inflateSync(bytes); } catch (e) {
    try { return zlib.inflateRawSync(bytes); } catch (e2) { return null; }
  }
}

const streams = [];
const needle = Buffer.from("stream");
let idx = 0;
while (idx < buf.length) {
  const s = buf.indexOf(needle, idx);
  if (s < 0) break;
  let start = s + 6;
  if (buf[start] === 0x0d) start++;
  if (buf[start] === 0x0a) start++;
  const e = buf.indexOf(Buffer.from("endstream"), start);
  if (e < 0) break;
  const raw = buf.slice(start, e);
  const inflated = inflate(raw);
  const headerStart = Math.max(0, s - 400);
  const header = buf.slice(headerStart, s).toString("latin1");
  streams.push({
    header: header.slice(-350),
    len: inflated ? inflated.length : 0,
    preview: inflated ? inflated.toString("latin1").slice(0, 250) : "",
    hasToUnicode: inflated && inflated.toString("latin1").includes("beginbfchar"),
    hasBT: inflated && /BT/.test(inflated.toString("latin1")),
  });
  idx = e + 9;
}

const tu = streams.filter(x => x.hasToUnicode);
const bt = streams.filter(x => x.hasBT);
console.log("total streams", streams.length, "ToUnicode", tu.length, "BT", bt.length);
console.log("--- ToUnicode preview ---");
tu.slice(0, 3).forEach((s, i) => console.log(i, s.len, s.preview.replace(/\r/g,"\\n").slice(0,200)));
console.log("--- BT preview ---");
bt.slice(0, 2).forEach((s, i) => console.log(i, s.len, JSON.stringify(s.preview.slice(0,180)), "\nHEADER:", s.header.replace(/\s+/g," ").slice(-200)));
