require("@nomicfoundation/hardhat-toolbox")
require("hardhat-gas-reporter")
require('hardhat-docgen')
require('solidity-coverage')
require('hardhat-abi-exporter')
require('dotenv').config()
require("@nomicfoundation/hardhat-network-helpers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100
      }
    }
  },
  networks: {
    mumbai: {
      chainId: 80001,
      url: process.env.MUMBAI_RPC,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  gasReporter: {
    enabled: false,
    currency: 'USD',
    gasPrice: 155
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
  },
  abiExporter: {
    path: './abi',
    runOnCompile: false,
    clear: true,
    flat: false,
    spacing: 2,
    format: "json",
  }
};
