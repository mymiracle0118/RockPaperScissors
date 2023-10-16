const express = require("express");
const session = require("express-session");
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const cors = require("cors");
const cron = require("node-cron")
const HttpException = require('./utils/HttpException.utils');
const errorMiddleware = require('./middleware/error.middleware');
const rpsgameRouter = require('./routes/api/rpsgame.route');

const app = express();
dotenv.config();
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.options("*", cors());

const port = Number(process.env.PORT || 3000);
app.use(cookieParser());

app.use(`/rpsgame`, rpsgameRouter);


// 404 error
app.all('*', (req, res, next) => {
    const err = new HttpException(404, 'Endpoint Not Found');
    next(err);
});

// Error middleware
app.use(errorMiddleware);

// starting the server
app.listen(port, () =>
    console.log(`🚀 Server running on port ${port}!`));


module.exports = app;