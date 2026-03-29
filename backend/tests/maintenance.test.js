import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import db from "../src/lib/db.js";
import { archiveOldPaymentIntents } from "../src/lib/maintenance.js";

describe("archiveOldPaymentIntents", () => {
  beforeEach(async () => {
    // Clear tables before each test
    await db("webhook_delivery_logs").del();
    await db("archived_payments").del();
    await db("payments").del();
    await db("merchants").del();

    // Insert a dummy merchant to satisfy foreign key constraints
    await db("merchants").insert({
      id: "11111111-1111-1111-1111-111111111111",
      email: "test@example.com",
      business_name: "Test Merchant",
      notification_email: "notify@example.com",
      api_key: "test_api_key",
      webhook_secret: "test_secret"
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it("should move payments older than 90 days to archived_payments and delete them from payments", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10);

    // Insert test data
    await db("payments").insert([
      {
        id: "22222222-2222-2222-2222-222222222222",
        merchant_id: "11111111-1111-1111-1111-111111111111",
        amount: "100.00",
        asset: "XLM",
        recipient: "GB123",
        created_at: oldDate // older than 90 days
      },
      {
        id: "33333333-3333-3333-3333-333333333333",
        merchant_id: "11111111-1111-1111-1111-111111111111",
        amount: "50.00",
        asset: "USDC",
        recipient: "GB123",
        created_at: recentDate // newer than 90 days
      }
    ]);

    const result = await archiveOldPaymentIntents();

    expect(result.archivedCount).toBe(1);

    // Verify payments table only has the recent payment
    const remainingPayments = await db("payments").select("*");
    expect(remainingPayments.length).toBe(1);
    expect(remainingPayments[0].id).toBe("33333333-3333-3333-3333-333333333333");

    // Verify archived_payments has the old payment
    const archivedPayments = await db("archived_payments").select("*");
    expect(archivedPayments.length).toBe(1);
    expect(archivedPayments[0].id).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("should do nothing if there are no old payments to archive", async () => {
    const result = await archiveOldPaymentIntents();
    expect(result.archivedCount).toBe(0);

    const archivedPayments = await db("archived_payments").select("*");
    expect(archivedPayments.length).toBe(0);
  });

  it("should rollback transaction if insertion fails", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);

    await db("payments").insert([
      {
        id: "44444444-4444-4444-4444-444444444444",
        merchant_id: "11111111-1111-1111-1111-111111111111",
        amount: "100.00",
        asset: "XLM",
        recipient: "GB123",
        created_at: oldDate
      }
    ]);

    // Mock insertion failure to test rollback
    const spy = vi.spyOn(db, 'transaction').mockImplementation(async () => {
      throw new Error("Simulated insertion failure");
    });

    await expect(archiveOldPaymentIntents()).rejects.toThrow("Simulated insertion failure");

    // Original payment should still exist
    const remainingPayments = await db("payments").select("*");
    expect(remainingPayments.length).toBe(1);
    expect(remainingPayments[0].id).toBe("44444444-4444-4444-4444-444444444444");

    // Archived table should remain empty
    const archivedPayments = await db("archived_payments").select("*");
    expect(archivedPayments.length).toBe(0);
  });
});
