const RPSGAMEService = require("../services/rpsgame.service")

class RPSGAMEController {
	getWallet = async(req, res, next) => {
		try{
			const result = await RPSGAMEService.getWallet(req.query)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	getStatus = async(req, res, next)=> {
		try{
			const result = await RPSGAMEService.getStatus(req.query)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	deposit = async(req, res, next)=>{
		try{
			const result = await RPSGAMEService.deposit(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	withdraw = async(req, res, next)=> {
		try{
			const result = await RPSGAMEService.withdraw(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	startMystery = async(req, res, next)=> {
		try{
			const result = await RPSGAMEService.startMystery(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	startInvite = async(req, res, next)=> {
		try{
			const result = await RPSGAMEService.startInvite(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	acceptInvitation = async(req, res, next)=> {
		try{
			const result = await RPSGAMEService.acceptInvite(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	cancelMystery = async(req, res, next)=>{
		try{
			const result = await RPSGAMEService.cancelMystery(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	findMatch = async(req, res, next)=>{
		try{
			const result = await RPSGAMEService.findMatch(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	getGameState = async(req, res, next)=>{
		try{
			const result = await RPSGAMEService.getGameState(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	submitRps = async(req, res, next)=>{
		try{
			const result = await RPSGAMEService.submitRps(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	getNonce = async(req, res, next) =>{
		try{
			const result = await RPSGAMEService.getNonce(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}

	signIn = async(req, res, next) =>{
		try{
			const result = await RPSGAMEService.signIn(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}
	
	tokenCheck = async(req, res, next) => {
		res.send({response : true, message : "prev token ok"})
	}

	preWithdraw = async(req, res, next) =>{
		try{
			const result = await RPSGAMEService.preWithdraw(req.body)
			res.send(result)
		}catch(err){
			next(err)
		}
	}
}

module.exports = new RPSGAMEController