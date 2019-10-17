import assert from 'power-assert'
import { useBucket } from '../../src/get-bucket'

const { get, set, remove, clear } = chrome.storage.local

const name = 'bucket1'
const bucket = useBucket('local', name)
const prefix = `bumble/storage__${name}`
const keysName = `${prefix}_keys`

const pfx = (k) => `${prefix}--${k}`

const xfmKeys = (xfm) => (obj) =>
  Object.keys(obj).reduce(
    (r, k) => ({ ...r, [xfm(k)]: obj[k] }),
    {},
  )

const pfxObj = xfmKeys(pfx)

const addKeys = (obj) => ({
  ...obj,
  [keysName]: Object.keys(obj),
})

beforeEach(() => {
  chrome.reset()
  get.yields({})
  set.yields()
  remove.yields()
  clear.yields()
})

test('set empty storage with object', async () => {
  get.yields({})

  const expected = { z: '789' }

  const result = await bucket.set(expected)

  expect(result).toEqual(expected)

  assert(get.calledOnce)
  assert(get.calledWith(keysName))

  const setter = {
    'bumble/storage__bucket1--z': '789',
    'bumble/storage__bucket1_keys': Object.keys(expected),
  }
  assert(set.calledOnce)
  assert(set.calledWith(setter))

  assert(remove.notCalled)
  assert(clear.notCalled)
})

test('set empty storage with function', async () => {
  get.yields({})

  const expected = { z: '789' }
  const spy = jest.fn(() => expected)

  const result = await bucket.set(spy)

  expect(result).toEqual(expected)

  assert(get.calledOnce)
  assert(get.calledWith(keysName))

  const setter = {
    'bumble/storage__bucket1--z': '789',
    'bumble/storage__bucket1_keys': Object.keys(expected),
  }
  assert(set.calledOnce)
  assert(set.calledWith(setter))

  assert(remove.notCalled)
  assert(clear.notCalled)
})
