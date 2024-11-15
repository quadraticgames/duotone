const axios = require('axios');

exports.handler = async function(event, context) {
    const { query } = event.queryStringParameters;
    const apiKey = process.env.UNSPLASH_API_KEY;

    try {
        const response = await axios.get(`https://api.unsplash.com/photos/random`, {
            params: { query },
            headers: { Authorization: `Client-ID ${apiKey}` }
        });
        return {
            statusCode: 200,
            body: JSON.stringify(response.data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch from Unsplash' }),
        };
    }
};
