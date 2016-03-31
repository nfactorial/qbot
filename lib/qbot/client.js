'use strict';

var Slack = require('@slack/client');
var Ratings = require('./ratings');

var RtmClient = Slack.RtmClient;
var CLIENT_EVENTS = Slack.CLIENT_EVENTS;
var RTM_EVENTS = Slack.RTM_EVENTS;
var RTM_CLIENT_EVENTS = CLIENT_EVENTS.RTM;

var RATING_TIME = 1000 * 60 * 60; // Minimum of one hour between ratings

var STATUS_DISCONNECTED = 0;
var STATUS_CONNECTING = 1;
var STATUS_AUTHENTICATED = 2;
var STATUS_CONNECTED = 3;

var SCORE_MSG = [
    'I feel bad, but I\'m sure you\'ll do better next time! Hang in there!',
    'I know it might not sound great, but it\'s better than 1 star!',
    'Above average! Now that\'s not too bad, is it?',
    'Ooh, I like you. You\'re pretty cool you know!',
    'You... are... *AWESOME*! Sometimes I can\'t believe you even exist!'
];


function pluralString(value, message) {
    if ( value === 1 ) {
        return value + message;
    }

    return value + message + 's';
}


/**
 * Manages our connection to the Slack service.
 */
class Client {
    /**
     * Prepares the Client object for use by the node server.
     * @param token The SLACK_API_TOKEN to be used by the client.
     */
    constructor(token) {
        this.ratings = new Ratings();

        this.status = STATUS_DISCONNECTED;
        this.rtm = new RtmClient(token);

        this.rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, this.onAuthenticated.bind(this));
        this.rtm.on(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, this.onConnected.bind(this));
        this.rtm.on(CLIENT_EVENTS.DISCONNECT, this.onDisconnected.bind(this));
        this.rtm.on('message', this.onMessage.bind(this));
    }

    /**
     * Attempts to establish a connection with the Slack web service.
     */
    start() {
        if ( this.status !== STATUS_DISCONNECTED ) {
            throw "Qbot cannot start, status unexpected (" + this.status + ").";
        }

        this.rtm.start();
        this.status = STATUS_CONNECTING;
    }

    /**
     * Callback invoked by Slack once our bot has authenticated with the server.
     * @param data
     */
    onAuthenticated(data) {
        this.status = STATUS_AUTHENTICATED;
    }

    /**
     * Callback invoked by Slack when we have lost our connection.
     */
    onDisconnected() {
        this.status = STATUS_DISCONNECTED;
    }

    /**
     * Callback invoked by Slack once we have an established connection with the server.
     */
    onConnected() {
        this.status = STATUS_CONNECTED;
    }

    /**
     * Called when the RTM client receives a message from the server.
     * @param message Object containing information about the message:
     *                  type -  The type of data ('message')
     *                  channel - The identifier of the channel
     *                  user - The user who sent the message
     *                  text - The string content of the message
     *                  ts - Time stamp of the message
     *                  team - Identifier of the team
     */
    onMessage(message) {
        if ( message.user === this.rtm.activeUserId ) {
            return;
        }

        if ( -1 !== message.text.indexOf('<@' + this.rtm.activeUserId + '>') ) {
            if ( -1 !== message.text.indexOf('rate me') ) {
                this.rateUser(message.channel, message.user);
                return;
            }

            if ( -1 !== message.text.indexOf('reset')) {
                this.ratings.reset();
                this.rtm.sendMessage('I have reset all ratings.', message.channel);
                return;
            }
        }
        //this.rtm.sendMessage('Hey there!', message.channel);

        // console.log('Received message.');
        // console.log(message);
    }

    /**
     * Invoked when a user has requested qbot to provide them with a rating.
     * @param channelId The channel where the request was made.
     * @param userId Identifier of the user who has requested a rating.
     */
    rateUser(channelId, userId) {
        let rating = this.ratings.getRating(userId);
        let response = 'Hey <@' + userId + '>! ';
        let isNew = true;
        let deltaTime = 0;

        if ( rating ) {
            deltaTime = Date.now() - rating.time;
            if ( deltaTime < RATING_TIME ) {
                isNew = false;
                response += 'I have already rated you with a score of ';
            } else {
                rating = this.ratings.createRating(userId);
            }
        } else {
            rating = this.ratings.createRating(userId);
        }

        if ( isNew ) {
            response += 'I have given you a rating of ';
        }

        response += pluralString( rating.value + 1, ' star' ) + '!';

        if ( isNew ) {
            response += '\n' + SCORE_MSG[ rating.value ];
        } else {
            const pending = RATING_TIME - deltaTime;

            if ( pending < ( 1000 * 60 ) ) {
                response += '\n' + 'You can get a new rating in ' + pluralString( Math.floor( pending / 1000 ), ' second' ) + '!';
            } else {
                response += '\n' + 'You can get a new rating in ' + pluralString( Math.floor( pending / ( 1000 * 60 ) ), ' minute' ) + '!';
            }
        }

        this.rtm.sendMessage(response, channelId);
    }
}


module.exports = Client;
