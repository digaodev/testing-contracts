// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAI is ERC20 {
    constructor() ERC20("DAI", "Dai Stablecoin") {}

    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
