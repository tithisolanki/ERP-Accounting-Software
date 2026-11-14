import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';
import {
  companyController,
  userController,
  accountController,
  standardMasterController,
  qualityController,
  descriptionController,
  hsnController,
  dropdownController,
  primaryGroupController
} from '../controllers/masters.controller';

const router = Router();

// ==========================================
// 1. Company Endpoints
// ==========================================
router.get('/companies', authenticateJWT, (req, res) => companyController.getCompanies(req, res));
router.post('/companies', authenticateJWT, (req, res) => companyController.createCompany(req, res));
router.put('/companies/:id', authenticateJWT, (req, res) => companyController.updateCompany(req, res));

// ==========================================
// 2. User Endpoints
// ==========================================
router.get('/users', authenticateJWT, (req, res) => userController.getUsers(req, res));
router.post('/users', authenticateJWT, (req, res) => userController.createUser(req, res));
router.delete('/users/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => userController.deleteUser(req, res));

// ==========================================
// 3. Account Endpoints
// ==========================================
router.get('/accounts', authenticateJWT, (req, res) => accountController.getAccounts(req, res));
router.post('/accounts', authenticateJWT, (req, res) => accountController.createAccount(req, res));
router.put('/accounts/:id', authenticateJWT, (req, res) => accountController.updateAccount(req, res));
router.delete('/accounts/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => accountController.deleteAccount(req, res));

// ==========================================================
// DYNAMIC DUAL MASTER CRUD GENERATION FOR STANDARD TEXT MASTERS
// ==========================================================
const entities = ['groups', 'categories', 'brokers', 'cities', 'states', 'transports', 'journal-voucher-types'];

entities.forEach((path) => {
  router.get(`/${path}`, authenticateJWT, (req, res) => standardMasterController.getItems(req, res, path));
  router.post(`/${path}`, authenticateJWT, (req, res) => standardMasterController.createItem(req, res, path));
  router.put(`/${path}/:id`, authenticateJWT, (req, res) => standardMasterController.updateItem(req, res, path));
  router.delete(`/${path}/:id`, authenticateJWT, requireRole(['ADMIN']), requireRole(['ADMIN']), (req, res) => standardMasterController.deleteItem(req, res, path));
});

// ==========================================
// Qualities CRUD Endpoints
// ==========================================
router.get('/qualities', authenticateJWT, (req, res) => qualityController.getAll(req, res));
router.post('/qualities', authenticateJWT, requireRole(['ADMIN']), (req, res) => qualityController.create(req, res));
router.put('/qualities/:id', authenticateJWT, (req, res) => qualityController.update(req, res));
router.delete('/qualities/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => qualityController.delete(req, res));

// ==========================================
// Descriptions CRUD Endpoints
// ==========================================
router.get('/descriptions', authenticateJWT, (req, res) => descriptionController.getAll(req, res));
router.post('/descriptions', authenticateJWT, requireRole(['ADMIN']), (req, res) => descriptionController.create(req, res));
router.put('/descriptions/:id', authenticateJWT, (req, res) => descriptionController.update(req, res));
router.delete('/descriptions/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => descriptionController.delete(req, res));

// ==========================================
// HSN Codes CRUD Endpoints
// ==========================================
router.get('/hsn-codes', authenticateJWT, (req, res) => hsnController.getAll(req, res));
router.post('/hsn-codes', authenticateJWT, requireRole(['ADMIN']), (req, res) => hsnController.create(req, res));
router.put('/hsn-codes/:id', authenticateJWT, (req, res) => hsnController.update(req, res));
router.delete('/hsn-codes/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => hsnController.delete(req, res));

// ==========================================
// Cascading Dropdown Select APIs
// ==========================================
router.get('/dropdown/categories', authenticateJWT, (req, res) => dropdownController.getDropdownCategories(req, res));
router.get('/dropdown/qualities', authenticateJWT, (req, res) => dropdownController.getDropdownQualities(req, res));
router.get('/dropdown/descriptions', authenticateJWT, (req, res) => dropdownController.getDropdownDescriptions(req, res));
router.get('/dropdown/hsn-codes', authenticateJWT, (req, res) => dropdownController.getDropdownHsnCodes(req, res));

// ==========================================
// Primary Groups Endpoints
// ==========================================
router.get('/primary-groups', authenticateJWT, (req, res) => primaryGroupController.getAll(req, res));
router.post('/primary-groups', authenticateJWT, (req, res) => primaryGroupController.create(req, res));
router.put('/primary-groups/:id', authenticateJWT, (req, res) => primaryGroupController.update(req, res));
router.delete('/primary-groups/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => primaryGroupController.delete (req, res));
router.get('/company-groups', authenticateJWT, (req, res) => primaryGroupController.getAll(req, res)); //standard  route for company to lookup primary groups
 
export default router;
