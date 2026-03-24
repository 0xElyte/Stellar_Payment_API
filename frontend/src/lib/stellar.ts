import * as StellarSdk from "stellar-sdk";

export interface PaymentTransactionParams {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  assetCode: string;
  assetIssuer: string | null;
  horizonUrl: string;
  networkPassphrase: string;
}

/**
 * Resolve a Stellar asset based on code and issuer
 */
export function resolveAsset(assetCode: string, assetIssuer: string | null): StellarSdk.Asset {
  if (assetCode === "XLM" || assetCode === "native") {
    return StellarSdk.Asset.native();
  }

  if (!assetIssuer) {
    throw new Error("Asset issuer is required for non-native assets");
  }

  return new StellarSdk.Asset(assetCode, assetIssuer);
}

/**
 * Build a payment transaction for submission to the Stellar network
 */
export async function buildPaymentTransaction(
  params: PaymentTransactionParams
): Promise<string> {
  try {
    const server = new StellarSdk.Horizon.Server(params.horizonUrl);

    // Load the source account details
    const sourceAccount = await server.loadAccount(params.sourcePublicKey);

    // Resolve the asset
    const asset = resolveAsset(params.assetCode, params.assetIssuer);

    // Build the transaction
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: params.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: params.destinationPublicKey,
          asset: asset,
          amount: params.amount,
        })
      )
      .setTimeout(300)
      .build();

    return transaction.toXDR();
  } catch (error) {
    throw new Error(
      `Failed to build payment transaction: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
