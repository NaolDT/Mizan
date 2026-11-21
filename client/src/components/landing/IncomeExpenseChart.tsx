import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

/**
 * Illustrative week of figures. They add up to the example totals shown in the
 * previews (12,450 income, 4,280 expenses) and are not real business data.
 */
export const DEMO_INCOME = [1200, 1450, 1100, 1900, 2300, 2800, 1700];
export const DEMO_EXPENSES = [500, 650, 300, 820, 480, 900, 630];

interface IncomeExpenseChartProps {
  days: string[];
  incomeLabel: string;
  expensesLabel: string;
  ariaLabel: string;
  heightClass?: string;
}

export function IncomeExpenseChart({
  days,
  incomeLabel,
  expensesLabel,
  ariaLabel,
  heightClass = "h-56",
}: IncomeExpenseChartProps) {
  const data = days.map((day, index) => ({
    day,
    income: DEMO_INCOME[index],
    expenses: DEMO_EXPENSES[index],
  }));

  return (
    <div role="img" aria-label={ariaLabel} className={`w-full ${heightClass}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barGap={3}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#475569" }}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            formatter={(value, name) => [
              `${Number(value).toLocaleString("en-US")} ETB`,
              name === "income" ? incomeLabel : expensesLabel,
            ]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Bar
            dataKey="income"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          />
          <Bar
            dataKey="expenses"
            fill="#fb7185"
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
