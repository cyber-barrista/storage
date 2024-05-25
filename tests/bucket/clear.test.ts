import { getBucket } from '../../src/bucket'
import {
  clear,
  get,
  keysName,
  remove,
  set,
  x,
  y,
  Bucket,
  bucketConfig,
} from './setup'

beforeEach(() => {
  jest.clearAllMocks()
})

test('clear', async () => {
  const bucket = getBucket<Bucket>(bucketConfig)

  await bucket.clear()

  expect(set).not.toBeCalled()
  expect(clear).not.toBeCalled()

  expect(get).toBeCalledTimes(1)
  expect(get).toBeCalledWith(keysName, expect.any(Function))

  expect(remove).toBeCalledTimes(1)
  expect(remove).toBeCalledWith(
    [keysName, x, y],
    expect.any(Function),
  )
})
