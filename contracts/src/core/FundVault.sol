// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IFundVault } from "../interfaces/IFundVault.sol";
import { ITranche } from "../interfaces/ITranche.sol";
import { ILaunch } from "../interfaces/ILaunch.sol";
import { TrancheMath } from "../libraries/TrancheMath.sol";
import { LaunchMath } from "../libraries/LaunchMath.sol";
import { Roles } from "../access/Roles.sol";

/// @title FundVault — 共同基金金庫（注資、記帳、分層結算）
/// @notice 對應白皮書 §6.1（事前注資）、§6.3（分層償付），結算邏輯委派給 TrancheMath（ADR-0002）。
/// @dev 設計原則（白皮書 §3.3）：
///      - 原則二「寧可賠付不確定，也不要償付能力不確定」：結算支付永遠夾在池可用餘額內，基金不會破產。
///      - 原則三「永遠不賠滿」：自負額永遠由使用者自負，不由池支付。
///      安全假設：搭配的 ERC20 為標準、非 fee-on-transfer 代幣；注資以實際到帳量記帳以資穩健。
contract FundVault is IFundVault, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice 注資與賠付使用的 ERC20 代幣
    IERC20 public immutable token;

    /// @notice 各地址累計貢獻額（Subscriber 的值即 TrancheMath 的 C_user）
    mapping(address => uint256) public override contributionOf;

    /// @notice 各地址的參與者類型
    mapping(address => ParticipantType) public override participantTypeOf;

    /// @notice 累計注資總額
    uint256 public totalContributed;

    /// @notice 累計賠付總額
    uint256 public totalPaidOut;

    /// @notice 共同池目前可用餘額（= totalContributed − totalPaidOut）
    uint256 public poolBalance;

    /// @notice 基金是否已啟動
    /// @dev 由 activate() 在達到啟動門檻（白皮書 §6.1.1 / §7.9）時單向閂鎖為 true；
    ///      亦可由 DEFAULT_ADMIN_ROLE 透過 setActive 緊急覆寫（暫停 / 測試）。
    bool public override active;

    /// @notice 啟動門檻參數（n_min / D_min / HHI_max / η_max，白皮書 §7.9）
    ILaunch.LaunchConfig public launchConfig;

    /// @notice 不重複參與者人數 n（啟動門檻聚合量）
    uint256 public participantCount;

    /// @notice 各參與者累計貢獻額的平方和 Σ cⱼ²（供風險集中度 HHI 計算）
    uint256 public sumOfSquares;

    /// @notice 最大單一參與者累計貢獻額 max cⱼ（供單一占比 η 計算）
    uint256 public maxContribution;

    error ZeroAmount();
    error InvalidParticipantType();
    error ParticipantTypeMismatch();
    error NotActive();
    error NotSubscriber(address account);
    error LaunchThresholdNotMet();

    /// @param token_  注資 / 賠付代幣
    /// @param admin   初始管理員（持有 DEFAULT_ADMIN_ROLE，可授予 SETTLER_ROLE、更新門檻與緊急覆寫啟動狀態）
    /// @param config_ 初始啟動門檻參數（之後可由 admin 以 setLaunchConfig 重新校準）
    constructor(IERC20 token_, address admin, ILaunch.LaunchConfig memory config_) {
        token = token_;
        launchConfig = config_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice 參與者注資，取得 / 增加在基金中的貢獻額
    /// @param pType  參與者類型（Provider 或 Subscriber）
    /// @param amount 注資金額
    function contribute(ParticipantType pType, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (pType != ParticipantType.Provider && pType != ParticipantType.Subscriber) {
            revert InvalidParticipantType();
        }

        ParticipantType existing = participantTypeOf[msg.sender];
        if (existing == ParticipantType.Unset) {
            participantTypeOf[msg.sender] = pType;
        } else if (existing != pType) {
            revert ParticipantTypeMismatch();
        }

        // 以實際到帳量記帳（穩健對待非預期的轉帳行為）。nonReentrant 防止代幣回呼重入。
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - balanceBefore;

        uint256 oldContribution = contributionOf[msg.sender];
        uint256 newContribution = oldContribution + received;

        // 增量維護啟動門檻聚合量（避免遍歷所有參與者）。貢獻額只增不減，故 running max 正確。
        if (oldContribution == 0 && newContribution > 0) {
            participantCount += 1;
        }
        sumOfSquares += newContribution * newContribution - oldContribution * oldContribution;
        if (newContribution > maxContribution) {
            maxContribution = newContribution;
        }

        contributionOf[msg.sender] = newContribution;
        totalContributed += received;
        poolBalance += received;

        emit Contributed(msg.sender, received, newContribution);
    }

    /// @notice 結算一筆已核准的索賠
    /// @dev M2 由 SETTLER_ROLE 佔位觸發；M3 將改由 commit-reveal 爭議判定結果驅動。
    ///      支付夾在池可用餘額內（永不破產）；不足的部分併入殘額（pro-rata haircut 的單筆版）。
    /// @param subscriber    受損的使用者公司（須為 Subscriber）
    /// @param loss          鑑定認定的損失金額 L
    /// @param deductibleBps 自負額比例 d（基點）
    /// @param coverageK     共同池上限倍率 k
    function settle(address subscriber, uint256 loss, uint256 deductibleBps, uint256 coverageK)
        external
        nonReentrant
        onlyRole(Roles.SETTLER_ROLE)
    {
        if (!active) revert NotActive();
        if (participantTypeOf[subscriber] != ParticipantType.Subscriber) revert NotSubscriber(subscriber);

        ITranche.TrancheResult memory r = TrancheMath.compute(
            ITranche.TrancheInput({
                loss: loss,
                deductibleBps: deductibleBps,
                coverageK: coverageK,
                userContribution: contributionOf[subscriber]
            })
        );

        // 永不破產：池實付不超過可用餘額；超出者併入殘額（→ 巨災層 / 法律途徑）。
        uint256 payout = r.poolPayout <= poolBalance ? r.poolPayout : poolBalance;
        uint256 residual = r.residual + (r.poolPayout - payout);

        poolBalance -= payout;
        totalPaidOut += payout;

        emit Settled(subscriber, loss, r.deductible, payout, residual);

        if (payout > 0) {
            token.safeTransfer(subscriber, payout);
        }
    }

    /// @notice 依當前聚合量評估啟動門檻（白皮書 §6.1.1 / §7.9）
    /// @return status 各條件與整體是否達標（見 ILaunch.LaunchStatus）
    function launchStatus() public view returns (ILaunch.LaunchStatus memory status) {
        return LaunchMath.evaluate(
            launchConfig,
            ILaunch.LaunchState({
                participantCount: participantCount,
                totalContributed: totalContributed,
                sumOfSquares: sumOfSquares,
                maxContribution: maxContribution
            })
        );
    }

    /// @notice 當前是否已達啟動門檻
    function canActivate() external view returns (bool) {
        return launchStatus().canActivate;
    }

    /// @notice 在達到啟動門檻時啟動基金（單向閂鎖，任何人可觸發）
    /// @dev 一旦啟動即維持啟動，不因後續注資改變占比而失效；已啟動時為冪等 no-op。
    ///      緊急停用請改用 setActive。
    function activate() external {
        if (active) return;
        if (!launchStatus().canActivate) revert LaunchThresholdNotMet();
        active = true;
        emit ActiveStatusChanged(true);
    }

    /// @notice 更新啟動門檻參數（白皮書參數須隨模擬 / 真實損失資料校準，§7）
    /// @dev 不回溯影響已啟動狀態；僅影響後續 activate 與 canActivate 評估。
    function setLaunchConfig(ILaunch.LaunchConfig calldata config_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        launchConfig = config_;
        emit LaunchConfigUpdated(config_.nMin, config_.dMin, config_.hhiMaxBps, config_.etaMaxBps);
    }

    /// @notice 設定基金啟動狀態（管理員緊急覆寫：暫停或測試用）
    /// @dev 正常啟動路徑為達門檻後呼叫 activate()；此函式供治理在異常情況下手動切換。
    function setActive(bool active_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        active = active_;
        emit ActiveStatusChanged(active_);
    }
}
