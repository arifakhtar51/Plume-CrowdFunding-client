import './App.css';
import { useState, useEffect } from "react";
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Create from './components/Create.jsx';
import Home from './components/Home.jsx';
import Closed from './components/Closed.jsx';
import contractData from './contracts/contractData.json';
import Nav from './components/Nav.jsx';
import { ethers } from 'ethers';

function App() {
  const [contract, setContract] = useState(null);
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await initiateContract();
          setWalletAddress(accounts[0]);
          setConnected(true);
          console.log("connected to wallet:", accounts[0]);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
        toast.error("Error connecting to wallet: " + error.message, {
          position: "top-center",
        });
      }
    }
  };

  const onConnect = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });

        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          toast.success("Wallet connected successfully!", {
            position: "top-center",
          });
          await initiateContract();
          setConnected(true);
        }
      } catch (error) {
        console.error("Connection error:", error);
        toast.error("Failed to connect wallet: " + error.message, {
          position: "top-center",
        });
      }
    } else {
      toast.error("Please install MetaMask or another Ethereum wallet", {
        position: "top-center",
      });
    }
  };

  const initiateContract = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("No Ethereum provider found");
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        contractData.address,
        contractData.abi,
        signer
      );
      
      console.log("Contract initialized:", contract);
      setContract(contract);
    } catch (error) {
      console.error("Error initializing contract:", error);
      toast.error("Error initializing contract: " + error.message, {
        position: "top-center",
      });
    }
  };

  useEffect(() => {
    checkWalletConnection();

    // Add event listeners for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          await initiateContract();
        } else {
          setWalletAddress(null);
          setContract(null);
          setConnected(false);
        }
      });
    }

    // Cleanup event listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  return (
    <BrowserRouter>
      <ToastContainer />
      <div className="App font-jersey-25">
        <div className="gradient-bg-welcome">
          <Nav checkTronLink={onConnect} connected={connected} walletAddress={walletAddress} />
          {!contract ? (
            <div className='text-white flex items-center justify-center'>Loading...</div>
          ) : (
            <Routes>
              <Route
                path='/create'
                element={<Create contract={contract} />}
              />
              <Route
                path='/'
                element={<Home contract={contract} />}
              />
              <Route
                path='/closed'
                element={<Closed contract={contract} />}
              />
            </Routes>
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;