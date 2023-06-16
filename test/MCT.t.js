const { expect } = require("chai");
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("MCT Contract Unit Testing", function () {
  let contract;
  let owner;
  let user;
  let user2;

  let signer1;
  let signer2;
  let signer3;
  let SECONDS_IN_DAY = 86400;

  before(async function () {
    let accounts = await ethers.getSigners();
    owner = accounts[0];
    user = accounts[1];
    user2 = accounts[2];

    signer1 = accounts[3];
    signer2 = accounts[4];
    signer3 = accounts[5];

    const MCT_ABI = await ethers.getContractFactory("MCT");
    contract = await MCT_ABI.deploy("Magic Club Token", "MCT");
  });

  /**
   * GENERAL SETUP TESTS
   */

  it("try querying metadata", async function () {
    expect(await contract.name()).to.equal("Magic Club Token");

    expect(await contract.symbol()).to.equal("MCT");

    expect(await contract.totalSupply()).to.equal(ethers.utils.parseEther("0"));

    expect(await contract.balanceOf(owner.address)).to.equal(
      ethers.utils.parseEther("0")
    );
  });

  it("try setting links", async function () {
    await contract
      .connect(owner)
      .setMultiSigAddressesLink("https://test.com/multisig");
    await contract
      .connect(owner)
      .setTokenDistributionPlanLink("https://test.com/testplan");

    expect(await contract.multiSigAddressesLink()).to.equal(
      "https://test.com/multisig"
    );
    expect(await contract.tokenDistributionPlanLink()).to.equal(
      "https://test.com/testplan"
    );
  });

  it("try adding three signers", async function () {
    await contract.connect(owner).addSigner(signer1.address);
    await contract.connect(owner).addSigner(signer2.address);
    await contract.connect(owner).addSigner(signer3.address);
    expect(await contract.isSigner(signer1.address)).to.equals(true);
    expect(await contract.signersCount()).to.equals("3");
  });

  it("try removing a signer", async function () {
    await contract.connect(owner).removeSigner(signer3.address);
    expect(await contract.isSigner(signer3.address)).to.equals(false);
    expect(await contract.signersCount()).to.equals("2");
  });

  it("try removing a required signer", async function () {
    try {
      await contract.connect(owner).removeSigner(signer2.address);
    } catch (err) {
      console.log(err);
      console.log("cannot remove required signer");
    }
    expect(await contract.isSigner(signer2.address)).to.equals(true);
    expect(await contract.signersCount()).to.equals("2");
  });

  it("try adding a signer from non-owner wallet", async function () {
    try {
      await contract.connect(user).addSigner(signer1.address);
    } catch (err) {
      console.log(err);
      console.log("cannot add signer from non-owner wallet");
    }
  });

  it("try removing a signer from non-owner wallet", async function () {
    try {
      await contract.connect(user).removeSigner(signer1.address);
    } catch (err) {
      console.log("cannot add signer from non-owner wallet");
    }
  });

  /**
   * TESTS FOR CLAIMING ALLOCATED TOKENS
   */
  it("try initiate a transaction to issue initial supply", async function () {
    await contract.connect(signer1).proposeOperation(6);
  });

  it("try approving operation from signers", async function () {
    await contract.connect(signer1).approveOperation(6);
    await contract.connect(signer2).approveOperation(6);
  });

  it("try executing operation from signers", async function () {
    await helpers.time.increase(SECONDS_IN_DAY * 2);
    await contract.connect(signer1).executeOperation(6);
    try {
      await contract.connect(signer1).executeOperation(6);
    } catch (err) {
      console.log(err);
      console.log("cannot execute operation more than once");
    }
  });

  it("check balance of initial supply receiver", async function () {
    expect(
      await contract.balanceOf("0x8824fE9FA03d3716A762375867FAC2052Cd54A8C")
    ).to.equals(ethers.utils.parseEther("60000000"));
  });

  it("try minting initial supply 2nd time (malicious)", async function () {
    await contract.connect(signer1).proposeOperation(6);

    await contract.connect(signer1).approveOperation(6);
    await contract.connect(signer2).approveOperation(6);

    await helpers.time.increase(SECONDS_IN_DAY * 2);
    try {
      await contract.connect(signer1).executeOperation(6);
    } catch (err) {
      console.log(err);
      console.log("error cannot mint more than pool allocation");
    }
  });

  it("try minting mining pool allocation after day 5", async function () {
    await contract.connect(signer1).proposeOperation(1);

    await contract.connect(signer1).approveOperation(1);
    await contract.connect(signer2).approveOperation(1);

    try {
      await contract.connect(signer1).executeOperation(1);
    } catch (err) {
      console.log(err);
      console.log("zero claimable amount");
    }

    await helpers.time.increase(SECONDS_IN_DAY * 5);
    await contract.connect(signer1).executeOperation(1);

    expect(
      await contract.balanceOf("0xb54E1c4B3927f4489Ead5c149b7895ecd03a5CE0")
    ).to.greaterThan(ethers.utils.parseEther("6923076"));
  });

  it("try minting reserve pool allocation before 104 weeks", async function () {
    await contract.connect(signer1).proposeOperation(3);

    await contract.connect(signer1).approveOperation(3);
    await contract.connect(signer2).approveOperation(3);

    try {
      await contract.connect(signer1).executeOperation(3);
    } catch (err) {
      console.log(err);
      console.log("before lock-in period");
    }

    await helpers.time.increase(SECONDS_IN_DAY * 300 * 7);
    await contract.connect(signer1).executeOperation(3);

    expect(
      await contract.balanceOf("0xd1e532C785deEC90c1c69c7c5A7DcD28a8f74248")
    ).to.greaterThan(ethers.utils.parseEther("6923076"));
  });

  it("try minting tokens from investor pool", async function () {
    await contract.connect(signer1).proposeOperation(7);

    await contract.connect(signer1).approveOperation(7);
    await contract.connect(signer2).approveOperation(7);

    await helpers.time.increase(SECONDS_IN_DAY * 2);
    await contract.connect(signer1).executeOperation(7);
  });

  it("send tokens to user2 as investor", async function () {
    const signer = await ethers.getImpersonatedSigner(
      "0x910bBe8B14dbe813eA3F0e268058b024Bf5301D9"
    );
    await owner.sendTransaction({
      to: signer.address,
      value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
    });
    await contract
      .connect(signer)
      .transfer(
        user2.address,
        contract.balanceOf("0x910bBe8B14dbe813eA3F0e268058b024Bf5301D9")
      );
    expect(await contract.investment(user2.address)).to.equals(
      ethers.utils.parseEther("180000000")
    );
    console.log(await contract.balanceOf(user2.address));
  });

  it("try to move tokens from investor wallet before 26 weeks", async function () {
    try {
      await contract
        .connect(user2)
        .transfer(user.address, ethers.utils.parseEther("180000000"));
    } catch (err) {
      console.log(err);
      console.log("cannot transfer during lock-in");
    }
  });

  it("try to move tokens from investor wallet after 27 weeks", async function () {
      await helpers.time.increase(SECONDS_IN_DAY * 27 * 7);
      await contract
        .connect(user2)
        .transfer(user.address, ethers.utils.parseEther("93461538"));
      console.log(await contract.balanceOf(user.address));

      try {
        await contract
        .connect(user2)
        .transfer(user.address, ethers.utils.parseEther("93461538"));
      } catch (err) {
        console.log(err)
        console.log("try to move unvested")
      }
      await helpers.time.increase(SECONDS_IN_DAY * 2 * 7);
      await contract
        .connect(user2)
        .transfer(user.address, ethers.utils.parseEther("6923076"));
      console.log(await contract.balanceOf(user.address));
  });

  it("try to move all from investor wallet after 52 weeks", async function () {
    await helpers.time.increase(SECONDS_IN_DAY * 27 * 7);
    await contract
      .connect(user2)
      .transfer(user.address, await contract.balanceOf(user2.address));
    console.log(await contract.balanceOf(user.address));
});
});
