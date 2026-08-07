async function queueTranscriptForFutureProviders(transcriptPayload) {
  // TODO(phase-2): Forward transcript payload to Azure Speech streaming integration.
  return {
    queued: true,
    provider: 'local-stub',
    payload: transcriptPayload
  };
}

module.exports = {
  queueTranscriptForFutureProviders
};
