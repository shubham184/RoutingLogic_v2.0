module.exports ={
    results: {
        nlp: {
            uuid:'0aaa624b-a84f-4095-9f18-9ca0b8368c10',
            intents: [
                {
                    slug:'greetings',
                    confidence:'0.99',
                    description:'Says hello'
                }
            ],
            entities:{},
            language:'en',
            processing_language:'en',
            version:'1903.6.2',
            timestamp:'2019-05-09T08:28:07.352883+00:00',
            status: 200,
            source:'Hi',
            act:'assert',
            type:'desc:reason',
            sentiment: 'vpositive'
        },
        qna: {},
        messages: [
            {
                type:'text',
                content:'Hi, nice to meet you :)'
            }
        ],
        conversation: {
            id:'6426566d-d4e2-43cd-852f-c90940e5b333',
            language:'en',
            memory: {},
            skill:'greetings',
            skill_occurences: 9
        }
    },
    message: 'Dialog rendered with success'
}
