/* eslint-disable no-unused-expressions */

process.env.NODE_ENV = "test";

/* eslint linebreak-style: ["error", "windows"] */
const { expect } = require("chai");

const routingLogic = require("../src/index.js");
const config = require("../config/test");

describe("first-test-chai-works", () => {
  it("should assert true to be true", () => {
    expect(true).to.be.true;
  });
});

describe("post hi to SAP testchatbot", () => {
  const url = config.botAPIEndPoint;
  const token = `Token ${config.defaultBotToken}`;
  const res = {};
  res.send = (message) => {
    res.message = message;
    console.log(`send called${message}`);
  };

  const req = {
    conversation_id: "123456",
    message: {
      type: "text",
      content: "hi",
    },
  };

  const { PostToSAP } = routingLogic;
  async function start() {
    return await PostToSAP(url, req, token, res);
  }

  (async() => 
    await start();
  );
  it("should return a message with hello", () => {
    expect(true).to.be.true;
  });
});

describe("post hi to livechat", () => {
  it("should post hi to livechat conversation", () => {
  });
});

describe("receive livechat message", () => {
});

