const http = require('http');

console.log('Testing server startup...');
console.log('Node.js version:', process.version);

try {
  // Test basic require
  const express = require('express');
  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');
  const cors = require('cors');
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');
  const rateLimit = require('express-rate-limit');
  const helmet = require('helmet');
  const validator = require('validator');

  console.log('✅ All dependencies loaded successfully');

  // Test .env loading
  require('dotenv').config();
  console.log('✅ Environment loaded');

  // Test database connection
  const db = require('./db');
  console.log('✅ Database module loaded');

  console.log('🎉 All basic checks passed! Server should start successfully.');

} catch (error) {
  console.error('❌ Error during testing:', error.message);
  process.exit(1);
}