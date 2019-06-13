import express from 'express'
import axios from 'axios'
import bodyParser from 'body-parser'
import logger from './logger'
import redis from 'redis'
import config from '../config'
import fs from 'fs'
import https from 'https'

var app = express()

axios.defaults.headers.common["Content-Type"] = "application/json";

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

app.post('/switchBot', (req, res) => {
    var client = redis.createClient(config.redisURL);
    var params = req.body;

    if(config.logMessage) {
        logger.info(JSON.stringify(req.body))
    }

    if (params.conversation_id == undefined || params.targetBot == undefined) {
        res.send("no valid parameters, no switching done.");
        return;
    }

    client.set(params.conversation_id, params.targetBot)
    res.send("Switchbot completed succesfully, conversationId " + params.conversation_id + " switched to " + params.targetBot)

    // {
    //     "conversation_id" :"6426566d-d4e2-43cd-852f-c90940e5b333",
    //     "message" : { "type" : "text", "content": "Hi" }
    // }
    // we're entering livechat. kickstart the convo there by sending notification and starting
    // message exchange with livechat, so that status messages from the livechat are sent to the channel
    if (params.targetBot == 'livechat') {
        var msg = {
            "conversation_id": params.conversation_id,
            "message": {
                "type": "text",
                "content": "Switched from chatbot"
            }
        }
        PostToLivechat("", msg, "livechat", res)
    }
})

app.post('/routeMessage', (req, res) => {
    var client = redis.createClient(config.redisURL)

    var message = req.body;

    if(config.logMessage) {
        logger.info(JSON.stringify(message));
    }

    var url = config.botAPIEndPoint; // URI for conversation endpoint
    var convo = message.message.conversation // retrieve conversation ID
    client.get(convo, function (err, value) {
        var messagea = message.message.attachment
        var req = {
            conversation_id: convo,
            message: messagea
        }
        var token;
        if (value == null) {
            // forward to default bot token
            token = "Token " + config.defaultBotToken
            PostToSAP(url, req, token, res)
        } else {
            if (value == 'livechat') {
                // post message to livechat logic
                token = 'livechat'
                PostToLivechat(url, req, token, res)
            } else {
                // forward message to bot specified in redis
                client.get(value, function (err, value) {
                    token = "Token " + value
                    PostToSAP(url, req, token, res)
                })
            }
        }
    })
})

app.post('/conversationTarget', (req, res) => {
    var convId = req.body.conversation_id;
    var client = redis.createClient();

    client.get(convId, function (err, value) {
        res.send('conversation ' + convId + ' is sent to ' + value);
    })
})

app.post('/agentMessage', (req, res) => {
    if(config.logMessage) {
        logger.info(JSON.stringify(req.body))
    }
     
    var message = req.body.message;
    var convId = req.body.conversation_id //'e7693317-3fad-4974-8fd3-3e7b97f60b9f'
    var bcUrl = config.botConnector + '/connectors' + config.connectorId + '/conversations/' + convId + '/messages'

    var response = {
        "messages": [{
            "type": "text",
            "content": message
        }]
    }

    axios.post(bcUrl, response, {});

    res.send('agentmessage posted to ' + bcUrl)
})

app.post('/errorMessage', (req, res) => {
    if(config.logMessage) {
        logger.info(JSON.stringify(req.body))
 
    }
    res.send('error message received from cisco ece')
})

function PostToSAP(url, req, token, res) {
    axios.post(url, req, {
            headers: {
                Authorization: token // this token will determine what bot will handle the input
            }
        })
        .then(function (response) {
            logger.info(response)
            res.send(response.data)
        })
        .catch(function (error) {
            logger.error(error)
        })
}

function PostToLivechat(url, req, token, res) {
    logger.info('posting to livechat')
    var lUrl = 'http://192.168.88.178:5000/livechatMessage'

    axios.post(lUrl, req).then(function (response) {
        logger.info(JSON.stringify(response.data))
        res.send(response.data)
    })
    return;
}

https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  }, app)
  .listen(config.port, function () {
    console.log('Routing logic listening on ' + config.port)
  })

