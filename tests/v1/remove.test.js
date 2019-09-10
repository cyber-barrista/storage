import assert from 'power-assert'
import { storage } from '../../src/get-basket'

const { get, set, remove, clear } = chrome.storage.local
const values = { x: '123', y: '456' }

beforeEach(() => {
  chrome.reset()
  get.yields(values)
  set.yields()
  remove.yields()
  clear.yields()
})

test('remove with string', async () => {
  const arg = 'x'
  const query = [arg]

  await storage.local.remove(arg)

  assert(set.notCalled)
  assert(clear.notCalled)

  assert(remove.calledOnceWith(query))
})

test('remove with array', async () => {
  const arg = ['x', 'z']

  await storage.local.remove(arg)

  assert(set.notCalled)
  assert(clear.notCalled)

  assert(remove.calledOnceWith(arg))
})

test('throws with unexpected args', async () => {
  const withNum = () => storage.local.remove(2)
  const withBool = () => storage.local.remove(true)
  const withMixedArray = () => storage.local.remove(['a', true])

  expect(withNum).toThrow(
    new TypeError('Unexpected argument type: number'),
  )

  expect(withBool).toThrow(
    new TypeError('Unexpected argument type: boolean'),
  )

  expect(withMixedArray).toThrow(
    new TypeError('Unexpected argument type: boolean'),
  )
})