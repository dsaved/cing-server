const authorizer = require('./authorizer')
const AuthController = require('../controllers/auth')
const GeneralController = require('../controllers/gen')
const AccountController = require('../controllers/accounts')
const functions = require('../helpers/functions');
const Wallet = require('../controllers/wallet')
const pay = require('../controllers/pay')

module.exports = function(app) {

    //Authentication Routes
    app.post('/login', AuthController.login)
    app.post('/signup/phone', AuthController.signup_phone)
    app.post('/signup/resend_code', AuthController.signup_phone)
    app.post('/signup/verify_phone', AuthController.verify_number)
    app.post('/signup/complete', AuthController.register)
    app.post('/recover', AuthController.recover)

    //General Routes
    app.get('/countries', GeneralController.countries)
    app.post('/rate', authorizer, GeneralController.getRate)

    //Account routes
    app.get('/account/:user_id', authorizer, AccountController.userInfo)
    app.get('/account/:user_id/photo', AccountController.userPhoto)
    app.post('/account/update', authorizer, AccountController.userUpdate)
    app.post('/account/update-password', authorizer, AccountController.userUpdatePassword)
    app.post('/account/upload-photo', authorizer, AccountController.userPhotoUpdate)

    //Paysatck API
    app.get('/get-banks/:country', authorizer, GeneralController.getBanks)
    app.get('/account-balance/:country', authorizer, GeneralController.getBalance)
    app.get('/get-banks/:country/pay_with_bank', authorizer, (request, response, next) => GeneralController.getBanks(request, response, next, 'payment'))
    app.post('/wallet/verify-account-number', authorizer, Wallet.verifyAccountNumber)

    //User wallet
    app.post('/wallet/list', authorizer, Wallet.listWallet)
    app.post('/wallet/single', authorizer, Wallet.walletInfo)
    app.post('/wallet/create', authorizer, Wallet.createWallet)
    app.post('/wallet/delete', authorizer, Wallet.deleteWallet)
    app.post('/test', async(request, response, next) => {
        const sentSMS = await functions.sendSMS('233543848378', `Your one time password is: 1111 Please do not share with anyone`).catch(error => {
            response.status(500).json({
                success: false,
                message: "Internal server error",
                error
            });
            return
        })
        response.status(200).json(sentSMS);
    })

    // transfer cash
    app.post('/transfer', authorizer, pay.cinq)

    app.post('/test-validate', async(request, response, next) => {
        const params = request.body;
        const name = (params.name) ? params.name : null;
        const phone = (params.phone) ? params.phone : null;
        const email = (params.email) ? params.email : null;

        const required = ['name', 'email', 'phone'];
        for (let index = 0; index < required.length; index++) {
            const element = required[index];
            console.log(element)
            if (!params[element]) {
                response.status(403).json({
                    message: `Please provide ${element}`,
                    success: false
                });
                return;
            }
        }

        response.status(200).json('done');
    })
}