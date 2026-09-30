// SPDX-License-Identifier: PRIVATE
pragma solidity ^0.7.2;

interface IERC20 {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function transfer(address to, uint value) external returns (bool);
    function approve(address spender, uint value) external returns (bool);
    function balanceOf(address owner) external view returns (uint);
}


interface IUniswapV2Router01 {

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);

}

interface IChi {
    function freeUpTo(uint256 value) external returns (uint256);
}

contract sender {

    address private uniaddress;
    address private sushiaddress;
    address private weth;
    address private chiaddres;

    address private owner;
    address private trader;
    IUniswapV2Router01 unirouter;
    IUniswapV2Router01 sushirouter;
    IChi chi;

    modifier discountCHI {
        uint256 gasStart = gasleft();
        _;
        uint256 gasSpent = 21000 + gasStart - gasleft() + 16 * msg.data.length;
        chi.freeUpTo((gasSpent + 14154) / 41947);
    }

    constructor(address _uniRouter, address _sushiRouter, address _weth, address _chi) {
        require(_uniRouter != address(0) && _sushiRouter != address(0), "Zero router address");
        require(_weth != address(0) && _chi != address(0), "Zero token address");
        uniaddress = _uniRouter;
        sushiaddress = _sushiRouter;
        weth = _weth;
        chiaddres = _chi;
        unirouter = IUniswapV2Router01(uniaddress);
        sushirouter = IUniswapV2Router01(sushiaddress);
        chi = IChi(chiaddres);
        owner = msg.sender;
    }

    function settrader(address adr) external {
        require(msg.sender == owner);
        trader = adr;
    }

    function approveRouter(uint amount, address token, address router) external {
        require(msg.sender == owner);
        IERC20(token).approve(router, amount);
    }

    function dotradeUni(uint amount, uint amountOutMin, address token) external discountCHI {
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = token;
        require(msg.sender == owner);
        uint256 deadline = block.timestamp;
        unirouter.swapExactTokensForTokens(amount, amountOutMin, path, address(this), deadline);
    }

    function dotradeSushi(uint amount, uint amountOutMin, address token) external discountCHI {
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = token;
        require(msg.sender == owner);
        uint256 deadline = block.timestamp;
        sushirouter.swapExactTokensForTokens(amount, amountOutMin, path, address(this), deadline);
    }

    function backUni(uint amountOutMin, address token) external {
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = weth;
        uint amount = IERC20(token).balanceOf(address(this));
        uint256 tokenamount = unirouter.getAmountsOut(amount, path)[1];
        require(tokenamount > amountOutMin, "1");
        require((msg.sender == owner) || (msg.sender == trader));
        uint256 deadline = block.timestamp;
        IERC20(token).approve(uniaddress, amount);
        unirouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(amount, amountOutMin, path, address(this), deadline);
    }

    function backSushi(uint amountOutMin, address token ) external {
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = weth;
        uint amount = IERC20(token).balanceOf(address(this));
        uint256 tokenamount = sushirouter.getAmountsOut(amount, path)[1];
        require(tokenamount > amountOutMin, "1");
        require((msg.sender == owner) || (msg.sender == trader));
        uint256 deadline = block.timestamp;
        IERC20(token).approve(sushiaddress, amount);
        sushirouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(amount, amountOutMin, path, address(this), deadline);
    }

    function homet(address to, uint value, address token) external {
        require((msg.sender == owner) || (msg.sender == trader));
        IERC20(token).transfer(to, value);
    }


}
