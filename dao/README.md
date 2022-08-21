# DAO Contract Hardhat Project

This project demonstrates a `Hardhat` DAO contract written in `Solidity`. It has the contract, a test for this contract, and a script that deploys this contract.

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

<img width="848" alt="image" src="https://user-images.githubusercontent.com/14263913/185806388-f690894d-13c6-4cb3-8d5a-b63772816242.png">

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
