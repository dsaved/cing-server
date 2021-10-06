const encryption = require('../library/encryption');
const encrypt = new encryption();
const Pagination = require('../library/MYSqlPagination');
const mysql = require('../library/mysql');
const functions = require('../helpers/functions');
const Configuration = require('../library/Configs');
const conf = Configuration.getConfig();

//file import
const path = require('path');
const multer = require('multer');
var fs = require('fs');

//database tables
const users_table = "users";
const userColumns = 'id as user_id,first_name,last_name,phone,email,photo,country,created';

const maxSize = 15 * 1000 * 1000;
let filename = "";
const placeholder = 'placeholder.jpg'
const uploads = 'uploads'
const public = './public'
const destination = `${public}/${uploads}`;
//define storage engine
const storage = multer.diskStorage({
    destination: destination,
    filename: (req, file, callback) => {
        filename = file.originalname + '-' + Date.now() + path.extname(file.originalname);
        callback(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: (request, file, callback) => {
        //allowed extensions
        const allowedFilesTypes = /gif|jpeg|png|svg|jpg/;
        //check extension
        const extname = allowedFilesTypes.test(path.extname(file.originalname).toLowerCase());
        //check mime type
        const mimetype = /image\/*/.test(file.mimetype);
        if (extname && mimetype) {
            callback(null, true);
        } else {
            callback('please upload allowed files only');
        }
    }
}).single('photo');

module.exports = {
    async userInfo(request, response) {
        const params = request.params;
        const db = new mysql(conf.db_config);

        const user_id = (params.user_id) ? params.user_id : null;

        if (!user_id) {
            response.status(403).json({
                message: 'Please provide user id',
                success: false
            });
            return;
        }

        await db.query(`SELECT ${userColumns} FROM ${users_table} user WHERE id= ${user_id}`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() > 0) {
            let user = db.first();
            user.photo = (user.photo) ? `${conf.api_link}account/${user.user_id}/photo` : '';
            response.status(200).json({
                success: true,
                user,
            });
        } else {
            response.status(404).json({
                success: false,
                message: 'No user found',
            });
        }
    },
    async userPhoto(request, response) {
        const params = request.params;
        const db = new mysql(conf.db_config);
        const user_id = (params.user_id) ? params.user_id : null;
        if (!user_id) {
            response.sendFile(placeholder, { root: `${__dirname}/../public/images` });
            return;
        }

        await db.query(`SELECT ${userColumns} FROM ${users_table} user WHERE id= ${user_id}`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        if (db.count() > 0) {
            let user = db.first();
            const photo = (user.photo) ? `${user.photo}` : `images/${placeholder}`;
            response.sendFile(photo, { root: `${__dirname}/../public` });
        } else {
            response.sendFile(placeholder, { root: `${__dirname}/../public/images` });
        }
    },
    async userUpdate(request, response) {
        const params = request.body;
        const db = new mysql(conf.db_config);

        const user_id = (params.user_id) ? params.user_id : null;
        const first_name = (params.firstname) ? params.firstname : null;
        const last_name = (params.lastname) ? params.lastname : null;
        const email = (params.email) ? params.email : null;
        const password = (params.password) ? params.password : null;

        if (!user_id) {
            response.status(403).json({
                message: 'Please provide user id',
                success: false
            });
            return;
        }
        if (!first_name) {
            response.status(403).json({
                message: 'Please provide first_name',
                success: false
            });
            return;
        }
        if (!last_name) {
            response.status(403).json({
                message: 'Please provide last_name',
                success: false
            });
            return;
        }
        if (!email) {
            response.status(403).json({
                message: 'Please provide email',
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

        const queryString = `select password from ${users_table} where id = ${user_id}`;
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
                const insertData = {
                    first_name: first_name,
                    last_name: last_name,
                    email: email
                }
                const done = await db.update(users_table, 'id', user_id, insertData).catch(error => {
                    response.status(500).json({
                        success: false,
                        message: "Internal server error",
                        error
                    });
                    return
                })
                if (done) {
                    await db.query(`SELECT ${userColumns} FROM ${users_table} user WHERE id= ${user_id}`).catch(error => {
                        response.status(500).json({
                            success: false,
                            message: "Internal server error",
                            error
                        });
                        return
                    })
                    let user = db.first();
                    user.photo = (user.photo) ? `${conf.api_link}account/${user_id}/photo` : '';
                    response.status(200).json({
                        success: true,
                        message: 'Account updated successfully',
                        user
                    });
                } else {
                    response.status(422).json({
                        success: false,
                        message: 'Could not update Account'
                    });
                }
            } else {
                response.status(401).json({ success: false, message: 'incorrect details provided' });
            }
        } else {
            response.status(404).json({ success: false, message: 'user not found' });
        }
    },
    async userUpdatePassword(request, response) {
        const params = request.body;
        const db = new mysql(conf.db_config);

        const user_id = (params.user_id) ? params.user_id : null;
        const current_password = (params.current_password) ? params.current_password : null;
        const new_password = (params.new_password) ? params.new_password : null;

        if (!user_id) {
            response.status(403).json({
                message: 'Please provide user id',
                success: false
            });
            return;
        }
        if (!current_password) {
            response.status(403).json({
                message: 'Please provide current password',
                success: false
            });
            return;
        }
        if (!new_password) {
            response.status(403).json({
                message: 'Please provide new password',
                success: false
            });
            return;
        }

        const queryString = `select password from ${users_table} where id = '${user_id}'`;
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
            const passed = await encrypt.compare(current_password, userdata.password);
            if (passed) {
                const insertData = {
                    password: await encrypt.hash(new_password),
                    change_password: "0"
                }
                const done = await db.update(users_table, 'id', user_id, insertData).catch(error => {
                    response.status(500).json({
                        success: false,
                        message: "Internal server error",
                        error
                    });
                    return
                })
                if (done) {
                    let authorization = await functions.getAuthorization(user_id);
                    let user = {
                        userid: user_id,
                        force_password_change: false,
                        auth: authorization
                    }
                    response.status(200).json({
                        success: true,
                        message: 'Account Password updated successfully',
                        user
                    });
                } else {
                    response.status(422).json({
                        success: false,
                        message: 'Could not update Account Password'
                    });
                }
            } else {
                response.status(401).json({
                    success: false,
                    message: 'Current Password is wrong !!!'
                });
            }
        } else {
            response.status(404).json({
                success: false,
                message: 'Account user not found'
            });
        }
    },
    async userPhotoUpdate(request, response) {
        upload(request, response, async(error) => {
            if (error) {
                response.status(403).json({ success: false, message: error });
            } else {
                const params = request.body;
                const location = uploads + "/" + filename;
                const user_id = (params.user_id) ? params.user_id : null;

                if (!user_id) {
                    try {
                        fs.unlinkSync(`${public}/${location}`);
                    } catch (error) {}
                    response.status(403).json({
                        message: 'Please provide user id',
                        success: false
                    });
                    return;
                }

                const db = new mysql(conf.db_config);
                await db.query(`select photo from ${users_table} where id = ${user_id}`).catch(error => {
                    response.status(500).json({
                        success: false,
                        message: "Internal server error",
                        error
                    });
                    return
                })
                if (db.count() > 0) {
                    const userdata = db.first();
                    if (userdata.photo) {
                        try {
                            fs.unlinkSync(`${public}/${userdata.photo}`);
                        } catch (error) {}
                    }
                    const insertData = {
                        photo: location,
                    }
                    const done = await db.update(users_table, 'id', user_id, insertData).catch(error => {
                        response.status(500).json({
                            success: false,
                            message: "Internal server error",
                            error
                        });
                        return
                    })
                    if (done) {
                        response.status(200).json({
                            success: true,
                            message: 'Account photo uploaded successfully'
                        });
                    } else {
                        response.status(422).json({
                            success: false,
                            message: 'Could not upload Account photo'
                        });
                    }
                } else {
                    response.status(404).json({ success: false, message: 'user not found' });
                }
            }
        })
    },
};