import { Bucket, getBucket } from './bucket';
declare type Storage = {
    local: Bucket<Record<string, any>>;
    sync: Bucket<Record<string, any>>;
    managed: Bucket<Record<string, any>>;
};
/**
 * Buckets for each storage area.
 */
export declare const storage: Storage;
export * from './types';
export { getBucket };
/**
 * Deprecated. Use `getBucket`.
 */
export declare const useBucket: <T extends object>(areaName: 'local' | 'sync' | 'managed', bucketName: string) => Bucket<T>;
