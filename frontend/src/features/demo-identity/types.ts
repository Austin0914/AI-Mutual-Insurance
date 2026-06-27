export type DemoRole = 'provider' | 'subscriber_assessor' | 'gatekeeper'

export interface DemoIdentity {
  address: `0x${string}`
  chainId: number
  role: DemoRole
  selectedAt: string
}

export const DEMO_ROLES: Record<
  DemoRole,
  {
    label: string
    shortLabel: string
    route: string
    description: string
  }
> = {
  provider: {
    label: 'AI Provider',
    shortLabel: 'Provider',
    route: '/app/provider',
    description: '對模型與 API 品質提供可驗證的責任承諾。',
  },
  subscriber_assessor: {
    label: 'AI 使用商 + 仲裁者',
    shortLabel: '使用商 / 仲裁者',
    route: '/app/subscriber-assessor',
    description: '取得有上限的責任分攤，也參與專業鑑定。',
  },
  gatekeeper: {
    label: '資格審查商 / Gatekeeper',
    shortLabel: 'Gatekeeper',
    route: '/app/gatekeeper',
    description: '管理企業准入與風險分群，但不判斷案件真相。',
  },
}

export function getDemoIdentityKey(chainId: number, address: string) {
  return `ai-insurance.demo.identity.${chainId}.${address.toLowerCase()}`
}

export function isDemoRole(value: unknown): value is DemoRole {
  return value === 'provider' || value === 'subscriber_assessor' || value === 'gatekeeper'
}

export function getRoleRoute(role: DemoRole) {
  return DEMO_ROLES[role].route
}
