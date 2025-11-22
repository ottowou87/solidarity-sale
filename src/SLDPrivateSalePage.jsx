import { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import {
  Twitter,
  Globe,
  Send,
  Wallet,
  Sun,
  Moon,
  History,
  Share2,
  Copy,
  Info,
  Smartphone,
  Shield,
} from "lucide-react";

export default function SLDPrivateSalePage() {
  // Core state
  const [account, setAccount] = useState(null);
  const [bnbAmount, setBnbAmount] = useState("0.1");
  const [message, setMessage] = useState("");
  const [rate, setRate] = useState(null);
  const [saleActive, setSaleActive] = useState(false);

  // UI / stats
  const [bnbPriceUSD, setBnbPriceUSD] = useState(null);
  const [tokenPreview, setTokenPreview] = useState(0);
  const [usdPreview, setUsdPreview] = useState(0);
  const [inputError, setInputError] = useState("");
  const [walletBnbBalance, setWalletBnbBalance] = useState(null);
  const [walletSldBalance, setWalletSldBalance] = useState(null);
  const [saleSldBalance, setSaleSldBalance] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [txHash, setTxHash] = useState(null);

  // Toggles
  const [darkMode, setDarkMode] = useState(true);
  const [lang, setLang] = useState("en"); // "en" | "fr"

  // Network / wallet env
  const [chainId, setChainId] = useState(null);
  const [isTrustWallet, setIsTrustWallet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Referral
  const [referrer, setReferrer] = useState(null);
  const [refCopyMsg, setRefCopyMsg] = useState("");

  // Config
  const saleAddress = "0xfda1788ba053632AB9b757098839ce45c330175F";
  const tokenAddress = "0xb10c8C889a23C4835Ea4F5962666b0B8da891B1A";
  const tokenSymbol = "SLD";
  const tokenDecimals = 18;

  const MIN_BNB = 0.01;
  const MAX_BNB = 3;
  const SALE_CAP_SLD = 50_000_000_000; // 50B SLD (human units)

  const saleAbi = [
    "function buyTokens() public payable",
    "function rate() public view returns (uint256)",
    "function saleActive() public view returns (bool)",
  ];

  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ];

  // Language texts
  const texts = {
    en: {
      title: "Solidarity (SLD) Private Sale",
      subtitle:
        "Buy Solidarity (SLD) securely using BNB on Binance Smart Chain. Tokens are delivered instantly after confirmation.",
      connect: "Connect Wallet",
      bnbAmount: "BNB Amount",
      minMax: "Min / Max Buy",
      livePrice: "Live BNB Price",
      youReceive: "You will receive approximately",
      youSpend: "You are spending about",
      buyActive: "Buy SLD",
      buyInactive: "Sale Inactive",
      walletOverview: "Wallet Overview",
      saleOverview: "Sale Overview",
      saleStatus: "Sale Status",
      network: "Network",
      rateLabel: "Rate",
      remaining: "Remaining in contract",
      saleProgress: "Sale Progress",
      historyTitle: "Recent Purchases (this session)",
      addToken: "Add SLD to MetaMask",
      bnbBalance: "BNB Balance",
      sldBalance: "SLD Balance",
      saleContract: "Sale Contract Address",
      tokenContract: "Token Contract",
      maxButton: "Max",
      referralLabel: "Referral (optional)",
      refYourLink: "Your referral link",
      refCopy: "Copy referral link",
      refCopied: "Referral link copied!",
      purchaseSuccess: "Purchase successful! SLD sent to your wallet.",
      trustDesktopWarning:
        "You appear to be using Trust Wallet on desktop. For best results, open this page from the Trust Wallet mobile app (DApp Browser).",
      switchToBsc: "Switch to BNB Smart Chain",
      wrongNetwork:
        "You are not on BNB Smart Chain. Please switch network in your wallet.",
      faqTitle: "FAQ & Important Notes",
      faq1Q: "Which wallets are supported?",
      faq1A:
        "You can use MetaMask browser extension (desktop), MetaMask mobile app, or Trust Wallet mobile app via the DApp Browser.",
      faq2Q: "Can I use Trust Wallet?",
      faq2A:
        "Yes. Open Trust Wallet, go to the DApp Browser, and paste this URL to participate directly.",
      faq3Q: "When do I receive my SLD tokens?",
      faq3A:
        "SLD tokens are transferred automatically to your wallet in the same transaction after confirmation on BNB Chain.",
      riskTitle: "Risk Notice",
      riskBody:
        "Cryptocurrency investments involve risk. Only invest what you can afford to lose. Always double-check contract addresses and links before sending funds.",
      leaderboardTitle: "Top Purchases (this session)",
      noPurchases: "No purchases yet this session.",
    },
    fr: {
      title: "Vente Privée Solidarity (SLD)",
      subtitle:
        "Achetez Solidarity (SLD) en toute sécurité avec du BNB sur Binance Smart Chain. Les tokens sont livrés instantanément après la confirmation.",
      connect: "Connecter le Portefeuille",
      bnbAmount: "Montant en BNB",
      minMax: "Achat Min / Max",
      livePrice: "Prix BNB en direct",
      youReceive: "Vous recevrez environ",
      youSpend: "Vous dépensez environ",
      buyActive: "Acheter SLD",
      buyInactive: "Vente inactive",
      walletOverview: "Vue d’ensemble du portefeuille",
      saleOverview: "Vue d’ensemble de la vente",
      saleStatus: "Statut de la vente",
      network: "Réseau",
      rateLabel: "Taux",
      remaining: "Restant dans le contrat",
      saleProgress: "Progression de la vente",
      historyTitle: "Achats récents (cette session)",
      addToken: "Ajouter SLD à MetaMask",
      bnbBalance: "Solde BNB",
      sldBalance: "Solde SLD",
      saleContract: "Adresse du Contrat de Vente",
      tokenContract: "Contrat du Token",
      maxButton: "Max",
      referralLabel: "Parrainage (optionnel)",
      refYourLink: "Votre lien de parrainage",
      refCopy: "Copier le lien de parrainage",
      refCopied: "Lien de parrainage copié !",
      purchaseSuccess:
        "Achat réussi ! SLD envoyé dans votre portefeuille.",
      trustDesktopWarning:
        "Vous semblez utiliser Trust Wallet sur ordinateur. Pour de meilleurs résultats, ouvrez cette page depuis l’application mobile Trust Wallet (DApp Browser).",
      switchToBsc: "Passer au réseau BNB Smart Chain",
      wrongNetwork:
        "Vous n’êtes pas sur BNB Smart Chain. Veuillez changer de réseau dans votre portefeuille.",
      faqTitle: "FAQ & Informations importantes",
      faq1Q: "Quels portefeuilles sont supportés ?",
      faq1A:
        "Vous pouvez utiliser MetaMask (extension navigateur), MetaMask mobile, ou Trust Wallet mobile via le DApp Browser.",
      faq2Q: "Puis-je utiliser Trust Wallet ?",
      faq2A:
        "Oui. Ouvrez Trust Wallet, allez dans le DApp Browser, et collez cette URL pour participer directement.",
      faq3Q: "Quand vais-je recevoir mes tokens SLD ?",
      faq3A:
        "Les tokens SLD sont transférés automatiquement vers votre portefeuille dans la même transaction après confirmation sur BNB Chain.",
      riskTitle: "Avertissement sur les risques",
      riskBody:
        "Les investissements en cryptomonnaies comportent des risques. N’investissez que ce que vous pouvez vous permettre de perdre. Vérifiez toujours les adresses de contrat et les liens avant d’envoyer des fonds.",
      leaderboardTitle: "Top Achats (cette session)",
      noPurchases: "Aucun achat pour le moment.",
    },
  };

  const t = texts[lang];

  const humanRate = rate ? rate / 1e18 : null; // 23,000,000 SLD / BNB
  const shortAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  // Detect environment (Trust Wallet, mobile, chain)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      setIsMobile(/Mobi|Android|iPhone|iPad/i.test(ua));

      if (window.ethereum) {
        // Trust Wallet detection (best-effort)
        setIsTrustWallet(
          !!window.ethereum.isTrustWallet ||
            (window.ethereum.isMetaMask &&
              window.ethereum.isTrust &&
              !window.ethereum.isBraveWallet)
        );

        window.ethereum
          .request({ method: "eth_chainId" })
          .then((cid) => setChainId(parseInt(cid, 16)))
          .catch(() => {});
        window.ethereum.on?.("chainChanged", (cid) =>
          setChainId(parseInt(cid, 16))
        );
      }
    }
  }, []);

  // Parse referral from URL (?ref=0x...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^0x[a-fA-F0-9]{40}$/.test(ref)) {
      setReferrer(ref);
    }
  }, []);

  // Connect wallet
  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask or use Trust Wallet DApp browser.");
        return;
      }
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  }

  // Try to switch to BSC
  async function switchToBsc() {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x38" }], // 56
      });
    } catch (err) {
      console.error("Network switch failed:", err);
      alert(
        "Please manually switch your wallet network to BNB Smart Chain (chainId 56)."
      );
    }
  }

  // Fetch sale info
  async function fetchSaleInfo(providerOverride) {
    try {
      const provider =
        providerOverride ||
        (window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null);
      if (!provider) return;

      const sale = new ethers.Contract(saleAddress, saleAbi, provider);
      const _rate = await sale.rate();
      const _saleActive = await sale.saleActive();
      setRate(Number(_rate));
      setSaleActive(_saleActive);
    } catch (err) {
      console.error("fetchSaleInfo error:", err);
    }
  }

  // Fetch balances
  async function fetchOnchainBalances() {
    try {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);

      if (account) {
        const bal = await provider.getBalance(account);
        setWalletBnbBalance(Number(ethers.formatEther(bal)));
      }

      const token = new ethers.Contract(tokenAddress, erc20Abi, provider);

      if (account) {
        const walletSld = await token.balanceOf(account);
        setWalletSldBalance(Number(walletSld) / 10 ** tokenDecimals);
      }

      const saleSld = await token.balanceOf(saleAddress);
      setSaleSldBalance(Number(saleSld) / 10 ** tokenDecimals);
    } catch (err) {
      console.error("fetchOnchainBalances error:", err);
    }
  }

  // Fetch BNB price
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

  // Initial sale info & balances
  useEffect(() => {
    if (window.ethereum) {
      fetchSaleInfo();
      fetchOnchainBalances();
    }
  }, []);

  // When account changes → refresh sale & balances
  useEffect(() => {
    if (account && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      fetchSaleInfo(provider);
      fetchOnchainBalances();
    }
  }, [account]);

  // Periodic balance refresh
  useEffect(() => {
    const id = setInterval(() => {
      fetchOnchainBalances();
    }, 30000);
    return () => clearInterval(id);
  }, [account]);

  // Input + preview
  function updateTokenPreview(amount) {
    setBnbAmount(amount);
    const numeric = Number(amount);

    if (!amount || isNaN(numeric) || numeric <= 0) {
      setTokenPreview(0);
      setUsdPreview(0);
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

    if (humanRate) {
      setTokenPreview(numeric * humanRate);
    }

    if (bnbPriceUSD) {
      setUsdPreview(numeric * bnbPriceUSD);
    }
  }

  // Max BNB (90% of wallet, capped by max)
  function setMaxBnb() {
    if (!walletBnbBalance) return;
    const usable = Math.max(0, Math.min(walletBnbBalance * 0.9, MAX_BNB));
    const rounded = usable.toFixed(4);
    updateTokenPreview(rounded);
  }

  // Buy tokens
  async function buyTokens() {
    try {
      if (!window.ethereum) return alert("Wallet not found");
      if (chainId !== 56) {
        alert(t.wrongNetwork);
        return;
      }
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

      setMessage(`✅ ${t.purchaseSuccess}`);
      setTxHash(receipt.hash);

      const sldAmount = humanRate ? numeric * humanRate : null;

      setPurchases((prev) => [
        {
          hash: receipt.hash,
          bnb: numeric,
          sld: sldAmount,
          time: new Date().toLocaleString(),
        },
        ...prev,
      ]);

      fetchOnchainBalances();
    } catch (error) {
      console.error(error);
      setMessage("❌ Transaction failed. Check console for details.");
    }
  }

  // Add token to MetaMask
  async function addTokenToWallet() {
    try {
      if (!window.ethereum) return;
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
          },
        },
      });
    } catch (err) {
      console.error("Add token to wallet failed:", err);
    }
  }

  // Sale progress
  const remainingSld = saleSldBalance ?? 0;
  const soldSld = Math.max(0, SALE_CAP_SLD - remainingSld);
  const saleProgress =
    SALE_CAP_SLD > 0 ? Math.min(100, (soldSld / SALE_CAP_SLD) * 100) : 0;

  // Leaderboard (top 3 by SLD bought in this session)
  const leaderboard = useMemo(() => {
    const withSld = purchases.filter((p) => p.sld != null);
    const sorted = [...withSld].sort((a, b) => (b.sld ?? 0) - (a.sld ?? 0));
    return sorted.slice(0, 3);
  }, [purchases]);

  // Referral link for current user
  const myReferralLink =
    typeof window !== "undefined" && account
      ? `${window.location.origin}${window.location.pathname}?ref=${account}`
      : "";

  async function copyReferralLink() {
    if (!myReferralLink) return;
    try {
      await navigator.clipboard.writeText(myReferralLink);
      setRefCopyMsg(t.refCopied);
      setTimeout(() => setRefCopyMsg(""), 2000);
    } catch {
      setRefCopyMsg("");
    }
  }

  // Theme classes
  const bgClass = darkMode
    ? "bg-gradient-to-br from-gray-950 via-gray-900 to-black"
    : "bg-gradient-to-br from-gray-50 via-white to-gray-100";
  const textMain = darkMode ? "text-white" : "text-gray-900";
  const cardBg = darkMode ? "bg-gray-900/90" : "bg-white";
  const cardBorder = darkMode ? "border-gray-800" : "border-gray-200";
  const subText = darkMode ? "text-gray-300" : "text-gray-600";

  const wrongNetwork = chainId !== null && chainId !== 56;

  return (
    <div
      className={`min-h-screen ${bgClass} ${textMain} flex flex-col items-center p-4 sm:p-6`}
    >
      {/* Top bar */}
      <div className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-amber-400">
            {t.title}
          </h1>
          <p className={`${subText} text-sm sm:text-base mt-1 max-w-xl`}>
            {t.subtitle}
          </p>
          {referrer && (
            <p className="text-xs text-emerald-400 mt-1">
              Referred by:{" "}
              <span className="font-mono">{shortAddress(referrer)}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Lang */}
          <div className="flex rounded-full border border-gray-600 overflow-hidden text-xs">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 ${
                lang === "en" ? "bg-amber-500 text-black" : "bg-transparent"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("fr")}
              className={`px-3 py-1 ${
                lang === "fr" ? "bg-amber-500 text-black" : "bg-transparent"
              }`}
            >
              FR
            </button>
          </div>

          {/* Theme */}
          <button
            onClick={() => setDarkMode((d) => !d)}
            className="p-2 rounded-full border border-gray-600 hover:bg-gray-800/40"
            title="Toggle theme"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-gray-700" />
            )}
          </button>

          {/* Wallet */}
          {account ? (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-xs bg-gray-800/70 px-3 py-1.5 rounded-xl border border-gray-700">
                <Wallet className="w-4 h-4 text-amber-400" />
                <span className="text-gray-200">{shortAddress(account)}</span>
              </div>
              <button
                onClick={addTokenToWallet}
                className="text-xs bg-amber-500/90 hover:bg-amber-400 text-black font-semibold px-3 py-1 rounded-xl shadow"
              >
                {t.addToken}
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2 px-6 rounded-xl shadow-lg text-sm"
            >
              {t.connect}
            </button>
          )}
        </div>
      </div>

      {/* Trust Wallet desktop warning */}
      {isTrustWallet && !isMobile && (
        <div className="w-full max-w-6xl mb-4">
          <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/60 rounded-2xl px-4 py-3 text-xs sm:text-sm text-yellow-200">
            <Smartphone className="w-4 h-4" />
            <p>{t.trustDesktopWarning}</p>
          </div>
        </div>
      )}

      {/* Wrong network warning */}
      {wrongNetwork && (
        <div className="w-full max-w-6xl mb-4">
          <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/70 rounded-2xl px-4 py-3 text-xs sm:text-sm text-red-200">
            <span>{t.wrongNetwork}</span>
            <button
              onClick={switchToBsc}
              className="bg-red-500/80 hover:bg-red-500 text-black font-semibold px-3 py-1 text-xs rounded-xl"
            >
              {t.switchToBsc}
            </button>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: buy panel */}
        <div
          className={`${cardBg} p-6 rounded-2xl shadow-xl border ${cardBorder}`}
        >
          {account ? (
            <>
              {/* Input */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm">{t.bnbAmount}</label>
                  <button
                    type="button"
                    onClick={setMaxBnb}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {t.maxButton}
                  </button>
                </div>
                <input
                  type="number"
                  value={bnbAmount}
                  onChange={(e) => updateTokenPreview(e.target.value)}
                  className="w-full p-2 rounded-lg text-black"
                  min="0.01"
                  step="0.001"
                />
                {inputError && (
                  <p className="text-xs text-red-400 mt-1">{inputError}</p>
                )}
              </div>

              {/* Rate + price */}
              {humanRate && (
                <p className="text-sm text-gray-400 mb-1">
                  {t.rateLabel}:{" "}
                  <span className="text-amber-400 font-semibold">
                    {humanRate.toLocaleString()} {tokenSymbol} / BNB
                  </span>
                </p>
              )}
              {bnbPriceUSD && (
                <p className="text-xs text-gray-500 mb-3">
                  {t.livePrice}: ~${bnbPriceUSD.toFixed(2)} USD
                </p>
              )}

              {/* Preview */}
              {(tokenPreview > 0 || usdPreview > 0) && (
                <div className="mb-4 text-sm space-y-1">
                  {tokenPreview > 0 && (
                    <p className="text-green-400">
                      {t.youReceive}{" "}
                      <span className="font-semibold">
                        {tokenPreview.toLocaleString()} {tokenSymbol}
                      </span>
                      .
                    </p>
                  )}
                  {usdPreview > 0 && (
                    <p className="text-blue-400">
                      {t.youSpend}{" "}
                      <span className="font-semibold">
                        ${usdPreview.toFixed(2)} USD
                      </span>
                      .
                    </p>
                  )}
                </div>
              )}

              {/* Buy button */}
              <button
                onClick={buyTokens}
                disabled={!saleActive || !!inputError || wrongNetwork}
                className={`w-full ${
                  saleActive && !inputError && !wrongNetwork
                    ? "bg-amber-500 hover:bg-amber-400"
                    : "bg-gray-600 cursor-not-allowed"
                } text-black font-semibold py-2 px-6 rounded-xl shadow-lg`}
              >
                {saleActive ? t.buyActive : t.buyInactive}
              </button>

              {message && (
                <p className="mt-4 text-center text-sm">{message}</p>
              )}

              {txHash && (
                <p className="mt-2 text-center text-xs text-amber-400">
                  Tx:{" "}
                  <a
                    href={`https://bscscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {shortAddress(txHash)}
                  </a>
                </p>
              )}

              {/* Referral section */}
              {account && (
                <div className="mt-6 text-xs sm:text-sm">
                  <p className="text-gray-400 mb-1">{t.refYourLink}:</p>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <div className="flex-1 bg-gray-800/70 rounded-lg px-3 py-2 text-[11px] break-all">
                      {myReferralLink || "-"}
                    </div>
                    <button
                      type="button"
                      onClick={copyReferralLink}
                      disabled={!myReferralLink}
                      className="flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-2 rounded-lg text-xs disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      <Share2 className="w-3 h-3" />
                      {t.refCopy}
                    </button>
                  </div>
                  {refCopyMsg && (
                    <p className="mt-1 text-emerald-400 text-[11px]">
                      {refCopyMsg}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center text-center">
              <Wallet className="w-10 h-10 text-amber-400 mb-3" />
              <p className={`${subText} mb-3 text-sm`}>
                Connect your wallet to participate in the Solidarity (SLD)
                private sale.
              </p>
              <button
                onClick={connectWallet}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2 px-6 rounded-xl shadow-lg"
              >
                {t.connect}
              </button>
            </div>
          )}
        </div>

        {/* Right: stats & extra info */}
        <div className="space-y-4">
          {/* Wallet overview */}
          <div
            className={`${cardBg} p-4 rounded-2xl border ${cardBorder}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-gray-200">
                  {t.walletOverview}
                </h2>
              </div>
              {account && (
                <span className="text-xs text-gray-400">
                  {shortAddress(account)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-800/80 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">{t.bnbBalance}</p>
                <p className="font-semibold">
                  {walletBnbBalance !== null
                    ? `${walletBnbBalance.toFixed(4)} BNB`
                    : "-"}
                </p>
              </div>
              <div className="bg-gray-800/80 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">{t.sldBalance}</p>
                <p className="font-semibold">
                  {walletSldBalance !== null
                    ? `${walletSldBalance.toLocaleString()} ${tokenSymbol}`
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Sale overview */}
          <div
            className={`${cardBg} p-4 rounded-2xl border ${cardBorder}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-gray-200">
                {t.saleOverview}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm mb-3">
              <div className="bg-gray-800/80 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">{t.rateLabel}</p>
                <p className="font-semibold">
                  {humanRate
                    ? `${humanRate.toLocaleString()} ${tokenSymbol} / BNB`
                    : "-"}
                </p>
              </div>
              <div className="bg-gray-800/80 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">{t.minMax}</p>
                <p className="font-semibold">
                  {MIN_BNB} – {MAX_BNB} BNB
                </p>
              </div>
              <div className="bg-gray-800/80 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">{t.network}</p>
                <p className="font-semibold">BNB Smart Chain (BEP-20)</p>
              </div>
              <div className="bg-gray-800/80 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">{t.saleStatus}</p>
                <p
                  className={`font-semibold ${
                    saleActive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {saleActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{t.saleProgress}</span>
                <span>
                  {soldSld.toLocaleString()} /{" "}
                  {SALE_CAP_SLD.toLocaleString()} {tokenSymbol}
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${saleProgress}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.remaining}:{" "}
              <span className="text-gray-200">
                {saleSldBalance !== null
                  ? saleSldBalance.toLocaleString()
                  : "-"}{" "}
                {tokenSymbol}
              </span>
            </p>
          </div>

          {/* Purchase history & leaderboard */}
          <div
            className={`${cardBg} p-4 rounded-2xl border ${cardBorder}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-gray-200">
                  {t.historyTitle}
                </h2>
              </div>
            </div>
            {purchases.length === 0 ? (
              <p className="text-xs text-gray-500">{t.noPurchases}</p>
            ) : (
              <div className="space-y-1 text-xs max-h-32 overflow-auto mb-3">
                {purchases.map((p, idx) => (
                  <div
                    key={`${p.hash}-${idx}`}
                    className="flex flex-col border-b border-gray-800 pb-1"
                  >
                    <span className="text-gray-300">
                      {p.bnb} BNB →{" "}
                      {p.sld ? p.sld.toLocaleString() : "?"} {tokenSymbol}
                    </span>
                    <span className="text-gray-500">{p.time}</span>
                    <a
                      href={`https://bscscan.com/tx/${p.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400"
                    >
                      {shortAddress(p.hash)}
                    </a>
                  </div>
                ))}
              </div>
            )}

            <h3 className="text-xs font-semibold text-gray-300 mt-2 mb-1">
              {t.leaderboardTitle}
            </h3>
            {leaderboard.length === 0 ? (
              <p className="text-[11px] text-gray-500">{t.noPurchases}</p>
            ) : (
              <ul className="text-[11px] text-gray-200 space-y-1">
                {leaderboard.map((p, i) => (
                  <li key={`${p.hash}-lb-${i}`}>
                    #{i + 1} – {p.sld?.toLocaleString()} {tokenSymbol} (
                    {p.bnb} BNB)
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Contracts + links + FAQ */}
          <div
            className={`${cardBg} p-4 rounded-2xl border ${cardBorder}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-gray-200">
                {t.saleContract}
              </h2>
            </div>
            <p className="text-amber-400 text-xs break-all mb-2">
              {saleAddress}
            </p>

            <p className="text-xs text-gray-400 mb-1">{t.tokenContract}:</p>
            <p className="text-amber-400 text-xs break-all mb-3">
              {tokenAddress}
            </p>

            <div className="mt-2 flex flex-wrap gap-4 text-gray-500 text-sm">
              <a
                href="https://solidaritytoken.io"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 flex items-center gap-2"
              >
                <Globe size={16} /> Website
              </a>
              <a
                href="https://t.me/solidaritytoken"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 flex items-center gap-2"
              >
                <Send size={16} /> Telegram
              </a>
              <a
                href="https://twitter.com/solidaritytoken"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-400 flex items-center gap-2"
              >
                <Twitter size={16} /> Twitter
              </a>
            </div>

            {/* FAQ & risk */}
            <div className="mt-4 border-t border-gray-800 pt-3 text-xs">
              <h3 className="font-semibold text-gray-200 mb-1">
                {t.faqTitle}
              </h3>
              <p className="text-gray-300 font-semibold mt-1">
                • {t.faq1Q}
              </p>
              <p className="text-gray-400 mb-1">{t.faq1A}</p>
              <p className="text-gray-300 font-semibold mt-1">
                • {t.faq2Q}
              </p>
              <p className="text-gray-400 mb-1">{t.faq2A}</p>
              <p className="text-gray-300 font-semibold mt-1">
                • {t.faq3Q}
              </p>
              <p className="text-gray-400 mb-2">{t.faq3A}</p>

              <p className="text-red-300 font-semibold mt-2">
                {t.riskTitle}
              </p>
              <p className="text-red-200 text-[11px]">{t.riskBody}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
