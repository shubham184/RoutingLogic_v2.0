<p align="center">
  <a href="" rel="noopener">
 </p>

<h3 align="center">Groupe Mutuel - Bot Routing Logic</h3>

<div align="center">
 
</div>
---
<p align="center"> The routing logic recveives messages from the bot connector, and routes them to the correct bot or to the livechat connector. 
    <br> 
</p>

## 📝 Table of Contents
- [About](#about)
- [Prerequisites](#Prerequisites)
- [Installing](#Installing)
- [Usage](#usage)
- [Built Using](#built_using)
- [Authors](#authors)

## 🧐 About <a name = "about"></a>
THe routing logic contains the logic required to route messages to the correct recipient. 

This project contains the routing logic application, created by Fujitsu

- require HTTPS certificate

### Prerequisites
- Node.JS. We recommend the LTS version from [https://nodejs.org/en/](https://nodejs.org/en/)
- Access to Redis server. you can install a local Redis server if needed
- To download and install the routing logic, we recommend using git

### Installing
A step by step series of examples that tell you how to get a development env running.

Download the bot connector code from gitlab or github. 

```
git clone <<repository address>>
```

once it has been downloaded, install the necessary node modules

```
npm install
```
After the installation, please update the configuration file in config\dev.js to use the correct settings. The delivery is done with the routing logic running on port 8083, but that can be changed by changing the port number in the configuration file. 

See below for a config file with local redis server, running on port 8083
```
module.exports = {
        "redisURL" : "redis://127.0.0.1:6379",
        "botAPIEndPoint" : "https://api.cai.tools.sap/build/v1/dialog",
        "botConnector" : "http://localhost:8082/v1/",
        "livechatConnector": "http://gmclouddemo.westeurope.cloudapp.azure.com:8084/",
        "connectorId": "60c079e0-8d7f-45cf-8c7a-66dec0d906bc",
        "defaultBotToken" : "8910250d582866777b70e9a8bbf342db",
        "port" : "8083",
        "logMessage" : true
}
```
To start the system, use the following command:

```
npm run startDev
```
Eventually, if no errors occur, you will see the following output:
```
2019-06-27T09:13:46.583Z - info: Routing logic listening to port 8083
```

## 🎈 Usage <a name="usage"></a>

To use the routing logic, the bot connector must point to this routing logic endpoint in the connector configuration. Then conversations will be routed by defualt to the bot defined in the code.

When the bot needs to switch to livechat, a webhook can be called. Default endpoint for the webhook is http://localhost:8083/switchBot. A JSON structure needs to be passed, containing the conversation ID and with the target set to livechat

```
{
    "conversation_id": "",
    "target":"livechat"
}
```

## 🚀 Deployment <a name = "deployment"></a>


## ⛏️ Built Using <a name = "built_using"></a>
- [Express](https://expressjs.com/) - Server Framework
- [NodeJs](https://nodejs.org/en/) - Server Environment

