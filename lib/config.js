"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hopr_demo_seeds_1 = require("@hoprnet/hopr-demo-seeds");
exports.DEFAULT_URI = 'ws://127.0.0.1:9545/';
exports.TOKEN_ADDRESSES = {
    mainnet: undefined,
    morden: undefined,
    ropsten: undefined,
    rinkeby: '0x25f4408b0F75D1347335fc625E7446F2CdEcD503',
    goerli: undefined,
    kovan: '0x591aE064387AB09805D9fF9206F0A90DB8F4C9B2',
    private: '0x302be990306f95a21905d411450e2466DC5DD927'
};
exports.CHANNELS_ADDRESSES = {
    mainnet: undefined,
    morden: undefined,
    ropsten: undefined,
    rinkeby: '0x077209b19F4Db071254C468E42784588003be34C',
    goerli: undefined,
    kovan: '0x506De99826736032cF760586ECce0bae1369155b',
    private: '0x66DB78F4ADD912a6Cb92b672Dfa09028ecc3085E'
};
exports.FUND_ACCOUNT_PRIVATE_KEY = hopr_demo_seeds_1.NODE_SEEDS[0];
exports.DEMO_ACCOUNTS = hopr_demo_seeds_1.NODE_SEEDS;