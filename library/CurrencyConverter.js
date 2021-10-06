const axios = require('axios').default;
const mysql = require("./mysql");

const Configuration = require('./Configs');
const conf = Configuration.getConfig();

async function getExchangeRate(from = "NGN", to = "GHS", amount = 1000) {

    const formaterTo = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: to
    })

    const formaterFrom = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: from
    })

    const db = new mysql(conf.db_config);
    await db.query(`SELECT * FROM charge_rate WHERE country LIKE '${from}' `);
    let rate = db.first();

    return new Promise(async(resolve, reject) => {
        const request = `https://api.exchangerate.host/convert?from=${from}&to=${to}`;

        let _percent = (rate.percent_charge / 100) * amount
        let _amount = amount - rate.max_charge
        if (amount < rate.if_amount_less_than) {
            _amount = amount - rate.min_charge
        }

        await axios.get(request)
            .then(function(result) {
                let response = result.data
                let _rcAmount = parseFloat(((response.result - rate.intrest_rate_unit) * (_amount - _percent)).toFixed(2))
                let receiving = formaterTo.format(_rcAmount)
                let words_sending = formaterFrom.format(amount)
                let _result = {}
                if (response.success) {
                    _result.sendging = {
                        amount: amount,
                        words: words_sending
                    };
                    _result.receive = {
                        amount: _rcAmount,
                        words: receiving
                    }
                }
                resolve(_result)
            })
            .catch(function(error) {
                reject(error)
            });
    });
}

module.exports = { getExchangeRate }