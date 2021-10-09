const mysql = require('../library/mysql');
const Pagination = require('../library/MYSqlPagination');
const { mail } = require('../helpers/mailer');
const functions = require('../helpers/functions');
const Configuration = require('../library/Configs');
const conf = Configuration.getConfig();
const encryption = require('../library/encryption');
const encrypt = new encryption();
// const { Flutterwave } = require('../library/Flutterwave');
const { Paystack } = require('../library/Paystack');
const { getCountry } = require('../library/CountryCode');

const fs = require('fs')

//db tables
const newsletter_db = "newsletter";
const users_table = "users";
const transactions = "transactions";

const vendor_licenses = "vendor_licenses";
const vendor_license_table = "vendor_license";
const license_order = "license_order";

//Flutter wave secrete key
const flutterwaveKey = "FLWSECK_TEST-1ffe071b921a3cf1d0b0fbeee0b5c31c-X";

const { countryArray } = require('../library/CountryCode');
const { getExchangeRate } = require('../library/CurrencyConverter');

module.exports = {
    async countries(request, response) {
        const countries = countryArray();
        response.status(200).json(countries);
    },
    async getRate(request, response) {
        const params = request.body;
        const from = (params.from_currency) ? params.from_currency : null;
        const to = (params.to_currency) ? params.to_currency : null;
        const amount = (params.amount) ? params.amount : null;

        if (!from) {
            response.status(200).json({
                message: 'Please provide from',
                success: false
            });
            return;
        }
        if (!to) {
            response.status(200).json({
                message: 'Please provide to',
                success: false
            });
            return;
        }
        if (!amount) {
            response.status(200).json({
                message: 'Please provide amount',
                success: false
            });
            return;
        }

        getExchangeRate(from, to, amount).then((result) => {
            response.status(200).json(result);
        }).catch((error) => { response.status(500).json({ success: false, message: error }); })
    },
    async getBanks(request, response, next, type = null) {
        const params = request.params;
        const country = (params.country) ? params.country : null;
        const pay_with_bank = (type) ? "&pay_with_bank=true" : ""

        if (!country) {
            response.status(403).json({
                message: 'Please provide user country',
                success: false
            });
            return;
        }

        const _country = getCountry(country);
        const paystack = new Paystack()
        const rersult = await paystack
            .setAuthorization(conf.paymentKeyGH)
            .listBanks(_country.name.toLowerCase(), pay_with_bank)

        response.status(200).json(rersult);
    },
    async getBalance(request, response) {
        const params = request.params;
        const country = (params.country) ? params.country : null;

        if (!country) {
            response.status(403).json({
                message: 'Please provide country',
                success: false
            });
            return;
        }

        const key = functions.getAccessKey(country)

        const paystack = new Paystack()
        const rersult = await paystack
            .setAuthorization(key)
            .getBalance()

        if (rersult.success) {
            response.status(200).json(rersult);
        } else {
            response.status(500).json(rersult);
        }
    },


    async newsletter(request, response) {
        const params = request.body;
        const db = new mysql(conf.db_config);
        const email = (params.email) ? params.email : null;

        if (!email) {
            response.status(200).json({
                message: 'Please provide email',
                success: false
            });
            return;
        }

        await db.query(`select * from ${newsletter_db} where email = '${email}'`);
        if (db.count() > 0) {
            response.status(200).json({
                message: 'Email already subscribed',
                success: true
            });
            return;
        }

        const done = await db.insert(newsletter_db, { email });
        if (done) {
            response.status(200).json({
                message: 'Email has been subscribed',
                success: true
            });
        } else {
            response.status(403).json({
                message: 'Error subscribing email',
                success: false
            });
        }
    },
    async contactUs(request, response) {
        const params = request.body
        const name = (params.name) ? params.name : null;
        const email = (params.email) ? params.email : null;
        const subject = (params.subject) ? params.subject : null;
        const message = (params.message) ? params.message : null;

        if (!name) {
            response.status(200).json({
                message: 'Please provide name',
                success: false
            });
            return;
        }
        if (!email) {
            response.status(200).json({
                message: 'Please provide email',
                success: false
            });
            return;
        }
        if (!subject) {
            response.status(200).json({
                message: 'Please provide subject',
                success: false
            });
            return;
        }
        if (!message) {
            response.status(200).json({
                message: 'Please provide message',
                success: false
            });
            return;
        }

        const msg = `${message}.\n\n\n\n From ${name} <${email}>`;
        await mail({ to: 'dsaved8291@gmail.com', subject, message: msg })
            // mail('info@arkautoshop.com', subject, msg)
        response.status(200).json({
            success: true,
            message: "Message sent successfullly"
        });
    },
    async makePayment(request, response, next) {
        const params = request.body;
        const name = (params.name) ? params.name : null;
        const phone = (params.phone) ? params.phone : null;
        const license_id = (params.license_id) ? params.license_id : null;
        let redirect_link = (params.redirect_link) ? params.redirect_link : null;

        if (!name) {
            response.status(403).json({
                message: 'Please provide name',
                success: false
            });
            return;
        }
        if (!phone) {
            response.status(403).json({
                message: 'Please provide phone',
                success: false
            });
            return;
        }
        if (!license_id) {
            response.status(403).json({
                message: 'Please provide license id',
                success: false
            });
            return;
        }
        if (!redirect_link) {
            redirect_link = `${conf.site_link}/payment/`
        }

        const db = new mysql(conf.db_config);

        // use the license_id to get the price
        await db.query(`SELECT * FROM ${vendor_licenses} WHERE id=${license_id} ORDER BY id LIMIT 1`);
        if (db.count() <= 0) {
            response.status(403).json({
                success: false,
                message: 'Selected license not found',
            });
        }
        const license_data = db.first();

        function pad(s) { return (s < 10) ? '0' + s : s; }
        var d = new Date();
        const acquired = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        d.setFullYear(d.getFullYear() + 1)
        const expires = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

        // use the user phone to get user information
        await db.query(`SELECT * FROM ${users_table} WHERE phone=${phone} ORDER BY id LIMIT 1`);
        if (db.count() <= 0) {
            response.status(403).json({
                success: false,
                message: 'Account not found',
            });
            return
        }
        const user_data = db.first();

        const referenceNumber = await functions.getUniqueNumber(transactions, 'transaction_id', 12, false);
        const transactionID = `RF${referenceNumber}`;
        let flutterWave = new Flutterwave();
        flutterWave.setRedirectTo(redirect_link)
            .setAuthorization(flutterwaveKey)
            .setCurrency('GHS')
            .setPaymentOption(Flutterwave.payment_options_gh[1].key)
            .setTransactionAmount(license_data.price)
            .setRefferenceNumber(transactionID)
            .setCustomer(name, 'system@nla.com', phone)

        let result = await flutterWave.pay();
        if (result.success) {
            const transaction = {
                amount_after_charges: 0,
                transaction_id: transactionID,
                payment_type: Flutterwave.payment_options_gh[1].key,
                payment_description: 'purchase of license',
                amount: license_data.price,
                currency: 'GHS',
                transaction_charges: 0,
                paid: 'NO',
            }
            await db.insert(transactions, transaction)
            await db.insert(license_order, {
                user_id: user_data.id,
                license_type: license_data.type,
                acquired: acquired,
                expires: expires,
                status: 'Active',
                ordernumber: transactionID,
            })
        }
        response.status(200).json(result);
    },
    async verifyPayment(request, response, next) {
        const params = request.body;
        const transaction_id = (params.transaction_id) ? params.transaction_id : null;

        if (!transaction_id) {
            response.status(403).json({
                message: 'Please provide transaction id',
                success: false
            });
            return;
        }

        const db = new mysql(conf.db_config);
        await db.query(`SELECT * FROM ${transactions} WHERE external_transactionI_id = ${transaction_id} LIMIT 1`)
        if (db.count() > 0) {
            const transData = db.first();
            if (transData.paid === 'YES') {
                response.status(200).json({
                    success: true,
                    status: 'completed',
                    message: 'Transaction completed successfully'
                });
            } else if (transData.paid === 'NO') {
                response.status(200).json({
                    success: false,
                    status: 'pending',
                    message: 'Transaction completed successfully'
                });
            } else {
                response.status(200).json({
                    success: false,
                    status: 'cancelled',
                    message: 'Transaction cancelled'
                });
            }
        } else {
            let flutterWave = new Flutterwave();
            flutterWave.settransactionId(transaction_id)
                .setAuthorization(flutterwaveKey)

            let result = await flutterWave.verifyTransaction();
            if (result.success) {
                console.log(result)
                const data = result.data
                const isSuccess = data.status === 'successful';
                const transactionData = {
                    amount_after_charges: data.amount_settled,
                    external_transactionI_id: data.id,
                    transaction_charges: data.appfee,
                    paid: isSuccess ? "YES" : "CANCELLED",
                }
                await db.update(transactions, 'transaction_id', data.tx_ref, transactionData)
                if (isSuccess) {
                    //Activate user license
                    await db.query(`INSERT INTO ${vendor_license_table} (user_id, license_type, acquired, expires,status)
                    SELECT user_id, license_type, acquired, expires, status
                    FROM ${license_order} WHERE ordernumber='${data.tx_ref}' LIMIT 1;`)
                    response.status(200).json({
                        success: true,
                        status: data.status,
                        message: 'Transaction completed successfully'
                    });
                } else {
                    response.status(200).json({
                        success: false,
                        status: data.status,
                        message: `Transaction ${data.status}`
                    });
                }
            } else {
                response.status(200).json({
                    success: false,
                    status: 'unknown',
                    message: 'Transaction not completed'
                });
            }
        }
    },
    async flutterwaveCallBack(request, response, next) {
        const data = request.body;
        const db = new mysql(conf.db_config);

        const isSuccess = data.status === 'successful';
        const transactionData = {
            amount_after_charges: data.amount,
            external_transactionI_id: data.id,
            transaction_charges: data.appfee,
            paid: isSuccess ? "YES" : "CANCELLED",
        }
        await db.update(transactions, 'transaction_id', data.txRef, transactionData)

        //Activate user license
        await db.query(`INSERT INTO ${vendor_license_table} (user_id, license_type, acquired, expires,status)
        SELECT user_id, license_type, acquired, expires, status
        FROM ${license_order} WHERE ordernumber='${data.txRef}' LIMIT 1;`)
        response.status(200).json({
            success: true
        });
    }
}