import { ethers } from "ethers";
import abi from "./abi.json";
import tokenabi from "./tokenabi.json";

const contract_address = "0xe19D79B31278B65Aa7b77F3AEA260A3e21A5a618";
const usdc_contract = "0x7cB3D276cCBD8DF74D0d7ef550f3201de0C1bF1C";
const RPC_URL = "https://polygon-amoy.infura.io/v3/95c5fe3fe1504b01a8a1c9a3c428a49f";

const amoyNetwork = {
  chainId: "0x1F",
  chainName: "Amoy Network",
  rpcUrls: ["https://rpc.amoy.network"],
  nativeCurrency: {
    name: "Amoy",
    symbol: "AMOY",
    decimals: 18,
  },
  blockExplorerUrls: ["https://explorer.amoy.network"],
};

const checkMetaMask = () => {
  return (
    typeof window !== "undefined" &&
    window.ethereum &&
    window.ethereum.isMetaMask
  );
};

const switchToAmoyNetwork = async () => {
  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [amoyNetwork],
    });
    console.log("Switched to Amoy network");
  } catch (error) {
    console.error("Failed to switch networks:", error);
    throw error;
  }
};

export const buyRoom = async (_tokenId) => {
  try {
    if (!checkMetaMask()) {
      throw new Error("Please install MetaMask to continue");
    }

    // Create RPC provider for reading state
    const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Get MetaMask provider and signer for transactions
    const metamaskProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await metamaskProvider.getSigner();

    // Create contract instances with RPC provider for reading
    const tokenWithProvider = new ethers.Contract(usdc_contract, tokenabi, signer);
    const contractWithProvider = new ethers.Contract(contract_address, abi, signer);

    // Create contract instances with signer for transactions
    const token = tokenWithProvider.connect(signer);
    const contract = contractWithProvider.connect(signer);

    // Check allowance using RPC provider (faster read)
    const userAddress = await signer.getAddress();
    sessionStorage.setItem("userAddress", userAddress);
    const res = await token.allowance(userAddress, contract_address);
    console.log("Allowance result:", res.toString());

    if (res.toString() === "0") {
      console.log("Approving token...");
      const approve = await token.approve(
        contract_address,
        "12412521512521521521125"
      );
      await approve.wait();
      console.log("Approval transaction complete:", approve.hash);
    }

   
    // Get gas estimate using RPC provider
    const gasEstimate = await contract.buyRoomBatch.estimateGas(
      [_tokenId],
      { from: userAddress }
    );

    console.log("Estimated gas:", gasEstimate.toString());

    // Execute transaction with signer and estimated gas
    const transaction = await contract.buyRoomBatch([_tokenId], {
      gasLimit: Math.ceil(Number(gasEstimate) * 1.2), // Add 20% buffer
    });

    console.log("Transaction sent:", transaction.hash);
    // const receipt = await transaction.wait();
    // console.log("Transaction successful:", receipt);
    sessionStorage.setItem("transactionId", transaction.hash);
    return  transaction.hash;

  } catch (error) {
    console.error("Error executing buyRoom:", error);
    //0xad4414c8ca792284cf42e0a91fe805c21bd3e048ea33171a4d9f2f294b37b55c
    if (error.code === 4001) {
      throw new Error("Transaction rejected by user");
    } else if (error.code === -32603) {
      throw new Error("Internal RPC error. Please check your balance and try again.");
    } else if (error.message.includes("user rejected")) {
      throw new Error("User rejected the connection request");
    } else if (error.message.includes("insufficient funds")) {
      throw new Error("Insufficient funds for transaction");
    } else {
      throw new Error(`Failed to execute buyRoom: ${error.message}`);
    }
  }
};

if (checkMetaMask()) {
  window.ethereum.on("accountsChanged", (accounts) => {
    console.log("Account changed:", accounts[0]);
  });

  window.ethereum.on("chainChanged", (chainId) => {
    console.log("Network changed:", chainId);
    window.location.reload();
  });
}

export const isMetaMaskInstalled = checkMetaMask;

export const getCurrentAccount = async () => {
  if (!checkMetaMask()) return null;
  try {
    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    });
    return accounts[0];
  } catch (error) {
    console.error("Error getting current account:", error);
    return null;
  }
};