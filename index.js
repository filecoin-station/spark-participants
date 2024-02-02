import { onContractEvent } from 'on-contract-event'
import { fetchMeasurements } from './lib/fetch-measurements.js'
import { createEthers } from './lib/ethers.js'

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

for await (const event of it) {
  if (event.name !== 'MeasurementsAdded') continue
  const [cid] = event.args
  const measurements = await fetchMeasurements(cid)
  console.log({ measurements })
}
