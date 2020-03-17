import type { Types } from "@hoprnet/hopr-core-connector-interface"
import secp256k1 from 'secp256k1'
import { Signature, Channel } from '.'
import { u8aConcat, u8aEquals } from '../core/u8a'
import { Uint8ArrayE } from '../types/extended'
import { AccountId } from '../types'
import { sign, verify, hashSync } from '../utils'
import HoprEthereum from '..'

class SignedChannel extends Uint8ArrayE implements Types.SignedChannel<Channel, Signature> {
  private _signature?: Signature
  private _channel?: Channel

  constructor(
    arr?: {
      bytes: ArrayBuffer
      offset: number
    },
    struct?: {
      signature: Signature
      channel: Channel
    }
  ) {
    if (arr != null && struct == null) {
      super(arr.bytes, arr.offset, SignedChannel.SIZE)
    } else if (arr == null && struct != null) {
      super(u8aConcat(struct.signature, struct.channel))
    } else {
      throw Error(`Invalid constructor arguments.`)
    }
  }

  get signature() {
    if (this._signature == null) {
      const signature = this.subarray(0, Signature.SIZE)

      this._signature = new Signature({
        bytes: signature.buffer,
        offset: signature.byteOffset
      })
    }

    return this._signature
  }

  get channel() {
    if (this._channel == null) {
      const channel = this.subarray(Signature.SIZE, Signature.SIZE + Channel.SIZE)

      this._channel = new Channel({
        bytes: channel.buffer,
        offset: channel.byteOffset
      })
    }

    return this._channel
  }

  get signer() {
    return new AccountId(
      secp256k1.ecdsaRecover(this.signature.signature, this.signature.recovery, hashSync(this.channel.toU8a()))
    )
  }

  async verify(coreConnector: HoprEthereum) {
    return await verify(this.channel.toU8a(), this.signature, coreConnector.self.publicKey)
  }

  static get SIZE() {
    return Signature.SIZE + Channel.SIZE
  }

  static async create(
    coreConnector: HoprEthereum,
    arr?: {
      bytes: ArrayBuffer,
      offset: number
    }, struct?: {
      channel: Channel,
      signature?: Signature
    }
  ): Promise<SignedChannel> {
    const emptySignatureArray = new Uint8Array(Signature.SIZE).fill(0x00)
    let signedChannel: SignedChannel

    if (typeof arr !== "undefined") {
      signedChannel = new SignedChannel(arr)
    } else if (typeof struct !== "undefined") {
      signedChannel = new SignedChannel(undefined, {
        channel: struct.channel,
        signature: struct.signature || new Signature({
          bytes: emptySignatureArray.buffer,
          offset: emptySignatureArray.byteOffset
        })
      })
    } else {
      throw Error(`Invalid input parameters.`)
    }

    if (signedChannel.signature.eq(emptySignatureArray)) {
      const channelHash = await coreConnector.utils.hash(signedChannel.channel.toU8a())
      signedChannel.set(await sign(channelHash, coreConnector.self.privateKey), 0)
    }

    return signedChannel
  }
}

export default SignedChannel