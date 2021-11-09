function countryArray() {
    return [
        { shortName: 'GH', code: '233', name: 'Ghana', currency: 'GHS', min_transaction: '100' },
        { shortName: 'NG', code: '234', name: 'Nigeria', currency: 'NGN', min_transaction: '5000' }
    ]
}

function getCountry(shortname = "") {
    const countryCodes = countryArray();
    let output = null;

    for (let index = 0; index < countryCodes.length; index++) {
        const countryCode = countryCodes[index];
        if (`${countryCode.shortName}`.toLowerCase() === `${shortname}`.toLowerCase()) {
            output = countryCode;
        }
    }
    return output;
}

function formatNumber(number, shortname) {
    return new Promise((resolve, reject) => {
        const countryCodes = countryArray();
        let output = null;
        let num = number;

        for (let index = 0; index < countryCodes.length; index++) {
            const countryCode = countryCodes[index];
            if (`${countryCode.shortName}`.toLowerCase() === `${shortname}`.toLowerCase()) {
                output = countryCode.code;
            }
        }

        const regExp = /^0[0-9].*$/
        if (regExp.test(number)) {
            num = `${number}`.replace('0', output);
        } else {
            if (`${number}`.startsWith(output)) {
                num = number;
            } else {
                num = `${output}${number}`
            }
        }
        resolve(num)
    })
}

module.exports = { formatNumber, countryArray, getCountry }