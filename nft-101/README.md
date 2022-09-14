# NFT Contract Hardhat Project

This project demonstrates a `Hardhat` ERC721 contract written in `Solidity`. It has the contract, a test for this contract, and a script that deploys this contract.

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

### Upload metadata to `ipfs` via `Pinata` cloud service
```shell
https://www.pinata.cloud/
```
<img width="1420" alt="image" src="https://user-images.githubusercontent.com/14263913/190223728-ef346201-fde1-4fdd-b08d-9aef59c2b440.png">

### Deploy the contract to `mumbai` testnet
```shell
npx hardhat run scripts/deploy.ts --network mumbai
```
<img width="1007" alt="image" src="https://user-images.githubusercontent.com/14263913/190223071-980f6577-921b-42c2-8922-1a25181f77a9.png">

### Check the deploy on `polygonscan`
```shell
https://mumbai.polygonscan.com/
```
<img width="1408" alt="image" src="https://user-images.githubusercontent.com/14263913/190223462-fbbd2ed5-f2cf-4859-8049-3644168fd3dd.png">

### Check the deploy on `opensea`
```shell
https://testnets.opensea.io/
```
<img width="1431" alt="image" src="https://user-images.githubusercontent.com/14263913/190223994-110e458b-ab37-41cb-afb1-ce280c362870.png">
<img width="1336" alt="image" src="https://user-images.githubusercontent.com/14263913/190224466-1c5b4ffc-e007-47e4-a963-9e5f36229b8f.png">
<img width="1318" alt="image" src="https://user-images.githubusercontent.com/14263913/190224544-578a7f78-d41e-47f1-99be-00ca8ce822dc.png">

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
