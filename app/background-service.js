const Configuration = require('../library/Configs');
const conf = Configuration.getConfig();

const Pagination = require('../library/MYSqlPagination');
const mysql = require('../library/mysql');
const axios = require('axios');

const dbConfig = conf.db_config;

const backgoundService = {
    start: async() => {}
}

module.exports = backgoundService;