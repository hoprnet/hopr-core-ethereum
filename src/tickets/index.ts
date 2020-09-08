import type HoprEthereum from '..'
import { Hash, Public } from '../types'

/**
 * Store and get tickets stored by the node.
 */
class Tickets {
  constructor(public coreConnector: HoprEthereum) {}

  async store(counterparty: Public, signedTicket: any): Promise<void> {
    // const key = Buffer.from(this.coreConnector.dbKeys.Ticket(channelId, signedTicket.ticket.challenge))
    // const value = Buffer.from(signedTicket)
    // await this.coreConnector.db.put(key, value)
  }

  async get(counterparty: Public): Promise<Map<string, any>> {
    const tickets = new Map<string, any>()

    return new Promise(async (resolve, reject) => {
      // this.coreConnector.db
      //   .createReadStream({
      //     gte: Buffer.from(this.coreConnector.dbKeys.Ticket(channelId, new Uint8Array(Hash.SIZE).fill(0x00))),
      //     lte: Buffer.from(this.coreConnector.dbKeys.Ticket(channelId, new Uint8Array(Hash.SIZE).fill(0xff))),
      //   })
      //   .on('error', (err) => reject(err))
      //   .on('data', ({ value }: { value: Buffer }) => {
      //     const signedTicket = new SignedTicket({
      //       bytes: value.buffer,
      //       offset: value.byteOffset,
      //     })

      //     tickets.set(signedTicket.ticket.challenge.toHex(), signedTicket)
      //   })
      //   .on('end', () => resolve(tickets))

      resolve(tickets)
    })
  }
}

export default Tickets
