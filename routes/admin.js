const router = require('express').Router();
const multer = require('multer');
const adminAuth = require('../util/adminAuth');

const {
  adminLogin,
  adminRegister,
  resetPassword,
  getUsers,
  updateUser,
  deleteUser,
  updateFile,
  getFiles,
} = require('../controllers/admin');

const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.post('/adminLogin', adminLogin);
router.post('/adminRegister', adminRegister);
router.post('/resetPassword', resetPassword);

// Protected admin routes
router.get('/getUsers', adminAuth, getUsers);
router.patch('/updateUser/:id', adminAuth, updateUser);
router.delete('/deleteUser/:id', adminAuth, deleteUser);
router.get('/getFiles', adminAuth, getFiles);
router.put('/files/:id', updateFile);

module.exports = router;