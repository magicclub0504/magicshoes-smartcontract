// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev MCT is the governance token contract
/// @notice fixed supply token
contract RL13 is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 6e9 * 1e18;
    uint256 public immutable START_TIME;

    uint256 public constant RESERVE_POOL_LOCKUP = 104 weeks;
    uint256 public constant TEAM_LOCKUP = 52 weeks;


    // Allocation amounts
    uint256 public constant MINING_POOL_ALLOCATION = 3.6e9 * 1e18;
    uint256 public constant AIRDROP_ALLOCATION = 6e8 * 1e18;
    uint256 public constant RESERVE_POOL_ALLOCATION = 7.2e8 * 1e18;
    uint256 public constant OPERATIONAL_POOL_ALLOCATION = 4.2e8 * 1e18;
    uint256 public constant TEAM_ALLOCATION = 4.2e8 * 1e18;
    uint256 public constant INITIAL_SUPPLY_ALLOCATION = 0.6e8 * 1e18;
    uint256 public constant INVESTOR_ALLOCATION = 1.8e8 * 1e18;

    // Vesting periods
    uint256 public constant MINING_POOL_VESTING = 520;
    uint256 public constant AIRDROP_VESTING = 52;
    uint256 public constant RESERVE_POOL_VESTING = 104;
    uint256 public constant OPERATIONAL_POOL_VESTING = 156;
    uint256 public constant TEAM_VESTING = 156;

    // Pool receivers
    address public constant MINING_POOL_RECEIVER = 0xb54E1c4B3927f4489Ead5c149b7895ecd03a5CE0;
    address public constant AIRDROP_POOL_RECEIVER = 0xF32fB437A2768f02FaDA4d97aBe76D8f306F44Fe;
    address public constant RESERVE_POOL_RECEIVER = 0xd1e532C785deEC90c1c69c7c5A7DcD28a8f74248;
    address public constant OPERATIONAL_POOL_RECEIVER = 0xA0B9Fe04F0E6E44E42C90CfE30507769E91C1919;
    address public constant TEAM_RECEIVER = 0x8A83d34fa97910B0786d8dAB29C5F3ACA5C1Cc76;
        address public constant INITIAL_SUPPLY_RECEIVER = 0x8824fE9FA03d3716A762375867FAC2052Cd54A8C;
    address public constant INVESTOR_POOL_RECEIVER = 0x910bBe8B14dbe813eA3F0e268058b024Bf5301D9;


    mapping(uint256 => uint256) public poolLastClaimTime; // maps pool id to last claim time
    mapping(uint256 => uint256) public poolClaimedAmount; // maps pool id to total claim amount

    mapping(address => bool) public isInvestor;
    mapping(address => uint256) public investment;
    mapping(address => uint256) public investedAt;


    // Timelock and Multi-signature wallet
    uint256 private constant TIMELOCK_DELAY = 48 hours;
    address[] private signers;
    mapping(bytes32 => bool) private pendingOperations;
    mapping(bytes32 => uint256) private operationTimestamps;
    mapping(bytes32 => uint256) private operationApprovals;
    uint256 private constant REQUIRED_SIGNATURES = 2; // Number of required signatures

    // A web link for sharing the timelock contract and multi-signers addresses information
    string public multiSignersAddresses;

    // A web link for share the token distribution plan and multi-signature wallet address
    string public tokenDistributionPlan;

    // Set the token distribution plan and multi-signature wallet address

    modifier onlySigner() {
        require(isSigner(msg.sender), "MCT: Only signers can call this function");
        _;
    }

    modifier onlyAfterTimelock(uint256 operationId) {
    bytes32 operationKey = bytes32(operationId);
    require(
        block.timestamp >= operationTimestamps[operationKey] + TIMELOCK_DELAY,
        "MCT: Timelock period not yet expired"
    );
    _;
}

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
        require(
            MINING_POOL_ALLOCATION +
            AIRDROP_ALLOCATION +
            RESERVE_POOL_ALLOCATION +
            OPERATIONAL_POOL_ALLOCATION +
            TEAM_ALLOCATION +
            INITIAL_SUPPLY_ALLOCATION +
            INVESTOR_ALLOCATION ==
            MAX_SUPPLY
            );
        START_TIME = block.timestamp;

    }

    function isSigner(address signer) public view returns (bool) {
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                return true;
            }
        }
        return false;
    }

    function addSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "MCT: Invalid signer address");
        require(!isSigner(newSigner), "MCT: Signer already exists");
        signers.push(newSigner);
    }

    function removeSigner(address signerToRemove) external onlyOwner {
        require(isSigner(signerToRemove), "MCT: Signer does not exist");
        uint256 signerIndex;
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signerToRemove) {
                signerIndex = i;
                break;
            }
        }
        signers[signerIndex] = signers[signers.length - 1];
        signers.pop();
    }

function proposeOperation(uint256 operationId) external onlySigner {
    bytes32 operationKey = bytes32(operationId);
    require(!pendingOperations[operationKey], "MCT: Operation already proposed");
    pendingOperations[operationKey] = true;
    operationTimestamps[operationKey] = block.timestamp;
    operationApprovals[operationKey] = 0;
}

function cancelOperation(uint256 operationId) external onlySigner {
    bytes32 operationKey = bytes32(operationId);
    require(pendingOperations[operationKey], "MCT: Operation not proposed");
    delete pendingOperations[operationKey];
    delete operationTimestamps[operationKey];
    delete operationApprovals[operationKey];
}

function approveOperation(uint256 operationId) external onlySigner  {
    bytes32 operationKey = bytes32(operationId);
    require(pendingOperations[operationKey], "MCT: Operation not proposed");
    require(operationApprovals[operationKey] < REQUIRED_SIGNATURES, "MCT: Operation already approved");
    operationApprovals[operationKey]++;
}

function executeOperation(uint256 operationId) external onlySigner onlyAfterTimelock(operationId)  {

    bytes32 operationKey = bytes32(operationId);
    require(pendingOperations[operationKey], "MCT: Operation not proposed");
    require(operationApprovals[operationKey] >= REQUIRED_SIGNATURES, "MCT: Not enough approvals for operation");

    delete pendingOperations[operationKey];
    delete operationTimestamps[operationKey];
    delete operationApprovals[operationKey];

    if (operationId == 1) {
        _claim(1, 0, MINING_POOL_ALLOCATION, MINING_POOL_VESTING, MINING_POOL_RECEIVER);

    } else if (operationId == 2) {
        _claim(2, 0, AIRDROP_ALLOCATION, AIRDROP_VESTING, AIRDROP_POOL_RECEIVER);

    } else if (operationId == 3) {
        _claim(3, RESERVE_POOL_LOCKUP, RESERVE_POOL_ALLOCATION, RESERVE_POOL_VESTING, RESERVE_POOL_RECEIVER);

    } else if (operationId == 4) {
        _claim(4, 0, OPERATIONAL_POOL_ALLOCATION, OPERATIONAL_POOL_VESTING, OPERATIONAL_POOL_RECEIVER);

    } else if (operationId == 5) {
        _claim(5, TEAM_LOCKUP, TEAM_ALLOCATION, TEAM_VESTING,TEAM_RECEIVER);
    }
    else if (operationId == 6) {
        _claim(6, 0, INITIAL_SUPPLY_ALLOCATION, 1, INITIAL_SUPPLY_RECEIVER);
    }
        else if (operationId == 7) {
        _claim(7, 0, INVESTOR_ALLOCATION, 1, INVESTOR_POOL_RECEIVER);
    }
}



function setmultiSignersAddresses(string memory link) external onlyOwner {
    multiSignersAddresses = link;
}

function setTokenDistributionPlan(string memory link) external onlyOwner {
    tokenDistributionPlan = link;
}



function _claim(
    uint256 poolId,
    uint256 lockIn,
    uint256 poolAllocation,
    uint256 vestingPeriod,
    address receiver
) internal {
    uint256 weeksElapsed;
    uint256 timeDiff;

    require(block.timestamp >= START_TIME + lockIn, "MCT: Lock-in Period");

    if (poolLastClaimTime[poolId] == 0) {
        timeDiff = block.timestamp - START_TIME;
    } else {
            timeDiff = block.timestamp - poolLastClaimTime[poolId];
        }

        weeksElapsed = timeDiff * 1 weeks / 1 weeks;

        require(weeksElapsed > 0, "MCT: Claim Period Invalid");

        uint256 weeklyReward = poolAllocation / vestingPeriod;
        uint256 totalReward = weeksElapsed * weeklyReward;
        uint256 newClaimedAmount = poolClaimedAmount[poolId] + totalReward;
        
        require(newClaimedAmount <= poolAllocation, "MCT: Claim Limit Reached");
        poolClaimedAmount[poolId] = newClaimedAmount;
        poolLastClaimTime[poolId] = block.timestamp;

        _mintNow(receiver, totalReward);
    }

    function _mintNow(address to_, uint256 amount_) internal {
        require(
            totalSupply() + amount_ <= MAX_SUPPLY,
            "MCT: Max Supply Reached"
        );
        _mint(to_, amount_);
    }

function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
) internal override {
    if (from == INVESTOR_POOL_RECEIVER && to != from) {
        if (isInvestor[to]) {
            require(investedAt[to] == 0, "MCT: You are already registered as an investor");
        } else {
            isInvestor[to] = true;
            investedAt[to] = block.timestamp;
        }
    }

    if (isInvestor[from]) {
        uint256 timeDiff = block.timestamp - (investedAt[from] + 26 weeks);
        uint256 weeksElapsed = timeDiff * 1 weeks / 1 weeks;

        if (weeksElapsed >= 52) {
            isInvestor[from] = false;
            investment[from] = 0;
            investedAt[from] = 0;
        } else {
            if (weeksElapsed >= 26 && weeksElapsed <= 52 && amount <= balanceOf(from) - investment[from]) {
                require(block.timestamp >= investedAt[from] + 26 weeks, "MCT: The lockdown period has not yet ended");
                require(weeksElapsed > 0, "MCT: Vesting period is incorrect");

                uint256 weeklyVesting = investment[from] * (1 weeks) / (52 weeks);
                uint256 amountVested = weeklyVesting * weeksElapsed / (1 weeks) ;

                require(amount <= amountVested, "MCT: Exceeds previously vested amount");
              }
          }
      }
   }
}
