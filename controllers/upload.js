const axios = require('axios');
const xlsx = require('xlsx');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { cloudinaryUpload } = require('../util/cloudinary');
const EnrichedFile = require('../modles/enrichedFile');

const MELISSA_ID = process.env.MELISSA_ID;

// ── Parse uploaded file ──────────────────────────────────────────────────────
const parseFile = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet);
};

const enrichRecord = async (row) => {
  const params = {
    format: 'JSON',
    id: MELISSA_ID,
    t: row.Email, // email as the search term
  };

  const response = await axios.get(
    'https://personatorsearch.melissadata.net/WEB/doPersonatorSearch',
    { params }
  );

  console.log('Melissa response:', JSON.stringify(response.data, null, 2));
  return response.data?.Records?.[0] || null;
};


// ── Call Melissa API for one row ─────────────────────────────────────────────
// const enrichRecord = async (row) => {
//   const params = {
//     format: 'JSON',
//     id: MELISSA_ID,
//     act: 'Append',
//     opt: 'Append:blank',
//     email: row.Email,
//   };

//   const response = await axios.get(
//     'https://personator.melissadata.net/v3/WEB/ContactVerify/doContactVerify',
//     { params }
//   );

//   console.log('Melissa response:', JSON.stringify(response.data, null, 2));
//   return response.data?.Records?.[0] || null;
// };

// ── Upload & Enrich ──────────────────────────────────────────────────────────
module.exports.uploadAndEnrich = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const stripe = require('stripe')(process.env.STRIPE_LIVE);
  const filePath = req.file.path;

  // Get user ID from JWT token
  let userId = null;
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log(token)
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    console.log(decoded)
    console.log('decoded')
    userId = decoded._id;
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const rows = parseFile(filePath);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'File is empty or could not be parsed' });
    }

    if (!rows[0].hasOwnProperty('Email')) {
      return res.status(400).json({ error: 'File must contain an "Email" column' });
    }

    let enrichedCount = 0;
    const enrichedRows = [];

    for (const row of rows) {
      try {
        if (!row.Email) {
          enrichedRows.push({ ...row, MelissaResults: 'SKIPPED - No Email' });
          continue;
        }

        const melissaResult = await enrichRecord(row);
        const resultCodes = melissaResult?.Results || '';
        
        const emailAddress = melissaResult?.EmailAddress?.trim();
        const resultCodesTrimmed = resultCodes.trim();
        const hasError = resultCodesTrimmed.split(',').every(code => code.trim().startsWith('E'));
        
        // Only count as enriched if Melissa returned a real EmailAddress
        const isEnriched = resultCodesTrimmed.length > 0 && !hasError && !!emailAddress;
        
        if (isEnriched) enrichedCount++;

        enrichedRows.push({
          // Original fields
          FirstName:          row.FirstName  || '',
          LastName:           row.LastName   || '',
          Address:            row.Address    || '',
          City:               row.City       || '',
          State:              row.State      || '',
          PostalCode:         row.PostalCode || '',
          Email:              row.Email      || '',
          Cell:               row.Cell       || '',
          // Melissa appended fields
          AppendedFirstName:  melissaResult?.FirstName    || '',
          AppendedLastName:   melissaResult?.LastName     || '',
          AppendedAddress:    melissaResult?.AddressLine1 || '',
          AppendedCity:       melissaResult?.City         || '',
          AppendedState:      melissaResult?.State        || '',
          AppendedPostalCode: melissaResult?.PostalCode   || '',
          AppendedPhone:      melissaResult?.PhoneNumber  || '',
          AppendedCompany:    melissaResult?.CompanyName  || '',
          Domain:             melissaResult?.Domain       || '',
          MelissaResults:     resultCodes,
        });

      } catch (rowError) {
        console.error(`Row failed for ${row.Email}:`, rowError.message);
        enrichedRows.push({
          ...row,
          AppendedFirstName: '', AppendedLastName: '', AppendedAddress: '',
          AppendedCity: '', AppendedState: '', AppendedPostalCode: '',
          AppendedPhone: '', AppendedCompany: '', Domain: '',
          MelissaResults: 'ERROR',
        });
      }
    }

    // Write enriched Excel file locally
    const outputWorkbook = xlsx.utils.book_new();
    const outputSheet = xlsx.utils.json_to_sheet(enrichedRows);
    xlsx.utils.book_append_sheet(outputWorkbook, outputSheet, 'Enriched');
    const outputPath = `uploads/enriched_${Date.now()}.xlsx`;
    xlsx.writeFile(outputWorkbook, outputPath);

    // Upload to Cloudinary
    const cloudinaryResult = await cloudinaryUpload(outputPath);
    const cloudinaryUrl = cloudinaryResult.url;
    console.log('Cloudinary URL:', cloudinaryUrl);

    // Save to DB
    await EnrichedFile.create({
      user:            userId,
      cloudinaryUrl,
      originalName:    req.file.originalname,
      totalRecords:    rows.length,
      enrichedRecords: enrichedCount,
      amountCharged:   enrichedCount * 1,
    });

    // Clean up local files
    fs.unlinkSync(filePath);
    fs.unlinkSync(outputPath);

    console.log(`Total: ${rows.length}, Enriched: ${enrichedCount}`);

    // Create Stripe payment intent (only if there are enriched records)
    let clientSecret = null;
    if (enrichedCount > 0) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount:   Math.round(enrichedCount * 100), // $1 per record in cents
        currency: 'usd',
        metadata: { cloudinaryUrl },
      });
      clientSecret = paymentIntent.client_secret;
    }

    return res.status(200).json({
      totalRecords:    rows.length,
      enrichedRecords: enrichedCount,
      downloadUrl:     cloudinaryUrl, // direct Cloudinary URL
      clientSecret,                   // for Stripe payment confirmation
    });

  } catch (err) {
    console.error('uploadAndEnrich error:', err.message);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(500).json({ error: 'Failed to process file' });
  }
};

// ── Create Payment Intent (standalone) ──────────────────────────────────────
module.exports.createPaymentIntent = async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_LIVE);
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100),
      currency: 'usd',
    });
    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    console.error('createPaymentIntent error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};

// ── Pay & get download URL ───────────────────────────────────────────────────
module.exports.payAndDownload = async (req, res) => {
    const { downloadUrl, paymentIntentId } = req.body;
  console.log("HERE")
    // Verify token
    try {
      const token = req.headers.authorization?.split(' ')[1];
      jwt.verify(token, process.env.JWT_KEY);
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  
    if (!downloadUrl) return res.status(400).json({ error: 'Missing downloadUrl' });
  
    return res.status(200).json({ downloadUrl });
  };
// ── Serve local file (fallback, not used with Cloudinary) ───────────────────
module.exports.downloadFile = (req, res) => {
  const { filename } = req.params;
  const filePath = `uploads/${filename}`;

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, filename, (err) => {
    if (!err) fs.unlinkSync(filePath);
  });
};



module.exports.getUserFiles = async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'No token provided' });
  
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const userId = decoded._id || decoded.id;
  
      if (!userId) return res.status(401).json({ error: 'Invalid token' });
  
      const files = await EnrichedFile.find({ user: userId })
        .sort({ createdAt: -1 }); // newest first
  
      return res.status(200).json({ files });
    } catch (e) {
      console.error('getUserFiles error:', e.message);
      return res.status(500).json({ error: 'Failed to fetch files' });
    }
  };