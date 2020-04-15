import type { Types } from "@hoprnet/hopr-core-connector-interface";
import { Uint8ArrayE } from '../types/extended';
declare class Signature extends Uint8ArrayE implements Types.Signature {
    constructor(arr?: {
        bytes: ArrayBuffer;
        offset: number;
    }, struct?: {
        signature: Uint8Array;
        recovery: number;
    });
    get signature(): Uint8Array;
    get recovery(): number;
    get msgPrefix(): Uint8Array;
    get onChainSignature(): Uint8Array;
    static get SIZE(): number;
    static create(arr?: {
        bytes: ArrayBuffer;
        offset: number;
    }, struct?: {
        signature: Uint8Array;
        recovery: number;
    }): Signature;
}
export default Signature;