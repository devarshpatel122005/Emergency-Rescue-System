const { saveChunk, completeUpload } = require('../services/uploadService');

async function uploadChunk(req, res, next) {
  try {
    const { uploadId, chunkIndex, chunkData } = req.body;

    const result = await saveChunk({ uploadId, chunkIndex, chunkData });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Chunk saved.'
    });
  } catch (error) {
    return next(error);
  }
}

async function finalizeUpload(req, res, next) {
  try {
    const { uploadId, totalChunks, filename } = req.body;

    const result = await completeUpload({ uploadId, totalChunks, filename });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Upload completed.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadChunk,
  finalizeUpload
};
