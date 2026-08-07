import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

function toFixedValue(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'N/A';
  }
  return Number(value).toFixed(digits);
}

function ResponseKPICharts({ kpis, responseTimes = [] }) {
  const statusData = Object.entries(kpis?.byStatus || {}).map(([name, value]) => ({
    name,
    value
  }));

  const responseTrend = responseTimes.slice(0, 12).reverse().map((row, index) => ({
    name: `I${index + 1}`,
    dispatch: row.dispatchMinutes || 0,
    arrival: row.arrivalMinutes || 0,
    resolution: row.resolutionMinutes || 0
  }));

  return (
    <div className="grid gap-3 lg:grid-cols-2" data-testid="response-kpi-charts">
      <div className="card p-3">
        <h3 className="mb-2 text-sm font-semibold text-brand-900">Incident Status Distribution</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-3">
        <h3 className="mb-2 text-sm font-semibold text-brand-900">Response Time Trend</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={responseTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="dispatch" stroke="#f97316" strokeWidth={2} />
              <Line type="monotone" dataKey="arrival" stroke="#2563eb" strokeWidth={2} />
              <Line type="monotone" dataKey="resolution" stroke="#16a34a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-3 text-sm text-slate-700 lg:col-span-2">
        <p>Avg Dispatch: {toFixedValue(kpis?.averages?.dispatchMinutes)} min</p>
        <p>Avg Arrival: {toFixedValue(kpis?.averages?.arrivalMinutes)} min</p>
        <p>Avg Resolution: {toFixedValue(kpis?.averages?.resolutionMinutes)} min</p>
      </div>
    </div>
  );
}

export default ResponseKPICharts;
