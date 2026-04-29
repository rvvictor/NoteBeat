import { getEmotionDashboard } from "@/lib/api";
import EmotionChart from "@/components/EmotionChart";

export default async function EmotionPage() {
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyM0BleGFtcGxlLmNvbSIsImV4cCI6MTc3NzQ3ODUxMH0.V2JbnF5LINjewyCV5ctPwSgZXtiNcuyvBPq6f88y5bM";

  const data = await getEmotionDashboard(token);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">
          Emotional Dashboard
        </h1>

        {/* Cards resumen */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-gray-500">Total Entries</p>
            <p className="text-2xl font-bold text-blue-600">
              {data.summary.total_entries}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-gray-500">Dominant Emotion</p>
            <p className="text-2xl font-bold text-green-600 capitalize">
              {data.summary.dominant_emotion}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-gray-500">Trend</p>
            <p className="text-2xl font-bold text-purple-600 capitalize">
              {data.summary.trend}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-gray-500">Avg Intensity</p>
            <p className="text-2xl font-bold text-orange-500">
              {data.summary.avg_intensity}
            </p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="mb-8">
          <EmotionChart data={data.distribution} />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Emotion Distribution
          </h2>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-3">Emotion</th>
                <th className="py-3">Count</th>
              </tr>
            </thead>

            <tbody>
              {data.distribution.map((item) => (
                <tr
                  key={item.emotion}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="py-3 capitalize">
                    {item.emotion}
                  </td>
                  <td className="py-3 font-semibold">
                    {item.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}