export function shortAddress(address?: string, chars = 4) {
  if (!address) return '未連線'
  if (address.length <= chars * 2 + 5) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function formatBigInt(value?: bigint, fallback = '—') {
  if (value === undefined) return fallback
  return value.toLocaleString('en-US')
}

export function formatBps(value?: bigint | number, fallback = '—') {
  if (value === undefined) return fallback
  const asNumber = typeof value === 'bigint' ? Number(value) : value
  return `${(asNumber / 100).toFixed(2)}%`
}

export function formatTimestamp(seconds?: bigint | number) {
  if (!seconds) return '—'
  const value = typeof seconds === 'bigint' ? Number(seconds) : seconds
  if (value === 0) return '—'
  return new Intl.DateTimeFormat('zh-Hant', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value * 1000))
}
