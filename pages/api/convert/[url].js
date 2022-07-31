import cloudinary from 'cloudinary';
import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function convert(req, res) {
  const cld = cloudinary.v2;
  const form = new IncomingForm();

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

  if (!fs.existsSync('./public/uploads')) {
    fs.mkdirSync('./public/uploads', { recursive: true });
  }

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.status(500).json({ msg: err });
      return;
    }
    let tempFilePath = files.file.filepath;
    let projectFilePath = `./public/uploads/${files.file.originalFilename}`;

    fs.rename(tempFilePath, projectFilePath, (err) => {
      if (err) {
        res.status(500).json({ msg: err.message });
      }
    });

    cld.uploader
      .upload(
        projectFilePath,
        {
          resource_type: 'raw',
          raw_convert: 'aspose',
          notification_url: `http://${url}`,
        },
        async function (error, result) {
          let state = null;

          if (result.info.raw_convert.aspose.status === 'pending') {
            //check if status is successful
            while (state !== 'success') {
              await wait();
              cld.api
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
                  res.status(200).json({
                    msg: 'document converted successfully!',
                    converted: cld.url(`${result.public_id}.jpeg`, {
                      transformation: [{ width: 600, crop: 'scale' }],
                    }),
                  });
                  state = 'success';

                  //clean up
                  fs.unlinkSync(projectFilePath);
                  return;
                })
                .catch((_) => {
                  res.status(500).json({ msg: 'error' });
                  return;
                });
            }
          } else if (result.info.raw_convert.aspose.status !== 'pending') {
            res.status(200).json({
              msg: 'document converted successfully!',
              converted: cld.url(`${result.public_id}.jpeg`, {
                transformation: [{ width: 600, crop: 'scale' }],
              }),
            });

            //clean up
            fs.unlinkSync(projectFilePath);
            return;
          } else {
            res.status(500).json({ msg: 'error' });
            return;
          }
        }
      )
      .catch((_) => res.status(500).json({ msg: 'error' }));
    return;
  });
}
