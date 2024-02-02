import { onContractEvent } from 'on-contract-event'
import { fetchMeasurements } from './lib/fetch-measurements.js'
import { createEthers } from './lib/ethers.js'
import {
  ethAddressFromDelegated,
  delegatedFromEthAddress
} from '@glif/filecoin-address'
import timers from 'node:timers/promises'
import { writeFile, readFile } from 'node:fs/promises'

const {
  CONTRACT_ADDRESS = '0x8460766Edc62B525fc1FA4D628FC79229dC73031',
  RPC_URL = 'https://api.node.glif.io/rpc/v1',
  GLIF_TOKEN
} = process.env

const { contract, provider, rpcHeaders } = await createEthers({
  contractAddress: CONTRACT_ADDRESS,
  rpcUrl: RPC_URL,
  glifToken: GLIF_TOKEN
})

const it = onContractEvent({
  contract,
  provider,
  rpcUrl: RPC_URL,
  rpcHeaders
})

const addressTo0x = address => {
  if (address.startsWith('f4')) {
    return ethAddressFromDelegated(address)
  } else {
    return address
  }
}
const validateAddress = address => {
  delegatedFromEthAddress(address)
}

const participants = new Set()

try {
  const store = JSON.parse(await readFile('participants.json', 'utf8'))
  for (const participant of store) {
    participants.add(participant)
  }
  console.log(`Loaded ${participants.size} participants from store`)
} catch (err) {
  if (err.code !== 'ENOENT') {
    console.error(err)
  }
}

await Promise.all([
  (async () => {
    for await (const event of it) {
      if (event.name !== 'MeasurementsAdded') continue
      const [cid] = event.args
      const measurements = await fetchMeasurements(cid)
      for (const m of measurements) {
        if (typeof m !== 'object' || m === null) continue
        const address = addressTo0x(m.participant_address).toLowerCase()
        try {
          validateAddress(address)
        } catch (err) {
          console.error(`Invalid address ${address}: ${err.message}`)
          continue
        }
        if (!participants.has(address)) {
          participants.add(address)
          console.log(`New participant: ${address} (total: ${participants.size})`)
        }
      }
    }
  })(),
  (async () => {
    while (true) {
      await timers.setTimeout(10_000)
      await writeFile(
        'participants.json',
        JSON.stringify([...participants], null, 2)
      )
    }
  })()
])
