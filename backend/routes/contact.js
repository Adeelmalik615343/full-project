const express = require('express');
const router = express.Router();
const { createContact, getAllContacts } = require('../controllers/contactController');
const auth = require('../middleware/auth');

router.post('/', createContact);
router.get('/', auth, getAllContacts);

module.exports = router;

