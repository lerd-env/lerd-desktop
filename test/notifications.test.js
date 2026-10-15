'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { parseFrame, notificationOptions, deepLink, listen } = require('../src/notifications')

test('parseFrame reads a notification frame', () => {
  assert.deepStrictEqual(
    parseFrame('{"type":"notification","title":"New email","body":"From acme","route":"#mail","urgency":"low"}'),
    { title: 'New email', body: 'From acme', route: '#mail', urgency: 'low' })
})

test('parseFrame fills what a frame leaves out', () => {
  assert.deepStrictEqual(parseFrame('{"type":"notification","title":"redis stopped","urgency":"loud"}'),
    { title: 'redis stopped', body: '', route: '', urgency: 'normal' })
})

test('parseFrame turns away anything that is not a notification', () => {
  assert.strictEqual(parseFrame('not json'), null)
  assert.strictEqual(parseFrame('{"type":"theme","title":"x"}'), null)
  assert.strictEqual(parseFrame('{"type":"notification","title":""}'), null)
  assert.strictEqual(parseFrame('null'), null)
})

test('notificationOptions keeps a low one quiet and a critical one on screen', () => {
  assert.deepStrictEqual(notificationOptions({ title: 't', body: 'b', urgency: 'low' }), { title: 't', body: 'b', silent: true })
  assert.deepStrictEqual(notificationOptions({ title: 't', body: 'b', urgency: 'normal' }), { title: 't', body: 'b', silent: false })
  assert.deepStrictEqual(notificationOptions({ title: 't', body: 'b', urgency: 'critical' }),
    { title: 't', body: 'b', silent: false, timeoutType: 'never' })
})

test('deepLink builds the link lerd-ui gives its own toasts', () => {
  assert.strictEqual(deepLink('#sites/acme.test'), 'lerd://open/#sites/acme.test')
  assert.strictEqual(deepLink('/#mail'), 'lerd://open/#mail')
  assert.strictEqual(deepLink(''), 'lerd://open/')
})

// FakeSocket stands in for WebSocket: each one is recorded, and the test drives
// its events.
function fakeSockets() {
  const made = []
  class FakeSocket {
    constructor(url) {
      this.url = url
      this.listeners = {}
      this.closed = false
      made.push(this)
    }
    addEventListener(type, fn) {
      ;(this.listeners[type] ||= []).push(fn)
    }
    emit(type, event = {}) {
      for (const fn of this.listeners[type] || []) fn(event)
    }
    close() {
      this.closed = true
    }
  }
  return { FakeSocket, made }
}

const tick = (ms) => new Promise((r) => setTimeout(r, ms))

test('listen connects to the desktop socket and passes notifications on', async () => {
  const { FakeSocket, made } = fakeSockets()
  const got = []
  const stop = listen((n) => got.push(n), { port: 7073, WebSocketImpl: FakeSocket })
  assert.strictEqual(made[0].url, 'ws://127.0.0.1:7073/api/desktop/ws')
  made[0].emit('open')
  made[0].emit('message', { data: '{"type":"notification","title":"redis stopped"}' })
  made[0].emit('message', { data: '{"type":"other"}' })
  assert.deepStrictEqual(got.map((n) => n.title), ['redis stopped'])
  stop()
  assert.strictEqual(made[0].closed, true)
})

test('listen retries a refused connection, backing off, until stopped', async () => {
  const { FakeSocket, made } = fakeSockets()
  const stop = listen(() => {}, { WebSocketImpl: FakeSocket, retryMinMs: 5, retryMaxMs: 20 })
  made[0].emit('error')
  made[0].emit('close')
  await tick(15)
  assert.strictEqual(made.length, 2, 'one retry after a refused connection')
  made[1].emit('close')
  await tick(30)
  assert.strictEqual(made.length, 3)
  stop()
  made[2].emit('close')
  await tick(40)
  assert.strictEqual(made.length, 3, 'no retry once stopped')
})

test('listen starts its back-off over once a connection opens', async () => {
  const { FakeSocket, made } = fakeSockets()
  const stop = listen(() => {}, { WebSocketImpl: FakeSocket, retryMinMs: 5, retryMaxMs: 1000 })
  for (let i = 0; i < 4; i++) {
    made[made.length - 1].emit('close')
    await tick(5 * 2 ** i + 10)
  }
  const before = made.length
  made[made.length - 1].emit('open')
  made[made.length - 1].emit('close')
  await tick(15)
  assert.strictEqual(made.length, before + 1, 'a dropped connection that had opened retries at the shortest delay')
  stop()
})
