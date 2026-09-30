const arbHelperABI = [
	{
		"inputs": [
			{ "internalType": "address", "name": "_uniRouter", "type": "address" },
			{ "internalType": "address", "name": "_sushiRouter", "type": "address" },
			{ "internalType": "address", "name": "_weth", "type": "address" },
			{ "internalType": "address payable", "name": "_aave", "type": "address" },
			{ "internalType": "address payable", "name": "_aaveCore", "type": "address" },
			{ "internalType": "address", "name": "_ethAddress", "type": "address" }
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_reserve",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_fee",
				"type": "uint256"
			},
			{
				"internalType": "bytes",
				"name": "_params",
				"type": "bytes"
			}
		],
		"name": "executeOperation",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_token",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "_mode",
				"type": "bool"
			}
		],
		"name": "svina",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
]

export default arbHelperABI
