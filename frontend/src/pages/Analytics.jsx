import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { listIncidents } from '../services/incidentService';
import { onSocket } from '../services/socket';
import Sidebar from '../components/Sidebar';

const COLORS = ['#0f766e', '#f97316', '#2563eb', '#7c3aed', '#dc2626', '#16a34a'];

function toChartRows(counter = {}) {
  return Object.entries(counter).map(([name, value]) => ({ name, value }));
}

function Analytics({ onLogout }) {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    const rows = await listIncidents();
    setIncidents(rows);
  };

  useEffect(() => {
    load().catch(() => setError(t('loadKpiFailed')));
  }, [t]);

  useEffect(() => {
    const refresh = () => load().catch(() => {});

    const offCreated = onSocket('incident:created', refresh);
    const offNew = onSocket('incident:new', refresh);
    const offAssigned = onSocket('incident:assigned', refresh);
    const offCompleted = onSocket('incident:completed', refresh);

    return () => {
      offCreated();
      offNew();
      offAssigned();
      offCompleted();
    };
  }, []);

  const { typeDistribution, departmentDistribution, incidentsOverTime } = useMemo(() => {
    const typeCounter = {};
    const departmentCounter = {};
    const dateCounter = {};

    incidents.forEach((incident) => {
      const type = incident.templateType || 'custom';
      typeCounter[type] = (typeCounter[type] || 0) + 1;

      const department = incident.department || t('other');
      departmentCounter[department] = (departmentCounter[department] || 0) + 1;

      const day = new Date(incident.createdAt).toISOString().slice(0, 10);
      dateCounter[day] = (dateCounter[day] || 0) + 1;
    });

    const sortedDays = Object.keys(dateCounter).sort();

    return {
      typeDistribution: toChartRows(typeCounter),
      departmentDistribution: toChartRows(departmentCounter),
      incidentsOverTime: sortedDays.map((day) => ({ day, incidents: dateCounter[day] }))
    };
  }, [incidents, t]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row">
        <Sidebar role="admin" onLogout={onLogout} />

        <section className="flex-1 space-y-4">
          <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">{t('analytics')}</h1>
            <p className="text-sm text-slate-500">{t('analyticsSubtitle')}</p>
          </header>

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">{t('incidentTypeDistribution')}</h2>
              <div className="h-72" data-testid="pie-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeDistribution} dataKey="value" nameKey="name" outerRadius={100} label>
                      {typeDistribution.map((entry, index) => (
                        <Cell key={`type-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">{t('incidentsPerDepartment')}</h2>
              <div className="h-72" data-testid="bar-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">{t('incidentsOverTime')}</h2>
            <div className="h-72" data-testid="line-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={incidentsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="incidents" stroke="#2563eb" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export default Analytics;
