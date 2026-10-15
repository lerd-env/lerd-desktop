'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { EventEmitter } = require('node:events')
const { ALREADY_RUNNING, agentCommand, nextDelay, superviseAgent } = require('../src/agent')

const LOCAL = 'C:\\Users\\me\\AppData\\Local'
const EXE = 'C:\\Users\\me\\AppData\\Local\\lerd\\bin\\lerd.exe'
const CONF = 'C:\\Users\\me\\AppData\\Local\\lerd\\bin\\lerd-wsl.conf'

test('agentCommand starts the shim as the agent once wsl:setup has set it up', () => {
  const both = new Set([EXE, CONF])
  assert.deepStrictEqual(agentCommand({ localAppData: LOCAL, exists: (f) => both.has(f) }), { file: EXE, args: ['--agent'] })
})

test('agentCommand waits while the shim or its config is missing', () => {
  assert.strictEqual(agentCommand({ localAppData: LOCAL, exists: (f) => f === CONF }), null, 'shim quarantined')
  assert.strictEqual(agentCommand({ localAppData: LOCAL, exists: (f) => f === EXE }), null, 'not set up')
})

test('nextDelay starts a working agent again at once and backs off a failing one', () => {
  assert.strictEqual(nextDelay({ code: 0, ranMs: 120000, lastDelay: 60000 }), 2000)
  assert.strictEqual(nextDelay({ code: 1, ranMs: 100, lastDelay: 0 }), 2000)
  assert.strictEqual(nextDelay({ code: 1, ranMs: 100, lastDelay: 2000 }), 4000)
  assert.strictEqual(nextDelay({ code: 1, ranMs: 100, lastDelay: 40000 }), 60000)
})

test('nextDelay leaves another agent be and only looks again later', () => {
  assert.strictEqual(nextDelay({ code: ALREADY_RUNNING, ranMs: 50, lastDelay: 0 }), 60000)
})

// harness runs superviseAgent with a fake clock, spawn and scheduler.
function harness(commandResult = { file: EXE, args: ['--agent'] }) {
  const spawned = []
  const scheduled = []
  let clock = 0
  superviseAgent({
    command: () => commandResult,
    spawn: (file, args) => {
      const child = new EventEmitter()
      spawned.push({ file, args, child })
      return child
    },
    now: () => clock,
    schedule: (fn, ms) => scheduled.push({ fn, ms }),
  })
  return {
    spawned,
    scheduled,
    advance: (ms) => (clock += ms),
    runNext: () => scheduled.shift().fn(),
  }
}

test('superviseAgent starts the agent and starts it again when it exits', () => {
  const h = harness()
  assert.strictEqual(h.spawned.length, 1)
  assert.deepStrictEqual(h.spawned[0].args, ['--agent'])
  h.advance(5 * 60000)
  h.spawned[0].child.emit('exit', 0)
  assert.strictEqual(h.scheduled[0].ms, 2000)
  h.runNext()
  assert.strictEqual(h.spawned.length, 2)
})

test('superviseAgent counts an error and the exit after it once', () => {
  const h = harness()
  h.spawned[0].child.emit('error', new Error('spawn ENOENT'))
  h.spawned[0].child.emit('exit', null)
  assert.strictEqual(h.scheduled.length, 1)
})

test('superviseAgent looks again later while lerd is not set up', () => {
  const h = harness(null)
  assert.strictEqual(h.spawned.length, 0)
  assert.strictEqual(h.scheduled[0].ms, 60000)
})
