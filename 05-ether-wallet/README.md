# Ether Wallet Contract Hardhat Project

This project demonstrates a `Hardhat` Ether Wallet contract written in `Solidity`. It has the contract, a test for this contract, and a script that deploys this contract.

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

<img width="763" alt="image" src="https://user-images.githubusercontent.com/14263913/185204768-a3b2808c-79ff-4f6e-98c0-41e878717753.png">

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
