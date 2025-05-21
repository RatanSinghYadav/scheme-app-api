const { connectMSSQL, executeQuery } = require('../config/mssql');
const Product = require('../models/Product');
const Distributor = require('../models/Distributor');
const schedule = require('node-schedule');

// Fetch products from MSSQL
const fetchProductsFromMSSQL = async () => {
  try {
    const connection = await connectMSSQL();
    
    // Updated query to fetch product data from correct table with fields matching MongoDB schema
    const query = `
      SELECT [BRANDNAME]
        ,[ITEMID]
        ,[ITEMNAME]
        ,[PACKTYPEGROUPNAME]
        ,[PRODUCTSTYLEID] as Style
        ,[PACKTYPE]
        ,[PRODUCTCONFIGURATIONID] as Configuration
        ,[NOB]
        ,[PRODUCTSEGMENTNAME] as FLAVOURTYPE
      FROM [BRLY_UAT].[dbo].[Ratan_Item]
    `;
    
    const result = await executeQuery(connection, query);
    connection.close();
    return result;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// Fetch distributors from MSSQL
const fetchDistributorsFromMSSQL = async () => {
  try {
    const connection = await connectMSSQL();
    
    // Updated query to fetch distributor data from correct table with fields matching MongoDB schema
    const query = `
      SELECT [SALESHIERARCHYCODE] as SMCODE
        ,[CUSTOMERACCOUNT]
        ,[ORGANIZATIONNAME]
        ,[ADDRESSCITY]
        ,[LINEDISCOUNTCODE] as CUSTOMERGROUPID
      FROM [BRLY_UAT].[dbo].[Ratan_Customer]
    `;
    
    const result = await executeQuery(connection, query);
    connection.close();
    return result;
  } catch (error) {
    console.error('Error fetching distributors:', error);
    throw error;
  }
};

// Sync product data to MongoDB
const syncProductsToMongoDB = async () => {
  try {
    console.log('Product sync process started...');
    
    // Fetch products from MSSQL
    const products = await fetchProductsFromMSSQL();
    
    if (!products || products.length === 0) {
      console.log('No products found');
      return;
    }
    
    console.log(`${products.length} products fetched from MSSQL`);
    
    // For each product, update or insert in MongoDB
    for (const product of products) {
      // Map MSSQL fields to MongoDB schema if needed
      const productData = {
        ITEMID: product.ITEMID,
        ITEMNAME: product.ITEMNAME,
        BRANDNAME: product.BRANDNAME,
        PACKTYPEGROUPNAME: product.PACKTYPEGROUPNAME,
        Style: product.Style || product.PRODUCTSTYLEID,
        PACKTYPE: product.PACKTYPE,
        Configuration: product.Configuration || product.PRODUCTCONFIGURATIONID,
        NOB: product.NOB,
        FLAVOURTYPE: product.FLAVOURTYPE || product.PRODUCTSEGMENTNAME
      };
      
      await Product.findOneAndUpdate(
        { ITEMID: product.ITEMID }, // search criteria
        productData, // update data
        { upsert: true, new: true } // create new if not found
      );
    }
    
    console.log(`${products.length} products successfully synced to MongoDB`);
  } catch (error) {
    console.error('Error syncing products:', error);
  }
};

// Sync distributor data to MongoDB
const syncDistributorsToMongoDB = async () => {
  try {
    console.log('Distributor sync process started...');
    
    // Fetch distributors from MSSQL
    const distributors = await fetchDistributorsFromMSSQL();
    
    if (!distributors || distributors.length === 0) {
      console.log('No distributors found');
      return;
    }
    
    console.log(`${distributors.length} distributors fetched from MSSQL`);
    
    // For each distributor, update or insert in MongoDB
    for (const distributor of distributors) {
      // Map MSSQL fields to MongoDB schema if needed
      const distributorData = {
        CUSTOMERACCOUNT: distributor.CUSTOMERACCOUNT,
        ORGANIZATIONNAME: distributor.ORGANIZATIONNAME,
        ADDRESSCITY: distributor.ADDRESSCITY,
        SMCODE: distributor.SMCODE || distributor.SALESHIERARCHYCODE,
        CUSTOMERGROUPID: distributor.CUSTOMERGROUPID || distributor.LINEDISCOUNTCODE
      };
       
      await Distributor.findOneAndUpdate(
        { CUSTOMERACCOUNT: distributor.CUSTOMERACCOUNT }, // search criteria
        distributorData, // update data
        { upsert: true, new: true } // create new if not found
      );
    }
    
    console.log(`${distributors.length} distributors successfully synced to MongoDB`);
  } catch (error) {
    console.error('Error syncing distributors:', error);
  }
};

// Main function to sync all data
const syncAllData = async () => {
  try {
    console.log('Data sync process started: ' + new Date().toISOString());
    
    // Sync products and distributors
    await syncProductsToMongoDB();
    await syncDistributorsToMongoDB();
    
    console.log('Data sync process completed: ' + new Date().toISOString());
  } catch (error) {
    console.error('Error in data sync process:', error);
  }
};

// Scheduler setup - will run every 3 hours
const setupScheduler = () => {
  // Job that runs every 3 hours
  const job = schedule.scheduleJob('0 0 */3 * * *', async () => {
    console.log('Scheduled data sync started: ' + new Date().toISOString());
    await syncAllData();
  });
  
  console.log('Data sync scheduler setup complete - will run every 3 hours');
  
  return job;
};

// Export for manual sync
module.exports = {
  syncAllData,
  setupScheduler,
  syncProductsToMongoDB,
  syncDistributorsToMongoDB
};