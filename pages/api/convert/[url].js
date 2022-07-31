import cloudinary from 'cloudinary';
import multer from 'multer';

export const config = {
  api: {
    bodyParser: false,
  },
};

const storage = multer.diskStorage({
  destination: './public/uploads',
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({
  storage,
});

export default async function convert(req, res) {
  const cld = cloudinary.v2;

  cld.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_API_KEY,
    api_secret: process.env.NEXT_PUBLIC_API_SECRET,
  });

  const { url } = req.query;

  //set waiting time
  const wait = () => {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, 5000);
    });
  };

  upload.single('file')(req, {}, (err) => {
    const filePath = `./public/uploads/${req.file.originalname}`;

    cld.uploader
      .upload(filePath, {
        resource_type: 'raw',
        raw_convert: 'aspose',
        notification_url: `http://${url}`,
      })
      .then(async (result) => {
        let state = null;

        if (result.info.raw_convert.aspose.status === 'pending') {
          //check if status is successful
          while (state !== 'success') {
            await wait();
            return cld.api
              .resource(
                result.public_id,
                { resource_type: 'raw' },
                function (error, result) {
                  if (result) {
                    return result;
                  } else {
                    return error;
                  }
                }
              )
              .then((_) => {
                state = 'success';

                return res.status(200).json({
                  msg: 'document converted successfully!',
                  converted: cld.url(`${result.public_id}.jpeg`, {
                    transformation: [{ width: 600, crop: 'scale' }],
                  }),
                });
              })
              .catch((_) => {
                return res.status(500).json({ msg: 'error' });
              });
          }
        } else if (result.info.raw_convert.aspose.status !== 'pending') {
          return res.status(200).json({
            msg: 'document converted successfully!',
            converted: cld.url(`${result.public_id}.jpeg`, {
              transformation: [{ width: 600, crop: 'scale' }],
            }),
          });
        } else {
          return res.status(500).json({ msg: 'error' });
        }
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).json({ msg: error });
      });
  });
}
