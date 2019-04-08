var express=require('express')
var app = express()
var axios=require('axios')
var bodyParser=require('body-parser')
var  logger=require('./logger')
var redis=require('redis')


const port = 5005
const redisURL = "redis://:GlobalSTORE1@redis-11736.c8.us-east-1-3.ec2.cloud.redislabs.com:11736"

axios.defaults.headers.common["Content-Type"] = "application/json";

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

app.post('/switchBot',  (req, res) => {
    var client = redis.createClient(redisURL) ;
    
    var params = req.body;
    
    client.set(params.conversation_id, params.targetBot)

    logger.info("switcbot: convid = " + params.conversation_id)
    res.send("Switchbot completed succesfully, conversationId")
})

app.post('/routeMessage', (req, res) => {
    logger.info(req.body);

    var client = redis.createClient(redisURL) 

    var message = req.body;
    
    var url = "https://api.cai.tools.sap/build/v1/dialog";
    var convo = message.message.conversation
    client.get(convo, function(err, value) {
        var messagea = message.message.attachment
        var req = { 
            conversation_id : convo,
            message : messagea
        }
        var token;
        if(value == null) {
            token = "Token 5f495d931aaaff155657eea874ff5cd7"  
            PostToSAP(url, req, token, res)
        }
        else 
            { 
                client.get(value, function (err, value) {
                    token = "Token " + value
                    PostToSAP(url, req, token, res)
                    })
             }
        }) 
    })

function PostToSAP(url, req, token, res) {
    axios.post(url, req, {
        headers: {
            Authorization: token
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('RoutingLogic listening on port ' + port))