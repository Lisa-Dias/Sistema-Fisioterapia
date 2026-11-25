const mysql = require('mysql2/promise');
const { database } = require('./config');

module.exports = mysql.createPool({
    ...database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
});
