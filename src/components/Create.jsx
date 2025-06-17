import { useEffect, useState } from 'react';
import { Button, Form, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import axios from 'axios';
import { PinataSDK } from "pinata-web3";
import "../App.css";
import jws from "../contracts/pinata.json";

const pinata = new PinataSDK({
  pinataJwt: jws.jws,
  pinataGateway: "beige-sophisticated-baboon-74.mypinata.cloud",
})

const Create = ({ contract }) => {
  const [processing, setProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formInfo, setFormInfo] = useState({
    title: "",
    description: "",
    target: 0,
    deadline: 0,
    imageHash: "" 
  });

  const handleDateChange = (date) => {
    setSelectedDate(date);
    handleChange({
      target: {
        name: 'deadline',
        value: Math.floor(date.getTime() / 1000),
      },
    });
  };

  useEffect(() => {
    document.title = "Create Campaign";
  }, []);

  const handleChange = (event) => {
    let { name, value } = event.target;
    if (name === "deadline") {
      value = Math.floor(new Date(value).getTime() / 1000);
    }
    setFormInfo((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    try {
      const response = await pinata.upload.file(file);
      setFormInfo((prevState) => ({
        ...prevState,
        imageHash: `https://beige-sophisticated-baboon-74.mypinata.cloud/ipfs/${response.IpfsHash}`,
      }));
      toast.success('Image uploaded successfully', { position: "top-center" });
    } catch (error) {
      console.error("Image upload failed", error);
      toast.error('Failed to upload image', { position: "top-center" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formInfo.target <= 0) {
      toast.error('Target must be greater than 0', { position: "top-center" });
      return;
    }

    if (formInfo.deadline < Date.now() / 1000) {
      toast.error('Deadline must be a future date', { position: "top-center" });
      return;
    }

    if (!formInfo.imageHash) {
      toast.error('Please upload an image', { position: "top-center" });
      return;
    }

    setProcessing(true);

    try {
      if (!contract) {
        throw new Error("Contract not initialized. Please connect your wallet.");
      }

      console.log("Form data:", formInfo);
      console.log("Contract address:", contract.address);

      const targetInWei = ethers.utils.parseEther(formInfo.target.toString());
      console.log("Target in Wei:", targetInWei.toString());

      // Check if we have a signer
      const signer = contract.signer;
      if (!signer) {
        throw new Error("No signer found. Please connect your wallet.");
      }

      console.log("Creating campaign with parameters:", {
        title: formInfo.title,
        description: formInfo.description,
        target: targetInWei.toString(),
        deadline: formInfo.deadline,
        image: formInfo.imageHash
      });

      // Create the transaction
      const tx = await contract.createCampaign(
        formInfo.title,
        formInfo.description,
        targetInWei,
        formInfo.deadline,
        formInfo.imageHash
      );
      
      console.log("Transaction sent:", tx.hash);
      toast.info("Transaction sent! Waiting for confirmation...", { position: "top-center" });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      toast.success("Campaign created successfully!", { position: "top-center" });
      
      // Reset form
      setFormInfo({
        title: "",
        description: "",
        target: 0,
        deadline: 0,
        imageHash: ""
      });
    } catch (error) {
      console.error("Error creating campaign:", error);
      let errorMessage = "Failed to create campaign: ";
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage += "Insufficient funds to create campaign";
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage += "Transaction would fail. Please check your input values";
      } else if (error.message.includes("user rejected")) {
        errorMessage += "Transaction was rejected by user";
      } else {
        errorMessage += error.message;
      }
      errorMessage = " Please Connect to Plume Wallet.";
      toast.error(errorMessage, { position: "top-center" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-r from-gray-800 to-gray-900">
      <main className="container mx-auto px-6 py-8">
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Create Campaign</h2>
          <Row className="g-4">
            <Form.Group className="mb-3">
              <Form.Label className="text-white">Upload Image</Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => handleImageUpload(e.target.files[0])}
                className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
              />
            </Form.Group>
            <Form.Control
              onChange={handleChange}
              name="title"
              required
              type="text"
              placeholder="Title"
              className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
            />
            <Form.Control
              onChange={handleChange}
              name="description"
              required
              as="textarea"
              placeholder="Description"
              className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
            />
            <div>
              <label className="text-white mb-2 block">Target Amount (PLUME)</label>
              <Form.Control
                onChange={handleChange}
                name="target"
                required
                type="number"
                placeholder="Target Amount"
                className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
              />
            </div>
            <div>
              <label className="text-white mb-2 block">Deadline</label>
              <Form.Control
                onChange={handleChange}
                name="deadline"
                required
                type="datetime-local"
                placeholder="Deadline"
                className="w-full p-3 my-2 bg-gray-700 text-white rounded-lg"
              />
            </div>
            <div className="flex justify-center mt-6">
              <Button
                onClick={handleSubmit}
                variant="primary"
                size="lg"
                disabled={processing}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
              >
                {processing ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </Row>
        </div>
      </main>
    </div>
  );
}

export default Create;
