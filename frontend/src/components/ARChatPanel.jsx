import ChatPanel from './ChatPanel';

function ARChatPanel({ incidentId, user }) {
  return (
    <section className="card p-3">
      <h2 className="mb-3 text-lg font-semibold text-brand-900">AR Chat</h2>
      <ChatPanel incidentId={incidentId} user={user} senderType="rescuer" />
    </section>
  );
}

export default ARChatPanel;
