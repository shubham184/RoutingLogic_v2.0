import express from 'express'
var app = express()
import axios from 'axios'
import bodyParser from 'body-parser'
import logger from './logger'
import redis from 'redis'


const port = 5005
const url = "";


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
    var value

    client.get(message.message.conversation, function(err, value) {
        if(value == null) {
            // not found use default bot token
            var token = "Token 45040b7e31a74878e785ea233bb87430"
            var convo = message.message.conversation
            var messagea = message.message.attachment
            var req = { 
                conversation_id : convo,
                message : messagea
            }

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
        else {
            // get bot token for his conversation and continue

            client.get(value, 
                function(err,value) 
                { 
                    var token = "Token " + value
                    var convo = message.message.conversation
                    var messagea = message.message.attachment
                    var req = { 
                        conversation_id : convo,
                        message : messagea
                    }

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
             ) }
    
}) })


app.listen(port, () => console.log('RoutingLogic listening on port ' + port))