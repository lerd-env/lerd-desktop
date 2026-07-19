'use strict'

const test = require('node:test')
const assert = require('node:assert')
const http = require('node:http')
const { probe, parseVersion } = require('../src/detect')

test('parseVersion pulls current from the version JSON', () => {
  assert.strictEqual(parseVersion('{"current":"v1.30.0","latest":""}'), 'v1.30.0')
  assert.strictEqual(parseVersion('not json'), '')
  assert.strictEqual(parseVersion('{}'), '')
})

test('probe reports up with version when the UI answers 200', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end('{"current":"v1.30.0"}')
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  const result = await probe({ port })
  server.close()
  assert.deepStrictEqual(result, { up: true, version: 'v1.30.0' })
})

test('probe reports down when nothing is listening', async () => {
  // Port 1 is reserved and refuses fast.
  const result = await probe({ port: 1, timeoutMs: 500 })
  assert.strictEqual(result.up, false)
})

test('probe reports down on timeout', async () => {
  const server = http.createServer(() => {
    // Never responds.
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  const result = await probe({ port, timeoutMs: 200 })
  server.close()
  assert.strictEqual(result.up, false)
})
