let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

function emitEvent(eventName, payload) {
  if (!ioInstance) {
    return;
  }
  ioInstance.emit(eventName, payload);
}

module.exports = {
  setIO,
  getIO,
  emitEvent
};
