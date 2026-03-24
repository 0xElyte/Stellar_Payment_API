import * as StellarSdk from "stellar-sdk";
import * as freighter from "@stellar/freighter-api";

export interface FreighterSignResponse {
  signedXDR: string;
  publicKey: string;
}

/**
 * Check if Freighter wallet is available and allowed
 */
export async function isFreighterAvailable(): Promise<boolean> {
  try {
    return await freighter.isAllowed();
  } catch {
    return false;
  }
}

/**
 * Get the public key from Freighter wallet
 */
export async function getFreighterPublicKey(): Promise<string> {
  try {
    return await freighter.getPublicKey();
  } catch (error) {
    throw new Error("Failed to get public key from Freighter wallet");
  }
}

/**
 * Sign a transaction with Freighter wallet
 */
export async function signWithFreighter(
  transactionXDR: string,
  networkPassphrase: string
): Promise<FreighterSignResponse> {
  try {
    const signedXDR = await freighter.signTransaction(transactionXDR, {
      networkPassphrase,
    });

    const publicKey = await freighter.getPublicKey();
    
    return {
      signedXDR,
      publicKey,
    };
  } catch (error) {
    throw new Error("Failed to sign transaction with Freighter wallet");
  }
}

/**
 * Submit a signed transaction to Stellar network
 */
export async function submitTransaction(
  signedXDR: string,
  horizonUrl: string,
  networkPassphrase: string
): Promise<{ hash: string }> {
  try {
    const server = new StellarSdk.Horizon.Server(horizonUrl);
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXDR,
      networkPassphrase
    );

    const result = await server.submitTransaction(signedTx);
    
    if (!result.hash) {
      throw new Error("No transaction hash returned");
    }

    return {
      hash: result.hash,
    };
  } catch (error) {
    throw new Error(
      `Failed to submit transaction: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
