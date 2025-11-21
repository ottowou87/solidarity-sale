import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Twitter, Globe, Send, CheckCircle2, X } from "lucide-react";

export default function SLDPrivateSalePage() {
  const [account, setAccount] = useState(null);
  const [bnbAmount, setBnbAmount] = useState("0.1");
  const [tokenPreview, setTokenPreview] = useState(0);
  const [bnbPriceUSD, setBnbPriceUSD] = useState(null);
  const [usdPreview, setUsdPreview] = useState(0);
  const [sldUsdValue, setSldUsdValue] = useState(0);
  const [message, setMessage] = useState("");
  const [rate, setRate] = useState(null);
  const [saleActive, setSaleActive] = useState(false);
  const [gasEstimateBNB, setGasEstimateBNB] = useState(null);
  const [gasEstimateUSD, setGasEstimateUSD] = useState(null);
  const [inputError, setInputError] = useState("");
  const [countdown, setCountdown] = useState({
    label: "",
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [showModal, setShowModal] = useState(false);
  const [txHash, setTxHash] = useState(null);

  // Sale contract address
  const saleAddress = "0xfda1788ba053632AB9b757098839ce45c330175F";

  const tokenSymbol = "SLD";

  // Sale timing
  const SALE_START = new Date("2025-11-17T00:00:00Z").getTime();
  const SALE_END = new Date("2025-12-31T00:00:00Z").getTime();

  const MIN_BNB = 0.01;
  const MAX_BNB = 3;

  const saleAbi = [
    "function buyTokens() public payable",
    "function rate() public view returns (uint256)",
    "function saleActive() public view returns (bool)",
  ];

  // Connect wallet
  async function connectWallet() {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      await fetchSaleInfo();
    } else {
      alert("Please install MetaMask to continue.");
    }
  }

  // Fetch rate & saleActive from contract
  async function fetchSaleInfo() {
    try {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const sale = new ethers.Contract(saleAddress, saleAbi, provider);
      const _rate = await sale.rate();
      const _saleActive = await sale.saleActive();
      setRate(Number(_rate)); // Store raw wei rate
      setSaleActive(_saleActive);
    } catch (err) {
      console.error(err);
    }
  }

  // Fetch BNB price in USD
  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch(
          "https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT"
        );
        const data = await res.json();
        setBnbPriceUSD(Number(data.price));
      } catch (err) {
        console.error("BNB price fetch failed", err);
      }
    }
    fetchPrice();
  }, []);

  // Countdown timer
  useEffect(() => {
    function updateCountdown() {
      const now = Date.now();
      let label = "";
      let target;

      if (now < SALE_START) {
        label = "Sale starts in:";
        target = SALE_START;
      } else if (now >= SALE_START && now <= SALE_END) {
        label = "Sale ends in:";
        target = SALE_END;
      } else {
        label = "Sale has ended.";
        target = null;
      }

      if (!target) {
        setCountdown({ label, days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const diff = target - now;
      setCountdown({
        label,
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Gas estimator
  async function estimateGas(numericAmount) {
    try {
      if (!window.ethereum || !account) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const sale = new ethers.Contract(saleAddress, saleAbi, signer);

      const valueWei = ethers.parseEther(numericAmount.toString());
      const gas = await signer.estimateGas({
        to: saleAddress,
        data: sale.interface.encodeFunctionData("buyTokens", []),
        value: valueWei,
      });

      const feeData = await provider.getFeeData();
      if (!feeData.gasPrice) return;

      const totalWei = gas * feeData.gasPrice;
      const gasBNB = Number(ethers.formatEther(totalWei));
      setGasEstimateBNB(gasBNB);

      if (bnbPriceUSD) {
        setGasEstimateUSD(gasBNB * bnbPriceUSD);
      }
    } catch (err) {
      console.error("Gas estimation failed:", err);
      setGasEstimateBNB(null);
      setGasEstimateUSD(null);
    }
  }

  // Update token preview
  function updateTokenPreview(amount) {
    setBnbAmount(amount);
    const numeric = Number(amount);

    if (!amount || isNaN(numeric) || numeric <= 0) {
      setTokenPreview(0);
      setUsdPreview(0);
      setSldUsdValue(0);
      setInputError("");
      return;
    }

    if (numeric < MIN_BNB) {
      setInputError(`Minimum purchase is ${MIN_BNB} BNB`);
    } else if (numeric > MAX_BNB) {
      setInputError(`Maximum purchase is ${MAX_BNB} BNB`);
    } else {
      setInputError("");
    }

    if (rate) {
      const humanRate = rate / 1e18;   // ✅ FIX: convert wei → readable
      const estimatedTokens = numeric * humanRate;
      setTokenPreview(estimatedTokens);
    }

    if (bnbPriceUSD) {
      const estimatedUSD = numeric * bnbPriceUSD;
      setUsdPreview(estimatedUSD);

      if (rate) {
        const humanRate = rate / 1e18;
        const sldPriceUSD = bnbPriceUSD / humanRate;
        const sldValueUSD = (numeric * humanRate) * sldPriceUSD;
        setSldUsdValue(sldValueUSD);
      }
    }

    estimateGas(numeric);
  }

  // Buy tokens
  async function buyTokens() {
    try {
      if (!window.ethereum) return alert("MetaMask not found");
      if (inputError) return alert(inputError);

      const numeric = Number(bnbAmount);
      if (!bnbAmount || isNaN(numeric) || numeric <= 0) {
        return alert("Enter a valid BNB amount.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const sale = new ethers.Contract(saleAddress, saleAbi, signer);

      setMessage("Sending transaction...");

      const tx = await sale.buyTokens({
        value: ethers.parseEther(bnbAmount.toString()),
      });

      setMessage("Waiting for confirmation...");
      const receipt = await tx.wait();

      setMessage(`✅ Purchase successful! ${tokenSymbol} tokens sent to your wallet.`);
      setTxHash(receipt.hash);
      setShowModal(true);
    } catch (error) {
      console.error(error);
      setMessage("❌ Transaction failed. Check console for details.");
    }
  }

  useEffect(() => {
    if (account) fetchSaleInfo();
  }, [account]);

  // UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-6 relative">

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-amber-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-amber-400">Purchase Successful</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-3 animate-pulse" />
              <p className="mb-2">Your {tokenSymbol} tokens have been sent to your wallet.</p>
              {txHash && (
                <a
                  href={`https://bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 text-sm underline mt-1"
                >
                  View on BscScan
                </a>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2 px-6 rounded-xl shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown */}
      <div className="absolute top-4 right-4 bg-gray-800/80 border border-gray-700 rounded-2xl px-4 py-2 text-sm">
        <p className="text-gray-400">{countdown.label}</p>
        {countdown.label !== "Sale has ended." && (
          <p className="font-mono text-amber-400">
            {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
          </p>
        )}
      </div>

      <h1 className="text-4xl font-bold mb-4 text-amber-400">Solidarity (SLD) Private Sale</h1>
      <p className="text-gray-300 mb-6 text-center max-w-xl">
        Buy Solidarity ({tokenSymbol}) tokens securely using BNB. Tokens are automatically delivered after confirmation.
      </p>

      {!account ? (
        <button
          onClick={connectWallet}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2 px-6 rounded-xl shadow-lg"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="w-full max-w-md bg-gray-800 p-6 rounded-2xl shadow-xl">
          <div className="mb-4">
            <label className="block mb-2 text-sm">BNB Amount</label>
            <input
              type="number"
              value={bnbAmount}
              onChange={(e) => updateTokenPreview(e.target.value)}
              className="w-full p-2 rounded-lg text-black"
              min="0.01"
              step="0.01"
            />
            {inputError && (
              <p className="text-xs text-red-400 mt-1">{inputError}</p>
            )}
          </div>

          {rate && (
            <p className="text-sm text-gray-400 mb-1">
              Current Rate:{" "}
              <span className="text-amber-400 font-semibold">
                {(rate / 1e18).toLocaleString()} {tokenSymbol} / BNB
              </span>
            </p>
          )}

          {tokenPreview > 0 && (
            <p className="text-green-400 text-sm mb-2">
              You will receive ~{" "}
              <span className="font-semibold">
                {tokenPreview.toLocaleString()} {tokenSymbol}
              </span>
            </p>
          )}

          {bnbPriceUSD && (
            <p className="text-xs text-gray-500 mb-3">
              Live BNB Price: ~${bnbPriceUSD.toFixed(2)} USD
            </p>
          )}

          <button
            onClick={buyTokens}
            disabled={!saleActive || !!inputError}
            className={`w-full ${
              saleActive && !inputError
                ? "bg-amber-500 hover:bg-amber-400"
                : "bg-gray-600 cursor-not-allowed"
            } text-black font-semibold py-2 px-6 rounded-xl shadow-lg`}
          >
            {saleActive ? `Buy ${tokenSymbol}` : "Sale Inactive"}
          </button>

          {message && (
            <p className="mt-4 text-center text-sm">{message}</p>
          )}
        </div>
      )}

      <div className="mt-6 text-gray-400 text-sm text-center">
        <p>Sale Contract Address:</p>
        <p className="text-amber-400 break-all">{saleAddress}</p>
      </div>

      <div className="mt-8 flex gap-6 text-gray-500">
        <a href="https://solidaritytoken.io" className="hover:text-amber-400 flex items-center gap-2">
          <Globe size={18} /> Website
        </a>
        <a href="https://t.me/solidaritytoken" className="hover:text-amber-400 flex items-center gap-2">
          <Send size={18} /> Telegram
        </a>
        <a href="https://twitter.com/solidaritytoken" className="hover:text-amber-400 flex items-center gap-2">
          <Twitter size={18} /> Twitter
        </a>
      </div>
    </div>
  );
}
