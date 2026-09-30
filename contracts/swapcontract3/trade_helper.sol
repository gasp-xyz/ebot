// SPDX-License-Identifier: PRIVATE
pragma solidity ^0.7.2;
pragma experimental ABIEncoderV2;

interface IERC20 {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function transfer(address to, uint value) external returns (bool);
    function approve(address spender, uint value) external returns (bool);
    function balanceOf(address owner) external view returns (uint);
}

interface TokenInterface {
    function balanceOf(address) external view returns (uint);
    function allowance(address, address) external view returns (uint);
    function approve(address, uint) external returns (bool);
    function transfer(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
    function deposit() external payable;
    function withdraw(uint) external;
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

interface ISwap {
    struct Swap {
        address pool;
        address tokenIn;
        address tokenOut;
        uint    swapAmount; // tokenInAmount / tokenOutAmount
        uint    limitReturnAmount; // minAmountOut / maxAmountIn
        uint    maxPrice;
    }
}

interface IBalancer is ISwap {

    function batchSwapExactIn(Swap[] memory swaps, TokenInterface tokenIn, TokenInterface tokenOut, uint totalAmountIn, uint minTotalAmountOut) external payable;

    function smartSwapExactIn(TokenInterface tokenIn, TokenInterface tokenOut, uint totalAmountIn, uint minTotalAmountOut, uint nPools) external payable;

    function viewSplitExactIn(address tokenIn, address tokenOut, uint swapAmount, uint nPools) external view returns (Swap[] memory swaps, uint totalOutput);
}

contract sender is ISwap {

    address private uniaddress;
    address private sushiaddress;
    address private balanceraddress;
    address private chiaddres;
    address private weth;
    address private dai;
    address private usdc;
    address private usdt;
    address private wbtc;

    address private owner;
    address private trader;
    IUniswapV2Router01 unirouter;
    IUniswapV2Router01 sushirouter;
    IChi chi;
    IBalancer balancer;

    modifier discountCHI {
        uint256 gasStart = gasleft();
        _;
        uint256 gasSpent = 21000 + gasStart - gasleft() + 16 * msg.data.length;
        chi.freeUpTo((gasSpent + 14154) / 41947);
    }

    constructor(
        address _uniRouter,
        address _sushiRouter,
        address _balancerRouter,
        address _chi,
        address _weth,
        address _dai,
        address _usdc,
        address _usdt,
        address _wbtc
    ) {
        require(_uniRouter != address(0) && _sushiRouter != address(0) && _balancerRouter != address(0), "Zero router address");
        require(_chi != address(0) && _weth != address(0), "Zero token address");
        require(_dai != address(0) && _usdc != address(0) && _usdt != address(0) && _wbtc != address(0), "Zero route token address");
        uniaddress = _uniRouter;
        sushiaddress = _sushiRouter;
        balanceraddress = _balancerRouter;
        chiaddres = _chi;
        weth = _weth;
        dai = _dai;
        usdc = _usdc;
        usdt = _usdt;
        wbtc = _wbtc;
        unirouter = IUniswapV2Router01(uniaddress);
        sushirouter = IUniswapV2Router01(sushiaddress);
        chi = IChi(chiaddres);
        balancer = IBalancer(balanceraddress);
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

    function frontUni(uint amount, uint amountOutMin, address[] memory path) external discountCHI {
        require(msg.sender == owner);
        unirouter.swapExactTokensForTokens(amount, amountOutMin, path, address(this), block.timestamp);
    }

    function frontSushi(uint amount, uint amountOutMin, address[] memory path) external discountCHI {
        require(msg.sender == owner);
        sushirouter.swapExactTokensForTokens(amount, amountOutMin, path, address(this), block.timestamp);
    }

    function frontBalancer(uint amount, uint amountOutMin, address token, uint pools) external discountCHI {
        Swap[] memory path;
        uint256 totalOutput;
        (path, totalOutput) = balancer.viewSplitExactIn(weth, token, amount, pools);
        require (totalOutput >= amountOutMin, "1");
        require(msg.sender == owner);
        balancer.batchSwapExactIn(path, TokenInterface(weth), TokenInterface(token), amount, amountOutMin);
    }

    // function frontUniDAI(uint amount, uint amountOutMin, address token) external discountCHI {
    //     address[] memory path = new address[](3);
    //     path[0] = weth;
    //     path[1] = dai;
    //     path[2] = token;
    //     require(msg.sender == owner);
    //     uint256 deadline = block.timestamp;
    //     unirouter.swapExactTokensForTokens(amount, amountOutMin, path, address(this), deadline);
    // }

    // function frontUniUSDC(uint amount, uint amountOutMin, address token) external discountCHI {
    //     address[] memory path = new address[](3);
    //     path[0] = weth;
    //     path[1] = usdc;
    //     path[2] = token;
    //     require(msg.sender == owner);
    //     uint256 deadline = block.timestamp;
    //     unirouter.swapExactTokensForTokens(amount, amountOutMin, path, address(this), deadline);
    // }

    // function frontBalancer2Smart(uint amount, uint requiredEthAmount, address token2address) external discountCHI {
    //     require(msg.sender == owner);
    //     balancer.smartSwapExactIn(TokenInterface(weth), TokenInterface(token2address), amount, requiredEthAmount, 2);
    // }

    function backUni(uint amountOutMin, address[] memory path) external {
        uint amount = IERC20(path[0]).balanceOf(address(this));
        uint256 tokenamount = unirouter.getAmountsOut(amount, path)[path.length - 1];
        require(tokenamount >= amountOutMin, "1");
        require((msg.sender == owner) || (msg.sender == trader));
        IERC20(path[0]).approve(uniaddress, amount);
        unirouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(amount, amountOutMin, path, address(this), block.timestamp);
    }

    function backSushi(uint amountOutMin, address[] memory path) external {
        uint amount = IERC20(path[0]).balanceOf(address(this));
        uint256 tokenamount = sushirouter.getAmountsOut(amount, path)[path.length - 1];
        require(tokenamount >= amountOutMin, "1");
        require((msg.sender == owner) || (msg.sender == trader));
        IERC20(path[0]).approve(sushiaddress, amount);
        sushirouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(amount, amountOutMin, path, address(this), block.timestamp);
    }

    function backBalancer(uint amountOutMin, address token, uint pools) external {
        uint amount = IERC20(token).balanceOf(address(this));
        Swap[] memory path;
        uint256 totalOutput;
        (path, totalOutput) = balancer.viewSplitExactIn(token, weth, amount, pools);
        require (totalOutput >= amountOutMin, "1");
        require((msg.sender == owner) || (msg.sender == trader));
        IERC20(token).approve(balanceraddress, amount);
        balancer.batchSwapExactIn(path, TokenInterface(token), TokenInterface(weth), amount, amountOutMin);
    }

    function homet(address to, uint value, address token) external {
        require((msg.sender == owner) || (msg.sender == trader));
        IERC20(token).transfer(to, value);
    }


}
