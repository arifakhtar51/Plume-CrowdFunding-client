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
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzJkMzc0OCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
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
    <div className="min-h-screen bg-gradient-to-r from-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="text-center py-20 px-4">
        <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
          Welcome to Ignitus Networks
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Ignitus Networks is building a premium pay-per-view platform where creators can upload their videos and get paid each time their videos are watched.
        </p>
      </div>

      {/* Campaigns Section */}
      <div className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-8">
            <Spinner animation="border" variant="light" />
          </div>
        ) : (
          <Row className="g-4">
            {openCampaigns.map((campaign) => (
              <Col key={campaign.id} className="d-flex align-items-stretch">
                <div className="card custom-card">
                  <img
                    className="card-img-top"
                    src={campaign.image}
                    alt={campaign.title}
                    style={{ height: '200px', objectFit: 'cover', width: '100%' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzJkMzc0OCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                  <div className="card-body">
                    <h5 className="card-title">{campaign.title}</h5>
                    <p className="card-text">{campaign.description}</p>
                    <p><strong>Target:</strong> {campaign.target} PLUME</p>
                    <p><strong>Collected:</strong> {campaign.amountCollected} PLUME</p>
                    <p><strong>Deadline:</strong> {new Date(campaign.deadline * 1000).toLocaleString()}</p>

                    <ProgressBar
                      now={calculateProgress(campaign.amountCollected, campaign.target)}
                      label={`${Math.round(calculateProgress(campaign.amountCollected, campaign.target))}%`}
                      variant="success"
                    />

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
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}

export default Home;