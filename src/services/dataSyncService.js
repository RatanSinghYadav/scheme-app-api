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

// Sync product data to MongoDB with improved logic
const syncProductsToMongoDB = async () => {
  try {
    console.log('Product sync process started...');
    
    // Fetch products from MSSQL
    const products = await fetchProductsFromMSSQL();
    
    if (!products || products.length === 0) {
      console.log('No products found in MSSQL');
      return { success: false, message: 'No products found in MSSQL' };
    }
    
    console.log(`${products.length} products fetched from MSSQL`);
    
    let syncedCount = 0;
    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;
    
    // Process products in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      for (const product of batch) {
        try {
          // Skip if ITEMID is null or empty
          if (!product.ITEMID) {
            console.warn('Skipping product with empty ITEMID:', product);
            continue;
          }
          
          // Map MSSQL fields to MongoDB schema
          const productData = {
            ITEMID: product.ITEMID?.toString().trim() || null,
            ITEMNAME: product.ITEMNAME?.toString().trim() || null,
            BRANDNAME: product.BRANDNAME?.toString().trim() || null,
            PACKTYPEGROUPNAME: product.PACKTYPEGROUPNAME?.toString().trim() || null,
            Style: (product.Style || product.PRODUCTSTYLEID)?.toString().trim() || null,
            PACKTYPE: product.PACKTYPE?.toString().trim() || null,
            Configuration: (product.Configuration || product.PRODUCTCONFIGURATIONID)?.toString().trim() || null,
            NOB: product.NOB ? parseInt(product.NOB) : null,
            FLAVOURTYPE: (product.FLAVOURTYPE || product.PRODUCTSEGMENTNAME)?.toString().trim() || null,
            updatedAt: new Date()
          };
          
          // Check if product already exists using ITEMID + Style combination
          const existingProduct = await Product.findOne({ 
            ITEMID: product.ITEMID,
            Style: productData.Style,
            Configuration: productData.Configuration
          });
          
          if (existingProduct) {
            // Compare fields to check if update is needed
            let needsUpdate = false;
            const fieldsToCheck = ['ITEMNAME', 'BRANDNAME', 'PACKTYPEGROUPNAME', 'PACKTYPE', 'NOB', 'FLAVOURTYPE'];
            
            for (const field of fieldsToCheck) {
              if (existingProduct[field] !== productData[field]) {
                needsUpdate = true;
                break;
              }
            }
            
            if (needsUpdate) {
              await Product.findOneAndUpdate(
                { ITEMID: product.ITEMID, Style: productData.Style },
                productData,
                { new: true }
              );
              updatedCount++;
              console.log(`Updated product: ${product.ITEMID} - ${productData.Style}`);
            }
          } else {
            // Create new product
            await Product.create(productData);
            createdCount++;
            console.log(`Created new product: ${product.ITEMID} - ${productData.Style}`);
          }
          
          syncedCount++;
          
        } catch (productError) {
          console.error(`Error syncing product ${product.ITEMID}:`, productError.message);
          errorCount++;
        }
      }
      
      // Log progress for large datasets
      console.log(`Processed ${Math.min(i + batchSize, products.length)} of ${products.length} products`);
    }
    
    // Final summary
    const summary = {
      totalFetched: products.length,
      totalSynced: syncedCount,
      created: createdCount,
      updated: updatedCount,
      errors: errorCount
    };
    
    console.log('Product sync completed:', summary);
    
    // Verify final count in MongoDB
    const mongoCount = await Product.countDocuments();
    console.log(`MongoDB now contains ${mongoCount} products`);
    
    return { 
      success: true, 
      message: `Product sync completed successfully`, 
      summary 
    };
    
  } catch (error) {
    console.error('Error in product sync process:', error);
    return { 
      success: false, 
      message: `Product sync failed: ${error.message}` 
    };
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