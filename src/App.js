import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

const PRESALE_RATE = 23000000; // 1 BNB = 23,000,000 SLD
const TOKEN_SYMBOL = "SLD";

// Wallet that will receive BNB from investors
const SALE_WALLET_ADDRESS = "0x37a8ccf24b8681dddaa1d2e1ad0aa7f7c3e0ee05";

// BSC Mainnet chain id
const BSC_CHAIN_ID = "0x38"; // 56 in hex

// Presale caps (you can adjust)
const SOFT_CAP_BNB = 50;
const HARD_CAP_BNB = 200;

// TODO: update this when you know how much you’ve raised
const CURRENT_RAISED_BNB = 0; // manual for now

// Presale end time (change this to your real end date/time)
const PRESALE_END_TIME = new Date("2025-12-31T23:59:59Z").getTime();

// Social links (replace with your real links)
const WEBSITE_URL = "https://solidarity-sale.vercel.app";
const TELEGRAM_URL = "#"; // e.g. "https://t.me/yourgroup"
const TWITTER_URL = "#"; // e.g. "https://x.com/yourhandle";

function formatTimeLeft(msDiff) {
  if (msDiff <= 0) return "Presale ended";
  const totalSeconds = Math.floor(msDiff / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [networkOk, setNetworkOk] = useState(false);
  const [bnbAmount, setBnbAmount] = useState("");
  const [sldAmount, setSldAmount] = useState("0");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(
    formatTimeLeft(PRESALE_END_TIME - Date.now())
  );

  // calculate SLD when BNB changes
  useEffect(() => {
    if (!bnbAmount || isNaN(Number(bnbAmount))) {
      setSldAmount("0");
      return;
    }
    const sld = Number(bnbAmount) * PRESALE_RATE;
    setSldAmount(sld.toLocaleString("en-US"));
  }, [bnbAmount]);

  // countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTimeLeft(formatTimeLeft(PRESALE_END_TIME - now));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // presale progress percentage
  const progressPercent = Math.max(
    0,
    Math.min(100, (CURRENT_RAISED_BNB / HARD_CAP_BNB) * 100)
  );

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setStatus(
          "Please install MetaMask or open this site inside MetaMask / Trust Wallet browser."
        );
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // Auto-switch to BNB Smart Chain
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BSC_CHAIN_ID }],
        });
      } catch (switchError) {
        // If BSC is NOT added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: BSC_CHAIN_ID,
                  chainName: "BNB Smart Chain",
                  nativeCurrency: {
                    name: "BNB",
                    symbol: "BNB",
                    decimals: 18,
                  },
                  rpcUrls: ["https://bsc-dataseed.binance.org/"],
                  blockExplorerUrls: ["https://bscscan.com/"],
                },
              ],
            });
          } catch (addError) {
            console.error(addError);
            setStatus("Please switch to BNB Smart Chain in your wallet.");
          }
        } else {
          console.error(switchError);
          setStatus("Please switch your wallet to BNB Smart Chain.");
        }
      }

      const chainId = await window.ethereum.request({ method: "eth_chainId" });

      setWalletAddress(accounts[0]);
      const correctNetwork = chainId === BSC_CHAIN_ID;
      setNetworkOk(correctNetwork);

      if (!correctNetwork) {
        setStatus(
          "Connected, but NOT on BNB Smart Chain. Please switch to BSC in your wallet."
        );
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
        setStatus(
          "Please install MetaMask or open this site inside MetaMask / Trust Wallet browser."
        );
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
        `Success! TX hash: ${tx.hash}. You will receive your ${TOKEN_SYMBOL} after the team processes presale allocations according to the vesting schedule.`
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
        <div className="header-right">
          <nav className="social-links">
            <a href={WEBSITE_URL} target="_blank" rel="noreferrer">
              Website
            </a>
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
              Telegram
            </a>
            <a href={TWITTER_URL} target="_blank" rel="noreferrer">
              X (Twitter)
            </a>
          </nav>
          <button className="wallet-btn" onClick={connectWallet}>
            {walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>
      </header>

      <main className="content">
        <section className="card">
          <h2>Participate in Presale</h2>
          <p className="rate">
            1 BNB = <strong>{PRESALE_RATE.toLocaleString()} SLD</strong>
          </p>
          <p className="timer">
            ⏳ Presale time left: <strong>{timeLeft}</strong>
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

          <p className="note">
            Mobile users: open this website inside MetaMask or Trust Wallet DApp
            browser for the best experience.
          </p>
        </section>

        <section className="card">
          <h2>Presale Information</h2>
          <ul className="info-list">
            <li>Chain: BNB Smart Chain (BEP-20)</li>
            <li>Presale rate: 1 BNB = 23,000,000 SLD</li>
            <li>
              Contract:{" "}
              <span className="mono">
                0xb10c8C889a23C4835Ea4F5962666b0B8da891B1A
              </span>
            </li>
            <li>Presale allocation: 20% of total supply</li>
            <li>Liquidity locked for 6 months</li>
            <li>10% unlocked at TGE, remaining vested over 6 months</li>
          </ul>

          <div className="progress-section">
            <h3>Presale Progress</h3>
            <p>
              Raised: <strong>{CURRENT_RAISED_BNB} BNB</strong> /{" "}
              <strong>{SOFT_CAP_BNB} BNB soft cap</strong> /{" "}
              <strong>{HARD_CAP_BNB} BNB hard cap</strong>
            </p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="note">
              * Update CURRENT_RAISED_BNB in the code when you want to reflect
              actual funds raised.
            </p>
          </div>
        </section>

        <section className="card full-width">
          <h2>How to Buy SLD</h2>
          <ol className="info-list">
            <li>
              <strong>Install a wallet:</strong> Use MetaMask (browser) or
              MetaMask / Trust Wallet app on mobile.
            </li>
            <li>
              <strong>Switch to BNB Smart Chain (BSC):</strong> The website will
              prompt you to switch. Approve the network change in your wallet.
            </li>
            <li>
              <strong>Fund your wallet with BNB:</strong> Buy BNB on an exchange
              (Binance, KuCoin, etc.) and withdraw to your BSC wallet address.
            </li>
            <li>
              <strong>Connect your wallet:</strong> Click the{" "}
              <em>Connect Wallet</em> button at the top right of this page.
            </li>
            <li>
              <strong>Enter BNB amount:</strong> In the presale card, type how
              much BNB you want to contribute. You’ll see the SLD you will
              receive.
            </li>
            <li>
              <strong>Confirm the transaction:</strong> Click{" "}
              <em>Buy SLD</em>. Your wallet will open — confirm the transaction.
            </li>
            <li>
              <strong>Receive SLD:</strong> After the presale ends, SLD will be
              distributed to your wallet according to the vesting schedule.
            </li>
          </ol>
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
