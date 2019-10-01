/* eslint linebreak-style: ["error", "windows"] */
import { readFileSync } from "fs";
import { createServer } from "https";

import express from "express";
import Axios, { defaults, post } from "axios";
import { json, urlencoded } from "body-parser";
import { createClient } from "redis";
import * as HttpsProxyAgent from "https-proxy-agent";

import config from "../config";

import answerGenerator from "./answerGenerator";
import logger from "./logger";

const app = express();

const PORT = process.env.PORT || config.port;

defaults.headers.common["Content-Type"] = "application/json";

app.use(json());
app.use(urlencoded({
  extended: true,
}));

const {
  httpsProxy,
} = process.env;

function PostToSAP(url, req, token, res) {
  logger.info(`Posting message to SAP CAI with token ${token}`);
  const convId = req.conversation_id;
  // default https proxy agent to null.
  // if defined, we will use the value from the environment
  let agent = null;
  if (httpsProxy) {
    agent = new HttpsProxyAgent(httpsProxy);
  }

  post(url, req, {
    headers: {
      Authorization: token, // this token will determine what bot will handle the input
    },
    httpsAgent: agent,
    proxy: false,
  })
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => {
      logger.error(error.stack.toString());
      const errorMessage = {
        results: {
          nlp: {},
          qna: {},
          messages: [
            {
              type: "text",
              content: "We're sorry, but there is an error establishing the link.",
              markdown: null,
              delay: 3,
              value: "We're sorry, but there is an error establishing the link.",
            },
          ],
          conversation: {
            id: convId,
            language: "fr",
            memory: {},
            skill: "small-talks",
            skill_occurences: 6,
          },
        },
        message: "Dialog rendered with success",
      };
      res.send(errorMessage);
    });
}

function PostToLivechat(url, req, token, res) {
  logger.info("posting to livechat");
  const convId = req.conversation_id || req.body.conversation_id;
  const lUrl = config.livechatConnector + config.livechatEndpoint;
  req.timeout = "2000";
  post(lUrl, req.body)
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => {
      logger.error(error.stack.toString());
      const errorMessage = {
        results: {
          nlp: {},
          qna: {},
          messages: [
            {
              type: "text",
              content: "We're sorry, but there is an error establishing the link.",
              markdown: null,
              delay: 3,
              value: "We're sorry, but there is an error establishing the link.",
            },
          ],
          conversation: {
            id: convId,
            language: "fr",
            memory: {},
            skill: "small-talks",
            skill_occurences: 6,
          },
        },
        message: "Dialog rendered with success",
      };
      res.send(errorMessage);
    });
}

app.post("/switchBot", (req, res) => {
  const client = createClient(config.redisURL);
  const params = req.body;
  let language = "fr";

  if (params.conversation_id === undefined || params.targetBot === undefined) {
    logger.error("no valid parameters, no switching done.");
    res.send("no valid parameters, no switching done.");
    return;
  }

  if (params.targetBot === "livechat" && params.language) {
    language = params.language;
  }

  // from livechat we send an empty string. if so, delete this conv so we are routed back to default bot
  if (params.targetBot === "") {
    client.del(params.conversation_id);
  } else {
    client.set(params.conversation_id, params.targetBot);
  }
  res.send(`Switchbot completed succesfully, conversationId ${params.conversation_id} switched to ${params.targetBot}`);

  // we're entering livechat. kickstart the convo there by sending notification and starting
  // message exchange with livechat, so that status messages from the livechat are sent to the channel
  if (params.targetBot === "livechat") {
    const msg = {
      body: {
        conversation_id: params.conversation_id,
        message: {
          type: "text",
          content: "Switched from chatbot",
        },
        language,
      },
    };
    PostToLivechat("", msg, "livechat", res);
  }
});

app.post("/routeMessage", (req, res) => {
  const client = createClient(config.redisURL);
  const message = req.body;

  const url = config.botAPIEndPoint; // URI for conversation endpoint
  const convo = message.message.conversation; // retrieve conversation ID
  client.get(convo, (err, value) => {
    const messagea = message.message.attachment;
    const req2 = {
      conversation_id: convo,
      message: messagea,
    };
    let token;
    if (value === null) {
      // forward to default bot token
      token = `Token ${config.defaultBotToken}`;
      PostToSAP(url, req2, token, res);
    } else if (value === "livechat") {
      // post message to livechat logic
      token = "livechat";
      PostToLivechat(url, req, token, res);
    } else {
      // forward message to bot specified in redis
      client.get(value, (_err, redisvalue) => {
        token = `Token ${redisvalue}`;
        PostToSAP(url, req, token, res);
      });
    }
  });
});

app.post("/conversationTarget", (req, res) => {
  const convId = req.body.conversation_id;
  const client = createClient();

  client.get(convId, (err, value) => {
    res.send(`conversation ${convId} is sent to ${value}`);
  });
});

/**
   * Route called from livechat to post an agent message to the customer chat window
   * @param  {String} conversation_id
   * @param  {String} message
   * @param  {function} callback
   * @return {Object} success code
   */
app.post("/agentMessage", (req, res) => {
  const { message } = req.body;
  const { agentName } = req.body;
  // eslint-disable-next-line camelcase
  const { conversation_id } = req.body;
  // eslint-disable-next-line camelcase
  const bcUrl = `${config.botConnector}/connectors/${config.connectorId}/conversations/${conversation_id}/messages`;

  const response = {
    messages: [{
      type: "text",
      content: message,
    }],
  };
  post(bcUrl, response, {});

  res.status(201).send(`agentmessage posted to ${bcUrl}`);
});

/**
   * Route called from the builder to check if we can switch to livechat.
   * @param  {String} language
   * @param  {function} callback
   * @return {Object} response Recast.AI bot connector json object to update conversation memory
7   */
app.post("/agentCheck", (req, res) => {
  const { language } = req.body.language || "fr"; // default to French
  const lUrl = config.livechatConnector + config.agentAvailability;
  const livechatReq = {
    language,
  };

  const reply = answerGenerator.newReplyObject();

  Axios.post(lUrl, livechatReq)
    .then((response) => {
      if (response.data.agentsAvailable) {
        reply.replies.push(answerGenerator.generateMemory("agent_available", response.data.agentsAvailable));
        res.status(200).send(reply);
      } else {
        reply.replies.push(answerGenerator.generateMemory("agent_available", 0));
        res.status(200).send(reply);
      }
    })
    .catch((errorArgs) => {
      logger.error(`error occurred during /agentCheck ${errorArgs.message}`);
      reply.replies.push(answerGenerator.generateMemory("agent_available", 0));
      res.status(500).send(reply);
    });
});

app.post("/errorMessage", (req, res) => {
  res.send("error message received from cisco ece");
});

app.get("/", (req, res) => {
  res.send("hi");
});

if (config.https) {
  // open routing logic in https
  createServer({
    key: readFileSync(config.keyfile),
    cert: readFileSync(config.certfile),
    timeout: 3000,
  }, app)
    .listen(PORT, () => {
      logger.info(`Routing logic listening on https ${PORT}`);
    });
} else {
  // open routing logic on http
  app.listen(PORT, () => {
    logger.info(`Routing logic listening on http ${PORT}`);
  });
}

