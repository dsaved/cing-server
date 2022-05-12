class encryption {
    constructor() {
        this.encrypt = require('bcryptjs');
    }

    async hash(text) {
        let salt = await this.salt(10);
        return await this.encrypt.hashSync(text, salt);
    }

    async compare(password, hash) {
        return await this.encrypt.compareSync(password, hash);
    }

    async salt(count) {
        return this.encrypt.genSaltSync(count)
    }
}

module.exports = encryption;