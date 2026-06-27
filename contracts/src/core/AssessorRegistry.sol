// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AssessorRegistry — 鑑定者註冊與列舉
/// @notice 對應白皮書 §6.5（鑑定者分派）。維護合格鑑定者池，供 DisputeManager 隨機抽選。
/// @dev M3a：質押額（stake）由 REGISTRAR_ROLE 設定，作為 M3b 質押加權統計的權重基準。
///      未來將改為實際代幣質押綁定（待後續 milestone）。
contract AssessorRegistry is AccessControl {
    /// @notice 可管理鑑定者名冊的角色
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    /// @notice 可罰沒鑑定者質押的角色（由 DisputeManager 持有）
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");

    /// @notice 鑑定者質押額（權重基準）；0 代表非鑑定者
    mapping(address => uint256) public stakeOf;

    /// @notice 協議累計罰沒額（供稽核；再分配 / 入庫待後續）
    uint256 public totalSlashed;

    /// @dev 鑑定者在 _assessors 中的 1-based 索引；0 代表不存在
    mapping(address => uint256) private _indexOf;

    /// @dev 合格鑑定者列表（供列舉與隨機抽選）
    address[] private _assessors;

    event AssessorRegistered(address indexed assessor, uint256 stake);
    event AssessorStakeUpdated(address indexed assessor, uint256 stake);
    event AssessorDeregistered(address indexed assessor);
    event AssessorSlashed(address indexed assessor, uint256 amount, uint256 newStake);

    error ZeroAddress();
    error ZeroStake();
    error AlreadyRegistered(address assessor);
    error NotRegistered(address assessor);

    /// @param admin 初始管理員（持有 DEFAULT_ADMIN_ROLE 與 REGISTRAR_ROLE）
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    /// @notice 註冊一名鑑定者
    function registerAssessor(address assessor, uint256 stake) external onlyRole(REGISTRAR_ROLE) {
        if (assessor == address(0)) revert ZeroAddress();
        if (stake == 0) revert ZeroStake();
        if (_indexOf[assessor] != 0) revert AlreadyRegistered(assessor);

        _assessors.push(assessor);
        _indexOf[assessor] = _assessors.length; // 1-based
        stakeOf[assessor] = stake;

        emit AssessorRegistered(assessor, stake);
    }

    /// @notice 更新鑑定者質押額
    function updateStake(address assessor, uint256 stake) external onlyRole(REGISTRAR_ROLE) {
        if (stake == 0) revert ZeroStake();
        if (_indexOf[assessor] == 0) revert NotRegistered(assessor);

        stakeOf[assessor] = stake;
        emit AssessorStakeUpdated(assessor, stake);
    }

    /// @notice 撤銷一名鑑定者（以 swap-and-pop 維持陣列緊湊）
    function deregisterAssessor(address assessor) external onlyRole(REGISTRAR_ROLE) {
        uint256 index = _indexOf[assessor];
        if (index == 0) revert NotRegistered(assessor);

        _removeAssessor(assessor, index);
        emit AssessorDeregistered(assessor);
    }

    /// @notice 罰沒一名鑑定者的質押（缺席 / 未揭露之懲罰）
    /// @dev 扣除額夾在現有質押內；扣到 0 則自動撤銷出池，維持「在池者皆有正權重」。
    /// @param assessor 受罰鑑定者
    /// @param amount   欲扣除的質押額
    function slash(address assessor, uint256 amount) external onlyRole(SLASHER_ROLE) {
        uint256 index = _indexOf[assessor];
        if (index == 0) revert NotRegistered(assessor);

        uint256 current = stakeOf[assessor];
        uint256 slashed = amount < current ? amount : current;
        uint256 newStake = current - slashed;
        totalSlashed += slashed;

        if (newStake == 0) {
            _removeAssessor(assessor, index);
            emit AssessorSlashed(assessor, slashed, 0);
            emit AssessorDeregistered(assessor);
        } else {
            stakeOf[assessor] = newStake;
            emit AssessorSlashed(assessor, slashed, newStake);
        }
    }

    /// @dev 以 swap-and-pop 自名冊移除，並清除索引與質押。
    function _removeAssessor(address assessor, uint256 index) private {
        uint256 lastIndex = _assessors.length;
        if (index != lastIndex) {
            address lastAssessor = _assessors[lastIndex - 1];
            _assessors[index - 1] = lastAssessor;
            _indexOf[lastAssessor] = index;
        }

        _assessors.pop();
        delete _indexOf[assessor];
        delete stakeOf[assessor];
    }

    /// @notice 是否為合格鑑定者
    function isAssessor(address account) external view returns (bool) {
        return _indexOf[account] != 0;
    }

    /// @notice 合格鑑定者總數
    function assessorCount() external view returns (uint256) {
        return _assessors.length;
    }

    /// @notice 依索引取得鑑定者（0-based）
    function assessorAt(uint256 index) external view returns (address) {
        return _assessors[index];
    }
}
