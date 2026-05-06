"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

import { EmotionItem } from "@/lib/emotions";

interface Props {
  data: EmotionItem[];
}

const COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
];

export default function EmotionChart({ data }: Props) {
  return (
    <div className="w-full h-80 bg-white rounded-2xl shadow-md p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />

          <XAxis
            dataKey="emotion"
            tick={{ fill: "#374151", fontSize: 13 }}
            axisLine={{ stroke: "#D1D5DB" }}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: "#374151", fontSize: 13 }}
            axisLine={{ stroke: "#D1D5DB" }}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #E5E7EB",
              borderRadius: "12px",
            }}
          />

          <Bar dataKey="avg_score" radius={[8, 8, 0, 0]}>
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}