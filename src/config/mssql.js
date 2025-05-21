const tedious = require('tedious');
const { Connection, Request } = tedious;

// MSSQL connection configuration using Tedious
const config = {
  server: process.env.MSSQL_SERVER || "103.230.152.158",  // BBPL-PC के बजाय localhost या IP एड्रेस का उपयोग करें
  authentication: {
    type: 'default',
    options: {
      userName: process.env.MSSQL_USER || "azure-sql",
      password: process.env.MSSQL_PASSWORD || "1234"
    }
  },
  options: {
    database: process.env.MSSQL_DATABASE || "BRLY_UAT",
    port: parseInt(process.env.MSSQL_PORT || "1433"),
    trustServerCertificate: true, 
    connectTimeout: 30000,
    requestTimeout: 30000,
    rowCollectionOnRequestCompletion: true
  }
};

// Function to connect to MSSQL using Tedious
const connectMSSQL = () => {
  return new Promise((resolve, reject) => {
    const connection = new Connection(config);
    
    connection.on('connect', (err) => {
      if (err) {
        console.error(`MSSQL connection error: ${err.message}`);
        reject(err);
        return;
      }
      
      console.log('Connected to MSSQL database using Tedious');
      resolve(connection);
    });
    
    connection.connect();
  });
};

// Execute a SQL query using Tedious
const executeQuery = (connection, query, params = []) => {
  return new Promise((resolve, reject) => {
    const request = new Request(query, (err, rowCount, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Format the results to be more usable
      const results = rows.map(row => {
        const item = {};
        row.forEach(column => {
          item[column.metadata.colName] = column.value;
        });
        return item;
      });
      
      resolve(results);
    });
    
    // Add parameters if any
    if (params.length > 0) {
      params.forEach(param => {
        request.addParameter(param.name, param.type, param.value);
      });
    }
    
    connection.execSql(request);
  });
};

module.exports = { connectMSSQL, executeQuery };