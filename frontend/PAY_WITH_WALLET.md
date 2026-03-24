# Pay with Wallet Feature

This feature allows users to make one-click payments using the Freighter Stellar wallet extension.

## Setup

### 1. Install Dependencies

The required packages have been added to `package.json`:
- `@stellar/freighter-api` - Freighter wallet integration
- `stellar-sdk` - Stellar network operations

Install them:

```bash
cd frontend
npm install
# or
yarn install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and update the values:

```bash
cp .env.example .env.local
```

Configure the following:
- `NEXT_PUBLIC_API_URL` - Your backend API URL (default: `http://localhost:3001`)
- `NEXT_PUBLIC_HORIZON_URL` - Stellar Horizon server URL (default: Testnet)
- `NEXT_PUBLIC_NETWORK_PASSPHRASE` - Network passphrase (Testnet or Public)

#### Example for Testnet:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

#### Example for Public Network:
```env
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_HORIZON_URL=https://horizon.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
```

### 3. Requirements for Users

- **Freighter Extension**: Users must have the [Freighter Stellar Wallet](https://freighter.app/) installed and enabled
- **XLM or USDC**: A funded Stellar account with the currency they want to send

## Features

### Payment Page (`/pay/[id]`)

The payment page displays:
- Payment amount and asset type
- Recipient address
- Description (if provided)
- Current payment status
- A "Pay with Freighter Wallet" button

### Payment Flow

1. **Check Freighter Availability**: The page detects if Freighter extension is installed
2. **Display Payment Details**: Shows all payment information
3. **One-Click Payment**:
   - User clicks "Pay with Freighter Wallet"
   - Freighter window appears to confirm the transaction
   - User signs the transaction
   - Transaction is submitted to the Stellar network
4. **Confirmation**: Payment status updates when complete

## Architecture

### Components

- **Pay Page** (`src/app/pay/[id]/page.tsx`) - Main payment UI component
- **Freighter Utils** (`src/lib/freighter.ts`) - Freighter API wrapper functions
- **Stellar Utils** (`src/lib/stellar.ts`) - Stellar transaction building utilities
- **Payment Hook** (`src/lib/usePayment.ts`) - React hook for payment processing

### Key Functions

#### Freighter Integration
```typescript
// Check if Freighter is available
isFreighterAvailable(): Promise<boolean>

// Get user's public key
getFreighterPublicKey(): Promise<string>

// Sign a transaction
signWithFreighter(transactionXDR: string, networkPassphrase: string): Promise<FreighterSignResponse>

// Submit to network
submitTransaction(signedXDR: string, horizonUrl: string, networkPassphrase: string): Promise<{ hash: string }>
```

#### Stellar Operations
```typescript
// Build a payment transaction
buildPaymentTransaction(params: PaymentTransactionParams): Promise<string>

// Resolve asset (XLM or custom)
resolveAsset(assetCode: string, assetIssuer: string | null): StellarSdk.Asset
```

#### React Hook
```typescript
// Process payment with hook
const { isProcessing, status, error, processPayment } = usePayment()
```

## Testing

### Test on Testnet

1. Get testnet XLM from [Stellar Friendbot](https://laboratory.stellar.org/#account-creator?network=testnet)
2. Install [Freighter Extension](https://freighter.app/)
3. Create a payment via the backend API:

```bash
curl -X POST http://localhost:3001/api/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "10",
    "asset": "XLM",
    "recipient": "GBBD47UZQ5JAKVYL2QY5HOKC3BH75WQGJEDZE35WVDAUBPOOLVKWTYC",
    "description": "Test Payment"
  }'
```

4. Visit the returned payment link `/pay/[id]`
5. Click "Pay with Freighter Wallet"
6. Review and sign the transaction in Freighter
7. Confirm completion on the payment page

## Error Handling

The component handles several error scenarios:

- **Freighter Not Available**: Displays install prompt
- **Insufficient Balance**: Freighter will reject with insufficient balance error
- **Network Error**: Shows network-related error messages
- **Transaction Rejected**: User rejected the transaction in Freighter

## Security Considerations

- All transaction signing happens in the user's browser
- Private keys never leave the Freighter extension
- Transactions are cryptographically signed before submission
- No sensitive data is stored on the frontend

## Future Enhancements

- Add multiple asset support with better UI
- Implement transaction history tracking
- Add QR code for manual entry
- Support for payment installments
- Invoice/receipt generation
