const query = require('../db/db-connection')
const { multipleColumnSet } = require('../utils/common.utils');

class RPSGAMELOGModel{
	tableName = 'log'

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
			return result[0]
		}catch(error){
			return {error : error.sqlMessage}
		}
	}

    create = async({roomId, result, winnerWallet, winnerName, loserWallet, loserName, amount}) => {
		try{
			const sql = `insert into ${this.tableName} 
            (roomId, result, winnerWallet, winnerName, loserWallet, loserName, amount) VALUES (?,?,?,?,?,?,?)`
            const re = await query(sql, [roomId, result, winnerWallet, winnerName, loserWallet, loserName, amount])
            return re
		} catch(err) {
			return {error:err.sqlMessage}
		}
	}

	update = async (params, id) => {
        try {
            const { columnSet, values } = multipleColumnSet(params)

            const sql = `UPDATE ${this.tableName} SET ${columnSet} WHERE id = ?`;

            const result = await query(sql, [...values, id]);

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

module.exports = new RPSGAMELOGModel