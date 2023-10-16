const nacl = require('tweetnacl')
const jwt = require("jsonwebtoken")
const {Connection, clusterApiUrl, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction, Keypair, PublicKey} = require('@solana/web3.js');
const bs58 = require('bs58')
const RPSGAMEUSERModel = require("../models/rpsgame_user.model")
const RPSGAMEMYSTERYPLAYERModel = require("../models/rpsgame_mysteryplayer.model")
const RPSGAMEROOMModel = require('../models/rpsgame_room.model')
const RPSGAMELOGModel = require('../models/rpsgame_log.model')

let conn = new Connection(clusterApiUrl("devnet"))
const treasuryWallet = Keypair.fromSecretKey(bs58.decode("2ysX3R755F8iPTwmU5syALzWMkdd7nJeSQTg2z68jjNbCc9aSMxAJ1DWcbgmf67WK7Dp1rcyg6fRQSYzXCtUfqA4"))
const confirmOption = {commitment : 'finalized',preflightCommitment : 'finalized',skipPreflight : false}

class RPSGAMEService{
	constructor(){
	}

	static async getNonce(rawData){
		try{
			let result = await RPSGAMEUSERModel.find({wallet : rawData.wallet})
			if(result.error) throw new Error("Find Error")
			let userData;
			if(result.length === 0){
				await RPSGAMEUSERModel.create(rawData.wallet)
				userData=await RPSGAMEUSERModel.findOne({wallet : rawData.wallet})
			}else{
				userData = result[0]
			}
			let nonce = Math.floor(Math.random() * (2**32))
			let updateResult = await RPSGAMEUSERModel.update({nonce : nonce},rawData.wallet)
			if(updateResult.error) throw new Error("Update Error")
			return {response : true, message : "success", nonce : nonce}
		}catch(err){
			console.log(err)
			return {response : false, message : 'nonce error'}
		}
	}

	static async signIn(rawData){
		try{
			let result = await RPSGAMEUSERModel.find({wallet : rawData.wallet})
			if(result.error || result.length===0) throw new Error("Find Error")
			let userData = result[0]
			let message = `Sign this message from authentication with your wallet. Nonce : ${userData.nonce}`
			const data = new TextEncoder().encode(message)
			let isSigned = nacl.sign.detached.verify(data, bs58.decode(rawData.signature), bs58.decode(rawData.wallet))
			if(!isSigned) throw new Error("Sign signature Error")
			const token=jwt.sign({wallet : rawData.wallet, nonce : userData.nonce}, process.env.SECRET_JWT,{expiresIn:"3h"})
			userData.token = token;
			return {response : true, message : "signin success", data : userData}
		}catch(err){
			console.log(err)
			return {response : false, message : 'signin error'}
		}
	}
	
	static async getWallet(rawData){
		try{
			let result = await RPSGAMEUSERModel.find({wallet : rawData.wallet})
			if(result.error || result.length==0) throw new Error("Find Error")
			return {response : true, message : 'success', data : {amount : result[0].amount}}
		}catch(err){
			return {response : false, message : 'find error', data : {amount : 0}}
		}
	}

	static async getStatus(rawData){
		try{
			let result = await RPSGAMEMYSTERYPLAYERModel.find({wallet : rawData.wallet})
			if(result.error || result.length==0) return {response : true, status : 0}
			if(result[0].status === 0) return {response : true, status : 1, isInvite : false}
			if(result[0].status === 1) return {response : true, status : 2, roomID : result[0].roomID}
			if(result[0].status === 3) return {response : true, status : 3, isInvite : true}
		}catch(err){
			return {response : false, status : 0}
		}
	}

	static async deposit(rawData){
		try{
			if(!rawData.wallet) throw Error("No Wallet")
			let result = await RPSGAMEUSERModel.find({wallet : rawData.wallet})
			if(result.error || result.length===0) throw new Error("Find Error")
			let userData = result[0]
			let hash = await conn.sendRawTransaction(rawData.transaction)
			await conn.confirmTransaction(hash)
			let verify=null;
			while(verify==null){
				try{
					verify=await conn.getTransaction(hash, {commitment : "finalized"})
				}catch(err){

				}
			}
			if(verify.transaction.message.accountKeys[0].toBase58() != rawData.wallet)
				throw new Error("Sender Error")
			if(verify.transaction.message.accountKeys[1].toBase58() != treasuryWallet.publicKey.toBase58())
				throw new Error("Receiver Error")
			if(verify.meta.postBalances[1]-verify.meta.preBalances[1] !== rawData.amount)
				throw new Error("Invalid Transaction")
			
			userData.amount += rawData.amount
			let updateResult = await RPSGAMEUSERModel.update(userData, rawData.wallet)
			if(updateResult.error) throw new Error("Update Error")
			return {response : true, message : "success"}
		}catch(err){
			console.log(err)
			return {response : false, message : "deposit error"}
		}
	}

	static async preWithdraw(rawData){
		try{
			if(!rawData.wallet) throw Error("No Wallet")
			let result = await RPSGAMEUSERModel.find({wallet : rawData.wallet})
			if(result.error || result.length===0) throw new Error("Find Error")
			let nonce = Math.floor(Math.random() * (2**32))
			let updateResult = await RPSGAMEUSERModel.update({withdraw_nonce : nonce, prewithdraw : 1},rawData.wallet)
			if(updateResult.error) throw new Error("Update Error")
			return {response : true, message : "success", nonce : nonce}
		}catch(err){
			console.log(err)
			return {response : false, message : 'nonce error'}
		}
	}

	static async withdraw(rawData){
		try{
			let result = await RPSGAMEUSERModel.find({wallet : rawData.wallet})
			if(result.error || result.length==0) throw new Error("Find Error")
			let userData = result[0]
			if(userData.prewithdraw === 0) throw new Error("Not found prewithdraw")
			let message = `Withdraw Request : ${userData.withdraw_nonce}`
			const data = new TextEncoder().encode(message)
			let isSigned = nacl.sign.detached.verify(data, bs58.decode(rawData.signature), bs58.decode(rawData.wallet))
			console.log(isSigned)
			if(!isSigned) throw new Error("Sign signature Error")
			if(userData.amount < rawData.amount) throw new Error("Amount Error")
			let transaction = new Transaction()
			let lamports = Number(rawData.amount)
			console.log(lamports)
			transaction.add(SystemProgram.transfer({
				fromPubkey : treasuryWallet.publicKey,
				toPubkey : new PublicKey(rawData.wallet),
				lamports : lamports
			}))
			let hash = await sendAndConfirmTransaction(conn, transaction, [treasuryWallet], confirmOption)
			console.log(hash)
			let verify = null;
			while(verify==null){
				try{
					verify=await conn.getTransaction(hash, {commitment : "finalized"})
				}catch(err){

				}
			}
			if(verify.meta.postBalances[1]-verify.meta.preBalances[1] !== rawData.amount)
				throw new Error("Invalid Transaction")

			userData.amount -= lamports
			userData.prewithdraw = 0
			let updateResult = await RPSGAMEUSERModel.update(userData, rawData.wallet)
			if(updateResult.error) throw new Error("Update Error")
			return {response : true, message : "success"}
		}catch(err){
			console.log(err)
			return {response : false, message: "withdraw error"}
		}
	}

	static async startMystery(rawData){
		try{
			let result = await RPSGAMEMYSTERYPLAYERModel.find({wallet : rawData.wallet})
			if(result.error || result.length!=0) throw new Error("Find Error")
			let userResult = await RPSGAMEUSERModel.find({wallet : rawData.wallet})
			if(userResult.error || userResult.length==0) throw new Error("Find Error")
			if(userResult[0].amount < rawData.amount) throw new Error("Amount Error")
			await RPSGAMEMYSTERYPLAYERModel.create(rawData.wallet)
			await RPSGAMEMYSTERYPLAYERModel.update({wallet : rawData.wallet, amount : rawData.amount, name : rawData.name, status : 0, roomID : 0}, rawData.wallet)
			await RPSGAMEUSERModel.update({amount : userResult[0].amount - rawData.amount}, rawData.wallet)
			return {response : true, message : "please wait"}
		}catch(err){
			console.log(err)
			return {response : false, message:"start error"}
		}
	}

	static async startInvite(rawData){
		try{
			let result = await RPSGAMEMYSTERYPLAYERModel.find({wallet : rawData.wallet})
			if(result.error || result.length!=0) throw new Error("Find Error")
			let userResult = await RPSGAMEUSERModel.find({wallet : rawData.wallet})
			if(userResult.error || userResult.length==0) throw new Error("Find Error")
			if(userResult[0].amount < rawData.amount) throw new Error("Amount Error")
			let waitingRoom = await RPSGAMEMYSTERYPLAYERModel.create(rawData.wallet)
			await RPSGAMEMYSTERYPLAYERModel.update({wallet : rawData.wallet, amount : rawData.amount, name : rawData.name, status : 3, roomID : 0}, rawData.wallet)
			await RPSGAMEUSERModel.update({amount : userResult[0].amount - rawData.amount}, rawData.wallet)
			return {response : true, message : "please wait", data : {id : waitingRoom.insertId}}
		}catch(err){
			console.log(err)
			return {response : false, message : "invite error"}
		}
	}

	static async acceptInvite(rawData){
		try{
			let result = await RPSGAMEMYSTERYPLAYERModel.find({wallet : rawData.wallet})
			if(result.error || result.length!==0) throw new Error("Find Error")
			let inviter = await RPSGAMEMYSTERYPLAYERModel.find({id : rawData.inviteId})
			if(inviter.error || inviter.length===0) throw new Error("Invite Error")
			if(inviter[0].status !== 3) throw new Error("Invite status error")
			let userResult = await RPSGAMEUSERModel.find({wallet : rawData.wallet})
			if(userResult.error || userResult.length==0) throw new Error("Find Error")
			if(userResult[0].amount < inviter[0].amount) throw new Error("Amount Error")
			let newRoom = await RPSGAMEROOMModel.create({
				wallet1 : inviter[0].wallet, name1 : inviter[0].name, wallet2 : rawData.wallet, name2 : rawData.name, amount : inviter[0].amount
			})
			await RPSGAMEMYSTERYPLAYERModel.update({status : 1, roomID : newRoom.insertId}, inviter[0].wallet)
			await RPSGAMEMYSTERYPLAYERModel.create(rawData.wallet)
			await RPSGAMEMYSTERYPLAYERModel.update({amount : inviter[0].amount, name : rawData.name, status : 1, roomID : newRoom.insertId},rawData.wallet)
			await RPSGAMEUSERModel.update({amount : userResult[0].amount - inviter[0].amount}, rawData.wallet)
			return {response : true, message : "create room"}
		}catch(err){
			console.log(err)
			return {response : false, message : "accept invitation error"}
		}
	}

	static async cancelMystery(rawData){
		try{
			let result = await RPSGAMEMYSTERYPLAYERModel.find({wallet : rawData.wallet})
			if(result.error || result.length==0) throw new Error("Find Error")
			let userResult = await RPSGAMEUSERModel.find({wallet : rawData.wallet})
			if(userResult.error || userResult.length==0) throw new Error("Find Error")
			if(result[0].status==1){
				throw new Error("You have already started")
			}
			await RPSGAMEUSERModel.update({amount : userResult[0].amount + result[0].amount},rawData.wallet)
			await RPSGAMEMYSTERYPLAYERModel.delete({wallet : rawData.wallet})
			return {response : true, message : "cancel success"}
		}catch(err){
			console.log(err)
			return {response : false, message : "cancel error"}
		}
	}

	static async findMatch(rawData){
		try{
			let result1 = await RPSGAMEMYSTERYPLAYERModel.find({wallet : rawData.wallet})
			if(result1.error || result1.length==0) throw new Error("Find Error")
			if(result1[0].status!=0){
				return {response : true, message : "room created", data : {roomID : result1[0].roomID}}
			}
			let result2 = await RPSGAMEMYSTERYPLAYERModel.findMatch(rawData.wallet, result1[0].amount)
			if(result2.error || result2.length<=1) throw new Error("Find Error")
			const others = result2.filter((item)=>{return item.wallet != rawData.wallet})
			let result = await RPSGAMEROOMModel.create({
				wallet1 : result1[0].wallet, name1 : result1[0].name,
				wallet2 : others[0].wallet, name2 : others[0].name,
				amount : result1[0].amount
			})
			if(result.error) throw new Error("Create Room Error")
			await RPSGAMEMYSTERYPLAYERModel.update({...result1[0], status : 1, roomID : result.insertId}, result1[0].wallet)
			await RPSGAMEMYSTERYPLAYERModel.update({...others[0], status : 1, roomID : result.insertId}, others[0].wallet)
			return {response : true, message : "room created", data : {roomID : result.insertId}}
		}catch(err){
			console.log(err)
			return {response : false, message : "not found"}
		}
	}

	static async getGameState(rawData){
		try{
			let result = await RPSGAMEROOMModel.find({id : rawData.roomId})
			if(result.error || result.length==0) throw new Error("Find Error")
			let gameState = result[0]
			let data = {};
			let currentTurn, mySelect, opSelect, myName, opName;
			if(gameState.wallet1 == rawData.wallet){
				mySelect = [gameState.select1%10, Math.floor((gameState.select1/10))%10, Math.floor((gameState.select1/100))]
				opSelect = [gameState.select2%10, Math.floor((gameState.select2/10))%10, Math.floor((gameState.select2/100))]
				myName = gameState.name1;
				opName = gameState.name2;
			}else if(gameState.wallet2 == rawData.wallet){
				opSelect = [gameState.select1%10, Math.floor((gameState.select1/10))%10, Math.floor((gameState.select1/100))]
				mySelect = [gameState.select2%10, Math.floor((gameState.select2/10))%10, Math.floor((gameState.select2/100))]
				myName = gameState.name2;
				opName = gameState.name1;
			}else{
				throw new Error("wallet invalid")
			}
			if(mySelect[0]==0 || opSelect[0]==0) currentTurn = 0
			else if(mySelect[1]==0 || opSelect[1]==0) currentTurn = 1
			else if(mySelect[2]==0 || opSelect[2]==0) currentTurn = 2
			else currentTurn = 3
			if(currentTurn<3) opSelect[currentTurn] = 0
			return {response : true, message : "success", data : {
				currentTurn : currentTurn, myName : myName, opName : opName,
				mySelect : mySelect, opSelect : opSelect, amount : gameState.amount,
				ended : gameState.ended
			}}
		}catch(err){
			console.log(err)
			return {response : false, message : "not found"}
		}
	}

	static getGameResult(mySel, opSel){
		if(mySel===0 || opSel===0) return 0
		if(mySel===opSel) return 0
		if((mySel===1 && opSel===3) || (mySel===2 && opSel===1) || (mySel===3 && opSel===2)) return 1
		return 2
	}

	static async submitRps(rawData){
		try{
			let result = await RPSGAMEROOMModel.find({id : rawData.roomId})
			let currentTurn;
			if(result.error || result.length==0) throw new Error("Find Error")
			let gameState = result[0]
			if(gameState.ended===1) throw new Error("game ended")
			let mySelect = [gameState.select1%10, Math.floor((gameState.select1/10))%10, Math.floor((gameState.select1/100))]
			let opSelect = [gameState.select2%10, Math.floor((gameState.select2/10))%10, Math.floor((gameState.select2/100))]
			if(mySelect[0]==0 || opSelect[0]==0) currentTurn = 0
			else if(mySelect[1]==0 || opSelect[1]==0) currentTurn = 1
			else if(mySelect[2]==0 || opSelect[2]==0) currentTurn = 2
			else currentTurn = 3
			if(currentTurn===3) throw new Error("game ended")
			if(gameState.wallet1 == rawData.wallet){
				if(mySelect[currentTurn]!=0) throw new Error("already submitted")
				gameState.select1 += (10**currentTurn) * rawData.item
				mySelect[currentTurn] = rawData.item
			}else if(gameState.wallet2 == rawData.wallet){
				if(opSelect[currentTurn]!=0) throw new Error("already submitted")
				gameState.select2 += (10**currentTurn) * rawData.item
				opSelect[currentTurn] = rawData.item
			}else throw new Error("wallet invalid")

			await RPSGAMEROOMModel.update({select1 : gameState.select1, select2 : gameState.select2}, rawData.roomId)

			if(mySelect[0]==0 || opSelect[0]==0) currentTurn = 0
			else if(mySelect[1]==0 || opSelect[1]==0) currentTurn = 1
			else if(mySelect[2]==0 || opSelect[2]==0) currentTurn = 2
			else currentTurn = 3

			let gameResult = [0,0,0]
			let myCount = 0, opCount = 0
			for(let i=0;i<3;i++){
				gameResult=this.getGameResult(mySelect[i], opSelect[i])
				if(gameResult===1) myCount++;
				if(gameResult===2) opCount++;
			}
			let fee = gameState.amount * 0.03
			let user1 = (await RPSGAMEUSERModel.find({wallet : gameState.wallet1}))[0]
			let user2 = (await RPSGAMEUSERModel.find({wallet : gameState.wallet2}))[0]
			if(currentTurn===3){
				console.log(myCount, "   ", opCount)
				await RPSGAMEROOMModel.update({ended : 1}, rawData.roomId)
				if(myCount > opCount){
					await RPSGAMEUSERModel.update({amount : user1.amount + gameState.amount*2 - fee*2}, gameState.wallet1)
					let aaa= await RPSGAMELOGModel.create({roomId : gameState.id, result : 1,winnerWallet : gameState.wallet1, winnerName : gameState.name1, loserWallet : gameState.wallet2, loserName : gameState.name2, amount : gameState.amount})
					console.log(aaa)
				}else if(myCount < opCount){
					await RPSGAMEUSERModel.update({amount : user2.amount + gameState.amount*2 - fee*2}, gameState.wallet2)
					await RPSGAMELOGModel.create({roomId : gameState.id, result : 1,winnerWallet : gameState.wallet2, winnerName : gameState.name2, loserWallet : gameState.wallet1, loserName : gameState.name1, amount : gameState.amount})
				}else{
					await RPSGAMEUSERModel.update({amount : user1.amount + gameState.amount - fee}, gameState.wallet1)
					await RPSGAMEUSERModel.update({amount : user2.amount + gameState.amount - fee}, gameState.wallet2)
					await RPSGAMELOGModel.create({roomId : gameState.id, result : 0,winnerWallet : gameState.wallet1, winnerName : gameState.name1, loserWallet : gameState.wallet2, loserName : gameState.name2, amount : gameState.amount})
				}
				await RPSGAMEMYSTERYPLAYERModel.delete({wallet : gameState.wallet1})
				await RPSGAMEMYSTERYPLAYERModel.delete({wallet : gameState.wallet2})
			}else if(currentTurn===2){
				if(myCount===2){
					await RPSGAMEROOMModel.update({ended : 1}, rawData.roomId)
					await RPSGAMEUSERModel.update({amount : user1.amount + gameState.amount*2 - fee*2}, gameState.wallet1)
					await RPSGAMELOGModel.create({roomId : gameState.id, result : 1,winnerWallet : gameState.wallet1, winnerName : gameState.name1, loserWallet : gameState.wallet2, loserName : gameState.name2, amount : gameState.amount})
				}else if(opCount===2){
					await RPSGAMEROOMModel.update({ended : 1}, rawData.roomId)
					await RPSGAMEUSERModel.update({amount : user1.amount + gameState.amount*2 - fee*2}, gameState.wallet1)
					await RPSGAMELOGModel.create({roomId : gameState.id, result : 1,winnerWallet : gameState.wallet2, winnerName : gameState.name2, loserWallet : gameState.wallet1, loserName : gameState.name1, amount : gameState.amount})
				}
				await RPSGAMEMYSTERYPLAYERModel.delete({wallet : gameState.wallet1})
				await RPSGAMEMYSTERYPLAYERModel.delete({wallet : gameState.wallet2})
			}
			return {response : true, message : "submit success"}
		}catch(err){
			console.log(err)
			return {response : false, message : "submit failed"}
		}
	}
}

module.exports = RPSGAMEService