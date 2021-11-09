const crypto = require('crypto');
const { mail } = require('../helpers/mailer');
const mysql = require('../library/mysql');
const functions = require('../helpers/functions');
const Configuration = require('../library/Configs');
const { getCountry } = require('../library/CountryCode');
const conf = Configuration.getConfig();
const { Paystack } = require('../library/Paystack');
const { result } = require('underscore');

//database tables
const wallet_table = "wallet";
const table_fields = "id wallet_id, user_id,account_name,account_number,account_type,country,institute,bank_code,type,created";


module.exports = {
    async cinq(request, response) {
        const params = request.body;

        const user_id = (params.user_id) ? params.user_id : null;
        const from_account = (params.from_account) ? params.from_account : null;
        const to_account = (params.to_account) ? params.to_account : null;
        const amount = (params.amount) ? params.amount : null;

        if (!user_id) {
            response.status(403).json({
                message: 'Please provide user_id',
                success: false
            });
            return;
        }
        if (!from_account) {
            response.status(403).json({
                message: 'Please provide from_account',
                success: false
            });
            return;
        }
        if (!to_account) {
            response.status(403).json({
                message: 'Please provide to_account',
                success: false
            });
            return;
        }
        if (!amount) {
            response.status(403).json({
                message: 'Please provide amount',
                success: false
            });
            return;
        }

        const db = new mysql(conf.db_config);


        //get the account details of the sender
        await db.query(`SELECT ${table_fields} FROM ${wallet_table} WHERE id=${from_account} AND user_id=${user_id} AND deleted=0`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() <= 0) {
            response.status(404).json({ success: false, message: 'transfer account not found' });
            return
        }
        const accountFrom = db.first();


        // Get the account details of the recipient and the infomation of the sender
        await db.query(`SELECT w.*, u.email FROM ${wallet_table} w LEFT JOIN users u ON u.id=w.user_id WHERE w.id=${to_account} AND w.user_id=${user_id} AND w.deleted=0`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() <= 0) {
            response.status(404).json({ success: false, message: 'recipient account not found' });
            return
        }
        const accountTo = db.first();
        const key = functions.getAccessKey(accountFrom.country)

        // Get the currency of the sending account
        const countryData = getCountry(accountFrom.country);
        if (accountFrom.account_type === "bank") {
            response.status(501).json({ success: false, message: "Transaction Not Implement" })
        } else if (accountFrom.account_type === "mobile money") {
            const payload = {
                amount,
                email: accountTo.email, // sender email
                currency: countryData.currency,
                mobile_money: {
                    phone: accountFrom.account_number,
                    provider: accountFrom.bank_code
                }
            };

            const paystack = new Paystack()
            const result = await paystack
                .setAuthorization(key)
                .setPayload(payload)
                .momoPay()
            return response.status(200).json(result)
        }
        response.status(422).json({ success: false, message: "unable to proccess payment" })
    },
};