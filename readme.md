<p align="center">
  <a href="" rel="noopener">
 </p>

<h3 align="center">Groupe Mutuel - Routing Logic</h3>

---

<p align="center"> The routing logic will pass messages on to either an SAP CAI chatbot in the SAP cloud, or to the livechat connector for transmission to a chat session in Cisco UCCE 11.6 .
</p>

## 📝 Table of Contents
- [About](#about)
- [Prerequisites](#Prerequisites)
- [Installing](#Installing)
- [Usage](#usage)
- [Built Using](#built_using)
- [Authors](#authors)

## 🧐 About <a name = "about"></a>
The GM routing logic component routs messages ot SAP CAI chatbots or to livechat connector for transmission to Cisco UCCE 11.6 agents. 

This project contains the routing logic component, created by Fujitsu. Major changes:

- require HTTPS certificate
- routing either to SAP dialog endpoint or ECE endpoint 

### Prerequisites
- Node.JS. We recommend the LTS version from [https://nodejs.org/en/](https://nodejs.org/en/)
- Access to Redis server. you can install a local Redis server if needed
- To download and install the bot connector, we recommend using git

### Installing
A step by step series of examples that tell you how to get a development env running.

Download the routing logic code from gitlab or github. 

```
git clone <<repository address>>
```

once it has been downloaded, install the necessary node modules

```
npm install
```
After the installation, please update the configuration file in config\dev.js to use the correct settings. The delivery is done with routing logic running on HTTPS port 8083, but that can be changed by changing the port number in the configuration file. 

See below for a config file with: 
- localredis server, 
- livechat component running on local server port 8084, 
- bot connector connector id = 60c079e0-8d7f-45cf-8c7a-66dec0d906bc
- bot token for default chat bot = 8910250d582866777b70e9a8bbf342db
- routing logic endpoint running on 8083
- use https for communication
- use keyfile and certfile specified for https encryption
- use logfile routinglogic.log for log info
- use username:password for proxy connection to SAP CAI. leave as empty string if no proxy is required
- proxyserver name, port and authentication information

For actual values for your system, please refer to the notes taken during bot connector installation, and the bot token as available in SAP CAI in your chat bot
```
module.exports = {
        "redisURL" : "redis://127.0.0.1:6379",
        "botAPIEndPoint" : "https://api.cai.tools.sap/build/v1/dialog",
        "botConnector" : "https://localhost:8082/v1/",
        "livechatConnector": "https://localhost:8084/",
        "connectorId": "60c079e0-8d7f-45cf-8c7a-66dec0d906bc",
        "defaultBotToken" : "8910250d582866777b70e9a8bbf342db",
        "port" : "8083",
        "logMessage" : true,
        "https": true,
        "keyfile": "gmclouddemo.westeurope.cloudapp.azure.com-key.pem",
        "certfile": "gmclouddemo.westeurope.cloudapp.azure.com-chain.pem",
        logfileLocation: "routinglogic.log",
        proxyname: "G02NLPXMRSH000.g02.fujitsu.local",
        proxyport: 82,
        proxyauth: "username:password"

}
```
To start the system, use the following command:

```
npm run startDev
```
Eventually, if no errors occur, you will see the following output:
```
2019-06-27T09:13:46.583Z - info: Routing logic is running and listening to port 8083
```
## 🎈 Usage <a name="usage"></a>
To verify if bot works correctly, open the webchat connected to your on-premise bot connector, and type a simple message ("Bonjour"). This should route the message through bot connector to routing logic to chatbot and back. 

you can also post the following JSON structure to https://localhost:8083/conversationTarget in Postman:
```
{
    "conversation_id": "12345" 
}
```
This should result in a message like the following:
```
conversation 12345 is sent to undefined
```
## 🚀 Deployment <a name = "deployment"></a>


## ⛏️ Built Using <a name = "built_using"></a>
- [Express](https://expressjs.com/) - Server Framework
- [NodeJs](https://nodejs.org/en/) - Server Environment




