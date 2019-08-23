import express from 'express';
import { defaults, post } from 'axios';
import { json, urlencoded } from 'body-parser';
import logger from './logger';
import { createClient } from 'redis';
import config from '../config';
import { readFileSync } from 'fs';
import { createServer } from 'https';
import * as tunnel from 'tunnel';
import HttpsProxyAgent from 'https-proxy-agent';

const {
    https_proxy,
} = process.env;

var app = express();

defaults.headers.common["Content-Type"] = "application/json";

app.use(json());
app.use(urlencoded({
    extended: true
}));

app.post('/switchBot', (req,res) => {
    
    
    var client = createClient(config.redisURL); 
    var params = req.body;
    var language = "fr";

    console.log('Switching ' + JSON.stringify( params));

    if(config.logMessage) {
        config.info(JSON.stringify(req.body, null, 2));
    }

    if (params.conversation_id == undefined || params.targetBot == undefined) {
        res.send("no valid parameters, no switching done.");
        return;
    }

    if(params.targetBot=="livechat" && params.language!=undefined){
        language=params.language;
    }
    
    // from livechat we send an empty string. if so, delete this conv so we are routed back to default bot
    if(params.targetBot == "") {
        client.del(params.conversation_id );
    }
    else {
        client.set(params.conversation_id, params.targetBot);
    }
    res.send("Switchbot completed succesfully, conversationId " + params.conversation_id + " switched to " + params.targetBot);

    // we're entering livechat. kickstart the convo there by sending notification and starting
    // message exchange with livechat, so that status messages from the livechat are sent to the channel
    if (params.targetBot == 'livechat') {
        var msg = {
            "conversation_id": params.conversation_id,
            "message": {
                "type": "text",
                "content": "Switched from chatbot"
            },
            "language": language
        };
        PostToLivechat("", msg, "livechat", res);
    }
});

app.post('/routeMessage', (req, res) => {
    var client = createClient(config.redisURL);

    var message = req.body;

    if(config.logMessage) {
        logger.info(JSON.stringify(message, null, 2));
    }

    var url = config.botAPIEndPoint; // URI for conversation endpoint
    var convo = message.message.conversation; // retrieve conversation ID
    client.get(convo, function (err, value) {
        var messagea = message.message.attachment;
        var req2 = {
            conversation_id: convo,
            message: messagea
        };
        var token;
        if (value == null) {
            // forward to default bot token
            token = "Token " + config.defaultBotToken;
            PostToSAP(url, req2, token, res);
        } else {
            if (value == 'livechat') {
                // post message to livechat logic
                token = 'livechat';
                PostToLivechat(url, req, token, res);
            } else {
                // forward message to bot specified in redis
                client.get(value, function (err, value) {
                    token = "Token " + value;
                    PostToSAP(url, req, token, res);
                });
            }
        }
    });
});

app.post('/conversationTarget', (req, res) => {
    var convId = req.body.conversation_id;
    var client = createClient();

    client.get(convId, function (err, value) {
        res.send('conversation ' + convId + ' is sent to ' + value);
    });
});

app.post('/agentMessage', (req, res) => {
    if(config.logMessage) {
        config.info(JSON.stringify(req.body, null, 2));
    }
     
    var message = req.body.message;
    var convId = req.body.conversation_id; //'e7693317-3fad-4974-8fd3-3e7b97f60b9f'
    var bcUrl = config.botConnector + '/connectors' + config.connectorId + '/conversations/' + convId + '/messages';

    var response = {
        "messages": [{
            "type": "text",
            "content": message
        }]
    };
-
    post(bcUrl, response, {});

    res.send('agentmessage posted to ' + bcUrl);
});

app.post('/errorMessage', (req, res) => {
    if(config.logMessage) {
        info(JSON.stringify(req.body, null, 2));
 
    }
    res.send('error message received from cisco ece');
});

app.get('/', (req, res) => {
	res.send('hi');
});

function PostToSAP(url, req, token, res) {
    logger.info('Posting to SAP CAI ' + token);

    const agent = new HttpsProxyAgent(https_proxy);
    
    post(url, req, {
            headers: {
                Authorization: token // this token will determine what bot will handle the input
            } ,
            httpsAgent: agent
        })
        .then(function (response) {
            if(config.logMessage) {
                logger.info('SAP CAI response: ' + JSON.stringify(response.data, null, 2));
            }
            res.send(response.data);
        })
        .catch(function (error) {
            logger.error(error);

            var errorMessage = {
                "results": {
                  "nlp": {},
                  "qna": {},
                  "messages": [
                    {
                      "type": "text",
                      "content": "We're sorry, but there is an error establishing the link.",
                      "markdown": null,
                      "delay": 3,
                      "value": "We're sorry, but there is an error establishing the link."
                    }
                  ],
                  "conversation": {
                    "id": params.conversation_id,
                    "language": "fr",
                    "memory": {},
                    "skill": "small-talks",
                    "skill_occurences": 6
                  }
                },
                "message": "Dialog rendered with success"
              };
                
            res.send(errorMessage);
        });
}

function PostToLivechat(url, req, token, res) {
    logger.info('posting to livechat');
    var lUrl = config.livechatConnector;

    req.timeout = "2000";

    post(lUrl, req)
    .then(function (response) {
        if(config.logMessage) {
            config.info('response: ' + JSON.stringify(response.data, null, 2)); }
        res.send(response.data);
    })
    .catch(function(error) {
        config.info(JSON.stringify(error, null, 2));
        
        var errorMessage = {
            "results": {
              "nlp": {},
              "qna": {},
              "messages": [
                {
                  "type": "text",
                  "content": "We're sorry, but there is an error establishing the link.",
                  "markdown": null,
                  "delay": 3,
                  "value": "We're sorry, but there is an error establishing the link."
                }
              ],
              "conversation": {
                "id": params.conversation_id,
                "language": "fr",
                "memory": {},
                "skill": "small-talks",
                "skill_occurences": 6
              }
            },
            "message": "Dialog rendered with success"
          };
            
        res.send(errorMessage);
        }
    );
    return;
}

if(config.https) {
    // open routing logic in https
    createServer({
        key: readFileSync(config.keyfile),
        cert: readFileSync(config.certfile),
        timeout: 3000
    }, app)
    .listen(config.port, function () {
        console.log('Routing logic listening on https ' + config.port);
    });
}
else {
    // open routing logic on http
    app.listen(config.port, function () {
        console.log('Routing logic listening on http ' + config.port); });
}

  
