const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const upload     = multer({ dest: 'uploads/' });  // <-- this must come BEFORE router.post

const { uploadAndEnrich, payAndDownload, getUserFiles,createPaymentIntent, downloadFile } = require('../controllers/upload');

console.log({ uploadAndEnrich, payAndDownload, downloadFile }); // remove after fix
router.get('/files', getUserFiles); // ← add this
router.post('/upload',            upload.single('file'), uploadAndEnrich);
router.post('/pay',               payAndDownload);
router.get('/download/:filename', downloadFile);
router.post('/create-payment-intent', createPaymentIntent);  

module.exports = router;