const crypto = require('crypto');
const { mail } = require('../helpers/mailer');
const mysql = require('../library/mysql');
const functions = require('../helpers/functions');
const Configuration = require('../library/Configs');
const conf = Configuration.getConfig();

//database tables
const users_table = "users";
const verification_table = "users_table_verification";

module.exports = {
    async webhookNG(request, response) {
        const params = request.body
        const hash = crypto.createHmac('sha512', conf.paymentKeyNG).update(JSON.stringify(params)).digest('hex');
        if (hash == request.headers['x-paystack-signature']) {
            // Retrieve the request's body
            const event = params;

            // Do something with event  
        }
        response.send(200);
    },
    async webhookGH(request, response) {
        const params = request.body
        const hash = crypto.createHmac('sha512', conf.paymentKeyGH).update(JSON.stringify(params)).digest('hex');
        if (hash == request.headers['x-paystack-signature']) {
            // Retrieve the request's body
            const event = params;

            // Do something with event  
        }
        response.send(200);
    }
};