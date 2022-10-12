# Voting Contract Hardhat Project

This project demonstrates a `Hardhat` Voting contract written in `Solidity`. It has the contract, a test for this contract, and a script that deploys this contract.

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

<img width="752" alt="image" src="https://user-images.githubusercontent.com/14263913/195440986-9cdba97a-3bdb-4969-ad45-7d63e43a964b.png">

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
