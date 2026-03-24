import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted makes mockCall available inside the vi.mock factory (which is hoisted above imports)
const { mockCall } = vi.hoisted(() => ({ mockCall: vi.fn() }))

vi.mock('stellar-sdk', () => {
  const MockAsset = vi.fn((code, issuer) => ({ isNative: () => false, code, issuer }))
  MockAsset.native = vi.fn(() => ({ isNative: () => true }))

  const MockServer = vi.fn(() => ({
    payments: () => ({
      forAccount: () => ({
        order: () => ({
          limit: () => ({ call: mockCall })
        })
      })
    })
  }))

  return { Asset: MockAsset, Horizon: { Server: MockServer } }
})

import { findMatchingPayment } from './stellar.js'

// Helper to build a payment record with sensible defaults
const makePayment = (overrides = {}) => ({
  type: 'payment',
  asset_type: 'native',
  amount: '100.0000000',
  id: 'op-1',
  transaction_hash: 'tx-abc123',
  ...overrides
})

const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'

describe('findMatchingPayment', () => {
  beforeEach(() => mockCall.mockReset())

  it('returns matching XLM payment', async () => {
    mockCall.mockResolvedValue({ records: [makePayment()] })

    const result = await findMatchingPayment({
      recipient: 'GABC',
      amount: '100',
      assetCode: 'XLM'
    })

    expect(result).toEqual({ id: 'op-1', transaction_hash: 'tx-abc123' })
  })

  it('returns matching non-native (USDC) payment', async () => {
    mockCall.mockResolvedValue({
      records: [
        makePayment({
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: USDC_ISSUER,
          amount: '50.0000000'
        })
      ]
    })

    const result = await findMatchingPayment({
      recipient: 'GABC',
      amount: '50',
      assetCode: 'USDC',
      assetIssuer: USDC_ISSUER
    })

    expect(result).toEqual({ id: 'op-1', transaction_hash: 'tx-abc123' })
  })

  it('matches when received amount differs by exactly the tolerance boundary (0.0000001)', async () => {
    mockCall.mockResolvedValue({ records: [makePayment({ amount: '100.0000001' })] })

    const result = await findMatchingPayment({
      recipient: 'GABC',
      amount: '100.0000000',
      assetCode: 'XLM'
    })

    expect(result).not.toBeNull()
  })

  it('returns null when amount difference exceeds tolerance', async () => {
    mockCall.mockResolvedValue({ records: [makePayment({ amount: '99.9999990' })] })

    const result = await findMatchingPayment({
      recipient: 'GABC',
      amount: '100',
      assetCode: 'XLM'
    })

    expect(result).toBeNull()
  })

  it('returns null when record list is empty', async () => {
    mockCall.mockResolvedValue({ records: [] })

    const result = await findMatchingPayment({
      recipient: 'GABC',
      amount: '100',
      assetCode: 'XLM'
    })

    expect(result).toBeNull()
  })

  it('skips non-payment type records (path_payment, create_account, etc.)', async () => {
    mockCall.mockResolvedValue({
      records: [
        makePayment({ type: 'path_payment_strict_send' }),
        makePayment({ type: 'create_account' })
      ]
    })

    const result = await findMatchingPayment({
      recipient: 'GABC',
      amount: '100',
      assetCode: 'XLM'
    })

    expect(result).toBeNull()
  })

  it('skips payments for the wrong asset', async () => {
    mockCall.mockResolvedValue({
      records: [
        makePayment({
          asset_type: 'credit_alphanum4',
          asset_code: 'USDC',
          asset_issuer: USDC_ISSUER
        })
      ]
    })

    // Asking for XLM, record is USDC — should not match
    const result = await findMatchingPayment({
      recipient: 'GABC',
      amount: '100',
      assetCode: 'XLM'
    })

    expect(result).toBeNull()
  })

  it('returns the first matching payment when multiple records are present', async () => {
    mockCall.mockResolvedValue({
      records: [
        makePayment({ id: 'op-first', transaction_hash: 'tx-first' }),
        makePayment({ id: 'op-second', transaction_hash: 'tx-second' })
      ]
    })

    const result = await findMatchingPayment({
      recipient: 'GABC',
      amount: '100',
      assetCode: 'XLM'
    })

    expect(result).toEqual({ id: 'op-first', transaction_hash: 'tx-first' })
  })
})
