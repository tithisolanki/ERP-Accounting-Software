import { Router } from 'express';
import purchaseRouter from './purchase.routes';
import salesRouter from './sales.routes';
import salesReturnRouter from './sales-return.routes';
import purchaseReturnRouter from './purchase-return.routes';
import challanRouter from './challan.routes';
import paymentRouter from './payment.routes';
import receiptRouter from './receipt.routes';

const router = Router();

router.use('/purchases', purchaseRouter);
router.use('/sales', salesRouter);
router.use('/sales-returns', salesReturnRouter);
router.use('/purchase-returns', purchaseReturnRouter);
router.use('/challans', challanRouter);
router.use('/payments', paymentRouter);
router.use('/receipts', receiptRouter);

export default router;
