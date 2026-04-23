"use client";

import { PieChart, Pie, Tooltip } from "recharts";

export default function EmotionChart({ data }: { data: any[] }) {
  return (
    <PieChart width={400} height={400}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="emotion"
        outerRadius={150}
        label
      />
      <Tooltip />
    </PieChart>
  );
}