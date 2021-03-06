const mysql = require("./mysql");

class MYSqlPagination extends mysql {
    constructor(db_config) {
        super(db_config);
        this._query = null;
        this._table = null;
        this.limit = 15;
        this.page = 0;
        this._fields = '*';
        this._condition = null;
        this.total = 0;
        this.pages = 0;
        this.start = 0;
        this.offset = 0;
        this.end = 0;
    }

    rawQuery(query) {
        this._query = query;
    }

    fields(fields) {
        this._fields = fields;
    }

    table(table) {
        this._table = table;
    }

    pageNum(page) {
        this.page = page;
    }

    result_per_page(limit) {
        this.limit = limit;
    }

    condition(condition) {
        this._condition = condition;
    }

    reset() {
        this._query = null;
        this._table = null;
        this._condition = null;
        this.limit = 15;
        this.page = 0;
        this.total = 0;
        this.pages = 0;
        this.start = 0;
        this.offset = 0;
        this.end = 0;
    }

    async run() {
        if (this._table === null && this._query === null) {
            throw new Error("Please provide _query or table name", 1);
        }

        const page = this.page;
        const limit = this.limit;
        this.offset = (page - 1) * limit;
        const vm = this;
        if (this._query) {
            await this.execute(`${this._query}`).then(dataset => {
                vm.total = dataset.length;
                vm.pages = Math.ceil(vm.total / vm.limit)
                vm.page = (vm.page < vm.pages) ? vm.page : vm.pages;
                vm.start = vm.offset + 1;
                vm.end = Math.min((vm.offset + vm.limit), vm.total)
            }).catch(error => {
                console.log(error)
            });
        } else {
            await this.execute(`SELECT ${this._fields} FROM ${this._table} ${this._condition}`).then(dataset => {
                vm.total = dataset.length;
                vm.pages = Math.ceil(vm.total / vm.limit)
                vm.page = (vm.page < vm.pages) ? vm.page : vm.pages;
                vm.start = vm.offset + 1;
                vm.end = Math.min((vm.offset + vm.limit), vm.total)
            }).catch(error => {
                console.log(error)
            });
        }


        if (this._query !== null) {
            if (!this._query.toLowerCase().includes("ORDER BY".toLowerCase())) {
                this._query += " ORDER BY (SELECT NULL) ";
            }
            await this.query(this._query + ' LIMIT ' + this.limit + ' OFFSET ' + this.offset);
        } else {
            // Prepare the paged _query
            if (this._condition !== null) {
                if (!this._condition.toLowerCase().includes("ORDER BY".toLowerCase())) {
                    this._condition += " ORDER BY (SELECT NULL) ";
                }
                this._query = `SELECT ${this._fields} FROM ${this._table} ${this._condition} LIMIT ${this.limit} OFFSET ${this.offset} `;
                await this.query(this._query);
            } else {
                this._query = `SELECT ${this._fields} FROM ${this._table} ORDER BY(SELECT NULL) LIMIT ${this.limit} OFFSET ${this.offset}`;
                await this.query(this._query);
            }
        }
    }


    pagination() {
        return {
            haspages: (this.page < this.pages) || (this.page > 1) ? true : false, //has pages
            start: this.start, // record starts from 
            end: this.end, //records ends in
            total: this.total, // total record in system
            page: this.page, //current page number
            pages: this.pages, //total pages in the system
            hasNext: this.page < this.pages, // has next page?
            hasPrevious: this.page > 1, //has previous page?
        }
    }
}

module.exports = MYSqlPagination;