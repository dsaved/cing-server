const encryption = require('../library/encryption');
const mysql = require('../library/mysql');
const Configuration = require('../library/Configs');
const fs = require('fs');
const path = require('path');

const encrypt = new encryption();
const conf = Configuration.getConfig()
const axios = require('axios')

//database tables
const users_table = "users";
const license_table = "license";
const vendor_license_table = "vendor_license";

module.exports = {
    getAuthorization: async function(id) {
        let aes256Key = await encrypt.salt(12);
        const db = new mysql(conf.db_config);

        await db.query(`SELECT * FROM authentication WHERE user_id = ${id} LIMIT 1`);
        const authData = {
            "user_id": id,
            "auth": aes256Key
        }
        if (db.count() > 0) {
            db.update("authentication", 'user_id', id, authData);
        } else {
            db.insert("authentication", authData);
        }
        return Buffer.from(`${id}:${aes256Key}`).toString('base64');
    },
    getUniqueNumber: async function(table, column, len, hex) {
        //Usage: await functions.getUniqueNumber('sales', 'sales_number', 10, false)
        const db = new mysql(conf.db_config);
        let shouldContinue = false;
        let return_str = '';

        while (shouldContinue == false) {
            const length = 2000;
            let characters = '';

            if (hex) {
                characters = "0123456789OPQdejklmnEFGHIopqrABCDstyWXYZzJKLMNabcRSfghiTUuvwxV";
            } else {
                characters = "0123456789";
            }

            let string = Date.now();
            let string2 = "";

            for (var p = 0; p < length; p++) {
                var min = 0;
                var max = characters.length - 1;
                string += characters[Math.floor(Math.random() * (max - min + 1)) + min];
            }

            for (var p = 0; p < length; p++) {
                var min = 0;
                var max = characters.length - 1;
                string2 += characters[Math.floor(Math.random() * (max - min + 1)) + min];
            }

            string = `${string2}${string}`;
            string = string.split('.').join('');
            const checkLent = `${string}`.length;
            return_str = (checkLent > len) ? `${string}`.substring(0, len) : string;

            await db.query(`SELECT ${column} FROM ${table} WHERE ${column} = '${return_str}' LIMIT 1`);
            if (db.count() > 0) {
                shouldContinue = false
            } else {
                shouldContinue = true
            }
        }
        return return_str;
    },
    encode: function(data) {
        return Buffer.from(data).toString('base64');
    },
    decode: function(base64String) {
        return Buffer.from(base64String, 'base64').toString('ascii');
    },
    numberCode: function(count) {
        var chars = '0123456789'.split('');
        var result = '';
        for (var i = 0; i < count; i++) {
            var x = Math.floor(Math.random() * chars.length);
            result += chars[x];
        }
        return result;
    },
    hexCode: function(count) {
        var chars = 'acdefhiklmnoqrstuvwxyz0123456789'.split('');
        var result = '';
        for (var i = 0; i < count; i++) {
            var x = Math.floor(Math.random() * chars.length);
            result += chars[x];
        }
        return result;
    },
    getDateDiff: function(d1, d2) {
        var t2 = d2.getTime();
        var t1 = d1.getTime();
        return parseInt((t2 - t1) / (24 * 3600 * 1000));
    },
    sendSMS: function(phone, message) {
        const smsKeys = {
            "1000": "All Messages sent successfully",
            "1001": "Not All Messages were sent successfully due to insufficient balance",
            "1002": "Missing API Parameters",
            "1003": "Insufficient balance",
            "1004": "Mismatched API key",
            "1005": "Invalid Phone Number",
            "1006": "invalid Sender ID. Sender ID must not be more than 11 Characters. Characters include white space.",
            "1007": "Message scheduled for later delivery",
            "1008": "Empty Message",
            "1009": "SMS sending failed",
            "1010": "No mesages has been sent on the specified dates using the specified api key"
        };
        return new Promise(async(resolve, reject) => {
            const PRIVATE_KEY = conf.sms_msmpusher.privatekey;
            const PUBLIC_KEY = conf.sms_msmpusher.publickey;
            const FROM = conf.sms_msmpusher.sender;
            const LINK = conf.sms_msmpusher.host;

            await axios.post(LINK, {
                    privatekey: PRIVATE_KEY,
                    publickey: PUBLIC_KEY,
                    sender: FROM,
                    numbers: phone,
                    message: message
                })
                .then(function(res) {
                    const response = res.data
                    let result = {
                        success: false,
                        message: smsKeys[response.status]
                    }
                    if (response.status == '1000' || response.status == '1007') {
                        result.success = true;
                    }
                    resolve(result);
                })
                .catch(function(error) {
                    console.log(error);
                    reject(error);
                });
        });
    },
    formatMoney(money, currency) {
        var formater = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        })
        return formater.format(money)
    },
    getDateTime({ dateTime = false }) {
        function pad(s) { return (s < 10) ? '0' + s : s; }
        var today = new Date();
        if (dateTime) {
            var time = [pad(today.getFullYear()), pad(today.getMonth() + 1), today.getDate()].join('-') + " " + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            return time;
        }
        var time = pad(today.getHours()) + ":" + pad(today.getMinutes()) + ":" + pad(today.getSeconds());
        return time;
    },
}