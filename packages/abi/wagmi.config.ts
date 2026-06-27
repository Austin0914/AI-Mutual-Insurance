import { defineConfig } from '@wagmi/cli'
import { foundry } from '@wagmi/cli/plugins'

// 從 contracts/ 的 Foundry 產出（out/）抽取選定合約的 ABI，
// 產生框架無關的型別化常數到 src/generated.ts。
// 不產 react hooks：前端自行以 wagmi 包裝，後端以 viem 使用。
export default defineConfig({
  out: 'src/generated.ts',
  plugins: [
    foundry({
      project: '../../contracts',
      artifacts: 'out',
      // 由根 script 先跑 forge build；此處不重複觸發，避免 PATH / 重複編譯問題。
      forge: { build: false },
      include: [
        'FundVault.sol/**',
        'AssessorRegistry.sol/**',
        'DisputeManager.sol/**',
        'ChainlinkVRFAdapter.sol/**',
        'IFundVault.sol/**',
        // 註：MockERC20 是測試用 mock，被 wagmi 預設 exclude 排除；
        //     正式代幣為標準 ERC20，前端如需 token ABI 之後另加標準介面。
      ],
    }),
  ],
})
