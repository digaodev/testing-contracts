# Advanced Storage Contract Hardhat Project

This project demonstrates a `Hardhat` Advanced Storage contract written in `Solidity`. It has the contract, a test for this contract, and a script that deploys this contract.

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

<img width="731" alt="image" src="https://user-images.githubusercontent.com/14263913/183993858-5f91f6e0-c7e9-431c-b6f0-26e45ed084ca.png">

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
