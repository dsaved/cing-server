const mysql = require('../library/mysql');
const functions = require('../helpers/functions');
const Configuration = require('../library/Configs');
const { Paystack } = require('../library/Paystack');
const { getCountry } = require('../library/CountryCode');
const conf = Configuration.getConfig();

//database tables
const wallet_table = "wallet";
const table_fields = "id wallet_id, user_id,account_name,account_number,account_type,country,institute,bank_code,type,created";

module.exports = {
    async listWallet(request, response) {
        const params = request.body;
        const user_id = (params.user_id) ? params.user_id : null;
        const wallet_type = (params.wallet_type) ? params.wallet_type : null;

        if (!user_id) {
            response.status(403).json({
                message: 'Please provide user_id',
                success: false
            });
            return;
        }
        if (!wallet_type) {
            response.status(403).json({
                message: 'Please provide wallet_type',
                success: false
            });
            return;
        }

        const db = new mysql(conf.db_config);
        await db.query(`SELECT ${table_fields} FROM ${wallet_table} WHERE user_id=${user_id} AND (type='${wallet_type}' OR use_for_sending_reciving=1) AND deleted=0`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() > 0) {
            response.status(200).json({
                success: true,
                wallets: db.results(),
            });
        } else {
            response.status(200).json({
                success: false,
                message: 'No wallet found',
                wallets: [],
            });
        }
    },
    async walletInfo(request, response) {
        const params = request.body;
        const wallet_id = (params.wallet_id) ? params.wallet_id : null;
        const user_id = (params.user_id) ? params.user_id : null;

        if (!wallet_id) {
            response.status(403).json({
                message: 'Please provide wallet_id',
                success: false
            });
            return;
        }
        if (!user_id) {
            response.status(403).json({
                message: 'Please provide user_id',
                success: false
            });
            return;
        }

        const db = new mysql(conf.db_config);
        await db.query(`SELECT * FROM ${wallet_table} WHERE id=${wallet_id} AND user_id=${user_id} AND deleted=0`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() > 0) {
            let wallet = db.first();
            response.status(200).json({
                success: true,
                wallet,
            });
        } else {
            response.status(404).json({
                success: false,
                message: 'No wallet found',
            });
        }
    },
    async verifyAccountNumber(request, response) {
        const params = request.body;
        const account_number = (params.account_number) ? params.account_number : null;
        const bank_code = (params.bank_code) ? params.bank_code : null;
        const country = (params.country) ? params.country : null;

        if (!account_number) {
            response.status(403).json({
                message: 'Please provide user account_number',
                success: false
            });
            return;
        }
        if (!bank_code) {
            response.status(403).json({
                message: 'Please provide user bank_code',
                success: false
            });
            return;
        }
        if (!country) {
            response.status(403).json({
                message: 'Please provide country',
                success: false
            });
            return;
        }

        const key = functions.getAccessKey(country)
        const paystack = new Paystack();
        const result = await paystack.setAccountNumber(account_number)
            .setAuthorization(key)
            .setBankCode(bank_code).verifyBank().catch(error => {
                response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error
                });
                return
            })

        if (result.success) {
            response.status(200).json(result);
        } else {
            response.status(422).json(result);
        }
    },
    async createWallet(request, response) {
        const params = request.body;
        const db = new mysql(conf.db_config);

        const account_name = (params.account_name) ? params.account_name : null;
        const account_number = (params.account_number) ? params.account_number : null;
        const account_type = (params.account_type) ? params.account_type : null;
        const country = (params.country) ? params.country : null;
        const user_id = (params.user_id) ? params.user_id : null;
        const wallet_type = (params.wallet_type) ? params.wallet_type : null;
        const institute = (params.institute) ? params.institute : null;
        const bank_code = (params.bank_code) ? params.bank_code : null;
        const use_for_sending_reciving = (params.use_for_sending_reciving) ? params.use_for_sending_reciving : false;

        const required = [
            'account_name',
            'account_number',
            'account_type',
            'country',
            'user_id',
            'wallet_type',
            'institute',
            'bank_code'
        ];
        for (let index = 0; index < required.length; index++) {
            const element = required[index];
            if (!params[element]) {
                return response.status(403).json({
                    message: `Please provide ${element}`,
                    success: false
                });
            }
        }

        if (account_type !== "mobile money" && account_type !== "bank") {
            response.status(403).json({
                message: 'Account type is not recognized',
                success: false
            });
            return;
        }

        await db.query(`select id,created, deleted from ${wallet_table} where account_number = '${account_number}' and type='${wallet_type}' and user_id=${user_id}`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })

        if (db.count() > 0) {
            const wallet = db.first();
            if (Number(wallet.deleted) === 1) {
                await db.update(wallet_table, 'id', wallet.id, { deleted: 0 })
                return response.status(200).json({
                    success: true,
                    message: "Wallet created successfully",
                    data: {
                        wallet_id: wallet.id,
                        created: wallet.created
                    }
                });
            } else {
                return response.status(403).json({
                    message: 'this account already exist',
                    success: false
                });
            }
        }

        let recipient_code = null
        if (wallet_type === 'receiver' || use_for_sending_reciving === true) {
            const _country = getCountry(country);
            const key = functions.getAccessKey(_country.shortName)
            const paystack = new Paystack();
            const result = await paystack.setAccountNumber(account_number)
                .setAccountName(account_name)
                .setCurrency(_country.currency)
                .setAuthorization(key)
                .setBankCode(bank_code).createTransferRecipient().catch(error => {
                    response.status(500).json({
                        success: false,
                        message: "Internal server error",
                        error
                    });
                    return
                })
            if (result.success) {
                recipient_code = result.data.recipient_code;
            } else {
                return response.status(422).json({
                    success: false,
                    message: 'Could not create wallet'
                });
            }
        }

        let recordData = {
            account_name: account_name,
            account_number: account_number,
            account_type: account_type,
            country: country,
            institute: institute,
            bank_code: bank_code,
            type: wallet_type,
            recipient_code: recipient_code,
            user_id: user_id
        }

        if (use_for_sending_reciving === true) {
            recordData.use_for_sending_reciving = 1
        }

        const done = await db.insert(wallet_table, recordData).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (done) {
            const id = db.lastInsertID()
            response.status(200).json({
                success: true,
                message: "Wallet created successfully",
                data: {
                    wallet_id: id,
                    created: functions.getDateTime({ dateTime: true })
                }
            });
        } else {
            response.status(422).json({
                success: false,
                message: 'Could not create wallet'
            });
        }
    },
    async deleteWallet(request, response) {
        const params = request.body;
        const db = new mysql(conf.db_config);
        const wallet_id = (params.wallet_id) ? params.wallet_id : null;
        const user_id = (params.user_id) ? params.user_id : null;
        const wallet_type = (params.wallet_type) ? params.wallet_type : null;

        if (!wallet_id) {
            response.status(403).json({
                message: 'Please provide wallet_id',
                success: false
            });
            return;
        }
        if (!user_id) {
            response.status(403).json({
                message: 'Please provide user_id',
                success: false
            });
            return;
        }
        if (!wallet_type) {
            response.status(403).json({
                message: 'Please provide wallet_type',
                success: false
            });
            return;
        }

        if (typeof wallet_id !== 'object') {
            response.status(403).json({
                message: 'wallet_id must be of type array',
                success: false
            });
            return;
        }
        await db.query(`Update ${wallet_table} set deleted=1 WHERE id IN (${wallet_id.join(',')}) AND type='${wallet_type}' AND user_id=${user_id}`)
            .catch(error => {
                response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error
                });
                return
            });
        const result = db.error()
        if (!result) {
            response.status(200).json({
                success: true,
                message: 'Wallet(s) deleted successfully'
            });
        } else {
            response.status(422).json({
                success: false,
                message: 'Could not delete Wallet(s)'
            });
        }
    },
};