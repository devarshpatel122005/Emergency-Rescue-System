const fs = require('fs');
const path = require('path');

function getStorageRoot() {
  return process.env.STORAGE_PATH
    ? path.resolve(process.cwd(), process.env.STORAGE_PATH)
    : path.resolve(__dirname, '..', 'uploads');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeName(name) {
  return String(name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200);
}

async function persistEvidenceFile(file, incidentId) {
  const storageRoot = getStorageRoot();
  const evidenceDir = path.join(storageRoot, 'evidence', String(incidentId));
  ensureDir(evidenceDir);

  const safeOriginal = sanitizeName(file.originalname || 'evidence.bin');
  const filename = `${Date.now()}-${safeOriginal}`;
  const destinationPath = path.join(evidenceDir, filename);

  if (file.path) {
    await fs.promises.rename(file.path, destinationPath);
  } else if (file.buffer) {
    await fs.promises.writeFile(destinationPath, file.buffer);
  } else {
    throw new Error('Unsupported file payload from upload middleware.');
  }

  const relativePath = path.relative(storageRoot, destinationPath);

  return {
    storagePath: relativePath,
    absolutePath: destinationPath,
    filename,
    originalName: file.originalname || filename,
    mimeType: file.mimetype || 'application/octet-stream',
    sizeBytes: Number(file.size || 0),
    provider: process.env.AWS_S3_BUCKET ? 'local-with-s3-hook' : 'local'
  };
}

function resolveStoragePath(relativePath) {
  return path.join(getStorageRoot(), relativePath);
}

module.exports = {
  getStorageRoot,
  persistEvidenceFile,
  resolveStoragePath
};
