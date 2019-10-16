/* eslint-disable no-unused-expressions */
process.env.NODE_ENV = "test";

/* eslint linebreak-style: ["error", "windows"] */
const chai = require("chai");
const nock = require("nock");
const uuidv4 = require("uuid/v4");
chai.use(require("chai-http"));

const config = require("../config");
const app = require("../src/index");

const { expect } = chai;

describe("post GET to /", () => {
  it("should retrieve a hello world message", (done) => {
    const endpoint = "/";

    chai.request(app)
      .get(endpoint)
      .then((res) => {
        expect(res.status).to.equal(200);
        done();
      });
  });
});

describe("post hi to SAP testchatbot", () => {
  it("should connect to SAP with simple message and receive a response 200 even if SAP is not available", (done) => {
    const url = "/routeMessage";
    const conversationId = uuidv4();

    const req = {
      message: {
        conversation: conversationId,
        attachment: {
          type: "text",
          content: "hi",
        },
      },
    };

    chai.request(app)
      .post(url)
      .send(req)
      .then((res) => {
        expect(res).to.have.status(200);
        expect(res.body.results.conversation.id).to.equal(conversationId);
        expect(res.body.message).to.equal("Dialog rendered with success");
        done();
      });
  }).timeout(150000);
});

describe("post agentmessage into a conversation", () => {
  it("should return status 200 when message has been posted into the bot connector", (done) => {
    // we will nock the bot connector endpoint, based on the conversation ID
    const conversationId = uuidv4();
    const endpoint = "/agentmessage";

    const myReply = {

    };

    const bcUrl = `${config.botConnector}`;
    const bcPath = `/connectors/${config.connectorId}/conversations/${conversationId}/messages`;

    nock(bcUrl)
      .post(bcPath)
      .reply(200, myReply);

    const myRequest = {
      conversation_id: conversationId,
      agentName: "test agent",
      message: "my message from a test agent",
    };

    chai.request(app)
      .post(endpoint)
      .send(myRequest)
      .then((res) => {
        expect(res.status).to.equal(201);
        expect(res.text).to.equal(`agentmessage posted to http:/localhost:8082/v1//connectors/${config.connectorId}/conversations/${conversationId}/messages`);
        done();
      });
  });
});
