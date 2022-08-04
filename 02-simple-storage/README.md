# Simple Storage Contract Hardhat Project

This project demonstrates a `Hardhat` Simple Storage contract written in `Solidity`. It has a simple contract, a test for that contract, and a script that deploys that contract.

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

<img width="716" alt="image" src="https://user-images.githubusercontent.com/14263913/182964693-e8a665cb-c347-48f0-bd12-aadaa79d2933.png">

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
