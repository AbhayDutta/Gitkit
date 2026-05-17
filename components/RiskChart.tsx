'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface FileScore {
  path: string;
  riskScore: number;
}

interface HistoryPoint {
  analyzedAt: string;
  avgRiskScore: number;
  criticalCount: number;
}

interface RiskChartProps {
  files: FileScore[];
  history?: HistoryPoint[];
}

const PIE_COLORS = ['#ef4444', '#eab308', '#22c55e'];
const BAR_COLORS = ['#a855f7', '#ec4899', '#f43f5e'];

function truncatePath(path: string, max = 28): string {
  if (path.length <= max) return path;
  return `...${path.slice(-(max - 3))}`;
}

export default function RiskChart({ files, history = [] }: RiskChartProps) {
  const top10 = [...files]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)
    .map((f) => ({
      name: truncatePath(f.path),
      score: f.riskScore,
      fullPath: f.path,
    }));

  const pieData = [
    {
      name: 'Critical (70-100)',
      value: files.filter((f) => f.riskScore >= 70).length,
    },
    {
      name: 'Warning (40-69)',
      value: files.filter((f) => f.riskScore >= 40 && f.riskScore < 70).length,
    },
    {
      name: 'Safe (0-39)',
      value: files.filter((f) => f.riskScore < 40).length,
    },
  ].filter((d) => d.value > 0);

  const trendData =
    history.length > 1
      ? history.map((h) => ({
          date: new Date(h.analyzedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          avgRisk: h.avgRiskScore,
          critical: h.criticalCount,
        }))
      : [];

  return (
    <div className="space-y-8 mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Top 10 Riskiest Files
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top10} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" fontSize={11} />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                stroke="#9ca3af"
                fontSize={10}
              />
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #6b21a8',
                  borderRadius: '8px',
                }}
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload as { fullPath?: string })?.fullPath || ''
                }
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {top10.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-xl p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Risk Distribution
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) =>
                  `${(name ?? '').split(' ')[0]} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #6b21a8',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {trendData.length > 1 && (
        <div className="glass rounded-xl p-6 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Risk Trend Over Time
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #6b21a8',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgRisk"
                name="Avg Risk Score"
                stroke="#a855f7"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="critical"
                name="Critical Files"
                stroke="#ef4444"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
