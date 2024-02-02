import { CarReader } from '@ipld/car'
import { validateBlock } from '@web3-storage/car-block-validator'
import { recursive as exporter } from 'ipfs-unixfs-exporter'

const parseMeasurements = str => {
  // Supports
  // - NDJSON (new format)
  // - JSON array on a single line (old format)
  const ret = str.split('\n').filter(Boolean).map(line => JSON.parse(line))
  if (ret.length === 1 && Array.isArray(ret[0])) return ret[0]
  return ret
}

export const fetchMeasurements = async cid => {
  const res = await fetch(
    `https://${encodeURIComponent(cid)}.ipfs.w3s.link?format=car`
  )
  if (!res.ok) {
    const msg = `Cannot fetch measurements ${cid}: ${res.status}\n${await res.text()}`
    throw new Error(msg)
  }
  const reader = await CarReader.fromIterable(res.body)
  const entries = exporter(cid, {
    async get (blockCid) {
      const block = await reader.get(blockCid)
      try {
        await validateBlock(block)
      } catch (err) {
        throw new Error(
          `Invalid block ${blockCid} of root ${cid}`, { cause: err }
        )
      }
      return block.bytes
    }
  })
  for await (const entry of entries) {
    // Depending on size, entries might be packaged as `file` or `raw`
    // https://github.com/web3-storage/w3up/blob/e8bffe2ee0d3a59a977d2c4b7efe425699424e19/packages/upload-client/src/unixfs.js#L11
    if (entry.type === 'file' || entry.type === 'raw') {
      const bufs = []
      for await (const buf of entry.content()) {
        bufs.push(buf)
      }
      return parseMeasurements(Buffer.concat(bufs).toString())
    }
  }
  throw new Error('No measurements found')
}