import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';

const daysLeft = (deadline) => {
  const difference = new Date(deadline * 1000).getTime() - Date.now();
  const remainingDays = difference / (1000 * 60 * 60 * 24);
  return remainingDays.toFixed(0);
};

const Closed = ({ contract }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const data = await contract.getCampaigns();
      const parsedCampaigns = data.map((campaign, i) => ({
        owner: campaign.owner,
        title: campaign.title,
        description: campaign.description,
        target: ethers.utils.formatEther(campaign.target.toString()),
        deadline: campaign.deadline.toNumber(),
        amountCollected: ethers.utils.formatEther(campaign.amountCollected.toString()),
        image: campaign.image,
        pId: i
      }));

      setCampaigns(parsedCampaigns);
    } catch (error) {
      console.log("Error loading campaigns:", error);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    if(contract) fetchCampaigns();
  }, [contract]);

  return (
    <div>
      {isLoading && (
        <div className="d-flex justify-content-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}

      {!isLoading && campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center -mt-4 sm:-mt-20">
          <h1 className="font-epilogue font-semibold text-[18px] text-white text-center">
            No campaigns found
          </h1>
        </div>
      )}

      {!isLoading && campaigns.length > 0 && (
        <>
          <h1 className="font-epilogue font-semibold text-[18px] text-white text-left">
            All Campaigns ({campaigns.length})
          </h1>

          <div className="flex flex-wrap mt-[20px] gap-[26px]">
            {campaigns.map((campaign) => <CampaignCard 
              key={campaign.pId}
              {...campaign}
              handleClick={() => navigate(`/campaign-details/${campaign.pId}`)}
            />)}
          </div>
        </>
      )}
    </div>
  )
}

const CampaignCard = ({ owner, title, description, target, deadline, amountCollected, image, handleClick }) => {
  const remainingDays = daysLeft(deadline);

  return (
    <div className="sm:w-[288px] w-full rounded-[15px] bg-[#1c1c24] cursor-pointer" onClick={handleClick}>
      <img src={image} alt="fund" className="w-full h-[158px] object-cover rounded-[15px]"/>

      <div className="flex flex-col p-4">
        <div className="flex flex-row items-center mb-[18px]">
          <p className="ml-[12px] mt-[2px] font-epilogue font-medium text-[12px] text-[#808191]">Education</p>
        </div>

        <div className="block">
          <h3 className="font-epilogue font-semibold text-[16px] text-white text-left leading-[26px] truncate">{title}</h3>
          <p className="mt-[5px] font-epilogue font-normal text-[#808191] text-left leading-[18px] truncate">{description}</p>
        </div>

        <div className="flex justify-between flex-wrap mt-[15px] gap-2">
          <div className="flex flex-col">
            <h4 className="font-epilogue font-semibold text-[14px] text-[#b2b3bd] leading-[22px]">{parseFloat(amountCollected).toFixed(2)} PLUME</h4>
            <p className="mt-[3px] font-epilogue font-normal text-[12px] leading-[18px] text-[#808191] sm:max-w-[120px] truncate">Raised of {parseFloat(target).toFixed(2)} PLUME</p>
          </div>
          <div className="flex flex-col">
            <h4 className="font-epilogue font-semibold text-[14px] text-[#b2b3bd] leading-[22px]">{remainingDays}</h4>
            <p className="mt-[3px] font-epilogue font-normal text-[12px] leading-[18px] text-[#808191] sm:max-w-[120px] truncate">Days Left</p>
          </div>
        </div>

        <div className="flex items-center mt-[20px] gap-[12px]">
          <div className="w-[30px] h-[30px] rounded-full flex justify-center items-center bg-[#13131a]">
            <p className="text-white text-xs">👤</p>
          </div>
          <p className="flex-1 font-epilogue font-normal text-[12px] text-[#808191] truncate">by <span className="text-[#b2b3bd]">{owner}</span></p>
        </div>
      </div>
    </div>
  )
}

export default Closed;