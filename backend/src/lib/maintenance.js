import db from "../db.js";
import logger from "../logger.js"; // Assuming a pino logger exists

/**
 * Archives payment intents from the 'payments' table that are older than 90 days.
 * Moves them to 'archived_payments' atomically using a transaction.
 * 
 * @returns {Promise<{ archivedCount: number }>}
 */
export async function archiveOldPaymentIntents() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  let archivedCount = 0;

  try {
    await db.transaction(async (trx) => {
      // 1. Select old payments
      const oldPayments = await trx("payments")
        .where("created_at", "<", ninetyDaysAgo)
        .select("*");

      if (oldPayments.length === 0) {
        return; // Nothing to archive
      }

      // 2. Insert into archived_payments
      // We map the records to Ensure archived_at gets set by default (or explicitly if needed)
      const recordsToInsert = oldPayments.map(p => {
        // We clone the object to avoid modifying the original
        const record = { ...p };
        // Clean up fields that are not in the archived schema (none right now, but good practice)
        return record;
      });

      await trx("archived_payments").insert(recordsToInsert);

      // 3. Delete from payments
      const deletedCount = await trx("payments")
        .whereIn("id", oldPayments.map(p => p.id))
        .delete();

      archivedCount = deletedCount;
    });

    if (archivedCount > 0) {
      if (logger && typeof logger.info === 'function') {
        logger.info({ archivedCount }, "Successfully archived old payments");
      }
    }
    
    return { archivedCount };
  } catch (error) {
    if (logger && typeof logger.error === 'function') {
      logger.error({ error }, "Failed to archive old payments");
    } else {
        console.error("Failed to archive old payments:", error);
    }
    throw error;
  }
}
