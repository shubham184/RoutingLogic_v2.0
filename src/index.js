import express from 'express'
var app = express()
import axios from 'axios'
import bodyParser from 'body-parser'
import logger from './logger'
import redis from 'redis'


const port = 5005

axios.defaults.headers.common["Content-Type"] = "application/json";

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

app.post('/switchBot',  (req, res) => {
    var client = redis.createClient();
    
    var params = req.body;
    
    client.set(params.conversation_id, params.targetBot)

    res.send("Switchbot completed succesfully")
})

app.post('/routeMessage', (req, res) => {
    logger.info(req.body);

    var client = redis.createClient()

    var message = req.body;
    
    var url = "https://api.cai.tools.sap/build/v1/dialog";

    client.get(message.message.conversation, function(err, value) {
        
        var token
        if(value == null) {
            token = "Token 5f495d931aaaff155657eea874ff5cd7"  }
        else 
            { 
                client.get(value, function (err, value) {
                    token = "Token " + value
                    var convo = message.message.conversation
                    var messagea = message.message.attachment
                    var req = { 
                        conversation_id : convo,
                        message : messagea
                    }

                    PostToSAP(url, req, token, res)
                    })
                    return;
             }
            
            var convo = message.message.conversation
            var messagea = message.message.attachment
            var req = { 
                conversation_id : convo,
                message : messagea
            }

            PostToSAP(url, req, token, res)
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


app.listen(port, () => console.log('RoutingLogic listening on port ' + port))