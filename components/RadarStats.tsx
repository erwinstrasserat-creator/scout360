"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

interface Props {
  stats: {
    technik: number;
    tempo: number;
    physis: number;
    intelligenz: number;
    defensiv: number;
    offensiv: number;
  };
}

export default function RadarStats({ stats }: Props) {
  const data = [
    { subject: "Technik", value: stats.technik },
    { subject: "Tempo", value: stats.tempo },
    { subject: "Physis", value: stats.physis },
    { subject: "Intelligenz", value: stats.intelligenz },
    { subject: "Defensiv", value: stats.defensiv },
    { subject: "Offensiv", value: stats.offensiv },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" stroke="#94a3b8" />
          <Radar
            name="Profil"
            dataKey="value"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}