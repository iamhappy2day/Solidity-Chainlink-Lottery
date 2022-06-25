const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { networks } = require("../../hardhat.config");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery unit tests", () => {
      let lottery, vrfCoordinatorV2Mock, entranceFee, deployer, interval;
      const chainId = network.config.chainId;

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        lottery = await ethers.getContract("Lottery", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        entranceFee = await lottery.getEntranceFee();
        interval = await lottery.getInterval();
      });

      describe("Test constructor", () => {
        it("initializes lottery correctly", async () => {
          const lotteryInterval = await lottery.getInterval();
          const lotteryState = await lottery.getLotteryState();
          const lotteryEntranceFee = await lottery.getEntranceFee();
          console.log("lotteryEntranceFee", lotteryEntranceFee.toString());
          assert.equal(lotteryState.toString(), "0");
          assert.equal(
            lotteryInterval.toString(),
            networkConfig[chainId]["keepersUpdateInterval"]
          );
          assert.equal(
            lotteryEntranceFee.toString(),
            networkConfig[chainId]["lotteryEntranceFee"]
          );
        });
      });

      describe("Test enter lottery function", () => {
        it("Reverts if not enough eth for enter lottery", async () => {
          await expect(lottery.enterLottery()).to.be.revertedWith(
            "Lottery__notEnoughEthForEntrance"
          );
        });

        it("Adds player when they enter", async () => {
          await lottery.enterLottery({ value: entranceFee });
          const addedPlayer = await lottery.getPlayer(0);
          console.log(addedPlayer);
          assert.equal(addedPlayer, deployer);
        });

        it("Reverts if lootery state not open", async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          // run chainlink keeper
          await lottery.performUpkeep([]);
          await expect(
            lottery.enterLottery({ value: entranceFee })
          ).to.be.revertedWith("Lottery__notOpen");
        });

        it("Emits event on enter lottery", async () => {
          await expect(lottery.enterLottery({ value: entranceFee })).to.emit(
            lottery,
            "EnterLottery"
          );
        });
      });
    });
