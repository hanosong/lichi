import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H2,
  Stack,
  Stat,
  Table,
  Text,
  TextInput,
  useCanvasState,
} from "cursor/canvas";

const HOURS = 40;
const BASE = 600;
const START = 3000;
const RATE = 0.2;
const MARGIN = 0.4;

function pay(revenue: number) {
  const wage = revenue >= START ? revenue * RATE : BASE;
  const commission = wage - BASE;
  const hourly = wage / HOURS;
  const grossProfit = revenue * MARGIN;
  const laborShare = grossProfit > 0 ? (wage / grossProfit) * 100 : 0;
  return { wage, commission, hourly, grossProfit, laborShare };
}

function yuan(n: number, digits = 2) {
  return `${n.toFixed(digits)}元`;
}

const scenarios = [2664, 3000, 3552, 3600, 4000, 4440].map((revenue) => ({
  revenue,
  ...pay(revenue),
}));

const tierRows = [
  ["0～888元", "第1档", "0", "0元", "0元", "600元"],
  ["888～1776元", "第2档", "0", "0元", "0元", "600元"],
  ["1776～2664元", "第3档", "0", "0元", "0元", "600元"],
  ["2664～3000元", "第4档前半", "0", "0元", "0元", "600元"],
  ["3000～3552元", "第4档后半", "20%", "110.40元", "110.40元", "710.40元"],
  ["3552～3600元", "预期线", "20%", "9.60元", "120.00元", "720.00元"],
  ["3600～4440元", "冲向第5档", "20%", "168.00元", "288.00元", "888.00元"],
  ["超过4440元", "第5档以后", "20%", "继续", "工资＝营业额×20%", "不封顶"],
];

const exampleRows = [
  ["未满一档", "2500元", "0元", "600元", "15.00元"],
  ["刚好满第4档", "3552元", "110.40元", "710.40元", "17.76元"],
  ["达到预期线", "3600元", "120.00元", "720.00元", "18.00元"],
  ["超过3600元", "4000元", "200.00元", "800.00元", "20.00元"],
];

const dailyRows = [
  ["9月24日", "10小时", "750元", "888元", "1000元"],
  ["9月25日", "10小时", "750元", "888元", "1000元"],
  ["9月26日", "10小时", "750元", "888元", "1000元"],
  ["9月27日", "10小时", "750元", "888元", "1000元"],
  ["四天合计", "40小时", "3000元", "3552元", "4000元"],
];

export default function ShenzhenPotatoFestPay() {
  const [input, setInput] = useCanvasState("revenue", "3600");
  const parsed = Number(input);
  const revenue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  const preview = pay(revenue);

  return (
    <Stack gap={20} style={{ padding: 24, maxWidth: 1120, margin: "0 auto" }}>
      <Stack gap={6}>
        <H1>深圳翻滚土豆节：4天兼职薪酬方案</H1>
        <Text tone="secondary">
          深圳大悦城 · 2026年9月24日至27日 · 每天11:00–21:00 · 40小时 · 毛利率40%
        </Text>
      </Stack>

      <Callout tone="success" title="推荐结论">
        底薪600元（含全勤）。4天营业额不到3000元拿600元；达到或超过3000元，总工资＝营业额×20%。
        3600元时为720元、折合18元/小时，这是预期线不是封顶。超过后继续按同一规则发放。
      </Callout>

      <Grid columns="1.35fr 1fr" gap={16}>
        <Card size="lg">
          <CardHeader trailing="推荐">工资结构</CardHeader>
          <CardBody>
            <Stack gap={14}>
              <Grid columns={2} gap={16}>
                <Stat value="600元" label="底薪：15元 × 40小时，含全勤" />
                <Stat value="15元" label="未到3000元时的时薪" />
                <Stat value="720元" label="3600元营业额时的预期工资" tone="info" />
                <Stat value="18元" label="3600元时的综合时薪" tone="success" />
              </Grid>
              <Text tone="secondary" size="small">
                未全勤按15元×实际工时支付底薪；已产生的销售提成仍正常结算。结算四舍五入到元。
              </Text>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>试算4天总营业额</CardHeader>
          <CardBody>
            <Stack gap={12}>
              <TextInput
                type="number"
                value={input}
                onChange={setInput}
                placeholder="例如 3600"
              />
              <Grid columns={2} gap={12}>
                <Stat value={yuan(preview.wage)} label="总工资" tone="info" />
                <Stat value={`${preview.hourly.toFixed(2)}元`} label="综合时薪" />
                <Stat value={yuan(preview.commission)} label="销售提成" />
                <Stat
                  value={`${preview.laborShare.toFixed(2)}%`}
                  label="人工占毛利"
                  tone={preview.laborShare > 50.05 ? "warning" : "success"}
                />
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Stack gap={8}>
        <H2>888档位怎么发钱</H2>
        <Text>
          对外用888元看进度，对内从3000元起按20%连续计提。前三档没有提成，是因为3600元时要发到720元，同时3000元时不能超过600元——这两个条件把3000元以前的提成率锁死为0，把之后的提成率锁死为20%。
        </Text>
        <Table
          headers={["四天营业额区间", "档位", "提成率", "跑完整段", "累计提成", "累计总工资"]}
          columnAlign={["left", "left", "right", "right", "right", "right"]}
          rows={tierRows}
          rowTone={[
            "neutral",
            "neutral",
            "neutral",
            "neutral",
            "info",
            "success",
            "success",
            "neutral",
          ]}
        />
        <Text tone="secondary" size="small">
          每一档内部按已完成营业额连续计算，不用凑满整档888元。超过4440元后规则不变，总工资始终等于营业额的20%。
        </Text>
      </Stack>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>计算示例</CardHeader>
          <CardBody>
            <Table
              headers={["情形", "营业额", "提成", "总工资", "时薪"]}
              columnAlign={["left", "right", "right", "right", "right"]}
              rows={exampleRows}
              rowTone={["neutral", "info", "success", "success"]}
            />
          </CardBody>
        </Card>
        <Stack gap={10}>
          <H2>超过3600元以后</H2>
          <Text>
            18元/小时不是天花板。超过3600元后每多卖5元营业额，工资多1元，因此不存在「已经拿到18元就不用再卖」的停点。
          </Text>
          <Text>
            若四天低于3000元，600元底薪会超过毛利的50%。这是营业额过低的经营风险，不能事后克扣应付工资。
          </Text>
        </Stack>
      </Grid>

      <Stack gap={8}>
        <H2>不同营业额下的经营测算</H2>
        <Text tone="secondary" size="small">
          毛利＝营业额×40%；综合时薪＝总工资÷40小时。达到或超过3000元后，人工占毛利始终为50%。
        </Text>
        <Table
          headers={["四天营业额", "销售提成", "总工资", "综合时薪", "商品毛利", "人工占毛利"]}
          columnAlign={["right", "right", "right", "right", "right", "right"]}
          rows={scenarios.map((row) => [
            `${row.revenue}元`,
            yuan(row.commission),
            yuan(row.wage),
            `${row.hourly.toFixed(2)}元`,
            yuan(row.grossProfit),
            `${row.laborShare.toFixed(2)}%`,
          ])}
          rowTone={scenarios.map((row) =>
            row.revenue === 3600
              ? "success"
              : row.revenue >= START
                ? "info"
                : "warning",
          )}
        />
      </Stack>

      <H2>不同营业额下的兼职工资与商品毛利</H2>
      <BarChart
        categories={scenarios.map((row) => `${row.revenue}元`)}
        series={[
          { name: "兼职工资", data: scenarios.map((row) => Number(row.wage.toFixed(2))), tone: "info" },
          { name: "商品毛利", data: scenarios.map((row) => Number(row.grossProfit.toFixed(2))), tone: "neutral" },
        ]}
        valueSuffix="元"
        height={260}
      />
      <Text tone="tertiary" size="small">
        横轴：四天总营业额（元）；纵轴：金额（元）。来源：本方案测算 · 4天全勤、40小时、毛利率40%。达到3000元后，工资按营业额的20%上升。
      </Text>

      <Stack gap={8}>
        <H2>每日参考目标</H2>
        <Text>
          最终按4天总额结算。每天888元是标准目标，对应四天满第4档；保底750元对应开始有提成；冲刺1000元对应时薪20元。
        </Text>
        <Table
          headers={["日期", "工时", "保底进度", "标准目标", "冲刺目标"]}
          columnAlign={["left", "right", "right", "right", "right"]}
          rows={dailyRows}
        />
      </Stack>

      <Card>
        <CardHeader>招聘时可直接说</CardHeader>
        <CardBody>
          <Stack gap={8}>
            <Text>
              底薪600元（含全勤）。4天总营业额达到3000元后，工资按营业额的20%计算。卖到3600元约720元（约18元/小时），卖到4000元约800元（20元/小时），销售越高收入越高。
            </Text>
            <Text tone="secondary" size="small">
              完整招聘文案见「兼职方案」文件夹中的《深圳翻滚土豆节兼职薪酬方案.md》。
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
