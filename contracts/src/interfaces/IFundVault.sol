// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/// @title IFundVault — 基金金庫的共用型別與事件
/// @notice 對應 docs/specs/tranche.md 與白皮書 §6.1（注資）、§6.3（分層償付）。
interface IFundVault {
    /// @notice 參與者類型
    /// @dev Subscriber 的累計貢獻額 C_user 作為 TrancheMath 的共同池上限基準。
    enum ParticipantType {
        Unset,
        Provider,
        Subscriber
    }

    /// @notice 參與者注資
    /// @param participant 注資地址
    /// @param amount      本次注資金額
    /// @param newTotal    該地址累計貢獻額
    event Contributed(address indexed participant, uint256 amount, uint256 newTotal);

    /// @notice 索賠結算完成
    /// @param subscriber  受損的使用者公司
    /// @param loss        鑑定認定的損失金額 L
    /// @param deductible  第一層：使用者自負額（不由池支付）
    /// @param poolPayout  第二層：共同池實付金額
    /// @param residual    第三層：殘額（→ 巨災層 / 法律途徑）
    event Settled(address indexed subscriber, uint256 loss, uint256 deductible, uint256 poolPayout, uint256 residual);

    /// @notice 基金啟動狀態變更
    event ActiveStatusChanged(bool active);

    /// @notice 啟動門檻參數更新
    /// @param nMin      最小參與公司數 n_min
    /// @param dMin      最小總注資額 D_min
    /// @param hhiMaxBps 風險集中度上限 HHI_max（基點）
    /// @param etaMaxBps 單一參與者占比上限 η_max（基點）
    event LaunchConfigUpdated(uint256 nMin, uint256 dMin, uint256 hhiMaxBps, uint256 etaMaxBps);

    /// @notice 查詢參與者累計貢獻額。
    /// @dev Subscriber 的貢獻額也是單筆索賠共同池上限計算的 C_user。
    function contributionOf(address account) external view returns (uint256);

    /// @notice 查詢地址的參與者類型。
    function participantTypeOf(address account) external view returns (ParticipantType);

    /// @notice 基金是否已啟動。
    function active() external view returns (bool);

    /// @notice 結算一筆已核准的索賠
    /// @dev 由持有 SETTLER_ROLE 者觸發（M3b 起由 DisputeManager 依爭議判定結果驅動）。
    /// @param subscriber    受損的使用者公司（須為 Subscriber）
    /// @param loss          鑑定認定的損失金額 L
    /// @param deductibleBps 自負額比例 d（基點）
    /// @param coverageK     共同池上限倍率 k
    function settle(address subscriber, uint256 loss, uint256 deductibleBps, uint256 coverageK) external;
}
