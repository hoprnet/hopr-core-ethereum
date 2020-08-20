import assert, { notDeepEqual } from 'assert'
import type HoprEthereum from '..'
import { randomBytes } from 'crypto'
import { Public } from '../types'

import Path from '.'

function gcd(a: number, b: number) {
  a = Math.abs(a)
  b = Math.abs(b)

  if (b > a) {
    var temp = a
    a = b
    b = temp
  }

  while (true) {
    if (b == 0) return a
    a %= b
    if (a == 0) return b
    b %= a
  }
}

function findGenerator(nodesCount: number, previousGenerator?: number) {
  for (let i = previousGenerator != null ? previousGenerator + 1 : 2; i < nodesCount; i++) {
    if (gcd(i, nodesCount) == 1) {
      return i
    }
  }
  return -1
}

async function generateGraph(nodesCount: number) {
  const nodes = []

  for (let i = 0; i < nodesCount; i++) {
    nodes.push(await Public.fromPrivKey(randomBytes(32)))
  }

  const edges = new Map<Public, Public[]>()

  if (nodesCount <= 1) {
    return { nodes, edges }
  }

  if (nodesCount == 2) {
    edges.set(nodes[0], [nodes[1]])
    edges.set(nodes[1], [nodes[0]])

    return { nodes, edges }
  }

  // find generators
  let generator = findGenerator(nodesCount)
  let secondGenerator = findGenerator(nodesCount, generator)
  let thirdGenerator = findGenerator(nodesCount, secondGenerator)

  console.log(generator, secondGenerator, thirdGenerator, nodesCount)

  if (generator < 0) {
    throw Error(`Failed to find generator`)
  }

  // This should generate a fully connected network
  for (let i = 0; i < nodesCount; i++) {
    const a = nodes[i % nodesCount]
    const b = nodes[(i + generator) % nodesCount]
    const c = nodes[(i + secondGenerator) % nodesCount]
    const d = nodes[(i + thirdGenerator) % nodesCount]

    const nodesFromA = edges.get(a) || []
    nodesFromA.push(b, c, d)
    edges.set(a, nodesFromA)
  }

  return { nodes, edges }
}

function generateConnector(edges: Map<Public, Public[]>) {
  const connector = ({
    indexer: {
      get({ partyA }: { partyA: Public }, filter?: (node: Public) => boolean) {
        let connectedNodes = edges.get(partyA)

        if (filter != null) {
          connectedNodes = connectedNodes.filter(filter)
        }

        if (connectedNodes == null) {
          return Promise.resolve([])
        }

        return connectedNodes.map((partyB) => {
          return {
            partyA,
            partyB,
          }
        })
      },
    },
  } as unknown) as HoprEthereum

  connector.path = new Path(connector)

  return connector
}

function validPath(path: Public[], edges: Map<Public, Public[]>) {
  for (let i = 0; i < path.length - 1; i++) {
    const edgeSet = edges.get(path[i])

    if (edgeSet == null || !edgeSet.includes(path[i + 1])) {
      return false
    }
  }

  return true
}

function noCircles(path: Public[]) {
  for (let i = 1; i < path.length; i++) {
    if (path.slice(0, i).includes(path[i]) || path.slice(i + 1).includes(path[i])) {
      return false
    }
  }

  return true
}

describe('test pathfinder', function () {
  it('should find a path', async function () {
    const { nodes, edges } = await generateGraph(123)

    const connector = generateConnector(edges)

    const path = await connector.path.findPath(nodes[0], 122)
    console.log(path)

    assert(path.length == 30, 'Should find a valid acyclic path that goes through all nodes')

    // const noPath = await connector.path.findPath(nodes[0], 29, (node: Public) => !node.eq(nodes[1]))

    // assert(noPath.length == 0)

    // const shorterPath = await connector.path.findPath(nodes[0], 27, (node: Public) => !node.eq(nodes[1]))

    // console.log(shorterPath)
    // assert(shorterPath.length == 28 && validPath(path, edges) && noCircles(path))
  })

  //it('should find a path without a certain node', async function () {})
})
