import cases from 'jest-in-case'
import { getBucket } from '../../src/bucket'
import {
  anyFn,
  Bucket,
  clear,
  get,
  keysName,
  remove,
  set,
  x,
  z,
  y,
  bucketConfig,
} from './setup'

beforeEach(jest.clearAllMocks)

cases<{
  remover: any
  rawRemover: any
  newKeys: (keyof Bucket)[]
}>(
  'each remover type',
  async ({ remover, rawRemover, newKeys }) => {
    const bucket = getBucket<Bucket>(bucketConfig)

    await bucket.remove(remover)

    expect(remove).toBeCalledTimes(1)
    expect(remove).toBeCalledWith(rawRemover, anyFn)

    expect(get).toBeCalledTimes(1)
    expect(get).toBeCalledWith(keysName, anyFn)

    expect(set).toBeCalledTimes(1)
    expect(set).toBeCalledWith(
      {
        [keysName]: newKeys,
      },
      anyFn,
    )

    expect(clear).not.toBeCalled()
  },
  {
    string: {
      remover: 'x',
      rawRemover: [x],
      newKeys: ['y'],
    },
    array: {
      remover: ['y', 'z'],
      rawRemover: [y, z],
      newKeys: ['x'],
    },
  },
)

cases<{ remover: any; type: any }>(
  'each invalid remover type',
  async ({ remover, type }) => {
    const bucket = getBucket<Bucket>(bucketConfig)

    expect(() => bucket.remove(remover)).toThrow(
      new TypeError(`Unexpected argument type: ${type}`),
    )
  },
  {
    number: { remover: 123, type: 'number' },
    boolean: { remover: true, type: 'boolean' },
    mixedArray: { remover: ['a', 1], type: 'number' },
  },
)
