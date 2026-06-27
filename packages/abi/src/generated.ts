//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// AssessorRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const assessorRegistryAbi = [
  {
    type: 'constructor',
    inputs: [{ name: 'admin', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REGISTRAR_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'SLASHER_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'index', internalType: 'uint256', type: 'uint256' }],
    name: 'assessorAt',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'assessorCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'assessor', internalType: 'address', type: 'address' }],
    name: 'deregisterAssessor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'role', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getRoleAdmin',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'isAssessor',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'assessor', internalType: 'address', type: 'address' },
      { name: 'stake', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'registerAssessor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'callerConfirmation', internalType: 'address', type: 'address' },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'assessor', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'slash',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'stakeOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSlashed',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'assessor', internalType: 'address', type: 'address' },
      { name: 'stake', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateStake',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'assessor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AssessorDeregistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'assessor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'stake',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AssessorRegistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'assessor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newStake',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AssessorSlashed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'assessor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'stake',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'AssessorStakeUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'previousAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'newAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
    ],
    name: 'RoleAdminChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RoleGranted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RoleRevoked',
  },
  { type: 'error', inputs: [], name: 'AccessControlBadConfirmation' },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'neededRole', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'AccessControlUnauthorizedAccount',
  },
  {
    type: 'error',
    inputs: [{ name: 'assessor', internalType: 'address', type: 'address' }],
    name: 'AlreadyRegistered',
  },
  {
    type: 'error',
    inputs: [{ name: 'assessor', internalType: 'address', type: 'address' }],
    name: 'NotRegistered',
  },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
  { type: 'error', inputs: [], name: 'ZeroStake' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ChainlinkVRFAdapter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const chainlinkVrfAdapterAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'vrfCoordinator', internalType: 'address', type: 'address' },
      { name: 'keyHash_', internalType: 'bytes32', type: 'bytes32' },
      { name: 'subscriptionId_', internalType: 'uint256', type: 'uint256' },
      { name: 'callbackGasLimit_', internalType: 'uint32', type: 'uint32' },
      { name: 'requestConfirmations_', internalType: 'uint16', type: 'uint16' },
      { name: 'nativePayment_', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'acceptOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'callbackGasLimit',
    outputs: [{ name: '', internalType: 'uint32', type: 'uint32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'consumer',
    outputs: [
      {
        name: '',
        internalType: 'contract IRandomnessConsumer',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'keyHash',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nativePayment',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'requestId', internalType: 'uint256', type: 'uint256' },
      { name: 'randomWords', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'rawFulfillRandomWords',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'requestConfirmations',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'numWords', internalType: 'uint32', type: 'uint32' }],
    name: 'requestRandomness',
    outputs: [{ name: 'requestId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 's_vrfCoordinator',
    outputs: [
      {
        name: '',
        internalType: 'contract IVRFCoordinatorV2Plus',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'consumer_',
        internalType: 'contract IRandomnessConsumer',
        type: 'address',
      },
    ],
    name: 'setConsumer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_vrfCoordinator', internalType: 'address', type: 'address' },
    ],
    name: 'setCoordinator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'subscriptionId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'to', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'consumer',
        internalType: 'contract IRandomnessConsumer',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ConsumerSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'vrfCoordinator',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'CoordinatorSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
    ],
    name: 'OwnershipTransferRequested',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
    ],
    name: 'OwnershipTransferred',
  },
  { type: 'error', inputs: [], name: 'ConsumerAlreadySet' },
  { type: 'error', inputs: [], name: 'OnlyConsumer' },
  {
    type: 'error',
    inputs: [
      { name: 'have', internalType: 'address', type: 'address' },
      { name: 'want', internalType: 'address', type: 'address' },
    ],
    name: 'OnlyCoordinatorCanFulfill',
  },
  {
    type: 'error',
    inputs: [
      { name: 'have', internalType: 'address', type: 'address' },
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'coordinator', internalType: 'address', type: 'address' },
    ],
    name: 'OnlyOwnerOrCoordinator',
  },
  { type: 'error', inputs: [], name: 'ZeroAddress' },
  { type: 'error', inputs: [], name: 'ZeroConsumer' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DisputeManager
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const disputeManagerAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'admin', internalType: 'address', type: 'address' },
      {
        name: 'registry_',
        internalType: 'contract AssessorRegistry',
        type: 'address',
      },
      {
        name: 'randomness_',
        internalType: 'contract IRandomnessProvider',
        type: 'address',
      },
      {
        name: 'fundVault_',
        internalType: 'contract IFundVault',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'CASE_MANAGER_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'caseId', internalType: 'uint256', type: 'uint256' },
      { name: 'commitment', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'commitVote',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'requestId', internalType: 'uint256', type: 'uint256' },
      { name: 'randomWords', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'fulfillRandomness',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'fundVault',
    outputs: [
      { name: '', internalType: 'contract IFundVault', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'caseId', internalType: 'uint256', type: 'uint256' }],
    name: 'getAssignedAssessors',
    outputs: [{ name: '', internalType: 'address[]', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'caseId', internalType: 'uint256', type: 'uint256' }],
    name: 'getCase',
    outputs: [
      {
        name: '',
        internalType: 'struct DisputeManager.Case',
        type: 'tuple',
        components: [
          { name: 'subscriber', internalType: 'address', type: 'address' },
          { name: 'loss', internalType: 'uint256', type: 'uint256' },
          { name: 'deductibleBps', internalType: 'uint256', type: 'uint256' },
          { name: 'coverageK', internalType: 'uint256', type: 'uint256' },
          { name: 'evidenceHash', internalType: 'bytes32', type: 'bytes32' },
          {
            name: 'status',
            internalType: 'enum DisputeManager.CaseStatus',
            type: 'uint8',
          },
          { name: 'numAssessors', internalType: 'uint32', type: 'uint32' },
          { name: 'commitDeadline', internalType: 'uint64', type: 'uint64' },
          { name: 'revealDeadline', internalType: 'uint64', type: 'uint64' },
          { name: 'quorumBps', internalType: 'uint256', type: 'uint256' },
          { name: 'slashBps', internalType: 'uint256', type: 'uint256' },
          { name: 'totalWeight', internalType: 'uint256', type: 'uint256' },
          { name: 'revealedWeight', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'role', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getRoleAdmin',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'caseId', internalType: 'uint256', type: 'uint256' },
      { name: 'assessor', internalType: 'address', type: 'address' },
    ],
    name: 'hasRevealed',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextCaseId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'subscriber', internalType: 'address', type: 'address' },
      { name: 'loss', internalType: 'uint256', type: 'uint256' },
      { name: 'deductibleBps', internalType: 'uint256', type: 'uint256' },
      { name: 'coverageK', internalType: 'uint256', type: 'uint256' },
      { name: 'evidenceHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'openDispute',
    outputs: [{ name: 'caseId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'loss', internalType: 'uint256', type: 'uint256' },
      { name: 'deductibleBps', internalType: 'uint256', type: 'uint256' },
      { name: 'coverageK', internalType: 'uint256', type: 'uint256' },
      { name: 'evidenceHash', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'openDisputeForSelf',
    outputs: [{ name: 'caseId', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'randomness',
    outputs: [
      {
        name: '',
        internalType: 'contract IRandomnessProvider',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'registry',
    outputs: [
      { name: '', internalType: 'contract AssessorRegistry', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'callerConfirmation', internalType: 'address', type: 'address' },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'caseId', internalType: 'uint256', type: 'uint256' },
      { name: 'numAssessors', internalType: 'uint32', type: 'uint32' },
    ],
    name: 'requestAssessors',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'caseId', internalType: 'uint256', type: 'uint256' }],
    name: 'resolve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'caseId', internalType: 'uint256', type: 'uint256' },
      { name: 'ratioBps', internalType: 'uint256', type: 'uint256' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'revealVote',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'caseId', internalType: 'uint256', type: 'uint256' },
      { name: 'commitDuration', internalType: 'uint64', type: 'uint64' },
      { name: 'revealDuration', internalType: 'uint64', type: 'uint64' },
      { name: 'quorumBps', internalType: 'uint256', type: 'uint256' },
      { name: 'slashBps', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'startVoting',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'caseId', internalType: 'uint256', type: 'uint256' },
      { name: 'assessor', internalType: 'address', type: 'address' },
    ],
    name: 'weightOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'caseId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'assessor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'AssessorNoShow',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'caseId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'assessors',
        internalType: 'address[]',
        type: 'address[]',
        indexed: false,
      },
    ],
    name: 'AssessorsAssigned',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'caseId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'requestId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'numAssessors',
        internalType: 'uint32',
        type: 'uint32',
        indexed: false,
      },
    ],
    name: 'AssessorsRequested',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'caseId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      { name: 'quorumMet', internalType: 'bool', type: 'bool', indexed: false },
      {
        name: 'medianRatioBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'effectiveLoss',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'CaseResolved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'caseId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'subscriber',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'evidenceHash',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: false,
      },
    ],
    name: 'DisputeOpened',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'previousAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'newAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
    ],
    name: 'RoleAdminChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RoleGranted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RoleRevoked',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'caseId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'assessor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'VoteCommitted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'caseId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'assessor',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'ratioBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VoteRevealed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'caseId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'commitDeadline',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      {
        name: 'revealDeadline',
        internalType: 'uint64',
        type: 'uint64',
        indexed: false,
      },
      {
        name: 'quorumBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VotingStarted',
  },
  { type: 'error', inputs: [], name: 'AccessControlBadConfirmation' },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'neededRole', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'AccessControlUnauthorizedAccount',
  },
  { type: 'error', inputs: [], name: 'AlreadyCommitted' },
  { type: 'error', inputs: [], name: 'AlreadyRevealed' },
  { type: 'error', inputs: [], name: 'CommitmentMismatch' },
  {
    type: 'error',
    inputs: [
      { name: 'caseId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'expected',
        internalType: 'enum DisputeManager.CaseStatus',
        type: 'uint8',
      },
      {
        name: 'actual',
        internalType: 'enum DisputeManager.CaseStatus',
        type: 'uint8',
      },
    ],
    name: 'InvalidCaseStatus',
  },
  { type: 'error', inputs: [], name: 'InvalidQuorum' },
  { type: 'error', inputs: [], name: 'InvalidSlash' },
  { type: 'error', inputs: [], name: 'LengthMismatch' },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'NoContribution',
  },
  { type: 'error', inputs: [], name: 'NoCommitment' },
  { type: 'error', inputs: [], name: 'NoReveals' },
  {
    type: 'error',
    inputs: [
      { name: 'caseId', internalType: 'uint256', type: 'uint256' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'NotAssignedAssessor',
  },
  {
    type: 'error',
    inputs: [
      { name: 'available', internalType: 'uint256', type: 'uint256' },
      { name: 'requested', internalType: 'uint32', type: 'uint32' },
    ],
    name: 'NotEnoughAssessors',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'NotSubscriber',
  },
  { type: 'error', inputs: [], name: 'NotInCommitWindow' },
  { type: 'error', inputs: [], name: 'NotInRevealWindow' },
  { type: 'error', inputs: [], name: 'OnlyRandomnessProvider' },
  { type: 'error', inputs: [], name: 'RatioOutOfRange' },
  { type: 'error', inputs: [], name: 'RevealWindowNotClosed' },
  {
    type: 'error',
    inputs: [{ name: 'requestId', internalType: 'uint256', type: 'uint256' }],
    name: 'UnknownRequest',
  },
  { type: 'error', inputs: [], name: 'ZeroAssessors' },
  { type: 'error', inputs: [], name: 'ZeroDuration' },
  { type: 'error', inputs: [], name: 'ZeroEvidenceHash' },
  { type: 'error', inputs: [], name: 'ZeroLoss' },
  { type: 'error', inputs: [], name: 'ZeroSubscriber' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FundVault
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const fundVaultAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'token_', internalType: 'contract IERC20', type: 'address' },
      { name: 'admin', internalType: 'address', type: 'address' },
      {
        name: 'config_',
        internalType: 'struct ILaunch.LaunchConfig',
        type: 'tuple',
        components: [
          { name: 'nMin', internalType: 'uint256', type: 'uint256' },
          { name: 'dMin', internalType: 'uint256', type: 'uint256' },
          { name: 'hhiMaxBps', internalType: 'uint256', type: 'uint256' },
          { name: 'etaMaxBps', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'activate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'active',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'canActivate',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'pType',
        internalType: 'enum IFundVault.ParticipantType',
        type: 'uint8',
      },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'contribute',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'contributionOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'role', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getRoleAdmin',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'launchConfig',
    outputs: [
      { name: 'nMin', internalType: 'uint256', type: 'uint256' },
      { name: 'dMin', internalType: 'uint256', type: 'uint256' },
      { name: 'hhiMaxBps', internalType: 'uint256', type: 'uint256' },
      { name: 'etaMaxBps', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'launchStatus',
    outputs: [
      {
        name: 'status',
        internalType: 'struct ILaunch.LaunchStatus',
        type: 'tuple',
        components: [
          { name: 'meetsParticipants', internalType: 'bool', type: 'bool' },
          { name: 'meetsDeposit', internalType: 'bool', type: 'bool' },
          { name: 'meetsConcentration', internalType: 'bool', type: 'bool' },
          { name: 'meetsShare', internalType: 'bool', type: 'bool' },
          { name: 'canActivate', internalType: 'bool', type: 'bool' },
          {
            name: 'concentrationBps',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'shareBps', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'maxContribution',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'participantCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'participantTypeOf',
    outputs: [
      {
        name: '',
        internalType: 'enum IFundVault.ParticipantType',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'poolBalance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'callerConfirmation', internalType: 'address', type: 'address' },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'active_', internalType: 'bool', type: 'bool' }],
    name: 'setActive',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'config_',
        internalType: 'struct ILaunch.LaunchConfig',
        type: 'tuple',
        components: [
          { name: 'nMin', internalType: 'uint256', type: 'uint256' },
          { name: 'dMin', internalType: 'uint256', type: 'uint256' },
          { name: 'hhiMaxBps', internalType: 'uint256', type: 'uint256' },
          { name: 'etaMaxBps', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    name: 'setLaunchConfig',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'subscriber', internalType: 'address', type: 'address' },
      { name: 'loss', internalType: 'uint256', type: 'uint256' },
      { name: 'deductibleBps', internalType: 'uint256', type: 'uint256' },
      { name: 'coverageK', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'settle',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'sumOfSquares',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'token',
    outputs: [{ name: '', internalType: 'contract IERC20', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalContributed',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalPaidOut',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'active', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ActiveStatusChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'participant',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newTotal',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Contributed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'nMin',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'dMin',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'hhiMaxBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'etaMaxBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'LaunchConfigUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'previousAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'newAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
    ],
    name: 'RoleAdminChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RoleGranted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RoleRevoked',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'subscriber',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'loss',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'deductible',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'poolPayout',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'residual',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Settled',
  },
  { type: 'error', inputs: [], name: 'AccessControlBadConfirmation' },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'neededRole', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'AccessControlUnauthorizedAccount',
  },
  {
    type: 'error',
    inputs: [
      { name: 'deductibleBps', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'DeductibleTooHigh',
  },
  { type: 'error', inputs: [], name: 'InvalidParticipantType' },
  { type: 'error', inputs: [], name: 'LaunchThresholdNotMet' },
  { type: 'error', inputs: [], name: 'NotActive' },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'NotSubscriber',
  },
  { type: 'error', inputs: [], name: 'ParticipantTypeMismatch' },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  { type: 'error', inputs: [], name: 'ZeroAmount' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IFundVault
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const iFundVaultAbi = [
  {
    type: 'function',
    inputs: [],
    name: 'active',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'contributionOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'participantTypeOf',
    outputs: [
      {
        name: '',
        internalType: 'enum IFundVault.ParticipantType',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'subscriber', internalType: 'address', type: 'address' },
      { name: 'loss', internalType: 'uint256', type: 'uint256' },
      { name: 'deductibleBps', internalType: 'uint256', type: 'uint256' },
      { name: 'coverageK', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'settle',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'active', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ActiveStatusChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'participant',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newTotal',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Contributed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'nMin',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'dMin',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'hhiMaxBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'etaMaxBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'LaunchConfigUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'subscriber',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'loss',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'deductible',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'poolPayout',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'residual',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Settled',
  },
] as const
