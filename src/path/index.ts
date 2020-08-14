import type HoprEthereum from '../'
import { Public } from '../types'

class Path {
  constructor(private coreConnector: HoprEthereum) {}

  async findPath(start: Public, targetLength: number): Promise<Public[]> {
    const openList: Public[] = [start]
    const closedList: Public[] = []

    const cameFrom = new Map<Public, Public>()
    const fScore = new Map<Public, number>([[start, 0]])

    let current: Public = start

    while (openList.length > 0) {
      current = openList.pop() as Public

      const newNodes = (await this.coreConnector.indexer.get({ partyA: current })).map((result) => {
        console.log(`partyA`, result)

        return result.partyA
        // if (current.eq(partyA)) {
        //   return partyB
        // } else {
        //   return partyA
        // }
      })

      if (fScore.get(current) == targetLength) {
        const path: Public[] = Array.from({ length: targetLength })

        for (let i = 0; i < targetLength; i++) {
          path[targetLength - i - 1] = current

          current = cameFrom.get(current)
        }

        if (current.eq(start)) {
          throw Error(`Wrong path!`)
        }

        return path
      }

      // sort according to utility function

      const add: Public[] = []

      let found: boolean

      for (let i = 0; i < newNodes.length; i++) {
        found = false

        for (let j = 0; j < closedList.length; j++) {
          if (closedList[j].eq(newNodes[i])) {
            found = true
            break
          }
        }

        if (found) {
          continue
        }

        for (let j = 0; j < openList.length; j++) {
          if (openList[j].eq(newNodes[i])) {
            found = true
            break
          }
        }

        cameFrom.set(newNodes[i], start)
        fScore.set(newNodes[i], fScore.get(current) + 1)

        if (!found) {
          add.push(newNodes[i])
        }
      }

      openList.push(...add)
      closedList.push(current)
    }
  }
}

export default Path
