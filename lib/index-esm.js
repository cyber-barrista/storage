import { fromEventPattern, concat, from } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';
import chromep from 'chrome-promise';

// export const invalidGetter = (g: any): string | void => {
//   switch (typeof g) {
//     case 'undefined':
//     case 'string':
//     case 'function':
//       return
//     case 'object': {
//       if (Array.isArray(g)) {
//         const x = g.find((x) => typeof x !== 'string')
//         if (x) {
//           return `Unexpected argument type: Array<${typeof x}>`
//         }
//       }
//       return
//     }
//     default:
//       return `Unexpected argument type: ${typeof g}`
//   }
// }
// export const invalidSetter = (s: any): string | void => {
//   if (Array.isArray(s)) {
//     return 'Unexpected argument type: Array'
//   } else if (s) {
//     switch (typeof s) {
//       case 'function':
//       case 'object':
//         return
//       default:
//         return `Unexpected argument type: ${typeof s}`
//     }
//   }
// }
const invalidSetterReturn = (r) => {
    if (Array.isArray(r)) {
        return 'Unexpected setter result value: Array';
    }
    else {
        switch (typeof r) {
            case 'object':
            case 'undefined':
                return;
            default:
                return `Unexpected setter return value: ${typeof r}`;
        }
    }
};

function isNonNull(value) {
    return value != null;
}

const getStorageArea = (area) => {
    switch (area) {
        case 'local':
            return chromep.storage.local;
        case 'sync':
            return chromep.storage.sync;
        case 'managed':
            return chromep.storage.managed;
        default:
            throw new TypeError(`area must be "local" | "sync" | "managed"`);
    }
};
/**
 * Create a bucket (synthetic storage area).
 *
 * @param {string} bucketName Must be a id for each bucket.
 * @param {string} [areaName = 'local'] The name of the storage area to use.
 * @returns {Bucket} Returns a bucket.
 */
function getBucket(bucketName, areaName) {
    /* ------------- GET STORAGE AREA ------------- */
    if (!areaName)
        areaName = 'local';
    const _areaName = areaName;
    const storage = getStorageArea(_areaName);
    /* --------------- SETUP BUCKET --------------- */
    const prefix = `extend-chrome/storage__${bucketName}`;
    const keys = `${prefix}_keys`;
    const pfx = (k) => {
        return `${prefix}--${k}`;
    };
    const unpfx = (pk) => {
        return pk.replace(`${prefix}--`, '');
    };
    const xfmKeys = (xfm) => (obj) => {
        return Object.keys(obj).reduce((r, k) => (Object.assign(Object.assign({}, r), { [xfm(k)]: obj[k] })), {});
    };
    const pfxAry = (ary) => {
        return ary.map(pfx);
    };
    const pfxObj = xfmKeys(pfx);
    const unpfxObj = xfmKeys(unpfx);
    const getKeys = async () => {
        const result = await storage.get(keys);
        return result[keys] || [];
    };
    const setKeys = (_keys) => {
        return storage.set({ [keys]: _keys });
    };
    /* --------- STORAGE OPERATION PROMISE -------- */
    let promise = null;
    async function coreGet(x) {
        // Flush pending storage.set ops before
        if (promise)
            return promise;
        if (typeof x === 'undefined' || x === null) {
            // get all
            const keys = await getKeys();
            if (!keys.length) {
                return {};
            }
            else {
                const getter = pfxAry(keys);
                const result = await storage.get(getter);
                return unpfxObj(result);
            }
        }
        else if (typeof x === 'string') {
            // string getter, get one
            const getter = pfx(x);
            const result = await storage.get(getter);
            return unpfxObj(result);
        }
        else if (Array.isArray(x)) {
            // string array getter, get each
            const getter = pfxAry(x);
            const result = await storage.get(getter);
            return unpfxObj(result);
        }
        else {
            // object getter, get each key
            const getter = pfxObj(x);
            const result = await storage.get(getter);
            return unpfxObj(result);
        }
    }
    function get(getter) {
        if (getter === null || getter === undefined) {
            return coreGet();
        }
        if (typeof getter === 'string' || typeof getter === 'object')
            return coreGet(getter);
        if (typeof getter === 'function')
            return coreGet().then(getter);
        throw new TypeError(`Unexpected argument type: ${typeof getter}`);
    }
    /* -------------------------------------------- */
    /*                  STORAGE.SET                 */
    /* -------------------------------------------- */
    const _createNextValue = (x) => x;
    let createNextValue = _createNextValue;
    function set(arg) {
        return new Promise((resolve, reject) => {
            let setter;
            if (typeof arg === 'function') {
                setter = (prev) => {
                    const result = arg(prev);
                    const errorMessage = invalidSetterReturn(result);
                    if (errorMessage) {
                        reject(new TypeError(errorMessage));
                        return prev;
                    }
                    else {
                        return Object.assign(Object.assign({}, prev), result);
                    }
                };
            }
            else {
                setter = (prev) => (Object.assign(Object.assign({}, prev), arg));
            }
            const composeFn = createNextValue;
            createNextValue = (prev) => (Object.assign(Object.assign({}, prev), setter(composeFn(prev))));
            if (promise === null) {
                // Update storage starting with current values
                promise = coreGet().then((prev) => {
                    try {
                        // Compose new values
                        const next = createNextValue(prev);
                        const pfxNext = pfxObj(next);
                        pfxNext[keys] = Object.keys(next);
                        // Execute set
                        return storage.set(pfxNext).then(() => next);
                    }
                    finally {
                        // Clean up after a set operation
                        createNextValue = _createNextValue;
                        promise = null;
                    }
                });
            }
            // All calls to set should call resolve or reject
            promise.then(resolve).catch(reject);
        });
    }
    const remove = (arg) => {
        const query = [].concat(arg);
        query.forEach((x) => {
            if (typeof x !== 'string') {
                throw new TypeError(`Unexpected argument type: ${typeof x}`);
            }
        });
        const _setKeys = (_keys) => setKeys(_keys.filter((k) => !query.includes(k)));
        return storage
            .remove(pfxAry(query))
            .then(getKeys)
            .then(_setKeys);
    };
    const nativeChange$ = fromEventPattern((handler) => {
        chrome.storage.onChanged.addListener(handler);
    }, (handler) => {
        chrome.storage.onChanged.removeListener(handler);
    });
    const changeStream = nativeChange$.pipe(filter(([changes, area]) => {
        return (area === areaName &&
            Object.keys(changes).some((k) => k.startsWith(prefix)));
    }), map(([changes]) => {
        const bucketChanges = Object.keys(changes).filter((k) => k.startsWith(prefix) && k !== keys);
        return bucketChanges.length
            ? bucketChanges.reduce((r, k) => (Object.assign(Object.assign({}, r), { [unpfx(k)]: changes[k] })), {})
            : undefined;
    }), filter(isNonNull));
    return {
        set,
        get,
        remove,
        async clear() {
            const _keys = await getKeys();
            const query = [keys, ...pfxAry(_keys)];
            return storage.remove(query);
        },
        async update(updater) {
            const store = await get();
            const result = await updater(store);
            return set(result);
        },
        async getKeys() {
            return getKeys();
        },
        get changeStream() {
            return changeStream;
        },
        get valueStream() {
            return concat(from(get()), changeStream.pipe(mergeMap(() => get())));
        },
    };
}

class StorageImpl {
    get local() {
        return getBucket('local', 'local');
    }
    get sync() {
        return getBucket('sync', 'sync');
    }
    get managed() {
        return getBucket('managed', 'managed');
    }
}
/**
 * Buckets for each storage area.
 */
const storage = new StorageImpl();
/**
 * Deprecated. Use `getBucket`.
 */
const useBucket = (areaName, bucketName) => getBucket(bucketName, areaName);

export { getBucket, storage, useBucket };
//# sourceMappingURL=index-esm.js.map