import { Ganache, migrate } from '@hoprnet/hopr-ethereum'
import assert from 'assert'
import { stringToU8a, u8aToHex, u8aEquals, u8aXOR } from '@hoprnet/hopr-utils'
import HoprTokenAbi from '@hoprnet/hopr-ethereum/build/extracted/abis/HoprToken.json'
import { getPrivKeyData, createAccountAndFund, createNode } from '../utils/testing'
import BN from 'bn.js'
import pipe from 'it-pipe'
import Web3 from 'web3'
import { HoprToken } from '../tsc/web3/HoprToken'
import { Await } from '../tsc/utils'
import { AccountId, Channel as ChannelType, Balance, ChannelBalance, Hash, SignedChannel } from '../types'
import { ChannelStatus } from '../types/channel'
import CoreConnector from '..'
import Channel from '.'
import * as configs from '../config'

describe('test Channel class', function () {
  const ganache = new Ganache()
  const channels = new Map<string, ChannelType>()
  const preChannels = new Map<string, ChannelType>()
  let web3: Web3
  let hoprToken: HoprToken
  let coreConnector: CoreConnector
  let counterpartysCoreConnector: CoreConnector
  let funder: Await<ReturnType<typeof getPrivKeyData>>

  before(async function () {
    this.timeout(60e3)

    await ganache.start()
    await migrate()

    web3 = new Web3(configs.DEFAULT_URI)
    hoprToken = new web3.eth.Contract(HoprTokenAbi as any, configs.TOKEN_ADDRESSES.private)
  })

  after(async function () {
    await ganache.stop()
  })

  beforeEach(async function () {
    channels.clear()
    preChannels.clear()

    funder = await getPrivKeyData(stringToU8a(configs.FUND_ACCOUNT_PRIVATE_KEY))
    const userA = await createAccountAndFund(web3, hoprToken, funder, configs.DEMO_ACCOUNTS[1])
    const userB = await createAccountAndFund(web3, hoprToken, funder, configs.DEMO_ACCOUNTS[2])

    coreConnector = await createNode(userA.privKey)
    counterpartysCoreConnector = await createNode(userB.privKey)
  })

  it('should create a channel', async function () {
    const channelType = new ChannelType(undefined, {
      balance: new ChannelBalance(undefined, {
        balance: new BN(123),
        balance_a: new BN(122),
      }),
      status: ChannelStatus.FUNDING,
    })

    const channelId = await coreConnector.utils.getId(
      new AccountId(coreConnector.self.onChainKeyPair.publicKey),
      new AccountId(counterpartysCoreConnector.self.onChainKeyPair.publicKey)
    )

    const signedChannel = await SignedChannel.create(counterpartysCoreConnector, undefined, { channel: channelType })

    preChannels.set(u8aToHex(channelId), channelType)

    const channel = await Channel.create(
      coreConnector,
      counterpartysCoreConnector.self.publicKey,
      async () => counterpartysCoreConnector.self.onChainKeyPair.publicKey,
      signedChannel.channel.balance,
      async () => {
        const result = await pipe(
          [(await SignedChannel.create(coreConnector, undefined, { channel: channelType })).subarray()],
          Channel.handleOpeningRequest(counterpartysCoreConnector),
          async (source: AsyncIterable<any>) => {
            let result: Uint8Array
            for await (const msg of source) {
              if (result! == null) {
                result = msg.slice()
                return result
              } else {
                continue
              }
            }
          }
        )

        return new SignedChannel({
          bytes: result.buffer,
          offset: result.byteOffset,
        })
      }
    )

    channels.set(u8aToHex(channelId), channelType)

    let secret: Uint8Array
    try {
      secret = await coreConnector.db.get(Buffer.from(coreConnector.dbKeys.OnChainSecret()))
    } catch (err) {
      throw err
    }

    let secretCounterParty: Uint8Array
    try {
      secretCounterParty = await counterpartysCoreConnector.db.get(Buffer.from(coreConnector.dbKeys.OnChainSecret()))
    } catch (err) {
      throw err
    }

    const challange = u8aXOR(false, secret, secretCounterParty)

    const signedTicket = await channel.ticket.create(channel, new Balance(1), new Hash(challange))
    assert(u8aEquals(await signedTicket.signer, coreConnector.self.publicKey), `Check that signer is recoverable`)

    const signedChannelCounterparty = await SignedChannel.create(coreConnector, undefined, { channel: channelType })
    assert(
      u8aEquals(await signedChannelCounterparty.signer, coreConnector.self.publicKey),
      `Check that signer is recoverable.`
    )

    counterpartysCoreConnector.db.put(
      Buffer.from(coreConnector.dbKeys.Channel(coreConnector.self.onChainKeyPair.publicKey)),
      Buffer.from(signedChannelCounterparty)
    )

    const dbChannels = (await counterpartysCoreConnector.channel.getAll(
      counterpartysCoreConnector,
      async (arg: any) => arg,
      async (arg: any) => Promise.all(arg)
    )) as Channel[]

    assert(
      u8aEquals(dbChannels[0].counterparty, coreConnector.self.onChainKeyPair.publicKey),
      `Channel record should make it into the database and its db-key should lead to the AccountId of the counterparty.`
    )

    const counterpartysChannel = await Channel.create(
      counterpartysCoreConnector,
      coreConnector.self.publicKey,
      () => Promise.resolve(coreConnector.self.onChainKeyPair.publicKey),
      signedChannel.channel.balance,
      () => Promise.resolve(signedChannelCounterparty)
    )

    assert(
      await coreConnector.channel.isOpen(coreConnector, counterpartysCoreConnector.self.onChainKeyPair.publicKey),
      `Checks that party A considers the channel open.`
    )
    assert(
      await counterpartysCoreConnector.channel.isOpen(
        counterpartysCoreConnector,
        coreConnector.self.onChainKeyPair.publicKey
      ),
      `Checks that party B considers the channel open.`
    )

    await channel.testAndSetNonce(new Uint8Array(1).fill(0xff)), `Should be able to set nonce.`

    assert.rejects(
      () => channel.testAndSetNonce(new Uint8Array(1).fill(0xff)),
      `Should reject when trying to set nonce twice.`
    )

    assert(
      await counterpartysChannel.ticket.verify(counterpartysChannel, signedTicket),
      `Ticket signature must be valid.`
    )
  })
})
