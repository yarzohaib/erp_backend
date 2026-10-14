const uploadService = require("../services/upload.service");

const uploadController = {
  async presign(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      const { kind, contentType, size } = req.body;

      const result = await uploadService.createUploadUrl({
        userId,
        kind,
        contentType,
        size,
      });

      return res.status(200).json({
        success: true,
        message: "Presigned upload URL generated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = uploadController;
