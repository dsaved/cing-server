const axios = require('axios').default;

class Paystack {
    constructor() {
        this.api_link = 'https://api.paystack.co/';
        this.tx_ref = null;
        this.amount = null;
        this.Authorization = null;
        this.payment_option = null;
        this.redirect_url = 'https://webhook.site/0404b881-7fd3-46bf-9db0-e055c9075a26';
        this.meta = [];
        this.customer = [];
        this.customizations = [];
        this.payload = null;
        this.transaction_id = null;
        this.currency = null;
        this.account_name = null;
        this.account_number = null;
        this.bank_code = null;
    }

    static payment_options = [{
        key: "card",
        label: "Card Payment",
    }, {
        key: "banktransfer",
        label: "Bank Transfer",
        image: this.bank_transfer_image
    }, ];

    setCurrency(currency) {
        this.currency = currency;
        return this
    }

    setRefferenceNumber(tx_ref) {
        this.tx_ref = tx_ref;
        return this;
    }

    setBankCode(_bank_code) {
        this.bank_code = _bank_code;
        return this;
    }

    setAccountNumber(_account_number) {
        this.account_number = _account_number;
        return this;
    }

    setAccountName(_account_name) {
        this.account_name = _account_name;
        return this;
    }

    setTransactionId(transaction_id) {
        this.transaction_id = transaction_id;
        return this;
    }

    setTransactionAmount(amount) {
        this.amount = amount;
        return this;
    }

    setPayload(payload) {
        this.payload = payload;
        return this;
    }

    setMetaData($meta) {
        this.meta = $meta;
        return this;
    }

    setAuthorization(Authorization) {
        this.Authorization = Authorization;
        return this;
    }

    setPaymentOption(payment_option) {
        this.payment_option = payment_option;
        return this;
    }

    setCustomer(name = null, email = null, phone = null) {
        if (!name || !email || !phone) {
            throw new Error('name, email and phone number is required');
        }
        this.customer = {
            "email": email,
            "phonenumber": phone,
            "name": name,
        };
        return this;
    }

    setCustomDisplay(title = null, description = null, logo = null) {
        if (!title || !description || !logo) {
            throw new Error('title, description and logo number is required');
        }
        this.customizations = {
            "title": title,
            "description": description,
            "logo": logo,
        }
        return this;
    }

    empty(data) {
        return data === undefined || data === null || !data
    }

    async pay() {
        if (this.empty(this.tx_ref)) {
            throw new Error("refference_number has no data");
        }
        if (this.empty(this.amount)) {
            throw new Error("transaction_amount data is required ");
        }
        if (this.empty(this.payment_option)) {
            throw new Error("payment_option data is required ");
        }
        if (this.empty(this.customer)) {
            throw new Error("customer data is required ");
        }
        if (this.empty(this.customer)) {
            throw new Error("customer data is required ");
        }
        if (this.empty(this.Authorization)) {
            throw new Error("Authorization is required ");
        }

        let amount_to_pay = this.amount;
        let payload = {
            "tx_ref": this.tx_ref,
            "amount": amount_to_pay,
            "currency": this.currency,
            "redirect_url": this.redirect_url,
            "payment_options": this.payment_option,
            "customer": this.customer
        }

        if (this.meta.length > 0) {
            payload.meta = this.meta
        }

        if (this.customizations.length > 0) {
            payload.customizations = this.customizations
        }

        let res = {};

        axios.defaults.headers.common['Authorization'] = `Bearer ${this.Authorization}`
        axios.defaults.headers.common['Content-Type'] = 'application/json'
        await axios.post(this.api_link, payload)
            .then(function(result) {
                let response = result.data
                if (response.status === "success") {
                    res.success = true
                    res.link = response.data.link
                } else {
                    res.success = false
                    res.message = response.message
                }
            })
            .catch(function(error) {
                console.log(error.response.data)
                res.success = false
                res.message = error.response.data
            });

        return res;
    }

    async verifyTransaction() {
        if (this.empty(this.transaction_id)) {
            throw new Error("transaction_id is required ");
        }

        if (this.empty(this.Authorization)) {
            throw new Error("Authorization is required ");
        }

        let res = {};
        const verify_link = `https://api.flutterwave.com/v3/transactions/${this.transaction_id}/verify`;

        axios.defaults.headers.common['Authorization'] = `Bearer ${this.Authorization}`
        axios.defaults.headers.common['Content-Type'] = 'application/json'
        await axios.get(verify_link)
            .then(function(result) {
                let response = result.data
                if (response.status === "success") {
                    res.success = true
                    res.data = response.data;
                } else {
                    res.success = false
                    res.message = response.message
                }
            })
            .catch(function(error) {
                console.log(error)
                res.success = false
                res.message = error
            });

        return res;
    }

    async momoPay() {
        if (this.empty(this.payload)) {
            throw new Error("payload is required ");
        }
        const _link = `${this.api_link}charge`;
        let payload = this.payload
        let res = { success: null, data: {}, message: null };

        axios.defaults.headers.common['Authorization'] = `Bearer ${this.Authorization}`
        axios.defaults.headers.common['Content-Type'] = 'application/json'
        await axios.post(this.api_link, payload)
            .then(function(result) {
                let response = result.data
                console.log(response)
                res.success = response.status
                res.message = response.message
                res.data = response.data
            })
            .catch(function(error) {
                console.log(error)
                res.success = false
                res.message = error
            });
        return res;
    }

    async verifyBank() {
        if (this.empty(this.account_number)) {
            throw new Error("account_number is required ");
        }

        if (this.empty(this.bank_code)) {
            throw new Error("bank_code is required ");
        }

        let res = { success: false, message: '', account: null };
        const _link = `${this.api_link}bank/resolve/?account_number=${this.account_number}&bank_code=${this.bank_code}`;

        axios.defaults.headers.common['Authorization'] = `Bearer ${this.Authorization}`
        axios.defaults.headers.common['Content-Type'] = 'application/json'
        await axios.get(_link)
            .then(function(result) {
                let response = result.data
                if (response.status) {
                    res.success = true
                    res.message = response.message
                    res.account = response.data;
                } else {
                    res.success = false
                    res.message = response.message
                }
            })
            .catch(function(error) {
                console.log(error)
                res.success = false
                res.message = error
            });

        return res;
    }

    async listBanks(country, pay_with_bank) {
        if (this.empty(country)) {
            throw new Error("country is required ");
        }
        let res = { success: false, message: '', banks: [] };
        const _link = `${this.api_link}bank/?country=${country}${pay_with_bank}`;

        axios.defaults.headers.common['Authorization'] = `Bearer ${this.Authorization}`
        axios.defaults.headers.common['Content-Type'] = 'application/json'
        await axios.get(_link)
            .then(function(result) {
                let response = result.data
                if (response.status) {
                    res.success = true
                    res.message = response.message
                    let banks = []
                    response.data.forEach((data, index) => {
                        if (!`${data.slug}`.includes('mobile-money')) {
                            banks.push({
                                name: data.name,
                                code: data.code,
                                currency: data.currency,
                                id: data.id,
                            })
                        }
                    })
                    res.banks = banks;
                    // res.banks = response.data;
                } else {
                    res.success = false
                    res.message = response.message
                }
            })
            .catch(function(error) {
                console.log(error)
                res.success = false
                res.message = error
            });

        return res;
    }

    async getBalance() {
        let res = { success: false, message: '', data: [] };
        const _link = `${this.api_link}balance`;

        axios.defaults.headers.common['Authorization'] = `Bearer ${this.Authorization}`
        axios.defaults.headers.common['Content-Type'] = 'application/json'
        await axios.get(_link)
            .then(function(result) {
                let response = result.data
                if (response.status) {
                    res.success = true
                    res.message = response.message
                    res.data = response.data;
                } else {
                    res.success = false
                    res.message = response.message
                }
            })
            .catch(function(error) {
                console.log(error)
                res.success = false
                res.message = error
            });

        return res;
    }

    async createTransferRecipient() {
        if (this.empty(this.account_number)) {
            throw new Error("account_number is required ");
        }
        if (this.empty(this.account_name)) {
            throw new Error("account_name is required ");
        }
        if (this.empty(this.bank_code)) {
            throw new Error("bank_code is required ");
        }

        let res = { success: false, message: '', data: {} };
        const _link = `${this.api_link}transferrecipient`;

        axios.defaults.headers.common['Authorization'] = `Bearer ${this.Authorization}`
        axios.defaults.headers.common['Content-Type'] = 'application/json'
        await axios.post(_link, {
                type: "nuban",
                name: this.account_name,
                account_number: this.account_number,
                bank_code: `${this.bank_code}`.toUpperCase(),
                currency: this.currency
            })
            .then(function(result) {
                let response = result.data
                if (response.status) {
                    res.success = true
                    res.message = response.message
                    res.data = response.data;
                } else {
                    res.success = false
                    res.message = response.message
                }
            })
            .catch(function(error) {
                console.log(error)
                res.success = false
                res.message = error
            });

        return res;
    }
}

module.exports = {
    Paystack: Paystack
};