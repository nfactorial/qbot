var token = process.env.SLACK_API_TOKEN || require('./slack_token.json').token;

var qbot = require('./lib/qbot/client');

var client = new qbot(token);

client.start();
