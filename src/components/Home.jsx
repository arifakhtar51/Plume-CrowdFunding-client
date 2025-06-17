import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Alert, Spinner, Form, ProgressBar } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import './Home.css';

function Home({ contract }) {
  const [openCampaigns, setOpenCampaigns] = useState([]);
  const [donationAmounts, setDonationAmounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDonating, setDonating] = useState(false);
  const [fetchData, setFechData] = useState(true);

  const getCampaigns = async () => {
    if (fetchData) {
      setLoading(true);
      setError(null);

      try {
        if (!contract) {
          throw new Error("Contract not initialized. Please connect your wallet.");
        }

        const allCampaigns = await contract.getCampaigns();
        const currentTime = Math.floor(Date.now() / 1000);

        const campaignsWithIds = allCampaigns.map((campaign, index) => ({
          ...campaign,
          id: index,
          amountCollected: ethers.utils.formatEther(campaign.amountCollected),
          target: ethers.utils.formatEther(campaign.target),
          deadline: campaign.deadline.toNumber()
        }));

        const open = campaignsWithIds.filter(campaign => {
          const { amountCollected, target, deadline } = campaign;
          return parseFloat(amountCollected) < parseFloat(target) && deadline > currentTime;
        });

        setOpenCampaigns(open);
      } catch (error) {
        console.error("Error loading campaigns:", error);
        setError("Failed to load campaigns. Please Connect to Plume Wallet.");
      } finally {
        setFechData(false);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    getCampaigns();
  }, [fetchData]);

  const handleDonationChange = (campaignId, value) => {
    setDonationAmounts(prev => ({
      ...prev,
      [campaignId]: value
    }));
  };

  const donateToCampaign = async (campaignId) => {
    const donationAmount = donationAmounts[campaignId];
    const parsedAmount = parseFloat(donationAmount);

    if (!parsedAmount || parsedAmount <= 0 || isNaN(parsedAmount)) {
      toast.error('Please enter a valid donation amount.', { position: 'top-center' });
      return;
    }

    try {
      setDonating(true);
      if (!contract) {
        throw new Error('Contract not initialized. Please connect your wallet.');
      }

      // Get the signer to check balance
      const signer = contract.signer;
      const balance = await signer.getBalance();
      const amountInWei = ethers.utils.parseEther(donationAmount.toString());

      // Check if user has enough balance
      if (balance.lt(amountInWei)) {
        throw new Error('Insufficient balance for donation');
      }

      console.log('Donating to campaign:', {
        campaignId,
        amount: donationAmount,
        amountInWei: amountInWei.toString()
      });

      toast.info('Please confirm the transaction in your wallet...', { position: 'top-center' });

      // Create the transaction
      const tx = await contract.donateToCampaign(campaignId, { value: amountInWei });
      console.log('Transaction sent:', tx.hash);

      toast.info('Transaction sent! Waiting for confirmation...', { position: 'top-center' });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      toast.success('Donation successful!', { position: 'top-center' });
      
      // Refresh campaign data
      setFechData(true);
    } catch (error) {
      console.error('Error donating to campaign:', error);
      let errorMessage = 'Donation failed: ';

      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage += 'Insufficient balance for donation';
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage += 'Transaction would fail. Please check your input values';
      } else if (error.message.includes("user rejected")) {
        errorMessage += 'Transaction was rejected by user';
      } else if (error.message.includes("insufficient funds")) {
        errorMessage += 'Insufficient balance for donation';
      } else {
        errorMessage += error.message || 'Please try again.';
      }

      toast.error(errorMessage, { position: 'top-center' });
    } finally {
      setDonating(false);
      setDonationAmounts((prev) => ({
        ...prev,
        [campaignId]: '',
      }));
    }
  };

  const calculateProgress = (collected, target) => {
    return (parseFloat(collected) / parseFloat(target)) * 100;
  };

  const renderCampaigns = (campaigns, isClosed) => (
    <Row xs={1} md={2} lg={3} className="g-4">
      {campaigns.map((campaign, index) => {
        const progress = calculateProgress(campaign.amountCollected, campaign.target);

        return (
          <Col key={index} className="d-flex align-items-stretch">
            <div className="card custom-card">
              <img
                className="card-img-top"
                src={campaign.image}
                alt={campaign.title}
                style={{ height: '200px', objectFit: 'cover', width: '100%' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/200x200?text=Error+Loading+Image';
                }}
              />
              <div className="card-body">
                <h5 className="card-title">{campaign.title}</h5>
                <p className="card-text">{campaign.description}</p>
                <p><strong>Target:</strong> {campaign.target} PLUME</p>
                <p><strong>Collected:</strong> {campaign.amountCollected} PLUME</p>
                <p><strong>Deadline:</strong> {new Date(campaign.deadline * 1000).toLocaleString()}</p>

                <ProgressBar
                  now={isClosed ? 100 : progress}
                  label={isClosed ? 'Campaign Closed' : `${Math.round(progress)}%`}
                  variant={isClosed ? 'danger' : 'success'}
                />

                {!isClosed && (
                  <>
                    <Form.Control
                      type="number"
                      placeholder="Enter donation amount"
                      value={donationAmounts[campaign.id] || ''}
                      onChange={(e) => handleDonationChange(campaign.id, e.target.value)}
                      className="mb-3 mt-3"
                      min="0"
                      step="0.1"
                    />
                    <Button
                      onClick={() => donateToCampaign(campaign.id)}
                      variant="primary"
                      className="w-100"
                      disabled={isDonating}
                    >
                      {isDonating ? 'Donating...' : "Donate"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Col>
        );
      })}
    </Row>
  );

  return (
    <div className="container-fluid mt-5">
      <div className="row">
        <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
          <div className="content mx-auto">
            <h2 className="text-center mb-4">Open Campaigns</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {loading ? (
              <div className="text-center mt-5">
                <Spinner animation="border" />
                <p>Loading campaigns...</p>
              </div>
            ) : (
              renderCampaigns(openCampaigns, false)
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Home;