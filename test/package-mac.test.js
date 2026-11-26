'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { signing } = require('../scripts/package-mac.js')

const FULL = {
  LERD_MAC_SIGN_IDENTITY: 'Developer ID Application',
  APPLE_API_KEY: '/keys/AuthKey.p8',
  APPLE_API_KEY_ID: 'KEYID',
  APPLE_API_ISSUER: 'issuer-uuid',
}

test('no identity packages ad hoc', () => {
  assert.strictEqual(signing({}), null)
})

test('an identity with its notary key signs and notarizes', () => {
  assert.deepStrictEqual(signing(FULL), {
    identity: 'Developer ID Application',
    key: '/keys/AuthKey.p8',
    keyId: 'KEYID',
    issuer: 'issuer-uuid',
  })
})

// A Developer ID signature with no notarization still warns on first open, so
// a half-set environment is refused rather than shipped.
test('an identity without the notary key is refused, naming what is missing', () => {
  const env = { ...FULL, APPLE_API_KEY_ID: '', APPLE_API_ISSUER: undefined }
  assert.throws(() => signing(env), /APPLE_API_KEY_ID, APPLE_API_ISSUER/)
})
