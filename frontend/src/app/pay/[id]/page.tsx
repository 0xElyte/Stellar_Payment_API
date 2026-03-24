"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { isFreighterAvailable } from "@/lib/freighter";
import { usePayment } from "@/lib/usePayment";

interface PaymentDetails {
  id: string;
  amount: number;
  asset: string;
  asset_issuer: string | null;
  recipient: string;
  description: string | null;
  status: string;
  tx_id: string | null;
  created_at: string;
}

export default function PaymentPage() {
  const params = useParams();
  const paymentId = params.id as string;

  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFreighterAvailableState, setIsFreighterAvailable] = useState(false);

  const { isProcessing, status: txStatus, error: paymentError, processPayment } = usePayment();

  // Fetch payment details
  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/api/payment-status/${paymentId}`);
        
        if (!response.ok) {
          throw new Error("Payment not found");
        }
        
        const data = await response.json();
        setPayment(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch payment details");
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [paymentId]);

  // Check if Freighter is available
  useEffect(() => {
    const checkFreighter = async () => {
      try {
        const available = await isFreighterAvailable();
        setIsFreighterAvailable(available);
      } catch {
        setIsFreighterAvailable(false);
      }
    };

    checkFreighter();
  }, []);

  const handlePayWithWallet = async () => {
    if (!payment || !isFreighterAvailableState) {
      setError("Freighter wallet not available");
      return;
    }

    try {
      const result = await processPayment({
        recipient: payment.recipient,
        amount: String(payment.amount),
        assetCode: payment.asset,
        assetIssuer: payment.asset_issuer,
      });

      setPayment({
        ...payment,
        status: "completed",
        tx_id: result.hash,
      });

      // Verify the payment with the backend
      setTimeout(async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          await fetch(`${apiUrl}/api/payment-status/${paymentId}`);
        } catch {
          // Silent error - the payment is still valid on-chain
        }
      }, 2000);
    } catch (err) {
      setError(paymentError || "Failed to process payment");
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-white/10"></div>
          <div className="h-12 w-full rounded bg-white/10"></div>
          <div className="h-32 w-full rounded bg-white/10"></div>
        </div>
      </main>
    );
  }

  if (error && !payment) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-red-400">Error: {error}</p>
        </div>
      </main>
    );
  }

  if (!payment) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-red-400">Payment not found</p>
        </div>
      </main>
    );
  }

  const isCompleted = payment.status === "completed";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-mint">Payment Details</p>
        <h1 className="text-3xl font-semibold text-white">Complete Payment</h1>
      </header>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="space-y-6">
          {/* Amount */}
          <div className="flex items-baseline justify-between border-b border-white/10 pb-4">
            <span className="text-slate-300">Amount</span>
            <span className="text-3xl font-semibold text-white">
              {payment.amount} {payment.asset}
            </span>
          </div>

          {/* Recipient */}
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Recipient Address</p>
            <p className="font-mono text-sm text-white break-all">{payment.recipient}</p>
          </div>

          {/* Description */}
          {payment.description && (
            <div className="space-y-2">
              <p className="text-sm text-slate-400">Description</p>
              <p className="text-white">{payment.description}</p>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-400">Status:</p>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              isCompleted
                ? "bg-green-500/20 text-green-400"
                : "bg-yellow-500/20 text-yellow-400"
            }`}>
              {isCompleted ? "Completed" : "Pending"}
            </span>
          </div>

          {/* Transaction Hash */}
          {payment.tx_id && (
            <div className="space-y-2">
              <p className="text-sm text-slate-400">Transaction Hash</p>
              <a
                href={`${process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org"}/transactions/${payment.tx_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-blue-400 hover:text-blue-300 break-all"
              >
                {payment.tx_id}
              </a>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Status message */}
          {txStatus && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
              <p className="text-sm text-blue-400">{txStatus}</p>
            </div>
          )}

          {/* Pay with Wallet Button */}
          {!isCompleted && (
            <div className="space-y-4 pt-4">
              {isFreighterAvailableState ? (
                <button
                  onClick={handlePayWithWallet}
                  disabled={isProcessing}
                  className="w-full rounded-lg bg-gradient-to-r from-mint to-mint/80 px-6 py-3 font-semibold text-black transition-all hover:shadow-lg hover:shadow-mint/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Processing..." : "Pay with Freighter Wallet"}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">Freighter wallet not detected</p>
                  <a
                    href="https://freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center rounded-lg border border-mint px-6 py-3 font-semibold text-mint transition-all hover:bg-mint/10"
                  >
                    Install Freighter Extension
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isCompleted && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-center">
          <p className="text-lg font-semibold text-green-400">Payment Completed!</p>
          <p className="mt-2 text-sm text-green-400/80">
            Thank you for your payment. Your transaction has been confirmed on the Stellar network.
          </p>
        </div>
      )}
    </main>
  );
}
