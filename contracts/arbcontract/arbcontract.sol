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

	function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);

}

interface ILendingPool {
	function flashLoan ( address _receiver, address _reserve, uint256 _amount, bytes calldata _params ) external;
}

contract sender {

		address private uniaddress;
		address private sushiaddress;
		address private weth;
		address payable private aave;
		address payable private aaveCore;
		address private ethAddress;

	address private token;
	address payable private owner;
	bool private mode;
		IUniswapV2Router01 unirouter;
		IUniswapV2Router01 sushirouter;

		constructor(
			address _uniRouter,
			address _sushiRouter,
			address _weth,
			address payable _aave,
			address payable _aaveCore,
			address _ethAddress
		) public {
			require(_uniRouter != address(0) && _sushiRouter != address(0), "Zero router address");
			require(_weth != address(0) && _ethAddress != address(0), "Zero asset address");
			require(_aave != address(0) && _aaveCore != address(0), "Zero lending address");
			uniaddress = _uniRouter;
			sushiaddress = _sushiRouter;
			weth = _weth;
			aave = _aave;
			aaveCore = _aaveCore;
			ethAddress = _ethAddress;
			unirouter = IUniswapV2Router01(uniaddress);
			sushirouter = IUniswapV2Router01(sushiaddress);
			owner = msg.sender;
	}

	receive() external payable {}

	function svina(uint amount, address _token, bool _mode) external payable {
		token = _token;
		mode = _mode;
		address[] memory path1 = new address[](2);
		path1[0] = weth;
		path1[1] = token;
		uint256 tokenamount = sushirouter.getAmountsOut(amount, path1)[1];
		address[] memory path2 = new address[](2);
		path2[0] = token;
		path2[1] = weth;
		uint256 amountOut = unirouter.getAmountsOut(tokenamount, path2)[1];
		if (amountOut > amount) {
		//flashloan take
			bytes memory params = "";
			ILendingPool lendingPool = ILendingPool(aave);
			lendingPool.flashLoan(address(this), ethAddress, amount, params);
		}
	}

	function executeOperation(
		address _reserve,
		uint256 _amount,
		uint256 _fee,
		bytes calldata _params
	)
	external {

		uint256 deadline = block.timestamp + 1;
		address[] memory path1 = new address[](2);
		path1[0] = weth;
		path1[1] = token;

		address[] memory path2 = new address[](2);
		path2[0] = token;
		path2[1] = weth;

		if (!mode) {
			sushirouter.swapExactETHForTokens{value:_amount}(0, path1, address(this), deadline);

			uint tokenamount = IERC20(token).balanceOf(address(this));
			IERC20(token).approve(uniaddress, tokenamount);

			unirouter.swapExactTokensForETHSupportingFeeOnTransferTokens(tokenamount, 0, path2, address(this), deadline);
		} else {
			unirouter.swapExactETHForTokens{value:_amount}(0, path1, address(this), deadline);

			uint tokenamount = IERC20(token).balanceOf(address(this));
			IERC20(token).approve(sushiaddress, tokenamount);

			sushirouter.swapExactTokensForETHSupportingFeeOnTransferTokens(tokenamount, 0, path2, address(this), deadline);
		}

		aaveCore.call{value: _amount + _fee}("");
		owner.transfer(address(this).balance);
	}


}
