"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bn_js_1 = __importDefault(require("bn.js"));
const hopr_utils_1 = require("@hoprnet/hopr-utils");
const _1 = require(".");
const extended_1 = require("../types/extended");
const utils_1 = require("../utils");
const WIN_PROB = new bn_js_1.default(1);
class Ticket extends extended_1.Uint8ArrayE {
    constructor(arr, struct) {
        if (arr == null && struct == null) {
            throw Error(`Invalid constructor arguments.`);
        }
        if (arr == null) {
            super(Ticket.SIZE);
        }
        else {
            super(arr.bytes, arr.offset, Ticket.SIZE);
        }
        if (struct != null) {
            this.set(struct.channelId, this.channelIdOffset - this.byteOffset);
            this.set(struct.challenge, this.challengeOffset - this.byteOffset);
            this.set(struct.epoch.toU8a(), this.epochOffset - this.byteOffset);
            this.set(struct.amount.toU8a(), this.amountOffset - this.byteOffset);
            this.set(struct.winProb, this.winProbOffset - this.byteOffset);
            this.set(struct.onChainSecret, this.onChainSecretOffset - this.byteOffset);
        }
    }
    get channelIdOffset() {
        return this.byteOffset;
    }
    get channelId() {
        return new _1.Hash(new Uint8Array(this.buffer, this.channelIdOffset, _1.Hash.SIZE));
    }
    get challengeOffset() {
        return this.byteOffset + _1.Hash.SIZE;
    }
    get challenge() {
        return new _1.Hash(new Uint8Array(this.buffer, this.challengeOffset, _1.Hash.SIZE));
    }
    get epochOffset() {
        return this.byteOffset + _1.Hash.SIZE + _1.Hash.SIZE;
    }
    get epoch() {
        return new _1.TicketEpoch(new Uint8Array(this.buffer, this.epochOffset, _1.TicketEpoch.SIZE));
    }
    get amountOffset() {
        return this.byteOffset + _1.Hash.SIZE + _1.Hash.SIZE + _1.TicketEpoch.SIZE;
    }
    get amount() {
        return new _1.Balance(new Uint8Array(this.buffer, this.amountOffset, _1.Balance.SIZE));
    }
    get winProbOffset() {
        return this.byteOffset + _1.Hash.SIZE + _1.Hash.SIZE + _1.TicketEpoch.SIZE + _1.Balance.SIZE;
    }
    get winProb() {
        return new _1.Hash(new Uint8Array(this.buffer, this.winProbOffset, _1.Hash.SIZE));
    }
    get onChainSecretOffset() {
        return this.byteOffset + _1.Hash.SIZE + _1.Hash.SIZE + _1.TicketEpoch.SIZE + _1.Balance.SIZE + _1.Hash.SIZE;
    }
    get onChainSecret() {
        return new _1.Hash(new Uint8Array(this.buffer, this.onChainSecretOffset, _1.Hash.SIZE));
    }
    get hash() {
        return utils_1.hash(hopr_utils_1.u8aConcat(this.challenge, this.onChainSecret, this.epoch.toU8a(), this.amount.toU8a(), this.winProb));
    }
    static get SIZE() {
        return _1.Hash.SIZE + _1.Hash.SIZE + _1.TicketEpoch.SIZE + _1.Balance.SIZE + _1.Hash.SIZE + _1.Hash.SIZE;
    }
    getEmbeddedFunds() {
        return this.amount.mul(new bn_js_1.default(this.winProb)).div(new bn_js_1.default(new Uint8Array(_1.Hash.SIZE).fill(0xff)));
    }
    static async create(channel, amount, challenge, arr) {
        const winProb = new extended_1.Uint8ArrayE(new bn_js_1.default(new Uint8Array(_1.Hash.SIZE).fill(0xff)).div(WIN_PROB).toArray('le', _1.Hash.SIZE));
        const channelId = await channel.channelId;
        const ticket = new Ticket(undefined, {
            channelId,
            challenge,
            epoch: new _1.TicketEpoch(1),
            amount: new _1.Balance(amount.toString()),
            winProb,
            onChainSecret: new _1.Hash(),
        });
        const signature = await utils_1.sign(await ticket.hash, channel.coreConnector.self.privateKey);
        const signedTicket = new _1.SignedTicket(undefined, {
            signature,
            ticket,
        });
        return signedTicket;
    }
    static async verify(channel, signedTicket) {
        // @TODO: check if this is needed
        // if ((await channel.currentBalanceOfCounterparty).add(signedTicket.ticket.amount).lt(await channel.balance)) {
        //   return false
        // }
        try {
            await channel.testAndSetNonce(signedTicket);
        }
        catch {
            return false;
        }
        return utils_1.verify(await signedTicket.ticket.hash, signedTicket.signature, await channel.offChainCounterparty);
    }
    static async submit(channel, signedTicket) {
        const { hoprChannels, signTransaction, account, utils } = channel.coreConnector;
        const { ticket, signature } = signedTicket;
        const { r, s, v } = utils.getSignatureParameters(signature);
        const counterPartySecret = hopr_utils_1.u8aXOR(false, ticket.challenge, ticket.onChainSecret);
        const transaction = await signTransaction(hoprChannels.methods.redeemTicket(hopr_utils_1.u8aToHex(ticket.challenge), hopr_utils_1.u8aToHex(ticket.onChainSecret), hopr_utils_1.u8aToHex(counterPartySecret), ticket.amount.toString(), hopr_utils_1.u8aToHex(ticket.winProb), hopr_utils_1.u8aToHex(r), hopr_utils_1.u8aToHex(s), v //TODO: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
        ), {
            from: account.toHex(),
            to: hoprChannels.options.address,
            nonce: await channel.coreConnector.nonce,
        });
        const receipt = await transaction.send();
        console.log(receipt);
    }
}
exports.default = Ticket;
