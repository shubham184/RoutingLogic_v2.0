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
const client = createClient(config.redisURL);
if (config.redisPassword) {
  client.auth(config.redisPassword);
}

const PORT = process.env.PORT || config.port;

defaults.headers.common["Content-Type"] = "application/json";

app.use(json());
app.use(urlencoded({
  extended: true,
}));

const {
  httpsProxy,
} = process.env;

//Set the routing parameters
function setRouting(convId, origin, destination, isLive, callback){
  let value = {
    origin,
    destination,
    isLive
  }
  client.set(convId, JSON.stringify(value), callback);
}

//Get the routing parameters if not present, returns empty object
function getRouting(convId, callback){
  client.get(convId, (err, value) => {
    if(err){
      console.error(err);
      return callback(err, null);
    }
    if(value === null){
      return callback(null, {});
    }else{
      try{
        value = JSON.parse(value);
      }catch(error){
        console.error(error);
      }
      return callback(null,value);
    }   
  })
}

//Update routing parameter Live
function switchLive(convId, callback){
  getRouting(convId, (err, value) => {
    if(err){
      console.error(err);
      return callback(err, null);
    }
    console.log("OLD VALUE  : %s", value.isLive);
    const isLive = !value.isLive;
    console.log("NEW VALUE  : %s", isLive);
    setRouting(convId, value.origin, value.destination, isLive, (err, value)  => {
      if(callback){
        callback(err, isLive);
      }
    });   
  });
}

function PostToSAP(url, req, token, res) {
  logger.info(`Posting message to SAP CAI with token ${token}`);
  const convId = req.conversation_id;
  // default https proxy agent to null.
  // if defined, we will use the value from the environment
  let agent = null;
  if (httpsProxy) {
    agent = new HttpsProxyAgent(httpsProxy);
  }
  console.log("SPECIFIC REQUEST");
  console.log(req);
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
};

function PostToLivechat(url, req, token, res) {
  logger.info("posting to livechat");
  const convId = req.conversation_id || req.body.chatId || req.body.conversation_id;
  const lUrl = config.livechatConnector + config.livechatEndpoint;
  req.timeout = "5000";
  logger.info(lUrl);
  post(lUrl, req.body)
    .then((response) => {
      logger.info("success");
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
  console.info("API:/switchBot");
  const params = req.body;
  const convId = params.conversation_id;
  let language = params.conversation_language || "fr";
  logger.info(JSON.stringify(params));

  if (params.conversation_id === undefined || params.targetBot === undefined) {
    logger.error("no valid parameters, no switching done.");
    res.send("no valid parameters, no switching done.");
    return;
  }


  switchLive(convId, (err, isLive) =>{
    if(isLive){
      console.log("Am I posting live ? %s", isLive);
      const msg = {
        body: {
          conversation_id: params.conversation_id,
          message: {
            type: "text",
            content: "Switched from chatbot",
          },
          language: language,
        },
      };
      PostToLivechat("", msg, "livechat", res);
    }
  });
  
  //res.send(`Switchbot completed succesfully, conversationId ${params.conversation_id} switched to ${params.targetBot}`);

});

//TODO : Discuss if we need one routing logic per language or one with a routing table.  
app.post("/routeMessage/destination/:botId/origin/:connectorId", (req, res) => {
  console.info("API:/routeMessage");
  console.info(req.body);
  /*   const client = createClient(config.redisURL);
    if (config.redisPassword) {
      client.auth(config.redisPassword);
  } */
  const message = req.body.message;
  const origin = req.params.connectorId;
  const destination = req.params.botId || config.defaultBotToken;
  const url = config.botAPIEndPoint; // URI for conversation endpoint
  const convId = message.conversation; // retrieve conversation ID

  getRouting(convId, (err, value) => {
    let token = `Token ${destination}`;
    /* 
    if(err){
      console.info("An error occured unable to retrieve routing");
      return;
    }
    */

    const messagea = message.attachment;
    const req2 = {
      conversation_id: convId,
      message: messagea,
    };

    if(!value.origin || !value.destination){
      setRouting(convId, origin, destination, value.isLive);
    }
    
    if (!value.isLive) {
      PostToSAP(url, req2, token, res);
    } else {
      PostToLivechat(url, req, token, res);
    }
  });
});

app.post("/conversationTarget", (req, res) => {
  const convId = req.body.conversation_id;
/*   const client = createClient(config.redisURL);
  if (config.redisPassword) {
    client.auth(config.redisPassword);
  } */

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
  const { message, agentName, isLive } = req.body;
  // eslint-disable-next-line camelcase
  const { conversation_id } = req.body;
  getRouting(conversation_id, (err, value) => {
    // eslint-disable-next-line camelcase
    const bcUrl = `${config.botConnector}/connectors/${value.origin}/conversations/${conversation_id}/messages`;

    const response = {
      messages: [{
        type: "text",
        isLive : isLive,
        from: agentName,
        content: message,
      }],
    };
    console.log(response);
    post(bcUrl, response, {});

    res.status(201).send(`agentmessage posted to ${bcUrl}`);

  });

});

/**
   * Route called from the builder to check if we can switch to livechat.
   * @param  {String} language
   * @param  {function} callback
   * @return {Object} response Recast.AI bot connector json object to update conversation memory
7   */
app.post("/agentCheck", (req, res) => {
  const language = req.body.conversation.language || "fr"; // default to French
  const lUrl = config.livechatConnector + config.agentAvailability;
  const livechatReq = {
    language,
  };

  const reply = answerGenerator.newReplyObject();

  Axios.post(lUrl, livechatReq)
    .then((response) => {
      let nbAgents = 0
      if (response.data.agentsAvailable) {
        nbAgents = response.data.agentsAvailable;
      }
      reply.conversation = answerGenerator.addInMemory(req.body.conversation, "agent_available", nbAgents);
      res.status(200).send(reply);
    })
    .catch((errorArgs) => {
      logger.error(`error occurred during /agentCheck ${errorArgs.message}`);
      reply.conversation = answerGenerator.addInMemory(req.body.conversation, "agent_available", 0);
      res.status(500).send(reply);
    });
});

app.post("/errorMessage", (req, res) => {
  res.send("error message received from cisco ece");
});

app.get("/", (req, res) => {
  res.send("Fujitsu Routing Logic");
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

module.exports = app;
