const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('MCT Contract Unit Testing', function () {
  let contract;
  let owner;
  let user;
  let user2;
  let miningPoolUnvestedPerWeek = '6923076923076923076923076';

  before(async function () {
    let accounts = await ethers.getSigners();
    owner = accounts[0];
    user = accounts[1];
    user2 = accounts[2];

    const MCT_ABI = await ethers.getContractFactory('MCT');
    /// Deploying MCT with fixed supply of 1000 tokens.
    contract = await MCT_ABI.deploy(
      ethers.utils.parseEther('60000000'),
      'Magic Club Token',
      'MCT'
    );

    const signer = await ethers.getImpersonatedSigner(
      '0x8824fE9FA03d3716A762375867FAC2052Cd54A8C'
    );
    await owner.sendTransaction({
      to: signer.address,
      value: ethers.utils.parseEther('1.0'), // Sends exactly 1.0 ether
    });
    await contract
      .connect(signer)
      .transfer(owner.address, ethers.utils.parseEther('60000000'));
  });

  it('try querying metadata', async function () {
    expect(await contract.name()).to.equal('Magic Club Token');

    expect(await contract.symbol()).to.equal('MCT');

    expect(await contract.totalSupply()).to.equal(
      ethers.utils.parseEther('240000000')
    );

    expect(await contract.balanceOf(owner.address)).to.equal(
      ethers.utils.parseEther('60000000')
    );
  });

  it('try transferring tokens from deployer to user', async function () {
    await contract.transfer(user.address, ethers.utils.parseEther('100'));
  });

  it('try fetching balance', async function () {
    console.log(await contract.balanceOf(user.address));
    expect(await contract.balanceOf(user.address)).to.equal(
      ethers.utils.parseEther('100')
    );
  });

  it('try approving tokens', async function () {
    await contract
      .connect(user)
      .approve(user2.address, ethers.utils.parseEther('100'));
  });

  it('try validating allowance before transfer', async function () {
    expect(await contract.allowance(user.address, user2.address)).to.equal(
      ethers.utils.parseEther('100')
    );
  });

  it('try transferring tokens based on approvals', async function () {
    await contract
      .connect(user2)
      .transferFrom(
        user.address,
        user2.address,
        ethers.utils.parseEther('100')
      );
  });

  it('try validating allowance post transfer', async function () {
    expect(await contract.allowance(user.address, user2.address)).to.equal(0);
  });

  it('try fetching balance after transfer', async function () {
    expect(await contract.balanceOf(user2.address)).to.equal(
      ethers.utils.parseEther('100')
    );

    expect(await contract.balanceOf(user.address)).to.equal(
      ethers.utils.parseEther('0')
    );
  });

  it('try claiming pool tokens after 1 week', async function () {
    await network.provider.send('evm_increaseTime', [604800]);
    await contract.claimUnvestedMiningPoolTokens();
  });
});
