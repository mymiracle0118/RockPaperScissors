const { statSync } = require('fs');
const query = require('../db/db-connection')
const { multipleColumnSet } = require('../utils/common.utils');

class RPSGAMEUSERModel{
	tableName = 'user'

    find = async (params = {}) => { 
        try {
            let sql = `SELECT * FROM ${this.tableName}`;
            if (!Object.keys(params).length) {
                return await query(sql);
            }
            const { columnSet, values } = multipleColumnSet(params)
            sql += ` WHERE ${columnSet}`;
            return await query(sql, [...values]);
        } catch(error) {
            return {error:error.sqlMessage}
        }
    }

    findOne = async(params) => {
		try{
			const {columnSet, values} = multipleColumnSet(params)
			const sql = `select * from ${this.tableName} where ${columnset}`
			const result = await query(sql, [...values])
		}catch(error){
			return {error : error.sqlMessage}
		}
	}

    create = async(wallet) => {
		try{
			const sql = `insert into ${this.tableName}
				(wallet) VALUES (?)`;
			const result = await query(sql, [wallet]);
			// const affectedRows = result ? result.affectedRows : 0;
			console.log(result)
            return result
		} catch(err) {
			return {error:err.sqlMessage}
		}
	}

	update = async (params, wallet) => {
        try {
            const { columnSet, values } = multipleColumnSet(params)

            const sql = `UPDATE ${this.tableName} SET ${columnSet} WHERE wallet = ?`;

            const result = await query(sql, [...values, wallet]);

            return result;
        } catch(error) {
            return {error:error.sqlMessage}
        }
    }

    delete = async (params) => {
        try {
            const { columnSet, values } = multipleColumnSet(params)
            
            const sql = `DELETE FROM ${this.tableName}
            WHERE ${columnSet}`;
            const result = await query(sql, [...values]);
            const affectedRows = result ? result.affectedRows : 0;

            return affectedRows;
        } catch (error) {
            return {error:error.sqlMessage}
        }
    }
}

module.exports = new RPSGAMEUSERModel