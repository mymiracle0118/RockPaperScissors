const router = require('express').Router();
const RPSGAMEController = require("../../controllers/rpsgame.controller")
const awaitHandlerFactory = require('../../middleware/awaitHandlerFactory.middleware')
const auth = require('../../middleware/auth.middleware')

router.get('/wallet',awaitHandlerFactory(RPSGAMEController.getWallet))
router.get('/status', awaitHandlerFactory(RPSGAMEController.getStatus))

router.post('/deposit',auth(), awaitHandlerFactory(RPSGAMEController.deposit))
router.post('/withdraw',auth(), awaitHandlerFactory(RPSGAMEController.withdraw))
router.post('/start/mystery',auth(),awaitHandlerFactory(RPSGAMEController.startMystery))
router.post('/start/invite',auth(), awaitHandlerFactory(RPSGAMEController.startInvite))
router.post('/match',auth(),awaitHandlerFactory(RPSGAMEController.findMatch))
router.post('/accept',auth(),awaitHandlerFactory(RPSGAMEController.acceptInvitation))
router.post('/gamestate',auth(), awaitHandlerFactory(RPSGAMEController.getGameState))
router.post('/submit', auth(), awaitHandlerFactory(RPSGAMEController.submitRps))
router.post('/nonce', awaitHandlerFactory(RPSGAMEController.getNonce))
router.post('/signin',awaitHandlerFactory(RPSGAMEController.signIn))
router.post('/tokencheck', auth(),awaitHandlerFactory(RPSGAMEController.tokenCheck))
router.post('/prewithdraw', auth(), awaitHandlerFactory(RPSGAMEController.preWithdraw))

router.delete('/cancel/mystery', auth(),awaitHandlerFactory(RPSGAMEController.cancelMystery))

module.exports = router