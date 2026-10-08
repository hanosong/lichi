const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const want = /calcium|phosphorus|taurine|ca\s*\/\s*p|ratio/i;
for (const [k, t] of Object.entries(data)) {
  console.log("\n#####", k, t.headers.join(" "));
  t.lines.forEach(l => {
    const names = l.cells.map(c => c.t).join(" ");
    if (want.test(names)) {
      console.log(l.y, l.cells.map(c => c.t).join(" | "));
    }
  });
}
