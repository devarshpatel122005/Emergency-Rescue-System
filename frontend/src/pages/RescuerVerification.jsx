import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import VerificationCard from '../components/VerificationCard';
import { approveRescuer, getPendingRescuers, rejectRescuer } from '../services/rescuerService';

function RescuerVerification({ onLogout }) {
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState('');

  const loadPending = async () => {
    const data = await getPendingRescuers();
    setRows(data);
  };

  useEffect(() => {
    loadPending().catch((error) => setNotice(error.response?.data?.message || 'Failed to load pending rescuers.'));
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveRescuer(id);
      setRows((prev) => prev.filter((item) => item._id !== id));
      setNotice('Rescuer approved.');
    } catch (error) {
      setNotice(error.response?.data?.message || 'Approval failed.');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectRescuer(id);
      setRows((prev) => prev.filter((item) => item._id !== id));
      setNotice('Rescuer rejected.');
    } catch (error) {
      setNotice(error.response?.data?.message || 'Rejection failed.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row">
        <Sidebar role="admin" onLogout={onLogout} />

        <section className="flex-1 space-y-4">
          <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">Rescuer Verification</h1>
          </header>

          {notice ? <div className="rounded-md border border-slate-200 bg-white p-3 text-sm">{notice}</div> : null}

          {rows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No pending rescuer requests.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((rescuer) => (
                <VerificationCard
                  key={rescuer._id}
                  rescuer={rescuer}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default RescuerVerification;
