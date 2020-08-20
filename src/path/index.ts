import type HoprEthereum from '../'
import { Public } from '../types'
import Heap from 'heap-js'
import { u8aToHex } from '@hoprnet/hopr-utils'

function reconstructPath(cameFrom: Map<Public, Public>, current: Public, targetLength: number) {
  const path: Public[] = Array.from({ length: targetLength })

  for (let i = 0; i < targetLength; i++) {
    path[targetLength - i - 1] = current

    current = cameFrom.get(current)
  }

  return path
}

class Path {
  constructor(private coreConnector: HoprEthereum) {}

  async findPath(start: Public, targetLength: number, filter?: (node: Public) => boolean): Promise<Public[]> {
    // const cameFrom = new Map<Public, Public>()
    // const fScore = new Map<Public, number>([[start, 0]])

    // const comparator = (a: Public, b: Public) => {
    //   if (fScore.get(a) == null || fScore.get(b) == null) {
    //     throw Error('Comparator: unable to find node')
    //   }

    //   return fScore.get(b) - fScore.get(a)
    // }

    // const openList = Heap.heapify([start], comparator)

    // let current: Public = start
    // let found

    // let add: Public[]

    // while (openList.length > 0) {
    //   current = openList.pop() as Public

    //   const currentFScore = fScore.get(current)

    //   if (currentFScore == targetLength) {
    //     return reconstructPath(cameFrom, current, targetLength)
    //   }

    //   add = []

    //   let newNode: Public

    //   const _newNodes = await this.coreConnector.indexer.get({ partyA: current })

    //   // @
    //   console.log(`newNodes`, _newNodes.length)

    //   for (let i = 0; i < _newNodes.length; i++) {
    //     found = false

    //     if (current.eq(_newNodes[i].partyA)) {
    //       newNode = _newNodes[i].partyB
    //     } else {
    //       newNode = _newNodes[i].partyA
    //     }

    //     const newNodeFScore = fScore.get(newNode)

    //     console.log(`currentFScore`, currentFScore, `newNodeFScore`, newNodeFScore)

    //     if (newNodeFScore == null) {
    //       cameFrom.set(newNode, current)
    //       fScore.set(newNode, currentFScore + 1)
    //       console.log(`setting new fScore`, currentFScore + 1)
    //       add.push(newNode)
    //       continue
    //     }

    //     let tmp = current
    //     while (true) {
    //       tmp = cameFrom.get(tmp)

    //       if (tmp == null) {
    //         break
    //       }

    //       if (tmp.eq(newNode)) {
    //         found = true
    //         break
    //       }
    //     }

    //     if (found) {
    //       console.log(`cycle found`)
    //       continue
    //     }

    //     if (newNodeFScore < currentFScore + 1) {
    //       cameFrom.set(newNode, current)
    //       fScore.set(newNode, currentFScore + 1)
    //     }

    //     for (let j = 0; j < openList.length; j++) {
    //       if (openList.heapArray[j].eq(newNode)) {
    //         found = true
    //         console.log(`duplicate found`)
    //         break
    //       }
    //     }

    //     if (!found) {
    //       add.push(newNode)
    //     }
    //   }

    //   openList.addAll(add)
    //   openList.init()
    //   console.log(
    //     `openList`,
    //     openList.heapArray.map((node: Public) => fScore.get(node))
    //   )

    //   // console.log(`before adding`, openList.length)
    //   // console.log(`toAdd`, add.length)
    //   // if (add.length == 0) {
    //   //   openList.pop()
    //   // } else {
    //   //   openList.replace(add[0])

    //   //   if (add.length > 1) {
    //   //     openList.addAll(add.slice(1))
    //   //   }
    //   // }
    //   // console.log(`after adding`, openList.length)

    //   add.splice(0, add.length)
    // }

    // return []

    // @TODO
    const comparator = (a: Entry, b: Entry) => b[2] - a[2]
    type Entry = [Public | undefined, Public, number]

    const cameFrom = new Map<Public, Heap<Entry>>()

    const open = new Heap<Entry>(comparator)
    const closed = new Set<string>()

    open.add([undefined, start, 0])

    let current: Entry
    let newNode: Public
    let entries: Heap<Entry>

    let found
    while (open.length > 0) {
      current = open.pop() as Entry
      console.log(current[2])

      found = false

      // check for cycles
      let tmp = cameFrom.get(current[0])
      console.log(`tmp before cycle iteration`, tmp)

      let nodes: Public[] = [current[1]]
      while (tmp != null && tmp.peek() != null && tmp.peek()[0] != null) {
        const entry = tmp.peek() as Entry

        console.log(`cycle iteration`)

        if (nodes.includes(entry[1])) {
          console.log(`cycle found`)

          tmp.pop()

          if (tmp.length == 0) {
            cameFrom.delete(entry[1])
          } else {
            cameFrom.set(entry[1], tmp)
          }

          found = true
          break
        }

        tmp = cameFrom.get(entry[0])
        nodes.push(entry[1])

        console.log(`nextIteration`, tmp)
      }

      if (found) {
        console.log(`next edge`)
        continue
      }

      if (current[2] == targetLength) {
        console.log(`found`)
        return []
        // reconstructPath
      }

      const _newNodes = await this.coreConnector.indexer.get({ partyA: current[1] })

      console.log(`newNodes`, _newNodes.length)

      for (let i = 0; i < _newNodes.length; i++) {
        if (current[1].eq(_newNodes[i].partyA)) {
          newNode = _newNodes[i].partyB
        } else {
          newNode = _newNodes[i].partyA
        }

        const newEntry: Entry = [current[1], newNode, current[2] + 1]

        if (cameFrom.has(newNode)) {
          entries = cameFrom.get(newNode)
        } else {
          entries = new Heap<Entry>(comparator)
        }

        let alreadyExists = false
        for (let j = 0; j < entries.length; j++) {
          if (entries.heapArray[j][0].eq(newEntry[0]) && entries.heapArray[j][1].eq(newEntry[1])) {
            entries.heapArray[j][2] = newEntry[2]
            alreadyExists = true
            entries.init()
          }
        }

        if (!alreadyExists) {
          entries.push(newEntry)
        }

        cameFrom.set(newNode, entries)

        // if (!entries.contains(newEntry, (a: Entry, b: Entry) => {
        //   return a[0].eq(b[0]) && a[1].eq(b[1])
        // })) {
        //   console.log(`already in entries`)
        // }

        let found = false

        if (open.heapArray != null && open.heapArray.length != 0) {
          for (let j = 0; j < open.heapArray.length; j++) {
            if (open.heapArray[j][0].eq(current[1]) && open.heapArray[j][1].eq(newNode)) {
              found = true
              console.log(`duplicate found`)
              break
            }
          }
        }

        if (!found) {
          open.add(newEntry)
        }
      }

      closed.add(u8aToHex(current[0] || new Uint8Array()).concat(u8aToHex(current[1])))

      if (_newNodes.length == 0) {
        const entries = cameFrom.get(current[1])

        entries.pop()

        if (entries.length == 0) {
          cameFrom.delete(current[1])
        } else {
          cameFrom.set(current[1], entries)
        }
      }
    }

    return []
  }
}

export default Path
