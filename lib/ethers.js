import { ethers } from 'ethers'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const createEthers = async ({
  contractAddress,
  rpcUrl,
  glifToken
}) => {
  const rpcHeaders = {
    Authorization: glifToken ? `Bearer ${glifToken}` : ''
  }
  const fetchRequest = new ethers.FetchRequest(rpcUrl)
  fetchRequest.setHeader(
    'Authorization',
    rpcHeaders.Authorization
  )
  const provider = new ethers.JsonRpcProvider(
    fetchRequest,
    null,
    { batchMaxCount: 1 }
  )
  const contract = new ethers.Contract(
    contractAddress,
    JSON.parse(
      await readFile(
        fileURLToPath(new URL('./abi.json', import.meta.url)),
        'utf8'
      )
    ),
    provider
  )
  return { provider, contract, rpcHeaders }
}
