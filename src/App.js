import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

const PRESALE_RATE = 23000000; // 1 BNB = 23,000,000 SLD
const TOKEN_SYMBOL = "SLD";

// Wallet that will receive BNB from investors
const SALE_WALLET_ADDRESS = "0x37a8ccf24b8681dddaa1d2e1ad0aa7f7c3e0ee05";

// BSC Mainnet chain id
const BSC_CHAIN_ID = "0x38"; // 56 in hex

// Presale caps
const SOFT_CAP_BNB = 50;
const HARD_CAP_BNB = 200;

// Optional: BscScan API key for auto-tracking raised BNB
// Get one free at https://bscscan.com/myapikey
const BSCSCAN_API_KEY = ""; // <-- put your key here (or leave empty to disable)
const BSCSCAN_ADDRESS = SALE_WALLET_ADDRESS;

// Presale end time (adjust to your real end date/time, in UTC)
const PRESALE_END_TIME = new Date("2025-12-31T23:59:59Z").getTime();

// Social links
const WEBSITE_URL = "https://solidarity-sale.vercel.app";
const TELEGRAM_URL = "https://t.me/solidaritytoken";
const TWITTER_URL = "https://x.com/bens1382590";

// Whitelist (simple, local)
const WHITELIST_ENABLED = false; // set true to enable
const WHITELIST = [
  // "0xYourWhitelistedAddressHere".toLowerCase(),
];

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

  const [raisedBNB, setRaisedBNB] = useState(0);
  const [raisedLoading, setRaisedLoading] = useState(false);

  // theme + language
  const [theme, setTheme] = useState("dark"); // "dark" | "light"
  const [lang, setLang] = useState("en"); // "en" | "fr"
  const isFrench = lang === "fr";

  // referral + analytics (local only)
  const [referrer, setReferrer] = useState(null);
  const [investorCount, setInvestorCount] = useState(0);
  const [totalContributed, setTotalContributed] = useState(0);
  const [referralStats, setReferralStats] = useState({}); // { refAddress: totalBNB }

  const averageContribution =
    investorCount > 0 ? totalContributed / investorCount : 0;

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

  // referral + analytics load (from localStorage)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        localStorage.setItem("sld_referrer", ref);
        setReferrer(ref);
      } else {
        const stored = localStorage.getItem("sld_referrer");
        if (stored) setReferrer(stored);
      }

      const storedAnalytics = localStorage.getItem("sld_analytics");
      if (storedAnalytics) {
        const parsed = JSON.parse(storedAnalytics);
        if (parsed.investorCount) setInvestorCount(parsed.investorCount);
        if (parsed.totalContributed)
          setTotalContributed(parsed.totalContributed);
        if (parsed.referralStats) setReferralStats(parsed.referralStats);
      }
    } catch (e) {
      console.error("Error reading local analytics:", e);
    }
  }, []);

  // auto-fetch raised BNB from BscScan (optional)
  useEffect(() => {
    const fetchRaised = async () => {
      if (!BSCSCAN_API_KEY) return; // disabled until key is set

      try {
        setRaisedLoading(true);
        const url = `https://api.bscscan.com/api?module=account&action=balance&address=${BSCSCAN_ADDRESS}&tag=latest&apikey=${BSCSCAN_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === "1") {
          const wei = data.result;
          const bnb = Number(ethers.formatEther(wei));
          setRaisedBNB(bnb);
        }
      } catch (err) {
        console.error("Error fetching raised amount:", err);
      } finally {
        setRaisedLoading(false);
      }
    };

    fetchRaised();
    // refresh every 60 seconds
    const interval = setInterval(fetchRaised, 60000);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = Math.max(
    0,
    Math.min(100, (raisedBNB / HARD_CAP_BNB) * 100)
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

      // whitelist check (optional)
      if (WHITELIST_ENABLED) {
        const normalized = walletAddress.toLowerCase();
        const allowed = WHITELIST.map((a) => a.toLowerCase());
        if (!allowed.includes(normalized)) {
          setStatus("Your wallet is not whitelisted for this presale.");
          return;
        }
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

      // update local analytics
      const currentRef =
        referrer || localStorage.getItem("sld_referrer") || null;

      const newInvestorCount = investorCount + 1;
      const newTotalContributed = totalContributed + valueBNB;

      const newReferralStats = { ...referralStats };
      if (currentRef) {
        const key = currentRef.toLowerCase();
        newReferralStats[key] = (newReferralStats[key] || 0) + valueBNB;
      }

      setInvestorCount(newInvestorCount);
      setTotalContributed(newTotalContributed);
      setReferralStats(newReferralStats);

      try {
        localStorage.setItem(
          "sld_analytics",
          JSON.stringify({
            investorCount: newInvestorCount,
            totalContributed: newTotalContributed,
            referralStats: newReferralStats,
          })
        );
      } catch (e) {
        console.error("Error saving analytics:", e);
      }

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

  const handleAddTokenToWallet = async () => {
    if (!window.ethereum) {
      setStatus("Wallet not detected. Please install MetaMask.");
      return;
    }

    try {
      const wasAdded = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: "0xb10c8C889a23C4835Ea4F5962666b0B8da891B1A", // SLD contract
            symbol: TOKEN_SYMBOL,
            decimals: 18,
            image: `${window.location.origin}/sld-logo-512.png`, // put logo in /public
          },
        },
      });

      if (wasAdded) {
        setStatus("SLD has been added to your wallet ✔");
      } else {
        setStatus("Token was not added to wallet.");
      }
    } catch (error) {
      console.error(error);
      setStatus("Could not add token to wallet.");
    }
  };

  const myReferralLink =
    walletAddress && typeof window !== "undefined"
      ? `${window.location.origin}?ref=${walletAddress}`
      : "";

  const topReferrers = Object.entries(referralStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className={`app ${theme}`}>
      <header className="header">
        <div className="logo" />
        <div className="title-group">
          <h1>
            {isFrench ? "Solidarity (SLD) Prévente" : "Solidarity (SLD) Presale"}
          </h1>
          <p>
            {isFrench
              ? "Renforcer le soutien mutuel mondial sur BNB Smart Chain"
              : "Empowering Global Mutual Support on BNB Smart Chain"}
          </p>
        </div>
        <div className="header-right">
          <div className="header-toggles">
            <div className="theme-toggle">
              <button
                type="button"
                className={theme === "dark" ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setTheme("dark")}
              >
                🌙
              </button>
              <button
                type="button"
                className={theme === "light" ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setTheme("light")}
              >
                ☀
              </button>
            </div>
            <div className="lang-toggle">
              <button
                type="button"
                className={lang === "en" ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setLang("en")}
              >
                EN
              </button>
              <button
                type="button"
                className={lang === "fr" ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setLang("fr")}
              >
                FR
              </button>
            </div>
          </div>
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
              : isFrench
              ? "Connecter le portefeuille"
              : "Connect Wallet"}
          </button>
        </div>
      </header>

      <main className="content">
        <section className="card">
          <h2>{isFrench ? "Participer à la prévente" : "Participate in Presale"}</h2>
          <p className="rate">
            1 BNB = <strong>{PRESALE_RATE.toLocaleString()} SLD</strong>
          </p>
          <p className="timer">
            ⏳{" "}
            {isFrench ? "Temps restant :" : "Presale time left:"}{" "}
            <strong>{timeLeft}</strong>
          </p>

          <div className="field-group">
            <label>{isFrench ? "Montant en BNB" : "Amount in BNB"}</label>
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
            <label>
              {isFrench ? "Vous recevrez (approx.)" : "You will receive (approx)"}
            </label>
            <div className="output">
              {sldAmount} <span>{TOKEN_SYMBOL}</span>
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={handleBuy}
            disabled={loading}
          >
            {loading
              ? isFrench
                ? "Traitement…"
                : "Processing…"
              : isFrench
              ? "Acheter SLD"
              : "Buy SLD"}
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={handleAddTokenToWallet}
          >
            {isFrench ? "Ajouter SLD à MetaMask" : "Add SLD to MetaMask"}
          </button>

          <p className="note">
            {isFrench
              ? "Les jetons seront distribués manuellement après la fin de la prévente, selon le calendrier de vesting officiel."
              : "Tokens are distributed manually after the presale ends, according to the official vesting schedule."}
          </p>

          <p className="note">
            {isFrench
              ? "Sur mobile : ouvrez ce site dans le navigateur DApp de MetaMask ou Trust Wallet."
              : "Mobile users: open this website inside MetaMask or Trust Wallet DApp browser for the best experience."}
          </p>
          {WHITELIST_ENABLED && (
            <p className="note">
              {isFrench
                ? "La prévente est en mode liste blanche. Seules les adresses approuvées peuvent participer."
                : "Presale is in whitelist mode. Only approved addresses can participate."}
            </p>
          )}
        </section>

        <section className="card">
          <h2>{isFrench ? "Informations sur la prévente" : "Presale Information"}</h2>
          <ul className="info-list">
            <li>
              {isFrench
                ? "Réseau : BNB Smart Chain (BEP-20)"
                : "Chain: BNB Smart Chain (BEP-20)"}
            </li>
            <li>
              {isFrench
                ? "Taux de prévente : 1 BNB = 23 000 000 SLD"
                : "Presale rate: 1 BNB = 23,000,000 SLD"}
            </li>
            <li>
              {isFrench ? "Contrat :" : "Contract:"}{" "}
              <span className="mono">
                0xb10c8C889a23C4835Ea4F5962666b0B8da891B1A
              </span>
            </li>
            <li>
              {isFrench
                ? "Allocation de prévente : 20% de l'offre totale"
                : "Presale allocation: 20% of total supply"}
            </li>
            <li>
              {isFrench
                ? "Liquidité verrouillée pour 6 mois"
                : "Liquidity locked for 6 months"}
            </li>
            <li>
              {isFrench
                ? "10% débloqués au TGE, reste vesté sur 6 mois"
                : "10% unlocked at TGE, remaining vested over 6 months"}
            </li>
          </ul>

          <div className="progress-section">
            <h3>{isFrench ? "Progression de la prévente" : "Presale Progress"}</h3>
            <p>
              {isFrench ? "Collecté :" : "Raised:"}{" "}
              <strong>
                {raisedLoading
                  ? "…"
                  : `${raisedBNB.toFixed(4)} BNB`}
              </strong>{" "}
              / <strong>{SOFT_CAP_BNB} BNB soft cap</strong> /{" "}
              <strong>{HARD_CAP_BNB} BNB hard cap</strong>
            </p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            {!BSCSCAN_API_KEY && (
              <p className="note">
                {isFrench
                  ? "* Pour mettre à jour automatiquement cette valeur, ajoutez BSCSCAN_API_KEY dans App.js."
                  : "* To auto-update this value, set BSCSCAN_API_KEY in App.js."}
              </p>
            )}
          </div>

          <div className="qr-section">
            <h3>
              {isFrench
                ? "Scanner pour ouvrir la prévente"
                : "Scan to Open Presale"}
            </h3>
            <p className="note">
              {isFrench
                ? "Scannez ce QR code avec votre téléphone ou votre wallet pour ouvrir cette page de prévente."
                : "Scan this QR code with your phone or wallet app to open this presale page."}
            </p>
            <img
              src="/sld-presale-qr.png"
              alt="SLD presale QR"
              className="qr-image"
            />
          </div>
        </section>

        <section className="card full-width">
          <h2>{isFrench ? "Comment acheter SLD" : "How to Buy SLD"}</h2>
          <ol className="info-list">
            <li>
              <strong>{isFrench ? "Installer un wallet :" : "Install a wallet:"}</strong>{" "}
              {isFrench
                ? "Utilisez MetaMask (navigateur) ou MetaMask / Trust Wallet sur mobile."
                : "Use MetaMask (browser) or MetaMask / Trust Wallet app on mobile."}
            </li>
            <li>
              <strong>
                {isFrench
                  ? "Passer sur BNB Smart Chain (BSC) :"
                  : "Switch to BNB Smart Chain (BSC):"}
              </strong>{" "}
              {isFrench
                ? "Le site vous demandera de changer de réseau. Acceptez dans votre wallet."
                : "The website will prompt you to switch. Approve the network change in your wallet."}
            </li>
            <li>
              <strong>
                {isFrench
                  ? "Approvisionner votre wallet en BNB :"
                  : "Fund your wallet with BNB:"}
              </strong>{" "}
              {isFrench
                ? "Achetez du BNB sur un exchange (Binance, KuCoin, etc.) et retirez vers votre adresse BSC."
                : "Buy BNB on an exchange (Binance, KuCoin, etc.) and withdraw to your BSC wallet address."}
            </li>
            <li>
              <strong>
                {isFrench
                  ? "Connecter votre wallet :"
                  : "Connect your wallet:"}
              </strong>{" "}
              {isFrench
                ? "Cliquez sur le bouton « Connecter le portefeuille » en haut à droite."
                : "Click the Connect Wallet button at the top right of this page."}
            </li>
            <li>
              <strong>
                {isFrench
                  ? "Entrer le montant en BNB :"
                  : "Enter BNB amount:"}
              </strong>{" "}
              {isFrench
                ? "Dans la carte de prévente, saisissez le montant de BNB à contribuer. Vous verrez le SLD à recevoir."
                : "In the presale card, type how much BNB you want to contribute. You’ll see the SLD you will receive."}
            </li>
            <li>
              <strong>
                {isFrench
                  ? "Confirmer la transaction :"
                  : "Confirm the transaction:"}
              </strong>{" "}
              {isFrench
                ? "Cliquez sur « Acheter SLD ». Votre wallet s’ouvrira — confirmez la transaction."
                : "Click Buy SLD. Your wallet will open — confirm the transaction."}
            </li>
            <li>
              <strong>
                {isFrench
                  ? "Recevoir SLD :"
                  : "Receive SLD:"}
              </strong>{" "}
              {isFrench
                ? "Après la fin de la prévente, SLD sera distribué selon le calendrier de vesting."
                : "After the presale ends, SLD will be distributed to your wallet according to the vesting schedule."}
            </li>
          </ol>
        </section>

        <section className="card full-width">
          <h2>{isFrench ? "Références & Statistiques" : "Referrals & Analytics"}</h2>
          <div className="analytics-grid">
            <div>
              <h3>{isFrench ? "Statistiques locales" : "Local Analytics"}</h3>
              <p>
                {isFrench ? "Investisseurs (local) :" : "Investors (local):"}{" "}
                <strong>{investorCount}</strong>
              </p>
              <p>
                {isFrench ? "Total contribué (local) :" : "Total contributed (local):"}{" "}
                <strong>{totalContributed.toFixed(4)} BNB</strong>
              </p>
              <p>
                {isFrench ? "Contribution moyenne :" : "Average contribution:"}{" "}
                <strong>{averageContribution.toFixed(4)} BNB</strong>
              </p>
              <p className="note">
                {isFrench
                  ? "Ces statistiques sont locales à votre navigateur. Pour des chiffres officiels, utilisez un backend ou un tableau de bord on-chain."
                  : "These stats are local to your browser. For official numbers, use a backend or on-chain dashboard."}
              </p>
            </div>

            <div>
              <h3>{isFrench ? "Votre lien de parrainage" : "Your Referral Link"}</h3>
              {walletAddress ? (
                <>
                  <p className="note">
                    {isFrench
                      ? "Partagez ce lien. Les contributions seront attribuées à votre adresse en local."
                      : "Share this link. Contributions will be attributed to your address locally."}
                  </p>
                  <div className="referral-box">
                    <code>{myReferralLink}</code>
                  </div>
                </>
              ) : (
                <p className="note">
                  {isFrench
                    ? "Connectez votre wallet pour voir votre lien de parrainage."
                    : "Connect your wallet to see your referral link."}
                </p>
              )}
              {referrer && (
                <p>
                  {isFrench ? "Votre parrain :" : "Your referrer:"}{" "}
                  <span className="mono">{referrer}</span>
                </p>
              )}
            </div>

            <div>
              <h3>{isFrench ? "Top parrains (local)" : "Top Referrers (local)"}</h3>
              {topReferrers.length === 0 ? (
                <p className="note">
                  {isFrench
                    ? "Aucun parrain enregistré localement pour le moment."
                    : "No referrers recorded locally yet."}
                </p>
              ) : (
                <ol className="info-list">
                  {topReferrers.map(([addr, amount]) => (
                    <li key={addr}>
                      <span className="mono">
                        {addr.slice(0, 6)}...{addr.slice(-4)}
                      </span>{" "}
                      — {amount.toFixed(4)} BNB
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          {isFrench
            ? "Vérifiez toujours l’adresse du contrat et l’URL du site."
            : "Always double-check the contract address and website URL."}
        </p>
      </footer>

      {status && <div className="status-bar">{status}</div>}
    </div>
  );
}

export default App;
