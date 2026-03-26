import express from "express";
import { requireApiKeyAuth } from "../lib/auth.js";

const router = express.Router();

/**
 * @swagger
 * /api/metrics/revenue:
 *   get:
 *     summary: Get aggregate revenue by asset
 *     tags: [Metrics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Revenue data grouped by asset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 revenue:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       asset:
 *                         type: string
 *                         description: Asset code (e.g., XLM, USDC)
 *                       asset_issuer:
 *                         type: string
 *                         nullable: true
 *                         description: Asset issuer (null for native XLM)
 *                       total:
 *                         type: string
 *                         description: Sum of amounts for this asset
 *                       count:
 *                         type: integer
 *                         description: Number of completed payments for this asset
 *       401:
 *         description: Unauthorized - invalid API key
 *       500:
 *         description: Server error
 */
router.get("/metrics/revenue", requireApiKeyAuth(), async (req, res, next) => {
  try {
    const pool = req.app.locals.pool;
    const merchantId = req.merchant.id;

    const query = `
      SELECT
        asset,
        asset_issuer,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments
      WHERE merchant_id = $1 AND status = 'completed'
      GROUP BY asset, asset_issuer
      ORDER BY asset, asset_issuer
    `;

    const { rows } = await pool.query(query, [merchantId]);

    res.json({
      revenue: rows.map(row => ({
        asset: row.asset,
        asset_issuer: row.asset_issuer,
        total: row.total,
        count: parseInt(row.count)
      }))
    });
  } catch (err) {
    next(err);
  }
});

export default router;
