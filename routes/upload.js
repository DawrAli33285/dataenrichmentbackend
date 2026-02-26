const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const upload     = multer({ storage: multer.memoryStorage() });

const { uploadAndEnrich, payAndDownload, getUserFiles, createPaymentIntent, downloadFile } = require('../controllers/upload');

router.get('/files', getUserFiles);
router.post('/upload',            upload.single('file'), uploadAndEnrich);
router.post('/pay',               payAndDownload);
router.get('/download/:filename', downloadFile);
router.post('/create-payment-intent', createPaymentIntent);

module.exports = router;