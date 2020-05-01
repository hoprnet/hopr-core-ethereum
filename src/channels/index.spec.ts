import assert from 'assert'
import Web3 from 'web3'
import { Ganache, migrate, fund } from '@hoprnet/hopr-ethereum'
import { durations } from '@hoprnet/hopr-utils'
import { stringToU8a } from '@hoprnet/hopr-utils'
import HoprTokenAbi from '@hoprnet/hopr-ethereum/build/extracted/abis/HoprToken.json'
import HoprChannelsAbi from '@hoprnet/hopr-ethereum/build/extracted/abis/HoprChannels.json'
import * as configs from '../config'
import { wait, getParties, isPartyA, time } from '../utils'
import { getPrivKeyData, generateUser, generateNode } from '../utils/testing'
import { HoprToken } from '../tsc/web3/HoprToken'
import { HoprChannels } from '../tsc/web3/HoprChannels'
import { Await } from '../tsc/utils'
import type CoreConnector from '..'

const CLOSURE_DURATION = durations.days(3)

describe.skip('test channels', function () {
  const ganache = new Ganache()
  let web3: Web3
  let hoprToken: HoprToken
  let hoprChannels: HoprChannels
  let coreConnector: CoreConnector
  let userA: Await<ReturnType<typeof getPrivKeyData>>
  let userB: Await<ReturnType<typeof getPrivKeyData>>
  let userC: Await<ReturnType<typeof getPrivKeyData>>

  before(async function () {
    this.timeout(60e3)

    // initialize ganache and contracts
    await ganache.start()
    await migrate()
    await fund()

    web3 = new Web3(configs.DEFAULT_URI)
    hoprToken = new web3.eth.Contract(HoprTokenAbi as any, configs.TOKEN_ADDRESSES.private)
    hoprChannels = new web3.eth.Contract(HoprChannelsAbi as any, configs.CHANNELS_ADDRESSES.private)

    userA = await getPrivKeyData(stringToU8a(configs.FUND_ACCOUNT_PRIVATE_KEY))
    userB = await generateUser(web3, userA, hoprToken)
    userC = await generateUser(web3, userA, hoprToken)
    coreConnector = await generateNode(userA.privKey)

    await hoprToken.methods.approve(hoprChannels.options.address, 100).send({
      from: userA.address.toHex(),
    })

    await coreConnector.start()
    await coreConnector.db.clear()
  })

  after(async function () {
    await coreConnector.stop()
    await ganache.stop()
  })

  context('intergration tests', function () {
    it('should not store channel before confirmations', async function () {
      this.timeout(5e3)

      await hoprChannels.methods.fundChannel(userA.address.toHex(), userB.address.toHex(), 1).send({
        from: userA.address.toHex(),
        gas: 200e3,
      })

      await hoprChannels.methods.openChannel(userB.address.toHex()).send({
        from: userA.address.toHex(),
        gas: 200e3,
      })

      await wait(3e3)

      const allChannels = await coreConnector.channels.getAll(coreConnector)
      assert.equal(allChannels.length, 0, 'check Channels.store')
    })

    it('should store channel & blockNumber correctly', async function () {
      const currentBlockNumber = await web3.eth.getBlockNumber()
      await time.advanceBlockTo(web3, currentBlockNumber + configs.MAX_CONFIRMATIONS)

      const allChannels = await coreConnector.channels.getAll(coreConnector)
      assert.equal(allChannels.length, 1, 'check Channels.store')
    })

    it('should query all channels', async function () {
      const [partyA, partyB] = getParties(userA.address, userB.address)

      const blockNumber = await web3.eth.getBlockNumber().then((blockNumber) => blockNumber - configs.MAX_CONFIRMATIONS)
      const allChannels = await coreConnector.channels.getAll(coreConnector)
      const latestConfirmedBlockNumber = await coreConnector.channels.getLatestConfirmedBlockNumber(coreConnector)

      assert(allChannels[0].partyA.eq(partyA), 'check Channels.store')
      assert(allChannels[0].partyB.eq(partyB), 'check Channels.store')
      assert.equal(allChannels[0].blockNumber, blockNumber, 'check Channels.store')
      assert.equal(latestConfirmedBlockNumber, blockNumber, 'check Channels.store')
    })

    it('should query channel using partyA', async function () {
      const [partyA, partyB] = getParties(userA.address, userB.address)

      const channels = await coreConnector.channels.get(coreConnector, {
        partyA,
      })

      assert.equal(channels.length, 1, 'check Channels.get')
      assert(channels[0].partyA.eq(partyA), 'check Channels.get')
      assert(channels[0].partyB.eq(partyB), 'check Channels.get')
    })

    it('should query channel using partyB', async function () {
      const [partyA, partyB] = getParties(userA.address, userB.address)

      const channels = await coreConnector.channels.get(coreConnector, {
        partyA,
      })

      assert.equal(channels.length, 1, 'check Channels.get')
      assert(channels[0].partyA.eq(partyA), 'check Channels.get')
      assert(channels[0].partyB.eq(partyB), 'check Channels.get')
    })

    it('should query channel using partyA & partyB', async function () {
      const [partyA, partyB] = getParties(userA.address, userB.address)

      const channels = await coreConnector.channels.get(coreConnector, {
        partyA,
        partyB,
      })

      assert.equal(channels.length, 1, 'check Channels.get')
      assert(channels[0].partyA.eq(partyA), 'check Channels.get')
      assert(channels[0].partyB.eq(partyB), 'check Channels.get')
    })

    it('should store another channel', async function () {
      this.timeout(5e3)

      const userAisPartyA = isPartyA(userA.address, userC.address)
      const [partyA, partyB] = getParties(userA.address, userC.address)

      await hoprChannels.methods.fundChannel(userA.address.toHex(), userC.address.toHex(), 1).send({
        from: userA.address.toHex(),
        gas: 200e3,
      })

      await hoprChannels.methods.openChannel(userC.address.toHex()).send({
        from: userA.address.toHex(),
        gas: 200e3,
      })

      await wait(3e3)
      const currentBlockNumber = await web3.eth.getBlockNumber()
      await time.advanceBlockTo(web3, currentBlockNumber + configs.MAX_CONFIRMATIONS)

      const allChannels = await coreConnector.channels.getAll(coreConnector)
      assert.equal(allChannels.length, 2, 'check Channels.store')

      const channelsByA = await coreConnector.channels.get(coreConnector, {
        partyA,
      })
      assert.equal(channelsByA.length, userAisPartyA ? 2 : 1, 'check Channels.get')

      const channelsByB = await coreConnector.channels.get(coreConnector, {
        partyB,
      })
      assert.equal(channelsByB.length, userAisPartyA ? 1 : 2, 'check Channels.get')
    })

    it('should not delete channel before confirmations', async function () {
      await hoprChannels.methods.initiateChannelClosure(userB.address.toHex()).send({
        from: userA.address.toHex(),
        gas: 200e3,
      })

      await time.increase(web3, Math.floor(CLOSURE_DURATION / 1e3))

      await hoprChannels.methods.claimChannelClosure(userB.address.toHex()).send({
        from: userA.address.toHex(),
        gas: 200e3,
      })

      const allChannels = await coreConnector.channels.getAll(coreConnector)
      assert.equal(allChannels.length, 2, 'check Channels.store')
    })

    it('should delete channel', async function () {
      const currentBlockNumber = await web3.eth.getBlockNumber()
      await time.advanceBlockTo(web3, currentBlockNumber + configs.MAX_CONFIRMATIONS)

      const allChannels = await coreConnector.channels.getAll(coreConnector)
      assert.equal(allChannels.length, 1, 'check Channels.store')
    })
  })

  context('unit tests', function () {
    beforeEach(async function () {
      await coreConnector.db.clear()
    })

    it('should not store older channel', async function () {
      await coreConnector.channels.onOpenedChannel(coreConnector, {
        returnValues: {
          opener: userA.address.toHex(),
          counterParty: userB.address.toHex(),
        },
        blockNumber: 2,
      } as any)

      await coreConnector.channels.onOpenedChannel(coreConnector, {
        returnValues: {
          opener: userA.address.toHex(),
          counterParty: userB.address.toHex(),
        },
        blockNumber: 1,
      } as any)

      const allChannels = await coreConnector.channels.getAll(coreConnector)
      assert.equal(allChannels.length, 1, 'check Channels.onOpenedChannel')
      assert.equal(allChannels[0].blockNumber, 2, 'check Channels.onOpenedChannel')
    })

    it('should not delete latest channel', async function () {
      await coreConnector.channels.onOpenedChannel(coreConnector, {
        returnValues: {
          opener: userA.address.toHex(),
          counterParty: userB.address.toHex(),
        },
        blockNumber: 2,
      } as any)

      await coreConnector.channels.onClosedChannel(coreConnector, {
        returnValues: {
          closer: userA.address.toHex(),
          counterParty: userB.address.toHex(),
        },
        blockNumber: 1,
      } as any)

      const allChannels = await coreConnector.channels.getAll(coreConnector)
      assert.equal(allChannels.length, 1, 'check Channels.onClosedChannel')
      assert.equal(allChannels[0].blockNumber, 2, 'check Channels.onClosedChannel')
    })
  })
})