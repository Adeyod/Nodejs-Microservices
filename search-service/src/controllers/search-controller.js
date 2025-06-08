const Search = require('../models/Search');
const logger = require('../utils/logger');

// Implement caching here for 2 to 5 mins
const searchPostController = async (req, res) => {
  logger.info(`Search endpoint hit.`);

  try {
    const { query } = req.query;

    console.log('query:', query);

    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: 'textScore' },
      }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(10);

    console.log('results:', results);
    res.status(200).json({
      success: true,
      mwssage: 'Search fetched successfully',
      results,
    });
  } catch (error) {
    logger.error('Error searching a post...', error);
    res.status(500).json({
      success: false,
      message: 'Error searching a post',
    });
  }
};

module.exports = { searchPostController };

// 08:50:00
