const express = require('express');
const { register, login, completeProfile, updateProfile } = require('../controllers/authController');
const { authenticateRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.patch('/complete-profile', authenticateRequired, completeProfile);
router.patch('/profile', authenticateRequired, updateProfile);

module.exports = router;
