import express from 'express'
var app = express()
import axios from 'axios'
import bodyParser from 'body-parser'
import logger from './logger'
import redis from 'redis'


const port = 5005
const redisURL = "redis://GlobalSTORE1@redis-11736.c8.us-east-1-3.ec2.cloud.redislabs.com:11736"

// 27.0.0.1:6379"

axios.defaults.headers.common["Content-Type"] = "application/json";

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

app.post('/switchBot',  (req, res) => {
    var client = redis.createClient(redisURL) ;
    var params = req.body;
    
    client.set(params.conversation_id, params.targetBot)
    res.send("Switchbot completed succesfully, conversationId " +  params.conversation_id + " switched to " + params.targetBot )
})

app.post('/routeMessage', (req, res) => {
    var client = redis.createClient(redisURL) 

    var message = req.body;
    
    var url = "https://api.cai.tools.sap/build/v1/dialog"; // URI for conversation endpoint
    var convo = message.message.conversation // retrieve conversation ID
    client.get(convo, function(err, value) {
        var messagea = message.message.attachment
        var req = { 
            conversation_id : convo,
            message : messagea
        }
        var token;
        if(value == null) {
            // forward to default bot token
            token = "Token 5f495d931aaaff155657eea874ff5cd7"  
            PostToLivechat(url, req, token, res)
        }
        else 
            { 
                if(value=='livechat') 
                {
                    // post message to livechat logic
                    token = 'livechat'
                    PostToLivechat(url, req, token, res)
                }
                else
                {
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

    client.get(convId, function(err, value) {
        res.send('conversation ' + convId + ' is sent to ' + value);
    }
    )
})

app.post('/agentMessage', (req, res) => {
    logger.info(req.body);
    res.send("agent message received");
    var message = req.body.message;
    var convId = req.body.conversation_id //'e7693317-3fad-4974-8fd3-3e7b97f60b9f'
    var bcUrl = 'http://localhost:8082/v1/connectors/d58394c2-9784-40d9-8158-9a46817ebe43/conversations/' + convId + '/messages';
    
    var response = { "messages" : [{ "type":"text", "content":message} ]}
    
    axios.post(bcUrl, response, { } );

    res.send('success')
})
    
app.post('/errorMessage', (req, res) => {
    logger.info(req.body);
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

function PostToLivechat(url ,req, token, res) {
    logger.info('posting to livechat')
    var lUrl = 'http://192.168.88.174:5000/livechatMessage'

    axios.post(lUrl, req).then(function (response) {
        logger.info(response)
        res.send(response.data)
    })
    return;
}


app.listen(port, () => console.log('RoutingLogic listening on port ' + port))