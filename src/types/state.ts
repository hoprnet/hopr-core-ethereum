import type { Types } from '@hoprnet/hopr-core-connector-interface'
import { UINT256 } from './solidity'

class State extends UINT256 implements Types.State {}

export default State
