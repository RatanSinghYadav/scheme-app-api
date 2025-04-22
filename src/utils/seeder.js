const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Product = require('../models/Product');
const Distributor = require('../models/Distributor');
const Scheme = require('../models/Scheme');

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    username: 'admin',
    password: 'password123',
    role: 'admin'
  },
  {
    name: 'Creator User',
    email: 'creator@example.com',
    username: 'creator',
    password: 'password123',
    role: 'creator'
  },
  {
    name: 'Verifier User',
    email: 'verifier@example.com',
    username: 'verifier',
    password: 'password123',
    role: 'verifier'
  },
  {
    name: 'Viewer User',
    email: 'viewer@example.com',
    username: 'viewer',
    password: 'password123',
    role: 'viewer'
  }
];

const distributors = [
  {
    name: 'ABC Distributors',
    code: 'ABC001',
    group: 'Premium',
    city: 'Mumbai',
    state: 'Maharashtra',
    region: 'West',
    contactPerson: 'John Doe',
    phone: '9876543210',
    email: 'contact@abcdist.com'
  },
  {
    name: 'XYZ Enterprises',
    code: 'XYZ002',
    group: 'Standard',
    city: 'Delhi',
    state: 'Delhi',
    region: 'North',
    contactPerson: 'Jane Smith',
    phone: '8765432109',
    email: 'info@xyzent.com'
  },
  {
    name: 'PQR Trading',
    code: 'PQR003',
    group: 'Premium',
    city: 'Bangalore',
    state: 'Karnataka',
    region: 'South',
    contactPerson: 'Robert Johnson',
    phone: '7654321098',
    email: 'sales@pqrtrading.com'
  }
];

const products = [
  {
    ITEMID: 'P001',
    ITEMNAME: 'Product A',
    BRANDNAME: 'Brand X',
    FLAVOURTYPE: 'Original',
    PACKTYPEGROUPNAME: 'Small',
    Style: 'Standard',
    PACKTYPE: 'Box',
    Configuration: 'Standard',
    NOB: 12,
    mrp: 120
  },
  {
    ITEMID: 'P002',
    ITEMNAME: 'Product B',
    BRANDNAME: 'Brand Y',
    FLAVOURTYPE: 'Mint',
    PACKTYPEGROUPNAME: 'Medium',
    Style: 'Premium',
    PACKTYPE: 'Bottle',
    Configuration: 'Premium',
    NOB: 6,
    mrp: 180
  },
  {
    ITEMID: 'P003',
    ITEMNAME: 'Product C',
    BRANDNAME: 'Brand X',
    FLAVOURTYPE: 'Strawberry',
    PACKTYPEGROUPNAME: 'Large',
    Style: 'Economy',
    PACKTYPE: 'Pouch',
    Configuration: 'Economy',
    NOB: 24,
    mrp: 240
  }
];

// Import data into DB
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Product.deleteMany();
    await Distributor.deleteMany();
    await Scheme.deleteMany();

    // Import users
    const createdUsers = await User.create(users);
    console.log(`${createdUsers.length} users imported`);

    // Import distributors
    const createdDistributors = await Distributor.create(distributors);
    console.log(`${createdDistributors.length} distributors imported`);

    // Import products
    const createdProducts = await Product.create(products);
    console.log(`${createdProducts.length} products imported`);

    // Create a sample scheme
    const adminUser = createdUsers.find(user => user.role === 'admin');
    
    const sampleScheme = {
      schemeCode: 'SCH-20230101-1234',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31'),
      distributors: [createdDistributors[0]._id, createdDistributors[1]._id],
  
      products: [
        {
          ITEMID: createdProducts[0].ITEMID,
          ITEMNAME: createdProducts[0].ITEMNAME,
          BRANDNAME: createdProducts[0].BRANDNAME,
          PACKTYPE: createdProducts[0].PACKTYPE,
          Configuration: createdProducts[0].Configuration, // mrp के लिए
          discountPrice: createdProducts[0].Configuration * 0.9,
          customFields: {
            promotion: 'Buy 1 Get 1 Free',
            target: '100 units'
          }
        },
        {
          ITEMID: createdProducts[1].ITEMID,
          ITEMNAME: createdProducts[1].ITEMNAME,
          BRANDNAME: createdProducts[1].BRANDNAME,
          PACKTYPE: createdProducts[1].PACKTYPE,
          Configuration: createdProducts[1].Configuration, // mrp के लिए
          discountPrice: createdProducts[1].Configuration * 0.85,
          customFields: {
            promotion: '15% Off',
            target: '50 units'
          }
        }
      ],
      status: 'Pending Verification',
      createdBy: adminUser._id,
      history: [
        {
          action: 'created',
          user: adminUser._id,
          notes: 'Initial scheme creation'
        }
      ]
    };

    await Scheme.create(sampleScheme);
    console.log('1 sample scheme imported');

    console.log('Data import complete!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Delete all data from DB
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Product.deleteMany();
    await Distributor.deleteMany();
    await Scheme.deleteMany();

    console.log('All data deleted!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Check command line args
if (process.argv[2] === '-d') {
  deleteData();
} else {
  importData();
}