// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { IRandomnessProvider } from "../interfaces/IRandomnessProvider.sol";
import { IRandomnessConsumer } from "../interfaces/IRandomnessConsumer.sol";
import { IFundVault } from "../interfaces/IFundVault.sol";
import { VoteTally } from "../libraries/VoteTally.sol";
import { AssessorRegistry } from "./AssessorRegistry.sol";

/// @title DisputeManager — 爭議案件生命週期（開案 → 分派 → commit-reveal → 加權結算）
/// @notice 對應白皮書 §6.5（可信度加權的對抗式鑑定）與 docs/specs/commit-reveal.md。
/// @dev 隨機來源以 IRandomnessProvider 抽象、統計委派給 VoteTally（ADR-0002）。
///      投票值為責任歸因比例（bps）；以「分派時快照的質押」加權中位數聚合；
///      達 quorum 才依比例縮放損失後呼叫 FundVault.settle。實際罰沒延後（僅記錄缺席）。
contract DisputeManager is AccessControl, IRandomnessConsumer {
    /// @notice 基點分母（10000 = 100%）
    uint256 internal constant BPS = 10_000;

    /// @notice 可開案、請求分派與開始投票的角色
    bytes32 public constant CASE_MANAGER_ROLE = keccak256("CASE_MANAGER_ROLE");

    /// @notice 案件狀態機
    enum CaseStatus {
        None,
        Evidence, // 已開案，等待請求分派
        AwaitingRandomness, // 已請求隨機，等待 callback
        Assigned, // 鑑定者已分派，等待開始投票
        Voting, // commit / reveal 進行中（以時窗區分子階段）
        Resolved // 已統計並結算（或因未達 quorum 結案不賠付）
    }

    /// @notice 案件資料
    /// @param subscriber     受損的使用者公司
    /// @param loss           鑑定標的損失金額 L
    /// @param deductibleBps  自負額比例 d（基點）
    /// @param coverageK      共同池上限倍率 k
    /// @param evidenceHash   證據摘要雜湊（鏈下證據的指紋）
    /// @param status         目前狀態
    /// @param numAssessors   欲分派的鑑定者數量
    /// @param commitDeadline commit 期截止時間戳
    /// @param revealDeadline reveal 期截止時間戳
    /// @param quorumBps      出席權重門檻（基點）
    /// @param slashBps       缺席罰沒比例（基點，作用於快照權重；0 = 不罰）
    /// @param totalWeight    被指派者的權重總和（分派時快照）
    /// @param revealedWeight 已揭露票的權重總和
    struct Case {
        address subscriber;
        uint256 loss;
        uint256 deductibleBps;
        uint256 coverageK;
        bytes32 evidenceHash;
        CaseStatus status;
        uint32 numAssessors;
        uint64 commitDeadline;
        uint64 revealDeadline;
        uint256 quorumBps;
        uint256 slashBps;
        uint256 totalWeight;
        uint256 revealedWeight;
    }

    /// @notice 合格鑑定者名冊
    AssessorRegistry public immutable registry;

    /// @notice 可驗證隨機來源（adapter）
    IRandomnessProvider public immutable randomness;

    /// @notice 結算用的基金金庫（本合約須持有其 SETTLER_ROLE）
    IFundVault public immutable fundVault;

    /// @dev caseId => 案件
    mapping(uint256 => Case) private _cases;

    /// @dev caseId => 已分派鑑定者
    mapping(uint256 => address[]) private _assigned;

    /// @dev randomness requestId => caseId
    mapping(uint256 => uint256) private _requestToCase;

    /// @dev caseId => assessor => 分派時快照的權重（0 表示非被指派者）
    mapping(uint256 => mapping(address => uint256)) private _weightOf;

    /// @dev caseId => assessor => commit 值
    mapping(uint256 => mapping(address => bytes32)) private _commitOf;

    /// @dev caseId => assessor => 是否已揭露
    mapping(uint256 => mapping(address => bool)) private _revealed;

    /// @dev caseId => assessor => 已揭露的責任比例（bps）
    mapping(uint256 => mapping(address => uint256)) private _revealedRatio;

    /// @notice 下一個案件序號
    uint256 public nextCaseId;

    event DisputeOpened(uint256 indexed caseId, address indexed subscriber, bytes32 evidenceHash);
    event AssessorsRequested(uint256 indexed caseId, uint256 indexed requestId, uint32 numAssessors);
    event AssessorsAssigned(uint256 indexed caseId, address[] assessors);
    event VotingStarted(uint256 indexed caseId, uint64 commitDeadline, uint64 revealDeadline, uint256 quorumBps);
    event VoteCommitted(uint256 indexed caseId, address indexed assessor);
    event VoteRevealed(uint256 indexed caseId, address indexed assessor, uint256 ratioBps);
    event CaseResolved(uint256 indexed caseId, bool quorumMet, uint256 medianRatioBps, uint256 effectiveLoss);
    event AssessorNoShow(uint256 indexed caseId, address indexed assessor);

    error ZeroSubscriber();
    error NotSubscriber(address account);
    error NoContribution(address account);
    error ZeroLoss();
    error ZeroEvidenceHash();
    error ZeroAssessors();
    error InvalidCaseStatus(uint256 caseId, CaseStatus expected, CaseStatus actual);
    error NotEnoughAssessors(uint256 available, uint32 requested);
    error OnlyRandomnessProvider();
    error UnknownRequest(uint256 requestId);
    error InvalidQuorum();
    error ZeroDuration();
    error InvalidSlash();
    error NotAssignedAssessor(uint256 caseId, address account);
    error NotInCommitWindow();
    error NotInRevealWindow();
    error AlreadyCommitted();
    error NoCommitment();
    error AlreadyRevealed();
    error RatioOutOfRange();
    error CommitmentMismatch();
    error RevealWindowNotClosed();

    /// @param admin       初始管理員（持有 DEFAULT_ADMIN_ROLE 與 CASE_MANAGER_ROLE）
    /// @param registry_   鑑定者名冊
    /// @param randomness_ 隨機來源 adapter
    /// @param fundVault_  結算金庫（部署後須授予本合約 SETTLER_ROLE）
    constructor(address admin, AssessorRegistry registry_, IRandomnessProvider randomness_, IFundVault fundVault_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CASE_MANAGER_ROLE, admin);
        registry = registry_;
        randomness = randomness_;
        fundVault = fundVault_;
    }

    /// @notice 由案件管理者代為開立一筆爭議案件。
    /// @dev 保留給營運後台、測試、或未來經審查後的代開案流程。
    /// @return caseId 新案件序號
    function openDispute(
        address subscriber,
        uint256 loss,
        uint256 deductibleBps,
        uint256 coverageK,
        bytes32 evidenceHash
    ) external onlyRole(CASE_MANAGER_ROLE) returns (uint256 caseId) {
        return _openDispute(subscriber, loss, deductibleBps, coverageK, evidenceHash);
    }

    /// @notice 由已注資的 Subscriber 以自己的錢包開立自身爭議案件。
    /// @dev 不允許替其他地址開案；完整證據仍留鏈下，鏈上只保存 evidenceHash。
    /// @return caseId 新案件序號
    function openDisputeForSelf(
        uint256 loss,
        uint256 deductibleBps,
        uint256 coverageK,
        bytes32 evidenceHash
    ) external returns (uint256 caseId) {
        if (fundVault.participantTypeOf(msg.sender) != IFundVault.ParticipantType.Subscriber) {
            revert NotSubscriber(msg.sender);
        }
        if (fundVault.contributionOf(msg.sender) == 0) revert NoContribution(msg.sender);

        return _openDispute(msg.sender, loss, deductibleBps, coverageK, evidenceHash);
    }

    function _openDispute(
        address subscriber,
        uint256 loss,
        uint256 deductibleBps,
        uint256 coverageK,
        bytes32 evidenceHash
    ) private returns (uint256 caseId) {
        if (subscriber == address(0)) revert ZeroSubscriber();
        if (loss == 0) revert ZeroLoss();
        if (evidenceHash == bytes32(0)) revert ZeroEvidenceHash();

        caseId = nextCaseId++;
        _cases[caseId] = Case({
            subscriber: subscriber,
            loss: loss,
            deductibleBps: deductibleBps,
            coverageK: coverageK,
            evidenceHash: evidenceHash,
            status: CaseStatus.Evidence,
            numAssessors: 0,
            commitDeadline: 0,
            revealDeadline: 0,
            quorumBps: 0,
            slashBps: 0,
            totalWeight: 0,
            revealedWeight: 0
        });

        emit DisputeOpened(caseId, subscriber, evidenceHash);
    }

    /// @notice 為案件請求隨機分派鑑定者
    /// @param caseId       案件序號
    /// @param numAssessors 欲分派的鑑定者數量
    function requestAssessors(uint256 caseId, uint32 numAssessors) external onlyRole(CASE_MANAGER_ROLE) {
        Case storage c = _cases[caseId];
        if (c.status != CaseStatus.Evidence) {
            revert InvalidCaseStatus(caseId, CaseStatus.Evidence, c.status);
        }
        if (numAssessors == 0) revert ZeroAssessors();

        uint256 available = registry.assessorCount();
        if (available < numAssessors) revert NotEnoughAssessors(available, numAssessors);

        c.numAssessors = numAssessors;
        c.status = CaseStatus.AwaitingRandomness;

        // 只需一個種子，後續以 Fisher-Yates 部分洗牌挑出不重複鑑定者。
        uint256 requestId = randomness.requestRandomness(1);
        _requestToCase[requestId] = caseId;

        emit AssessorsRequested(caseId, requestId, numAssessors);
    }

    /// @inheritdoc IRandomnessConsumer
    /// @dev 僅允許設定的隨機來源回呼。以種子做部分 Fisher-Yates 洗牌，選出不重複鑑定者。
    function fulfillRandomness(uint256 requestId, uint256[] calldata randomWords) external override {
        if (msg.sender != address(randomness)) revert OnlyRandomnessProvider();

        uint256 caseId = _requestToCase[requestId];
        Case storage c = _cases[caseId];
        // requestId 未知時 caseId=0 且該案狀態多半非 AwaitingRandomness，於下方一併擋下。
        if (c.status != CaseStatus.AwaitingRandomness) {
            revert InvalidCaseStatus(caseId, CaseStatus.AwaitingRandomness, c.status);
        }

        address[] memory selected = _selectAssessors(randomWords[0], c.numAssessors);
        _assigned[caseId] = selected;
        c.status = CaseStatus.Assigned;

        // 分派時快照每位鑑定者的質押作為投票權重（後續質押變動不影響本案）。
        uint256 totalWeight;
        for (uint256 i = 0; i < selected.length; i++) {
            uint256 w = registry.stakeOf(selected[i]);
            _weightOf[caseId][selected[i]] = w;
            totalWeight += w;
        }
        c.totalWeight = totalWeight;

        delete _requestToCase[requestId];

        emit AssessorsAssigned(caseId, selected);
    }

    /// @dev 以部分 Fisher-Yates 從名冊中選出 n 名不重複鑑定者
    /// @param seed 隨機種子
    /// @param n    欲選數量（呼叫端已確保 n <= 名冊大小）
    function _selectAssessors(uint256 seed, uint32 n) internal view returns (address[] memory) {
        uint256 poolSize = registry.assessorCount();

        // 建立索引工作陣列 [0, 1, ..., poolSize-1]
        uint256[] memory indices = new uint256[](poolSize);
        for (uint256 i = 0; i < poolSize; i++) {
            indices[i] = i;
        }

        address[] memory selected = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            // 從 [i, poolSize) 中隨機挑一個與位置 i 交換
            seed = uint256(keccak256(abi.encode(seed, i)));
            uint256 j = i + (seed % (poolSize - i));
            (indices[i], indices[j]) = (indices[j], indices[i]);
            selected[i] = registry.assessorAt(indices[i]);
        }
        return selected;
    }

    /// @notice 開始投票，設定 commit 與 reveal 時窗
    /// @param caseId          案件序號
    /// @param commitDuration  commit 期長度（秒）
    /// @param revealDuration  reveal 期長度（秒）
    /// @param quorumBps       出席權重門檻（基點，須 <= BPS 且 > 0）
    /// @param slashBps        缺席罰沒比例（基點，須 <= BPS；0 = 不罰）
    function startVoting(
        uint256 caseId,
        uint64 commitDuration,
        uint64 revealDuration,
        uint256 quorumBps,
        uint256 slashBps
    ) external onlyRole(CASE_MANAGER_ROLE) {
        Case storage c = _cases[caseId];
        if (c.status != CaseStatus.Assigned) {
            revert InvalidCaseStatus(caseId, CaseStatus.Assigned, c.status);
        }
        if (commitDuration == 0 || revealDuration == 0) revert ZeroDuration();
        if (quorumBps == 0 || quorumBps > BPS) revert InvalidQuorum();
        if (slashBps > BPS) revert InvalidSlash();

        // forge-lint: disable-next-line(block-timestamp)
        uint64 commitDeadline = uint64(block.timestamp) + commitDuration;
        uint64 revealDeadline = commitDeadline + revealDuration;

        c.commitDeadline = commitDeadline;
        c.revealDeadline = revealDeadline;
        c.quorumBps = quorumBps;
        c.slashBps = slashBps;
        c.status = CaseStatus.Voting;

        emit VotingStarted(caseId, commitDeadline, revealDeadline, quorumBps);
    }

    /// @notice 鑑定者提交保密承諾 commit = keccak256(abi.encode(ratioBps, salt, caseId))
    /// @param caseId     案件序號
    /// @param commitment 承諾雜湊
    function commitVote(uint256 caseId, bytes32 commitment) external {
        Case storage c = _cases[caseId];
        if (c.status != CaseStatus.Voting) {
            revert InvalidCaseStatus(caseId, CaseStatus.Voting, c.status);
        }
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > c.commitDeadline) revert NotInCommitWindow();
        if (_weightOf[caseId][msg.sender] == 0) revert NotAssignedAssessor(caseId, msg.sender);
        if (_commitOf[caseId][msg.sender] != bytes32(0)) revert AlreadyCommitted();

        _commitOf[caseId][msg.sender] = commitment;

        emit VoteCommitted(caseId, msg.sender);
    }

    /// @notice 鑑定者揭露投票，合約驗證與先前 commit 一致
    /// @param caseId   案件序號
    /// @param ratioBps 責任歸因比例（基點，須 <= BPS）
    /// @param salt     commit 時使用的隨機鹽
    function revealVote(uint256 caseId, uint256 ratioBps, bytes32 salt) external {
        Case storage c = _cases[caseId];
        if (c.status != CaseStatus.Voting) {
            revert InvalidCaseStatus(caseId, CaseStatus.Voting, c.status);
        }
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp <= c.commitDeadline || block.timestamp > c.revealDeadline) {
            revert NotInRevealWindow();
        }
        if (ratioBps > BPS) revert RatioOutOfRange();

        bytes32 commitment = _commitOf[caseId][msg.sender];
        if (commitment == bytes32(0)) revert NoCommitment();
        if (_revealed[caseId][msg.sender]) revert AlreadyRevealed();
        if (keccak256(abi.encode(ratioBps, salt, caseId)) != commitment) revert CommitmentMismatch();

        _revealed[caseId][msg.sender] = true;
        _revealedRatio[caseId][msg.sender] = ratioBps;
        c.revealedWeight += _weightOf[caseId][msg.sender];

        emit VoteRevealed(caseId, msg.sender, ratioBps);
    }

    /// @notice reveal 期結束後統計並結算
    /// @dev 達 quorum：以加權中位數比例縮放損失後呼叫 FundVault.settle；
    ///      未達 quorum：結案不賠付。未 reveal 者記錄為缺席（罰沒延後）。
    /// @param caseId 案件序號
    function resolve(uint256 caseId) external {
        Case storage c = _cases[caseId];
        if (c.status != CaseStatus.Voting) {
            revert InvalidCaseStatus(caseId, CaseStatus.Voting, c.status);
        }
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp <= c.revealDeadline) revert RevealWindowNotClosed();

        c.status = CaseStatus.Resolved;

        address[] memory assigned = _assigned[caseId];

        // 蒐集已揭露的 (ratio, weight)，並對缺席者罰沒。
        uint256 revealedCount;
        for (uint256 i = 0; i < assigned.length; i++) {
            address assessor = assigned[i];
            if (_revealed[caseId][assessor]) {
                revealedCount++;
            } else {
                emit AssessorNoShow(caseId, assessor);
                _slashNoShow(caseId, assessor, c.slashBps);
            }
        }

        bool quorumMet = VoteTally.meetsQuorum(c.revealedWeight, c.totalWeight, c.quorumBps);
        if (!quorumMet || revealedCount == 0) {
            emit CaseResolved(caseId, false, 0, 0);
            return;
        }

        uint256[] memory ratios = new uint256[](revealedCount);
        uint256[] memory weights = new uint256[](revealedCount);
        uint256 k;
        for (uint256 i = 0; i < assigned.length; i++) {
            address a = assigned[i];
            if (_revealed[caseId][a]) {
                ratios[k] = _revealedRatio[caseId][a];
                weights[k] = _weightOf[caseId][a];
                k++;
            }
        }

        uint256 medianRatio = VoteTally.weightedMedian(ratios, weights);
        uint256 effectiveLoss = (c.loss * medianRatio) / BPS;

        emit CaseResolved(caseId, true, medianRatio, effectiveLoss);

        fundVault.settle(c.subscriber, effectiveLoss, c.deductibleBps, c.coverageK);
    }

    /// @dev 依快照權重對缺席鑑定者罰沒；已被移出名冊者則略過。
    function _slashNoShow(uint256 caseId, address assessor, uint256 slashBps) private {
        if (slashBps == 0) return;
        if (!registry.isAssessor(assessor)) return;

        uint256 penalty = (_weightOf[caseId][assessor] * slashBps) / BPS;
        if (penalty == 0) return;

        registry.slash(assessor, penalty);
    }

    /// @notice 取得案件資料
    function getCase(uint256 caseId) external view returns (Case memory) {
        return _cases[caseId];
    }

    /// @notice 取得案件已分派的鑑定者
    function getAssignedAssessors(uint256 caseId) external view returns (address[] memory) {
        return _assigned[caseId];
    }

    /// @notice 取得某鑑定者在某案的分派權重（0 表示非被指派者）
    function weightOf(uint256 caseId, address assessor) external view returns (uint256) {
        return _weightOf[caseId][assessor];
    }

    /// @notice 查詢某鑑定者是否已在某案揭露
    function hasRevealed(uint256 caseId, address assessor) external view returns (bool) {
        return _revealed[caseId][assessor];
    }
}
