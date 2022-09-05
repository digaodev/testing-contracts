# Auction Contract Hardhat Project

This project demonstrates a `Hardhat` Auction contract written in `Solidity`. It has the contract, a test for this contract, and a script that deploys this contract.

## How to use

### Download and install all the dependencies
```shell
npm install
```

### List all available commands
```shell
npx hardhat help
```

### Compile the contract
```shell
npx hardhat compile
```

### Run all tests
```shell
npx hardhat test
```

<img width="945" alt="image" src="https://user-images.githubusercontent.com/14263913/188509877-0310bf80-12b8-407a-9bcb-ab2d2c0f548a.png">

#


### You can deploy in the localhost network following these steps:

- Start a local node
```shell
npx hardhat node
```

- Open a new terminal and deploy the smart contract in the localhost network
```shell
npx hardhat run --network localhost scripts/deploy.ts
```
