const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    },
    message: 'ERS backend is healthy.'
  });
});

module.exports = router;
