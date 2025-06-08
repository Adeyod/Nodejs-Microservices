const Media = require('../models/Media');
const { uploadMediaToCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');

const uploadMedia = async (req, res) => {
  logger.info('Starting media upload');

  try {
    console.log(req.file, 'req.file');
    if (!req.file) {
      logger.error('No file found. Please add a file and try again!');
      return res.status(400).json({
        success: false,
        message: 'No file found. Please add a file and try again!',
      });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(`File details: name=${originalname}, type=${mimetype}`);
    logger.info(`Upload to cloudinary starting`);

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      `Cloudinary upload successfully. Public ID - ${cloudinaryUploadResult.public_id}`
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      url: cloudinaryUploadResult.secure_url,
      originalName: originalname,
      mimeType: mimetype,
      userId,
    });

    await newlyCreatedMedia.save();
    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: 'Media upload is successful',
    });
  } catch (error) {
    logger.error('Error uploading media...', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading media',
    });
  }
};

const getAllMedias = async (req, res) => {
  try {
    const results = await Media.find();

    res.status(200).json({
      success: true,
      message: 'Media fetched successfully',
      medias: results,
    });
  } catch (error) {
    logger.error('Error fetching medias...', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching medias',
    });
  }
};

module.exports = { uploadMedia, getAllMedias };
