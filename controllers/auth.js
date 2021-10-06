const encryption = require('../library/encryption');
const { mail } = require('../helpers/mailer');
const mysql = require('../library/mysql');
const functions = require('../helpers/functions');
const { welcomNewUser, password_message_sms, password_message_email } = require('../library/Messages');
const { formatNumber } = require('../library/CountryCode');
const Configuration = require('../library/Configs');
const encrypt = new encryption();
const conf = Configuration.getConfig();

//database tables
const users_table = "users";
const verification_table = "users_table_verification";

module.exports = {
    async login(request, response) {
        const params = request.body;

        if (params.user && params.password) {
            const user = params.user;
            const password = params.password;

            const db = new mysql(conf.db_config)
            const queryString = `select id,first_name,last_name,phone,email,password,country,change_password from ${users_table} where phone = '${user}' OR email = '${user}'`;

            await db.query(queryString).catch(error => {
                response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error
                });
                return
            })
            if (db.count() > 0) {
                const userdata = db.first();
                const passed = await encrypt.compare(password, userdata.password);
                if (passed) {
                    let authorization = await functions.getAuthorization(userdata.id);
                    const change_password = Number(userdata.change_password) === 1 ? true : false;
                    let user = {
                        userid: userdata.id,
                        force_password_change: change_password,
                        auth: authorization
                    }
                    response.status(200).json({ success: true, user: user, message: "welcome back" });
                } else {
                    response.status(401).json({ success: false, message: 'incorrect details provided' });
                }
            } else {
                response.status(404).json({ success: false, message: 'user not fond' });
            }
        } else {
            response.status(403).json({ message: 'Please provide user and password', success: false });
        }
    },
    async signup_phone(request, response) {
        const params = request.body;
        const db = new mysql(conf.db_config);

        const phone = (params.phone) ? params.phone : null;
        const country = (params.country) ? params.country : null;

        if (!phone) {
            response.status(403).json({
                message: 'Please provide phone number',
                success: false
            });
            return;
        }
        if (!country) {
            response.status(403).json({
                message: 'Please provide country short name',
                success: false
            });
            return;
        }

        await db.query(`select phone from ${users_table} where phone = '${phone}'`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() > 0) {
            response.status(403).json({
                message: 'this phone already exist',
                success: false
            });
            return;
        }

        const smsCode = functions.numberCode(6);
        await db.query(`select phone from ${verification_table} where phone = '${phone}'`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() > 0) {
            await db.update(`${verification_table}`, "phone", phone, { phone: phone, code: smsCode }).catch(error => {
                response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error
                });
                return
            })
        } else {
            await db.insert(`${verification_table}`, { phone: phone, code: smsCode }).catch(error => {
                response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error
                });
                return
            })
        }

        const _phone = await formatNumber(phone, country)
        const sentSMS = await functions.sendSMS(_phone, `Your one time password is: ${smsCode} Please do not share with anyone`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        response.status(200).json(sentSMS);
    },
    async verify_number(request, response) {
        const params = request.body;
        const db = new mysql(conf.db_config);
        const phone = (params.phone) ? params.phone : null;
        const code = (params.code) ? params.code : null;

        await db.query(`select phone from ${verification_table} where phone = '${phone}' and code = '${code}'`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() > 0) {
            await db.update(`${verification_table}`, "phone", phone, { code: 1 });
            response.status(200).json({
                success: true,
                message: "verification successful"
            });
        } else {
            response.status(400).json({
                success: false,
                message: "invalid verification code"
            });
        }
    },
    async register(request, response) {
        const params = request.body;
        const db = new mysql(conf.db_config);

        const first_name = (params.firstname) ? params.firstname : null;
        const last_name = (params.lastname) ? params.lastname : null;
        const phone = (params.phone) ? params.phone : null;
        const email = (params.email) ? params.email : null;
        const country = (params.country) ? params.country : null;
        const password = (params.password) ? params.password : null;

        if (!first_name) {
            response.status(403).json({
                message: 'Please provide first name',
                success: false
            });
            return;
        }
        if (!last_name) {
            response.status(403).json({
                message: 'Please provide last name',
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
        if (!phone) {
            response.status(403).json({
                message: 'Please provide email address',
                success: false
            });
            return;
        }
        if (!email) {
            response.status(403).json({
                message: 'Please provide email number',
                success: false
            });
            return;
        }
        if (!password) {
            response.status(403).json({
                message: 'Please provide password',
                success: false
            });
            return;
        }

        await db.query(`select phone from ${users_table} where phone = '${phone}'`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() > 0) {
            response.status(403).json({
                message: 'this phone already exist',
                success: false
            });
            return;
        }

        await db.query(`select email from ${users_table} where email = '${email}'`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() > 0) {
            response.status(403).json({
                message: 'this email already exist',
                success: false
            });
            return;
        }

        let insertData = {
            first_name: first_name,
            last_name: last_name,
            phone: phone,
            email: email,
            country: country,
            password: await encrypt.hash(password),
        }

        const done = await db.insert(users_table, insertData).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (done) {
            const userid = db.lastInsertID();
            let authorization = await functions.getAuthorization(userid);
            let user = {
                userid,
                auth: authorization
            }

            const msg = await welcomNewUser({ name: `${first_name} ${last_name}` })
            await mail({ to: email, subject: "Account created successfully", message: msg, image: 'register.jpg' }).catch(error => {})
            response.status(200).json({ success: true, user: user, message: "Account created successfully" });
        } else {
            response.status(422).json({
                success: false,
                message: 'Could not create account'
            });
        }
    },
    async recover(request, response) {
        const params = request.body;
        const db = new mysql(conf.db_config);
        const user = (params.user) ? params.user : null;

        await db.query(`select first_name, last_name, phone, email, id from ${users_table} where phone = '${user}' or email = '${user}'`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() < 1) {
            response.status(404).json({
                message: 'Email Or Phone number does not exist',
                success: false
            });
            return;
        }
        const user_data = db.first();

        const password = functions.hexCode(8).toUpperCase()
        const hashed_password = await encrypt.hash(password)
        const updateData = {
            password: hashed_password,
            change_password: 1,
        }
        const done = await db.update(users_table, "id", user_data.id, updateData).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (done) {
            const message = password_message_sms({ password });
            const _phone = await formatNumber(user_data.phone, user_data.country)
            await functions.sendSMS(_phone, message)

            const name = `${user_data.first_name} ${user_data.last_name}`
            const message_mail = await password_message_email({ name: name, password });
            await mail({ to: user_data.email, subject: "Password Reset Request", message: message_mail, image: 'recover.jpg' })
            response.status(200).json({
                message: 'Your password has been sent to your email and phone number',
                success: true
            });
        } else {
            response.status(422).json({
                message: 'could not reset your password',
                success: false
            });
        }
    },
};