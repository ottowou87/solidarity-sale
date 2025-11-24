import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

const PRESALE_RATE = 23000000; // 1 BNB = 23,000,000 SLD
const TOKEN_SYMBOL = "SLD";

// 👉 REPLACE THIS with the wallet that will receive BNB from investors
const SALE_WALLET_ADDRESS = "0x37a8ccf24b8681dddaa1d2e1ad0aa7f7c3e0ee05";

// BSC Mainnet chain id
const BSC_CHAIN_ID = "0x38"; // 56 in hex

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [networkOk, setNetworkOk] = useState(false);
  const [bnbAmount, setBnbAmount] = useState("");
  const [sldAmount, setSldAmount] = useState("0");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // calculate SLD when BNB changes
  useEffect(() => {
    if (!bnbAmount || isNaN(Number(bnbAmount))) {
      setSldAmount("0");
      return;
    }
    const sld = Number(bnbAmount) * PRESALE_RATE;
    setSldAmount(sld.toLocaleString("en-US"));
  }, [bnbAmount]);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setStatus("Please install MetaMask or use a Web3-enabled browser.");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const chainId = await window.ethereum.request({ method: "eth_chainId" });

      setWalletAddress(accounts[0]);
      const correctNetwork = chainId === BSC_CHAIN_ID;
      setNetworkOk(correctNetwork);

      if (!correctNetwork) {
        setStatus("Connected, but NOT on BNB Smart Chain. Please switch to BSC.");
      } else {
        setStatus("Wallet connected on BNB Smart Chain ✔");
      }

      // listen for chain/account changes
      window.ethereum.on("chainChanged", () => window.location.reload());
      window.ethereum.on("accountsChanged", () => window.location.reload());
    } catch (err) {
      console.error(err);
      setStatus("Wallet connection cancelled or failed.");
    }
  };

  const handleBuy = async () => {
    try {
      if (!window.ethereum) {
        setStatus("Please install MetaMask or Trust Wallet browser.");
        return;
      }
      if (!walletAddress) {
        setStatus("Please connect your wallet first.");
        return;
      }
      if (!networkOk) {
        setStatus("Please switch your wallet to BNB Smart Chain (BSC).");
        return;
      }
      const valueBNB = Number(bnbAmount);
      if (!valueBNB || valueBNB <= 0) {
        setStatus("Enter a valid BNB amount.");
        return;
      }

      setLoading(true);
      setStatus("Opening wallet… confirm the transaction.");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: SALE_WALLET_ADDRESS,
        value: ethers.parseEther(valueBNB.toString()),
      });

      setStatus("Transaction sent. Waiting for confirmation…");

      await tx.wait();

      setStatus(
        `Success! TX hash: ${tx.hash}. You will receive your ${TOKEN_SYMBOL} after the team processes presale allocations.`
      );
      setBnbAmount("");
    } catch (err) {
      console.error(err);
      if (err.code === 4001) {
        setStatus("Transaction rejected in wallet.");
      } else {
        setStatus("Error sending transaction. Check console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">SLD</div>
        <div className="title-group">
          <h1>Solidarity (SLD) Presale</h1>
          <p>Empowering Global Mutual Support on BNB Smart Chain</p>
        </div>
        <button className="wallet-btn" onClick={connectWallet}>
          {walletAddress
            ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            : "Connect Wallet"}
        </button>
      </header>

      <main className="content">
        <section className="card">
          <h2>Participate in Presale</h2>
          <p className="rate">
            1 BNB = <strong>{PRESALE_RATE.toLocaleString()} SLD</strong>
          </p>

          <div className="field-group">
            <label>Amount in BNB</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={bnbAmount}
              onChange={(e) => setBnbAmount(e.target.value)}
              placeholder="0.1"
            />
          </div>

          <div className="field-group">
            <label>You will receive (approx)</label>
            <div className="output">
              {sldAmount} <span>{TOKEN_SYMBOL}</span>
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={handleBuy}
            disabled={loading}
          >
            {loading ? "Processing…" : "Buy SLD"}
          </button>

          <p className="note">
            Tokens are distributed manually after the presale ends, according to
            the official vesting schedule.
          </p>
        </section>

        <section className="card">
          <h2>Presale Information</h2>
          <ul className="info-list">
            <li>Chain: BNB Smart Chain (BEP-20)</li>
            <li>Presale rate: 1 BNB = 23,000,000 SLD</li>
            <li>Contract: 0xb10c8C889a23C4835Ea4F5962666b0B8da891B1A</li>
            <li>Presale allocation: 20% of total supply</li>
            <li>Liquidity locked for 6 months</li>
            <li>10% unlocked at TGE, remaining vested over 6 months</li>
          </ul>
        </section>
      </main>

      <footer className="footer">
        <p>Always double-check the contract address and website URL.</p>
      </footer>

      {status && <div className="status-bar">{status}</div>}
    </div>
  );
}

export default App;
