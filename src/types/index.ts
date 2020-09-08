import AccountId from './accountId'
import Balance from './balance'
import { Channel, ChannelBalance, ChannelState } from './channel'
import ChannelEntry from './channelEntry'
import ChannelId from './channelId'
import Hash from './hash'
import Moment from './moment'
import NativeBalance from './nativeBalance'
import PreImage from './preImage'
import Public from './public'
import Signature from './signature'
import SignedChannel from './signedChannel'
import SignedTicket from './signedTicket'
import Ticket from './ticket'
import TicketEpoch from './ticketEpoch'

class Types {
  public AccountId = AccountId
  public Balance = Balance
  public Channel = Channel
  public ChannelBalance = ChannelBalance
  public ChannelState = ChannelState
  public ChannelEntry = ChannelEntry
  public ChannelId = ChannelId
  public Hash = Hash
  public Moment = Moment
  public NativeBalance = NativeBalance
  public PreImage = PreImage
  public Public = Public
  public Signature = Signature
  public SignedChannel = SignedChannel
  public SignedTicket = SignedTicket
  public Ticket = Ticket
  public TicketEpoch = TicketEpoch
}

export {
  AccountId,
  Balance,
  Channel,
  ChannelId,
  ChannelBalance,
  ChannelEntry,
  ChannelState,
  Hash,
  Moment,
  NativeBalance,
  PreImage,
  Public,
  Signature,
  SignedChannel,
  SignedTicket,
  Ticket,
  TicketEpoch,
}

export default Types
