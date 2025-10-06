const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Photo optimization utility for free tier storage efficiency
 * Compresses images and creates thumbnails to minimize storage usage
 */

const PHOTO_SIZES = {
  thumbnail: { width: 150, height: 150, quality: 70 },
  medium: { width: 800, height: 600, quality: 80 },
  original: { quality: 85 } // Compressed original
};

/**
 * Optimize and create multiple sizes of an uploaded photo
 * @param {string} inputPath - Path to the original uploaded file
 * @param {string} outputDir - Directory to save optimized versions
 * @param {string} filename - Base filename (without extension)
 * @returns {Object} - Paths and metadata for all created versions
 */
const optimizePhoto = async (inputPath, outputDir, filename) => {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const baseFilename = path.parse(filename).name;
    const results = {
      original: null,
      medium: null,
      thumbnail: null,
      metadata: null
    };

    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    results.metadata = {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size
    };

    // Create thumbnail (150x150, cropped and centered)
    const thumbnailPath = path.join(outputDir, `${baseFilename}_thumb.webp`);
    await sharp(inputPath)
      .resize(PHOTO_SIZES.thumbnail.width, PHOTO_SIZES.thumbnail.height, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: PHOTO_SIZES.thumbnail.quality })
      .toFile(thumbnailPath);
    
    results.thumbnail = {
      path: thumbnailPath,
      filename: `${baseFilename}_thumb.webp`,
      size: PHOTO_SIZES.thumbnail
    };

    // Create medium size (800x600, maintain aspect ratio)
    const mediumPath = path.join(outputDir, `${baseFilename}_medium.webp`);
    await sharp(inputPath)
      .resize(PHOTO_SIZES.medium.width, PHOTO_SIZES.medium.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: PHOTO_SIZES.medium.quality })
      .toFile(mediumPath);
    
    results.medium = {
      path: mediumPath,
      filename: `${baseFilename}_medium.webp`,
      size: PHOTO_SIZES.medium
    };

    // Create optimized original (compressed but full size)
    const originalPath = path.join(outputDir, `${baseFilename}_original.webp`);
    await sharp(inputPath)
      .webp({ quality: PHOTO_SIZES.original.quality })
      .toFile(originalPath);
    
    results.original = {
      path: originalPath,
      filename: `${baseFilename}_original.webp`,
      size: { ...metadata, quality: PHOTO_SIZES.original.quality }
    };

    // Calculate compression savings
    const originalSize = metadata.size;
    const thumbnailSize = (await fs.stat(thumbnailPath)).size;
    const mediumSize = (await fs.stat(mediumPath)).size;
    const optimizedOriginalSize = (await fs.stat(originalPath)).size;

    results.compressionStats = {
      originalSize,
      thumbnailSize,
      mediumSize,
      optimizedOriginalSize,
      totalOptimizedSize: thumbnailSize + mediumSize + optimizedOriginalSize,
      compressionRatio: ((originalSize - (thumbnailSize + mediumSize + optimizedOriginalSize)) / originalSize * 100).toFixed(1)
    };

    // Clean up original file after optimization
    await fs.unlink(inputPath);

    return results;
  } catch (error) {
    console.error('Photo optimization error:', error);
    throw new Error(`Failed to optimize photo: ${error.message}`);
  }
};

/**
 * Batch optimize multiple photos
 * @param {Array} photos - Array of photo objects with inputPath, outputDir, filename
 * @returns {Array} - Array of optimization results
 */
const batchOptimizePhotos = async (photos) => {
  const results = [];
  
  for (const photo of photos) {
    try {
      const result = await optimizePhoto(photo.inputPath, photo.outputDir, photo.filename);
      results.push({
        success: true,
        filename: photo.filename,
        ...result
      });
    } catch (error) {
      results.push({
        success: false,
        filename: photo.filename,
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * Get storage usage statistics
 * @param {string} uploadsDir - Directory containing all uploads
 * @returns {Object} - Storage statistics
 */
const getStorageStats = async (uploadsDir) => {
  try {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byType: {
        thumbnails: { count: 0, size: 0 },
        medium: { count: 0, size: 0 },
        original: { count: 0, size: 0 }
      }
    };

    const scanDirectory = async (dir) => {
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          await scanDirectory(filePath);
        } else if (file.isFile() && file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
          const fileStat = await fs.stat(filePath);
          stats.totalFiles++;
          stats.totalSize += fileStat.size;
          
          // Categorize by type
          if (file.name.includes('_thumb')) {
            stats.byType.thumbnails.count++;
            stats.byType.thumbnails.size += fileStat.size;
          } else if (file.name.includes('_medium')) {
            stats.byType.medium.count++;
            stats.byType.medium.size += fileStat.size;
          } else if (file.name.includes('_original')) {
            stats.byType.original.count++;
            stats.byType.original.size += fileStat.size;
          }
        }
      }
    };

    await scanDirectory(uploadsDir);
    
    // Convert bytes to human readable format
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      ...stats,
      totalSizeFormatted: formatBytes(stats.totalSize),
      byType: {
        thumbnails: {
          ...stats.byType.thumbnails,
          sizeFormatted: formatBytes(stats.byType.thumbnails.size)
        },
        medium: {
          ...stats.byType.medium,
          sizeFormatted: formatBytes(stats.byType.medium.size)
        },
        original: {
          ...stats.byType.original,
          sizeFormatted: formatBytes(stats.byType.original.size)
        }
      }
    };
  } catch (error) {
    console.error('Storage stats error:', error);
    return null;
  }
};

/**
 * Clean up old photos to free storage space
 * @param {string} uploadsDir - Directory containing uploads
 * @param {number} maxAgeInDays - Maximum age of files to keep
 * @returns {Object} - Cleanup statistics
 */
const cleanupOldPhotos = async (uploadsDir, maxAgeInDays = 365) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
    
    let deletedFiles = 0;
    let freedSpace = 0;
    
    const scanAndClean = async (dir) => {
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          await scanAndClean(filePath);
        } else if (file.isFile() && file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
          const fileStat = await fs.stat(filePath);
          
          if (fileStat.mtime < cutoffDate) {
            freedSpace += fileStat.size;
            await fs.unlink(filePath);
            deletedFiles++;
          }
        }
      }
    };
    
    await scanAndClean(uploadsDir);
    
    return {
      deletedFiles,
      freedSpace,
      freedSpaceFormatted: formatBytes(freedSpace)
    };
  } catch (error) {
    console.error('Cleanup error:', error);
    return { deletedFiles: 0, freedSpace: 0, error: error.message };
  }
};

// Helper function to format bytes
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = {
  optimizePhoto,
  batchOptimizePhotos,
  getStorageStats,
  cleanupOldPhotos,
  PHOTO_SIZES
};
