// Dialogflow CX integration setup
// Fill in your Dialogflow CX credentials and logic here

const {SessionsClient} = require('@google-cloud/dialogflow-cx');
const projectId = process.env.DIALOGFLOW_CX_PROJECT_ID;
const location = process.env.DIALOGFLOW_CX_LOCATION;
const agentId = process.env.DIALOGFLOW_CX_AGENT_ID;
const languageCode = 'en';

const client = new SessionsClient();

async function detectIntent(text, sessionId) {
    const sessionPath = client.projectLocationAgentSessionPath(
        projectId, location, agentId, sessionId
    );
    const request = {
        session: sessionPath,
        queryInput: {
            text: { text },
            languageCode,
        },
    };
    const [response] = await client.detectIntent(request);
    return response;
}

module.exports = { detectIntent };