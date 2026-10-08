const fs = require("fs");
const data = JSON.parse(fs.readFileSync("C:\\Users\\ha\\Desktop\\梨奇店铺标签\\鲜食蒸馏\\蒸馏产出\\_tools\\fediaf_tables.json","utf8"));
function dump(id, y0, y1) {
  console.log("\n==", id);
  data[id].lines.filter(l => l.y <= y0 && l.y >= y1).forEach(l => {
    console.log(l.y, l.cells.map(c => `${c.x}:${c.t}`).join(" | "));
  });
}
dump("stream_14", 470, 390);
dump("stream_15", 450, 360);
dump("stream_17", 430, 360);
dump("stream_18", 445, 370);
