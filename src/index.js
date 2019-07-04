import express from 'express';
import { defaults, post } from 'axios';
import { json, urlencoded } from 'body-parser';
import logger from './logger';
import { createClient } from 'redis';
import { redisURL, logMessage, botAPIEndPoint, defaultBotToken, botConnector, connectorId, livechatConnector, port } from '../config';
import { readFileSync } from 'fs';
import { createServer } from 'https';

var app = express();

defaults.headers.common["Content-Type"] = "application/json";

app.use(json());
app.use(urlencoded({
    extended: true
}));

app.post('/switchBot', (req,res) => {
    
    
    var client = createClient(redisURL);
    var params = req.body;

    console.log('Switching ' + JSON.stringify( params));

    if(logMessage) {
        info(JSON.stringify(req.body));
    }

    if (params.conversation_id == undefined || params.targetBot == undefined) {
        res.send("no valid parameters, no switching done.");
        return;
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
            }
        };
        PostToLivechat("", msg, "livechat", res);
    }
});

app.post('/routeMessage', (req, res) => {
    var client = createClient(redisURL);

    var message = req.body;

    if(logMessage) {
        logger.info(JSON.stringify(message));
    }

    var url = botAPIEndPoint; // URI for conversation endpoint
    var convo = message.message.conversation; // retrieve conversation ID
    client.get(convo, function (err, value) {
        var messagea = message.message.attachment;
        var req = {
            conversation_id: convo,
            message: messagea
        };
        var token;
        if (value == null) {
            // forward to default bot token
            token = "Token " + defaultBotToken;
            PostToSAP(url, req, token, res);
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
    if(logMessage) {
        info(JSON.stringify(req.body));
    }
     
    var message = req.body.message;
    var convId = req.body.conversation_id; //'e7693317-3fad-4974-8fd3-3e7b97f60b9f'
    var bcUrl = botConnector + '/connectors' + connectorId + '/conversations/' + convId + '/messages';

    var response = {
        "messages": [{
            "type": "text",
            "content": message
        }]
    };

    post(bcUrl, response, {});

    res.send('agentmessage posted to ' + bcUrl);
});

app.post('/errorMessage', (req, res) => {
    if(logMessage) {
        info(JSON.stringify(req.body, null, 2));
 
    }
    res.send('error message received from cisco ece');
});

app.get('/', (req, res) => {
	res.send('hi');
});

function PostToSAP(url, req, token, res) {
    logger.info('Posting to SAP CAI ' + token);
    post(url, req, {
            headers: {
                Authorization: token // this token will determine what bot will handle the input
            }
        })
        .then(function (response) {
            if(logMessage) {
                logger.info('SAP CAI response: ' + JSON.stringify(response.data, null, 2));
            }
            res.send(response.data);
        })
        .catch(function (error) {
            logger.error(error);
        });
}

function PostToLivechat(url, req, token, res) {
    logger.info('posting to livechat');
    var lUrl = livechatConnector;

    req.timeout = "2000";

    post(lUrl, req)
    .then(function (response) {
        info('response: ' + JSON.stringify(response.data));
        res.send(response.data);
    })
    .catch(function(error) {
        info(JSON.stringify(error));
        
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

app.listen(port, function () {
    console.log('Routing logic listening on ' + port); });

// createServer({
//     key: readFileSync('gmclouddemo.westeurope.cloudapp.azure.com-key.pem'),
//     cert: readFileSync('gmclouddemo.westeurope.cloudapp.azure.com-chain.pem'),
//     timeout: 3000
//   }, app)
//   .listen(port, function () {
//     console.log('Routing logic listening on ' + port);
//   });
  
