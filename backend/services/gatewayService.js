async function sendSmsStub(job) {
  return {
    success: true,
    provider: 'stub',
    channel: 'sms',
    target: job.target,
    reference: `sms-${Date.now()}`
  };
}

async function sendEmailStub(job) {
  return {
    success: true,
    provider: 'stub',
    channel: 'email',
    target: job.target,
    reference: `email-${Date.now()}`
  };
}

async function sendWithGateway(job) {
  if (job.channel === 'sms') {
    return sendSmsStub(job);
  }

  if (job.channel === 'email') {
    return sendEmailStub(job);
  }

  throw new Error(`Unsupported channel ${job.channel}`);
}

module.exports = {
  sendSmsStub,
  sendEmailStub,
  sendWithGateway
};
