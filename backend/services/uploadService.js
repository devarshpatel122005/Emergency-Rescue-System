const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

function getStorageRoot() {
  return process.env.STORAGE_PATH
    ? path.resolve(process.cwd(), process.env.STORAGE_PATH)
    : path.resolve(__dirname, '..', 'uploads');
}

async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function saveChunk({ uploadId, chunkIndex, chunkData }) {
  if (!uploadId || chunkIndex === undefined || !chunkData) {
    throw new Error('uploadId, chunkIndex and chunkData are required.');
  }

  const root = getStorageRoot();
  const chunkDir = path.join(root, 'chunks', uploadId);
  await ensureDir(chunkDir);

  const chunkPath = path.join(chunkDir, `${chunkIndex}.part`);
  const buffer = Buffer.from(chunkData, 'base64');
  await fsp.writeFile(chunkPath, buffer);

  return { uploadId, chunkIndex, chunkPath };
}

async function completeUpload({ uploadId, totalChunks, filename }) {
  if (!uploadId || !totalChunks || !filename) {
    throw new Error('uploadId, totalChunks and filename are required.');
  }

  const safeName = path.basename(filename);
  const root = getStorageRoot();
  const chunkDir = path.join(root, 'chunks', uploadId);
  const finalDir = path.join(root, 'files');

  await ensureDir(finalDir);

  const outputFile = path.join(finalDir, `${Date.now()}-${safeName}`);
  const writeStream = fs.createWriteStream(outputFile);

  for (let index = 0; index < Number(totalChunks); index += 1) {
    const chunkPath = path.join(chunkDir, `${index}.part`);
    const exists = fs.existsSync(chunkPath);
    if (!exists) {
      writeStream.close();
      throw new Error(`Missing chunk ${index}.`);
    }

    const chunkBuffer = await fsp.readFile(chunkPath);
    writeStream.write(chunkBuffer);
  }

  writeStream.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  // TODO(phase-2): Add checksum verification and resumable retry markers.
  await fsp.rm(chunkDir, { recursive: true, force: true });

  return {
    uploadId,
    filePath: outputFile,
    filename: path.basename(outputFile)
  };
}

module.exports = {
  saveChunk,
  completeUpload
};
