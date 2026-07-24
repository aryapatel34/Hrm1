const cloudinary = require('cloudinary').v2;

/**
 * Save a Base64 image/document string to Cloudinary.
 * @param {string} base64Str - The Base64 string (including data URI prefix)
 * @param {string} subFolder - The subfolder name (e.g. 'profile', 'screenshots', 'documents')
 * @param {string} prefix - The filename prefix
 * @returns {Promise<string|null>} The Cloudinary URL, or null if invalid
 */
const saveBase64Image = async (base64Str, subFolder, prefix) => {
  try {
    if (!base64Str) return null;
    
    // If it's already a full URL, return it as is
    if (base64Str.startsWith('http://') || base64Str.startsWith('https://')) {
      return base64Str;
    }
    
    if (!base64Str.startsWith('data:')) {
      return null;
    }
    
    // Upload directly to Cloudinary using base64 string
    const uploadRes = await cloudinary.uploader.upload(base64Str, {
      folder: `hrm/${subFolder}`,
      public_id: `${prefix}-${Date.now()}`,
      resource_type: 'auto'
    });
    
    return uploadRes.secure_url;
  } catch (err) {
    console.error('Error uploading to Cloudinary:', err);
    return null;
  }
};

module.exports = { saveBase64Image };
