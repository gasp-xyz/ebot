interface IERC20 {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function transfer(address to, uint value) external returns (bool);
    function approve(address spender, uint value) external returns (bool);
    function balanceOf(address owner) external view returns (uint);
}


interface IUniswapV2Router01 {

    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);

	function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;

}

contract sender {

	address private owner;
	address private trader;

	constructor() public {
		owner = msg.sender;
	}

	function settrader(address adr) external {
	    require(msg.sender == owner);
	    trader = adr;
	}

	function dotrade(uint amountOutMin, address[] calldata path, uint deadline, address router) external payable {
		require(msg.sender == owner);
		IUniswapV2Router01(router).swapExactETHForTokens{value:msg.value}(amountOutMin, path, address(this), deadline);
	}

	function back(
        uint amountOutMin,
        address[] calldata path,
        uint deadline,
		address router,
		uint value
	) external {
		require((msg.sender == owner) || (msg.sender == trader));
		uint amount = IERC20(path[0]).balanceOf(address(this));
		IERC20(path[0]).approve(router, value);
		IUniswapV2Router01(router).swapExactTokensForETHSupportingFeeOnTransferTokens(amount, amountOutMin, path, owner, deadline);
	}

	function homet(address to, uint value, address token) external {
		require((msg.sender == owner) || (msg.sender == trader));
		IERC20(token).transfer(to, value);
	}


}
